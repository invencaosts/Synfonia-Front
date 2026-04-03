import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Minimize2, Shuffle, Repeat, Loader2, Heart, ChevronDown } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';
import MarqueeText from '../ui/MarqueeText';

const FullscreenPlayer = ({ onClose }) => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    skipNext,
    skipPrevious,
    currentTime,
    duration,
    seek,
    isBuffering,
    volume,
    setVolume,
    favoriteIds,
    toggleFavorite,
    isShuffleEnabled,
    toggleShuffle,
    isAutoplayEnabled,
    setIsAutoplayEnabled,
    queue,
    queueIndex
  } = useAudio();

  const [seekProgress, setSeekProgress] = useState(null);
  const [isChangingVolume, setIsChangingVolume] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [direction, setDirection] = useState(1);

  // Wrappers to track skip direction
  const handleSkipNext = () => {
    setDirection(1);
    skipNext();
  };

  const handleSkipPrevious = () => {
    setDirection(-1);
    skipPrevious();
  };

  const handleProgressChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setSeekProgress(newProgress);
    const newTime = (newProgress / 100) * duration;
    seek(newTime);
  };

  const handleProgressEnd = () => {
    setSeekProgress(null);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Calcula próxima e anterior para o preview
  const prevTrack = (queue && queue.length > 0 && queueIndex > 0) ? queue[queueIndex - 1] : null;
  const nextTrack = (queue && queue.length > 0 && queueIndex < queue.length - 1) ? queue[queueIndex + 1] : null;

  // Controle de visibilidade da UI (Inatividade do mouse)
  useEffect(() => {
    let timeout;

    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000); // 3 segundos de inatividade
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    // Inicia o timer
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = seekProgress !== null ? seekProgress : progress;

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isFavorite = favoriteIds instanceof Set
    ? favoriteIds.has(String(currentTrack.trackId || currentTrack.id))
    : Array.isArray(favoriteIds)
      ? favoriteIds.includes(String(currentTrack.trackId || currentTrack.id))
      : false;

  return (
    <motion.div
      initial={{ y: 'calc(100% - 96px)', borderRadius: '24px 24px 0 0', opacity: 1 }}
      animate={{ y: 0, borderRadius: 0, opacity: 1 }}
      exit={{ y: 'calc(100% - 96px)', borderRadius: '24px 24px 0 0', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      onMouseMove={() => setShowControls(true)}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.8 }}
      onDragEnd={(e, info) => {
        if (info.offset.y > 150 || info.velocity.y > 800) {
          onClose();
        }
      }}
      style={{ touchAction: 'none' }}
      className="fixed inset-0 z-100 bg-zinc-900 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0"
      >
        <img
          src={currentTrack.capaUrl?.replace('100x100', '600x600')}
          className="w-full h-full object-cover blur-[80px] scale-110 grayscale-[0.2]"
          alt=""
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/60" />
      </motion.div>

      {/* Track Previews (Corner) */}
      <AnimatePresence>
        {showControls && (
          <>            {/* Previous Track (Bottom Left) */}
            {prevTrack && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute bottom-10 left-10 z-50 flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 group cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all max-w-[300px] shadow-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipPrevious();
                }}
              >
                <div className="relative shrink-0 w-14 h-14">
                  <img src={prevTrack.capaUrl || prevTrack.artworkUrl} className="w-full h-full rounded-2xl object-cover shadow-2xl opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <SkipBack size={20} className="text-white fill-white" />
                  </div>
                </div>
                <div className="min-w-0 pr-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand mb-1">Anterior</p>
                  <p className="text-sm font-bold text-white/90 group-hover:text-white truncate transition-colors leading-tight">{prevTrack.nome || prevTrack.trackName}</p>
                  <p className="text-[10px] text-white/40 group-hover:text-white/60 truncate">{prevTrack.artista || prevTrack.artistName}</p>
                </div>
              </motion.div>
            )}

            {/* Next Track (Bottom Right) */}
            {nextTrack && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute bottom-10 right-10 z-50 flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 group cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all text-right max-w-[300px] shadow-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipNext();
                }}
              >
                <div className="min-w-0 pl-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand mb-1">Próxima</p>
                  <p className="text-sm font-bold text-white/90 group-hover:text-white truncate transition-colors leading-tight">{nextTrack.nome || nextTrack.trackName}</p>
                  <p className="text-[10px] text-white/40 group-hover:text-white/60 truncate">{nextTrack.artista || nextTrack.artistName}</p>
                </div>
                <div className="relative shrink-0 w-14 h-14">
                  <img src={nextTrack.capaUrl || nextTrack.artworkUrl} className="w-full h-full rounded-2xl object-cover shadow-2xl opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <SkipForward size={20} className="text-white fill-white" />
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
        <motion.button
          animate={{
            opacity: showControls ? 1 : 0,
            scale: showControls ? 1 : 0.8
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white cursor-pointer group active:scale-95 shadow-xl relative w-14 h-14 flex items-center justify-center overflow-hidden"
          style={{ pointerEvents: showControls ? 'auto' : 'none' }}
          title="Sair da Tela Cheia"
        >
          <AnimatePresence mode="wait">
            {isHovered ? (
              <motion.div
                key="down"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={32} />
              </motion.div>
            ) : (
              <motion.div
                key="min"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Minimize2 size={28} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Tocando Agora</span>
        </div>
        <div className="w-12" />
      </div>      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[1400px] px-8 flex-1 flex flex-col justify-center items-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentTrack.trackId || currentTrack.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 w-full"
          >
            {/* Artwork */}
            <div className="w-64 h-64 md:w-[480px] md:h-[480px] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 shrink-0">
              <img
                src={currentTrack.capaUrl?.replace('100x100', '1000x1000')}
                className="w-full h-full object-cover"
                alt={currentTrack.nome}
              />
            </div>

            {/* Info & Controls Group */}
            <div className="md:flex-1 flex flex-col items-center md:items-start text-center md:text-left w-full md:max-w-2xl min-w-0">
              <div className="mb-10 w-full overflow-hidden">
                <MarqueeText
                  text={currentTrack.nome}
                  className="text-4xl md:text-6xl font-black text-white mb-2 leading-tight"
                />
                <h2 className="text-xl md:text-2xl font-medium text-brand opacity-90">{currentTrack.artista}</h2>
              </div>

              {/* Progress Bar */}
              <div className="w-full mb-10 group">
                <div className="flex justify-between mb-3 px-1 text-xs font-mono text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="w-full h-1.5 bg-white/10 rounded-full relative group">
                  <div
                    className="absolute left-0 top-0 h-full bg-brand rounded-full transition-all group-hover:bg-brand"
                    style={{ width: `${displayProgress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.01"
                    value={displayProgress}
                    onChange={handleProgressChange}
                    onMouseUp={handleProgressEnd}
                    onTouchEnd={handleProgressEnd}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {seekProgress !== null && (
                    <div
                      className="absolute -top-8 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono rounded shadow-lg transition-opacity"
                      style={{ left: `${displayProgress}%`, transform: 'translateX(-50%)' }}
                    >
                      {formatTime((displayProgress / 100) * duration)}
                    </div>
                  )}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between w-full mb-12">
                <button
                  onClick={toggleShuffle}
                  className={`transition-colors p-2 ${isShuffleEnabled ? 'text-brand' : 'text-white/40 hover:text-white/80'}`}
                >
                  <Shuffle size={20} />
                </button>

                <button
                  onClick={handleSkipPrevious}
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <SkipBack size={36} fill="currentColor" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-2xl"
                >
                  {isBuffering ? (
                    <Loader2 size={32} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={36} className="fill-current" />
                  ) : (
                    <Play size={36} className="fill-current ml-2" />
                  )}
                </button>

                <button
                  onClick={handleSkipNext}
                  className="text-white/60 hover:text-white transition-colors p-2"
                >
                  <SkipForward size={36} fill="currentColor" />
                </button>

                <button
                  onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                  className={`transition-colors p-2 ${isAutoplayEnabled ? 'text-brand' : 'text-white/40 hover:text-white/80'}`}
                  title={isAutoplayEnabled ? "Autoplay Ativado" : "Autoplay Desativado"}
                >
                  <Repeat size={20} className={isAutoplayEnabled ? 'animate-pulse' : ''} />
                </button>
              </div>

              {/* Secondary Controls (Volume, Like) */}
              <div className="flex items-center justify-between w-full pt-8 border-t border-white/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(currentTrack);
                  }}
                  className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                >
                  <Heart
                    size={20}
                    className={isFavorite ? 'text-brand fill-brand' : 'text-white/60 group-hover:text-white'}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60 group-hover:text-white">Curtida</span>
                </button>

                <div className="flex items-center gap-3 group px-4">
                  {volume === 0 ? <VolumeX size={20} className="text-white/60 group-hover:text-brand transition-colors" /> : <Volume2 size={20} className="text-white/60 group-hover:text-brand transition-colors" />}
                  <div className="w-24 h-1.5 bg-white/10 rounded-full relative group/volume">
                    <div
                      className="absolute left-0 top-0 h-full bg-brand rounded-full"
                      style={{ width: `${volume * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/volume:opacity-100 transition-opacity translate-x-1/2" />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default FullscreenPlayer;
