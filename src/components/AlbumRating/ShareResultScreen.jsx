import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X } from 'lucide-react';
import ShareCard from './ShareCard';
import { captureNode, shareOrDownloadImage } from '../../utils/shareImage';

const ShareResultScreen = ({ rating, onClose }) => {
  const cardRef = useRef(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

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
      await shareOrDownloadImage(blob, `${rating.albumName}-avaliacao.png`);
    } catch (err) {
      console.error('Erro ao compartilhar imagem:', err);
      setErro('Não foi possível compartilhar a imagem.');
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
          <ShareCard ref={cardRef} rating={rating} />

          {erro && <p className="text-sm text-red-400 text-center px-6">{erro}</p>}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xs sm:max-w-none px-6 sm:px-0">
            <button
              type="button"
              onClick={handleBaixar}
              disabled={processando}
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 transition-colors disabled:opacity-40"
            >
              <Download size={18} className="shrink-0" />
              Baixar imagem
            </button>
            <button
              type="button"
              onClick={handleCompartilhar}
              disabled={processando}
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand hover:bg-brand/90 text-brand-contrast font-semibold px-5 py-3 transition-colors disabled:opacity-40"
            >
              <Share2 size={18} className="shrink-0" />
              Compartilhar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareResultScreen;
