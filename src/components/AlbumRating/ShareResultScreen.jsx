import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Download, Link2, Loader2, Share2, X } from 'lucide-react';
import ShareCard, { CARD_ALTURA, CARD_BLUR, CARD_LARGURA } from './ShareCard';
import { authService } from '../../services/authService';
import { albumRatingService } from '../../services/albumRatingService';
import { captureNode, prepararCapaCompartilhamento, shareOrDownloadImage } from '../../utils/shareImage';

const ShareResultScreen = ({ rating, onClose }) => {
  const cardRef = useRef(null);
  const usuario = authService.getCurrentUser();
  const username = usuario?.username;
  const chaveCompartilhamento = `${rating?.id || ''}:${Boolean(rating?.oculto)}`;
  const statusInicialCompartilhamento = rating?.oculto
    ? 'indisponivel'
    : rating?.id ? 'carregando' : 'erro-link';
  const [compartilhamento, setCompartilhamento] = useState({
    chave: chaveCompartilhamento,
    status: statusInicialCompartilhamento,
    url: null,
  });
  const compartilhamentoAtual = compartilhamento.chave === chaveCompartilhamento
    ? compartilhamento
    : {
        chave: chaveCompartilhamento,
        status: statusInicialCompartilhamento,
        url: null,
      };
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  // A capa (e o fundo desfocado gerado a partir dela) é baixada uma vez só, antes da captura.
  // Os botões só liberam quando as duas estão prontas: antes, o html2canvas baixava o fundo
  // de novo na hora de compartilhar e, se o proxy demorasse, a imagem saía sem fundo.
  const [capa, setCapa] = useState(() => ({
    status: rating?.capaUrl ? 'carregando' : 'pronta',
    capaSrc: null,
    fundoSrc: null,
  }));
  const capaStatus = capa.status;
  const capaCarregando = capaStatus === 'carregando';
  const linkPublico = compartilhamentoAtual.url;
  const bloqueado = processando || capaCarregando || compartilhamentoAtual.status === 'carregando';

  useEffect(() => {
    if (!rating?.id || rating.oculto) {
      return undefined;
    }

    let cancelado = false;

    (async () => {
      try {
        const resposta = await albumRatingService.createPublicShare(rating.id);
        if (!resposta?.url) throw new Error('O backend não retornou o link público.');
        if (!cancelado) setCompartilhamento({ chave: chaveCompartilhamento, status: 'pronto', url: resposta.url });
      } catch (err) {
        console.error('Erro ao criar link público da avaliação:', err);
        if (!cancelado) setCompartilhamento({ chave: chaveCompartilhamento, status: 'erro-link', url: null });
      }
    })();

    return () => { cancelado = true; };
  }, [chaveCompartilhamento, rating?.id, rating?.oculto]);

  useEffect(() => {
    const capaUrl = rating?.capaUrl;
    if (!capaUrl) return undefined;
    let cancelado = false;
    let objectUrl = null;

    prepararCapaCompartilhamento(capaUrl, { largura: CARD_LARGURA, altura: CARD_ALTURA, blurPx: CARD_BLUR })
      .then(({ capaSrc, fundoSrc }) => {
        objectUrl = capaSrc;
        if (cancelado) {
          URL.revokeObjectURL(capaSrc);
          return;
        }
        setCapa({ status: 'pronta', capaSrc, fundoSrc });
      })
      .catch((err) => {
        console.error('Erro ao carregar a capa para compartilhar:', err);
        if (!cancelado) setCapa({ status: 'erro', capaSrc: null, fundoSrc: null });
      });

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rating?.capaUrl]);

  if (!rating) return null;

  const gerarImagem = async () => {
    if (!cardRef.current) return null;
    setProcessando(true);
    setErro(null);
    try {
      return await captureNode(cardRef.current);
    } catch (err) {
      console.error('Erro ao gerar imagem de compartilhamento:', err);
      setErro('Não foi possível gerar a imagem. Tente novamente.');
      return null;
    } finally {
      setProcessando(false);
    }
  };

  const handleBaixar = async () => {
    const blob = await gerarImagem();
    if (!blob) return;
    try {
      await shareOrDownloadImage(blob, `${rating.albumName}-avaliacao.png`);
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      setErro('Não foi possível baixar a imagem.');
    }
  };

  const handleCompartilhar = async () => {
    const blob = await gerarImagem();
    if (!blob) return;
    try {
      await shareOrDownloadImage(blob, `${rating.albumName}-avaliacao.png`, {
        text: linkPublico ? `Minha avaliação de ${rating.albumName} no Synfonia: ${linkPublico}` : undefined,
      });
    } catch (err) {
      console.error('Erro ao compartilhar imagem:', err);
      setErro('Não foi possível compartilhar a imagem.');
    }
  };

  const handleCopiarLink = async () => {
    if (!linkPublico) return;
    try {
      await navigator.clipboard.writeText(linkPublico);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link público:', err);
      setErro('Não foi possível copiar o link.');
    }
  };

  return (
    <AnimatePresence>
      {/* Tela cheia de verdade: cobre até o miniplayer/navbar de baixo (não reserva espaço
          pra eles, ao contrário das outras telas de álbum/avaliação). O áudio não é afetado
          — isso é só sobreposição visual (z-index), não mexe no estado de reprodução. */}
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        />

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
          className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
        >
          <X size={24} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <ShareCard
            ref={cardRef}
            rating={rating}
            username={username}
            capaSrc={capa.capaSrc}
            fundoSrc={capa.fundoSrc}
            capaCarregando={capaCarregando}
          />

          {capaStatus === 'erro' && !erro && (
            <p className="text-sm text-yellow-400 text-center px-6">Não foi possível carregar a capa do álbum.</p>
          )}
          {compartilhamentoAtual.status === 'indisponivel' && rating.oculto && (
            <p className="text-sm text-yellow-400 text-center px-6">Esta avaliação está oculta e será compartilhada sem link público.</p>
          )}
          {compartilhamentoAtual.status === 'erro-link' && (
            <p className="text-sm text-yellow-400 text-center px-6">Não foi possível criar o link público. Você ainda pode compartilhar a imagem sem o link.</p>
          )}
          {erro && <p className="text-sm text-red-400 text-center px-6">{erro}</p>}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xs sm:max-w-none px-6 sm:px-0">
            <button
              type="button"
              onClick={handleBaixar}
              disabled={bloqueado}
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bloqueado
                ? <Loader2 size={18} className="shrink-0 animate-spin" />
                : <Download size={18} className="shrink-0" />}
              Baixar imagem
            </button>
            <button
              type="button"
              onClick={handleCompartilhar}
              disabled={bloqueado}
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand hover:bg-brand/90 text-brand-contrast font-semibold px-5 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bloqueado
                ? <Loader2 size={18} className="shrink-0 animate-spin" />
                : <Share2 size={18} className="shrink-0" />}
              Compartilhar
            </button>
            {linkPublico && (
              <button
                type="button"
                onClick={handleCopiarLink}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 transition-colors"
              >
                {linkCopiado
                  ? <Check size={18} className="shrink-0" />
                  : <Link2 size={18} className="shrink-0" />}
                {linkCopiado ? 'Link copiado' : 'Copiar link público'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareResultScreen;
