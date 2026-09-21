import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import StarRating from './StarRating';
import { albumRatingService } from '../../services/albumRatingService';

const TITULO_MAX = 100;

const RatingFormScreen = ({ album, isOpen, onClose, onSaved, onDeleted }) => {
  const [nota, setNota] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [review, setReview] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState(null);

  const jaAvaliado = !!album?.id;

  useEffect(() => {
    if (isOpen && album) {
      setNota(album.nota ?? 0);
      setTitulo(album.titulo ?? '');
      setReview(album.review ?? '');
      setErro(null);
      setConfirmandoExclusao(false);
    }
  }, [isOpen, album]);

  if (!isOpen || !album) return null;

  const handleClose = () => {
    setNota(0);
    setTitulo('');
    setReview('');
    setErro(null);
    setConfirmandoExclusao(false);
    onClose();
  };

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      setErro('Dê um título pra sua avaliação.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const response = await albumRatingService.saveRating({
        source: album.source,
        artista: album.artista,
        albumName: album.albumName,
        capaUrl: album.capaUrl,
        nota,
        titulo,
        review,
      });
      setNota(0);
      setTitulo('');
      setReview('');
      onSaved(response);
    } catch (err) {
      setErro('Não foi possível salvar a avaliação. Tente novamente.');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!album?.albumKey) return;
    setExcluindo(true);
    setErro(null);
    try {
      await albumRatingService.deleteRating(album.albumKey);
      setNota(0);
      setTitulo('');
      setReview('');
      onDeleted && onDeleted(album);
    } catch (err) {
      setErro('Não foi possível excluir a avaliação. Tente novamente.');
      console.error(err);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 right-0 top-0 z-50 bg-zinc-900 overflow-y-auto"
        style={{ bottom: 'calc(var(--player-offset, 0px) + var(--mobile-nav-offset, 0px))' }}
      >
        <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-white/10 px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{jaAvaliado ? 'Editar avaliação' : 'Avaliar álbum'}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-w-lg mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">
          <div className="flex items-center gap-4">
            {album.capaUrl && (
              <img
                src={album.capaUrl}
                alt={album.albumName}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{album.albumName}</p>
              <p className="text-sm text-white/50 truncate">{album.artista}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 py-2">
            <StarRating value={nota} onChange={setNota} size={40} />
            <span className="text-sm text-white/50">{nota.toFixed(1).replace('.0', '')} / 5</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">Título</label>
              <span className="text-xs text-white/40">{titulo.length}/{TITULO_MAX}</span>
            </div>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.slice(0, TITULO_MAX))}
              placeholder="Resuma sua avaliação em uma frase"
              maxLength={TITULO_MAX}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs text-white/40">É isso que aparece na imagem de compartilhamento.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Texto (opcional)</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Escreva o quanto quiser sobre esse álbum..."
              maxLength={2000}
              rows={10}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || excluindo}
            className="w-full rounded-full bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-brand-contrast font-semibold py-3.5 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar avaliação'}
          </button>

          {jaAvaliado && (
            confirmandoExclusao ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExcluir}
                  disabled={excluindo}
                  className="flex-1 rounded-full bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 text-red-400 font-semibold py-2.5 transition-colors text-sm"
                >
                  {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                  className="flex-1 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/60 font-semibold py-2.5 transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(true)}
                className="flex items-center justify-center gap-2 w-full text-red-400/70 hover:text-red-400 text-sm font-medium py-1 transition-colors"
              >
                <Trash2 size={14} />
                Excluir avaliação
              </button>
            )
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RatingFormScreen;
