import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Repeat, Loader2, ListMusic, Heart, Shuffle, X, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../../hooks/useAudio';
import { authService } from '../../services/authService';
import QueueDrawer from './QueueDrawer';
import FullscreenPlayer from './FullscreenPlayer';
import MarqueeText from '../ui/MarqueeText';

const AudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    skipNext,
    skipPrevious,
    audioElement,
    isAutoplayEnabled,
    setIsAutoplayEnabled,
    favoriteTrackVolume,
    setFavoriteTrackVolume,
    currentTime,
    duration,
    seek,
    isBuffering,
    isSpotifyPlayback,
    volume,
    setVolume,
    favoriteIds,
    toggleFavorite,
    isShuffleEnabled,
    toggleShuffle
  } = useAudio();
  const [isMuted, setIsMuted] = useState(false);
  const [seekProgress, setSeekProgress] = useState(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hoverExpand, setHoverExpand] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const wasPlayingRef = useRef(false);
  const touchStartY = useRef(0);
  const startDragOffset = useRef(0);

  // Constants for mobile player
  const MINI_HEIGHT = 80; // h-20
  const EXPANDED_HEIGHT = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 480;
  const MAX_DRAG = EXPANDED_HEIGHT - MINI_HEIGHT;

  // Initialize currentHeight based on isExpanded
  useEffect(() => {
    if (!isDragging) {
      setCurrentHeight(isExpanded ? EXPANDED_HEIGHT : MINI_HEIGHT);
    }
  }, [isExpanded, isDragging, EXPANDED_HEIGHT, MINI_HEIGHT]);

  const user = authService.getCurrentUser();
  const isFavorite = currentTrack && (currentTrack.id === user?.favoriteTrackId || currentTrack.trackId === user?.favoriteTrackId);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = seekProgress !== null ? seekProgress : progress;

  const handleProgressChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setSeekProgress(newProgress);
    const newTime = (newProgress / 100) * duration;
    seek(newTime);
  };

  const handleProgressEnd = () => {
    setSeekProgress(null);
  };

  const prevVolumeRef = useRef(volume);

  useEffect(() => {
    if (isMuted) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else if (prevVolumeRef.current > 0) {
      setVolume(prevVolumeRef.current);
    } else {
      setVolume(0.7);
    }
  }, [isMuted]);

  useEffect(() => {
    setSeekProgress(null);
  }, [currentTrack?.id]);

  const togglePlayRef = useRef(togglePlay);
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  }, [togglePlay]);

  useEffect(() => {
    const handleGlobalRelease = () => {
      if (wasPlayingRef.current) {
        togglePlayRef.current();
        wasPlayingRef.current = false;
      }
      setSeekProgress(null);
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);

    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, []);

  const handleMouseDown = (e) => {
    const newProgress = parseFloat(e.target.value);
    setSeekProgress(newProgress);

    if (isPlaying) {
      wasPlayingRef.current = true;
      togglePlay();
    } else {
      wasPlayingRef.current = false;
    }
  };

  const handleInputClick = () => {
    if (seekProgress !== null) setSeekProgress(null);
  };

  if (!currentTrack) return null;

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (e) => {
    if (window.innerWidth >= 768) return;
    touchStartY.current = e.touches[0].clientY;
    startDragOffset.current = isExpanded ? EXPANDED_HEIGHT : MINI_HEIGHT;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || window.innerWidth >= 768) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Calculate new height (dragging DOWN increases Y, so we subtract deltaY to decrease height)
    let newHeight = startDragOffset.current - deltaY;
    
    // Constraints
    newHeight = Math.max(MINI_HEIGHT, Math.min(newHeight, EXPANDED_HEIGHT));
    
    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    if (!isDragging || window.innerWidth >= 768) return;
    setIsDragging(false);

    // Snap to closest state
    if (isExpanded) {
      // If was expanded and dragged down significantly, collapse
      if (currentHeight < EXPANDED_HEIGHT - 100) {
        setIsExpanded(false);
      } else {
        setCurrentHeight(EXPANDED_HEIGHT);
      }
    } else {
      // If was collapsed and dragged up significantly, expand
      if (currentHeight > MINI_HEIGHT + 100) {
        setIsExpanded(true);
      } else {
        setCurrentHeight(MINI_HEIGHT);
      }
    }
  };
  const expansionProgress = Math.max(0, Math.min(1, (EXPANDED_HEIGHT - MINI_HEIGHT) === 0 ? 0 : (currentHeight - MINI_HEIGHT) / (EXPANDED_HEIGHT - MINI_HEIGHT)));
  const safeFavoriteIds = favoriteIds || new Set();

  return (
    <>
      {/* Scrim/Overlay background when expanded */}
      {(isExpanded || currentHeight > MINI_HEIGHT + 20) && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: expansionProgress }}
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500 md:h-24 ${isDragging ? '' : 'transition-all duration-300'}`}
        style={{ 
          bottom: window.innerWidth < 768 ? `${80 * (1 - expansionProgress)}px` : '0px',
          height: window.innerWidth < 768 ? `${currentHeight}px` : undefined,
          visibility: !currentTrack ? 'hidden' : 'visible'
        }}
      >
        <motion.div 
          initial={false}
          animate={{ opacity: isFullScreen ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          className={`glass-panel border-t border-white/5 px-4 md:px-6 py-3 md:py-4 flex ${(isExpanded || expansionProgress > 0.05) ? 'flex-col items-center justify-center pt-16 pb-20' : 'items-center justify-between'} relative w-full h-full overflow-hidden ${expansionProgress > 0.3 ? 'bg-zinc-900 shadow-2xl' : ''}`}
        >
          
          {/* Drag Handle for Mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full md:hidden" />
          
          {/* Header for Expanded Mobile Player */}
          {(isExpanded || expansionProgress > 0.05) && (
            <div 
              className="relative flex items-center justify-center mb-2 md:hidden w-full h-10"
              style={{ opacity: expansionProgress }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">Tocando Agora</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="absolute right-0 p-2 text-dim hover:text-main"
              >
                <X size={24} />
              </button>
            </div>
          )}

          {/* Track Info Section (Toggle Expansion) */}
          <div 
            onClick={() => !isExpanded && window.innerWidth < 768 && setIsExpanded(true)}
            className={`flex ${(isExpanded || expansionProgress > 0.05) ? 'flex-col items-center' : 'items-center gap-3 md:gap-4 w-auto md:w-1/3 flex-1 md:flex-none'} min-w-0 md:min-w-[200px] cursor-pointer`}
          >
            <div 
            className="rounded-lg overflow-hidden shadow-2xl shrink-0 group transition-all duration-300 bg-zinc-800 md:w-16 md:h-16"
              style={{ 
                width: window.innerWidth < 768 ? `${48 + (132 * expansionProgress)}px` : undefined,
                height: window.innerWidth < 768 ? `${48 + (132 * expansionProgress)}px` : undefined,
                marginTop: window.innerWidth < 768 ? `${expansionProgress > 0.1 ? 12 * expansionProgress : 0}px` : undefined,
                marginBottom: window.innerWidth < 768 ? `${expansionProgress > 0.1 ? 8 * expansionProgress : 0}px` : undefined
              }}
            >
              <img
                src={currentTrack.capaUrl?.replace('100x100', '600x600') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'}
                alt={currentTrack.nome}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className={`overflow-hidden flex flex-col ${(isExpanded || expansionProgress > 0.05) ? 'items-center text-center mt-1 w-full px-6' : 'justify-center md:max-w-xs'}`}>
              <div className={`flex items-center ${(isExpanded || expansionProgress > 0.05) ? 'flex-col gap-0' : 'gap-3'} w-full`}>
                <MarqueeText 
                  text={currentTrack?.nome || 'Sem Reprodução'}
                  className={(isExpanded || expansionProgress > 0.05) ? 'text-lg font-black mb-0' : 'font-bold text-xs md:text-sm truncate uppercase tracking-tight'}
                  style={{ color: 'var(--user-song-color, var(--brand-color))' }}
                />
                
                {!(isExpanded || expansionProgress > 0.05) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQueueOpen(true);
                    }}
                    className="text-dim hover:text-brand transition-colors shrink-0 flex items-center justify-center p-1"
                    title="Ver fila"
                  >
                    <ListMusic size={20} />
                  </button>
                )}
              </div>
              <MarqueeText 
                text={currentTrack?.artista || 'Artista desconhecido'}
                className={(isExpanded || expansionProgress > 0.05) ? 'text-sm text-brand font-medium' : 'text-[10px] md:text-xs text-dim'}
              />
              
              {(isExpanded || expansionProgress > 0.05) && (
                <div 
                  className="flex items-center gap-6 mt-2"
                  style={{ opacity: expansionProgress }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(currentTrack);
                    }}
                    className={`p-2 transition-all active:scale-90 ${safeFavoriteIds.has(String(currentTrack.trackId || currentTrack.id)) ? 'text-brand' : 'text-dim'}`}
                  >
                    <Heart size={32} fill={safeFavoriteIds.has(String(currentTrack.trackId || currentTrack.id)) ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQueueOpen(true);
                    }}
                    className="p-2 text-zinc-500 hover:text-brand"
                  >
                    <ListMusic size={32} />
                  </button>
                </div>
              )}
            </div>

            {!(isExpanded || expansionProgress > 0.2) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentTrack);
                }}
                className={`p-2 transition-all active:scale-90 ${safeFavoriteIds.has(String(currentTrack.trackId || currentTrack.id)) ? 'text-brand' : 'text-dim hover:text-main'}`}
                title={safeFavoriteIds.has(String(currentTrack.trackId || currentTrack.id)) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart size={20} fill={safeFavoriteIds.has(String(currentTrack.trackId || currentTrack.id)) ? "currentColor" : "none"} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Controls & Progress - Perfectly Centered, shifted left to match Discord icon in taskbar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm lg:max-w-md px-4 hidden md:flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="flex items-center gap-6 pointer-events-auto">
              <button
                onClick={toggleShuffle}
                className={`transition-all hover:scale-110 active:scale-90 ${isShuffleEnabled ? 'text-brand' : 'text-dim hover:text-main'}`}
                title={isShuffleEnabled ? "Desativar Aleatório" : "Ativar Aleatório"}
              >
                <Shuffle size={18} />
              </button>
              <button
                onClick={skipPrevious}
                className="text-dim hover:text-main transition-colors p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
                title="Anterior"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-brand rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg"
                title={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isBuffering ? (
                  <Loader2 size={20} className="text-brand-contrast animate-spin" />
                ) : isPlaying ? (
                  <Pause size={20} className="text-brand-contrast fill-current" />
                ) : (
                  <Play size={20} className="text-brand-contrast fill-current ml-1" />
                )}
              </button>
              <button
                onClick={skipNext}
                className="text-dim hover:text-main transition-colors p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
                title="Próxima"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>

            <div className="w-full flex items-center gap-3 pointer-events-auto">
              <span className="text-[10px] text-dim font-mono w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-5 flex items-center relative group">
                <div className="absolute inset-x-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>

                <div
                  className="absolute w-3 h-3 rounded-full bg-brand shadow-[0_0_10px_rgba(var(--color-brand-rgb),0.4)] z-10 pointer-events-none"
                  style={{ left: `${displayProgress}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute inset-1 bg-white rounded-full opacity-80" />
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.01"
                  value={displayProgress}
                  onChange={handleProgressChange}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                  onClick={handleInputClick}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>
              <span className="text-[10px] text-dim font-mono w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Expanded Mobile Controls and Progress */}
          {(isExpanded || expansionProgress > 0.05) && (
            <div 
              className="flex flex-col gap-2 mt-2 md:hidden animate-in fade-in duration-500 w-full"
              style={{ opacity: expansionProgress }}
            >
              <div className="w-full flex flex-col gap-0">
                <div className="flex items-center gap-3 pointer-events-auto">
                  <div className="flex-1 h-5 flex items-center relative group">
                    <div className="absolute inset-x-0 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${displayProgress}%` }}
                      />
                    </div>

                    <div
                      className="absolute w-5 h-5 rounded-full bg-brand shadow-[0_0_15px_rgba(var(--color-brand-rgb),0.6)] z-10 pointer-events-none"
                      style={{ left: `${displayProgress}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute inset-1.5 bg-white rounded-full opacity-90" />
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.01"
                      value={displayProgress}
                      onChange={handleProgressChange}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleMouseDown}
                      onClick={handleInputClick}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                  </div>
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-xs text-dim font-mono">{formatTime(currentTime)}</span>
                  <span className="text-xs text-dim font-mono">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <button
                  onClick={toggleShuffle}
                  className={`p-2 transition-all ${isShuffleEnabled ? 'text-brand' : 'text-dim'}`}
                >
                  <Shuffle size={24} />
                </button>
                <button
                  onClick={skipPrevious}
                  className="p-2 text-dim hover:text-main transition-colors"
                >
                  <SkipBack size={32} fill="currentColor" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-brand rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                >
                  {isBuffering ? (
                    <Loader2 size={28} className="text-brand-contrast animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={28} className="text-brand-contrast fill-current" />
                  ) : (
                    <Play size={28} className="text-brand-contrast fill-current ml-1" />
                  )}
                </button>
                <button
                  onClick={skipNext}
                  className="p-2 text-dim hover:text-main transition-colors"
                >
                  <SkipForward size={32} fill="currentColor" />
                </button>
                <button
                  onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                  className={`p-2 transition-all ${isAutoplayEnabled ? 'text-brand' : 'text-dim hover:text-main'}`}
                >
                  <Repeat size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Normal Mobile Mini Controls (Hidden when Expanded) */}
          {!(isExpanded || expansionProgress > 0.2) && (
            <div className="flex md:hidden items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-all active:scale-90 ${isShuffleEnabled ? 'text-brand' : 'text-dim hover:text-main'}`}
                title={isShuffleEnabled ? "Desativar Aleatório" : "Ativar Aleatório"}
              >
                <Shuffle size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-brand rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              >
                {isBuffering ? (
                  <Loader2 size={18} className="text-brand-contrast animate-spin" />
                ) : isPlaying ? (
                  <Pause size={18} className="text-brand-contrast fill-current" />
                ) : (
                  <Play size={18} className="text-brand-contrast fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={skipNext}
                className="text-dim hover:text-main active:text-main transition-colors"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
          )}

          {/* Volume & Extras */}
          <div className="hidden md:flex items-center justify-end gap-4 w-1/3">
            <div className="flex items-center gap-2 group/volume relative h-5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-dim hover:text-main transition-colors"
                title={isFavorite ? "Volume da Música Favorita" : "Volume"}
              >
                {isMuted || (!isFavorite && volume === 0) || (isFavorite && favoriteTrackVolume === 0) ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <div className="relative w-24 h-1 bg-zinc-800 rounded-lg group-hover/volume:w-32 transition-all duration-300 hidden group-hover/volume:block">
                <div 
                  className="absolute left-0 top-0 h-full bg-brand rounded-full"
                  style={{ width: `${(isFavorite ? favoriteTrackVolume : volume) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/volume:opacity-100 transition-opacity translate-x-1/2" />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isFavorite ? favoriteTrackVolume : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isFavorite) {
                      setFavoriteTrackVolume(val);
                    } else {
                      setVolume(val);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsFullScreen(true)}
                onMouseEnter={() => setHoverExpand(true)}
                onMouseLeave={() => setHoverExpand(false)}
                className="text-dim hover:text-main transition-all p-2 flex items-center justify-center relative overflow-hidden"
                title="Tela Cheia"
              >
                <AnimatePresence mode="wait">
                  {hoverExpand ? (
                    <motion.div
                      key="up"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronUp size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="max"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Maximize2 size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <button
              onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
              className={`p-2 rounded-lg transition-all ${isAutoplayEnabled ? 'bg-brand/20 text-brand' : 'text-dim hover:text-main'}`}
              title={isAutoplayEnabled ? "Autoplay Ativado" : "Autoplay Desativado"}
            >
              <Repeat size={16} className={isAutoplayEnabled ? 'animate-pulse' : ''} />
            </button>
          </div>
        </motion.div>
      </div>
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      <AnimatePresence>
        {isFullScreen && (
          <FullscreenPlayer isOpen={isFullScreen} onClose={() => setIsFullScreen(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default AudioPlayer;
