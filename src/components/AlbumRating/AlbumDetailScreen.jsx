import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, Shuffle, Star, Loader2, Pause, Plus, ListMusic } from 'lucide-react';
import { albumRatingService } from '../../services/albumRatingService';
import { useAudio } from '../../hooks/useAudio';
import { addRecentAlbum } from '../../utils/recentAlbums';
import StarRating from './StarRating';

const shuffleArray = (arr) => {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

const AlbumDetailScreen = ({ album, onClose, onRate }) => {
  const { playTrack, currentTrack, isPlaying, addToQueue, playNext } = useAudio();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState(null);

  useEffect(() => {
    if (!album) return;
    let cancelado = false;

    setLoading(true);
    albumRatingService.getTracks(album)
      .then((results) => {
        if (!cancelado) setTracks(results || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar faixas do álbum:', err);
        if (!cancelado) setTracks([]);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => { cancelado = true; };
  }, [album]);

  useEffect(() => {
    if (!album?.albumKey) return;
    let cancelado = false;

    setMinhaAvaliacao(null);
    albumRatingService.getRating(album.albumKey)
      .then((rating) => {
        if (!cancelado) setMinhaAvaliacao(rating);
      })
      .catch(() => {
        // 404 = ainda não avaliado, estado normal
      });

    return () => { cancelado = true; };
  }, [album?.albumKey]);

  if (!album) return null;

  const tocarFaixa = (track) => {
    addRecentAlbum(album);
    playTrack(track, tracks);
    onClose();
  };

  const tocarEmOrdem = () => {
    if (tracks.length === 0) return;
    addRecentAlbum(album);
    playTrack(tracks[0], tracks);
    onClose();
  };

  const tocarAleatorio = () => {
    if (tracks.length === 0) return;
    addRecentAlbum(album);
    const embaralhadas = shuffleArray(tracks);
    playTrack(embaralhadas[0], embaralhadas);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed left-0 right-0 top-0 z-50 bg-zinc-900 overflow-hidden flex flex-col"
        style={{ bottom: 'calc(var(--player-offset, 0px) + var(--mobile-nav-offset, 0px))' }}
      >
        {/* Fundo desfocado com a capa, mesmo tratamento do FullscreenPlayer */}
        <div className="absolute inset-0">
          <img
            src={album.capaUrl?.replace('100x100', '600x600')}
            className="w-full h-full object-cover blur-[80px] scale-110 grayscale-[0.2] opacity-40"
            alt=""
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/70" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 p-6 md:p-8 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-3 bg-brand rounded-full text-brand-contrast active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.5)] w-12 h-12 flex items-center justify-center transition-transform hover:scale-105"
            title="Fechar"
          >
            <ChevronDown size={26} strokeWidth={2.75} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Álbum</span>
          <div className="w-12" />
        </div>

        {/* Conteúdo principal */}
        <div className="relative z-10 flex-1 min-h-0 w-full max-w-6xl mx-auto px-6 md:px-10 pb-8 flex flex-col md:flex-row gap-8 md:gap-14 overflow-y-auto md:overflow-visible">
          {/* Capa + info + ações rápidas */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0 md:w-80">
            <div className="w-48 h-48 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 mb-6">
              <img
                src={album.capaUrl?.replace('100x100', '1000x1000')}
                className="w-full h-full object-cover"
                alt={album.albumName}
              />
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-1">{album.albumName}</h1>
            <p className="text-base text-brand font-medium mb-3">{album.artista}</p>

            {minhaAvaliacao && (
              <div className="flex items-center gap-2 mb-6">
                <StarRating value={minhaAvaliacao.nota} readOnly size={16} />
              </div>
            )}

            <div className={`flex flex-col w-full gap-3 ${minhaAvaliacao ? '' : 'mt-6'}`}>
              <button
                type="button"
                onClick={tocarEmOrdem}
                disabled={tracks.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-brand text-brand-contrast font-bold rounded-full px-5 py-3 hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={18} className="fill-current shrink-0" />
                Tocar álbum
              </button>
              <button
                type="button"
                onClick={tocarAleatorio}
                disabled={tracks.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-semibold rounded-full px-5 py-3 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shuffle size={18} className="shrink-0" />
                Aleatório
              </button>
              <button
                type="button"
                onClick={() => onRate(minhaAvaliacao || album)}
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-semibold rounded-full px-5 py-3 hover:bg-white/20 active:scale-95 transition-all"
              >
                <Star size={18} className="shrink-0" />
                {minhaAvaliacao ? 'Editar avaliação' : 'Avaliar'}
              </button>
            </div>
          </div>

          {/* Tracklist — mesmo padrão visual das listas de música do sistema */}
          <div className="flex-1 min-h-0 flex flex-col">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/60" />
              </div>
            )}

            {!loading && tracks.length === 0 && (
              <p className="text-white/50 text-center py-16">Não encontramos as faixas deste álbum.</p>
            )}

            {!loading && tracks.length > 0 && (
              <div className="max-h-[45vh] md:max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2">
                {tracks.map((track) => {
                  const tocandoAgora = currentTrack?.id === track.id && isPlaying;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => tocarFaixa(track)}
                      className="music-list-item group w-full text-left"
                    >
                      <div className="item-image relative">
                        <img
                          src={track.capaUrl || album.capaUrl}
                          alt={track.nome}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-brand/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-brand-contrast">
                          {tocandoAgora ? (
                            <Pause size={16} fill="currentColor" />
                          ) : (
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="item-info">
                        <h3 className="font-bold text-sm truncate text-song flex items-center gap-2" title={track.nome}>
                          <span className="truncate">{track.nome}</span>
                          {track.source === 'YOUTUBE_MUSIC' ? (
                            <span className="bg-red-500/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-red-500/20 uppercase tracking-tighter shrink-0">YouTube</span>
                          ) : (
                            <span className="bg-brand/10 text-brand text-[8px] font-black px-1.5 py-0.5 rounded-md border border-brand/20 uppercase tracking-tighter shrink-0">{track.source === 'ITUNES' ? 'Apple' : 'Synfonia'}</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs">
                          <span className="text-brand">{track.artista}</span>
                          <span className="text-dim/40">•</span>
                          <span className="text-dim truncate">{track.album}</span>
                        </div>
                      </div>

                      <div className="item-actions">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); playNext(track); }}
                          className="p-2 text-dim hover:text-brand transition-colors hidden md:block"
                          title="Tocar a seguir"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                          className="p-2 text-dim hover:text-brand transition-colors"
                          title="Adicionar à fila"
                        >
                          <ListMusic size={18} />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AlbumDetailScreen;
