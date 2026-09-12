import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Music, ListMusic, Lock } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';
import { useTheme } from '../../hooks/useTheme';

const QueueDrawer = ({ isOpen, onClose }) => {
  const { 
    queue, 
    queueIndex, 
    removeFromQueue, 
    clearQueue, 
    playFromQueue, 
    isSpotifyPlayback,
    spotifyToken
  } = useAudio();
  const { queuePosition } = useTheme();
  const [visibleLimit, setVisibleLimit] = React.useState(20);

  const nextSongs = queue.slice(queueIndex + 1);
  const visibleNextSongs = nextSongs.slice(0, visibleLimit);
  const hasMore = nextSongs.length > visibleLimit;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-60"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: queuePosition === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: queuePosition === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 ${queuePosition === 'right' ? 'right-0 border-l' : 'left-0 border-r'} h-full w-full md:w-[400px] z-70 border-white/5 shadow-2xl flex flex-col`}
            style={{ 
              backgroundColor: 'var(--bg-side)',
              color: 'var(--text-main)'
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <ListMusic className="text-brand" size={24} style={{ color: 'var(--color-brand)' }} />
                  <h2 className="text-xl font-bold tracking-tight">Fila de Reprodução</h2>
                  {isSpotifyPlayback && (
                    <span className="px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full border border-brand/20 uppercase tracking-wider" style={{ color: 'var(--color-brand)', borderColor: 'var(--color-brand)', backgroundColor: 'color-mix(in srgb, var(--color-brand) 10%, transparent)' }}>
                      Spotify Sync
                    </span>
                  )}
                </div>
                <p className="text-xs text-dim" style={{ color: 'var(--text-dim)' }}>
                  {isSpotifyPlayback ? "Sincronizado com Spotify na fila" : `${queue.length} músicas na fila`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {queue.length > 0 && !isSpotifyPlayback && (
                  <button
                    onClick={clearQueue}
                    className="p-2 text-dim hover:text-red-400 transition-colors hover:bg-white/5 rounded-full"
                    title="Limpar fila"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-dim space-y-4" style={{ color: 'var(--text-dim)' }}>
                  <Music size={48} className="opacity-20" />
                  <p>Sua fila está vazia</p>
                </div>
              ) : (
                <>
                  {/* Tocando Agora Section */}
                  {queueIndex !== -1 && queue[queueIndex] && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-dim px-2" style={{ color: 'var(--text-dim)' }}>
                        Tocando Agora
                      </h3>
                      <motion.div
                        layout
                        key={`playing-${queue[queueIndex].id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group flex items-center gap-4 p-4 rounded-2xl transition-all border-2 border-brand/40 bg-brand/5 shadow-lg shadow-brand/10"
                        style={{ 
                          backgroundColor: 'color-mix(in srgb, var(--color-brand) 10%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-brand) 40%, transparent)'
                        }}
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                          <img
                            src={queue[queueIndex].capaUrl || '/default-album.png'}
                            alt={queue[queueIndex].nome}
                            className={`w-full h-full object-cover ${(queue[queueIndex].isSpotify || queue[queueIndex].source === 'SPOTIFY' || (queue[queueIndex].uri && queue[queueIndex].uri.includes('spotify'))) && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand) 40%, transparent)' }}>
                            <div className="flex gap-1">
                              <span className="w-1.5 h-4 bg-white animate-pulse" />
                              <span className="w-1.5 h-6 bg-white animate-pulse [animation-delay:0.2s]" />
                              <span className="w-1.5 h-3 bg-white animate-pulse [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 
                            className="font-bold text-base truncate uppercase tracking-tight flex items-center gap-2"
                            style={{ color: 'var(--color-brand)' }}
                          >
                            {(queue[queueIndex].isSpotify || queue[queueIndex].source === 'SPOTIFY' || (queue[queueIndex].uri && queue[queueIndex].uri.includes('spotify'))) && !spotifyToken && <Lock size={14} className="text-brand shrink-0" />}
                            {queue[queueIndex].nome}
                          </h4>
                          <p className="text-xs font-medium opacity-80 truncate" style={{ color: 'var(--text-main)' }}>
                            {queue[queueIndex].artista}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {visibleNextSongs.length > 0 && (
                    <div className="space-y-3 pt-2">
                       <h3 className="text-[10px] font-bold uppercase tracking-widest text-dim px-2" style={{ color: 'var(--text-dim)' }}>
                        Próximas na Fila {nextSongs.length > visibleLimit && `(Mostrando 20 de ${nextSongs.length})`}
                      </h3>
                      <div className="space-y-2">
                        {visibleNextSongs.map((track, i) => {
                          const realIndex = queueIndex + 1 + i;
                          return (
                            <motion.div
                              key={`${track.id}-${realIndex}`}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group flex items-center gap-4 p-3 rounded-xl transition-all border border-transparent hover:bg-white/5 hover:border-white/5"
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                <img
                                  src={track.capaUrl || '/default-album.png'}
                                  alt={track.nome}
                                  className={`w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity ${(track.isSpotify || track.source === 'SPOTIFY' || (track.uri && track.uri.includes('spotify'))) && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                                />
                                {(track.isSpotify || track.source === 'SPOTIFY' || (track.uri && track.uri.includes('spotify'))) && !spotifyToken && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Lock size={14} className="text-brand" />
                                  </div>
                                )}
                              </div>

                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => playFromQueue(realIndex)}
                              >
                                <h4 className="font-bold text-sm truncate uppercase tracking-tight flex items-center gap-2" style={{ color: 'var(--user-song-color, var(--text-main))' }}>
                                  {(track.isSpotify || track.source === 'SPOTIFY' || (track.uri && track.uri.includes('spotify'))) && !spotifyToken && <Lock size={12} className="text-brand shrink-0" />}
                                  <span className="truncate">{track.nome}</span>
                                </h4>
                                <p className="text-xs text-dim truncate" style={{ color: 'var(--text-dim)' }}>{track.artista}</p>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isSpotifyPlayback && (
                                  <button
                                    onClick={() => removeFromQueue(realIndex)}
                                    className="p-2 text-dim hover:text-red-400 transition-colors"
                                    style={{ color: 'var(--text-dim)' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}

                        {hasMore && (
                          <button
                            onClick={() => setVisibleLimit(prev => prev + 20)}
                            className="w-full py-4 mt-2 text-xs font-bold uppercase tracking-widest text-brand hover:text-brand/80 transition-all border border-dashed border-brand/20 rounded-xl hover:bg-brand/5"
                          >
                            Mostrar mais 20 músicas
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QueueDrawer;
