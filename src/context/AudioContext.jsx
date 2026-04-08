import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { musicService } from '../services/musicService';
import { spotifyService } from '../services/spotifyService';
import { PlayerContext } from './PlayerContext';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { Music, AlertCircle } from 'lucide-react';
import GlobalSyncProgress from '../components/Spotify/GlobalSyncProgress';

export const AudioProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(() => {
    return localStorage.getItem('synfonia-autoplay') !== 'false';
  });

  // Atualizar offset do player para modais e outros elementos UI
  useEffect(() => {
    const updateOffset = () => {
      const isMobile = window.innerWidth < 768;
      if (currentTrack) {
        // Altura do player: Desktop ~96px (h-24), Mobile Mini ~80px
        document.documentElement.style.setProperty('--player-offset', isMobile ? '80px' : '96px');
      } else {
        document.documentElement.style.setProperty('--player-offset', '0px');
      }
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [currentTrack]);

  const [spotifyToken, setSpotifyToken] = useState(spotifyService.getAccessToken());
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState(null);
  const [isSpotifyPlayback, setIsSpotifyPlayback] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [spotifyNowPlaying, setSpotifyNowPlaying] = useState(null);

  const [isFavoriteAutoplayEnabled, setIsFavoriteAutoplayEnabled] = useState(() => {
    return localStorage.getItem('synfonia-favorite-autoplay') === 'true';
  });
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(() => {
    return localStorage.getItem('synfonia-shuffle') === 'true';
  });
  const [favoriteTrackVolume, setFavoriteTrackVolume] = useState(() => {
    return parseFloat(localStorage.getItem('synfonia-favorite-volume')) || 0.5;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    return parseFloat(localStorage.getItem('synfonia-volume')) || 0.7;
  });
  const audioRef = useRef(null);
  const playlistRef = useRef([]);
  const currentTrackRef = useRef(null);
  const isAutoplayRef = useRef(false);
  const profileAudioRef = useRef(null);
  const wasPlayingMainRef = useRef(false);
  const [isPlayingProfile, setIsPlayingProfile] = useState(false);

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('NATURAL');
  const [isSpotifySyncEnabled, setIsSpotifySyncEnabled] = useState(() => {
    return localStorage.getItem('synfonia-spotify-sync') !== 'false';
  });
  const volumeRef = useRef(0.7);

  // Estados de Favoritos Centralizados
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isFavoritesLoaded, setIsFavoritesLoaded] = useState(false);
  const [isRefreshingFavorites, setIsRefreshingFavorites] = useState(false);


  // Sync internal refs for use in event listeners
  const queueRef = useRef([]);
  const queueIndexRef = useRef(-1);
  const spotifyPlayerRef = useRef(null);
  const isSpotifyReadyRef = useRef(false);
  const spotifyDeviceIdRef = useRef(null);
  const playTrackInternalRef = useRef(null);
  const playFromQueueRef = useRef(null);
  const lastHistoryTrackIdRef = useRef(null);
  const isShuffleRef = useRef(false);
  const isFetchingRecommendationsRef = useRef(false);
  const lastTrackEndedIdRef = useRef(null);
  const playbackModeRef = useRef('NATURAL');
  const isSpotifySyncEnabledRef = useRef(true);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.volume = volumeRef.current;
  }

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isAutoplayRef.current = isAutoplayEnabled; }, [isAutoplayEnabled]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isShuffleRef.current = isShuffleEnabled; }, [isShuffleEnabled]);
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
  useEffect(() => { 
    isSpotifySyncEnabledRef.current = isSpotifySyncEnabled; 
    localStorage.setItem('synfonia-spotify-sync', isSpotifySyncEnabled);
  }, [isSpotifySyncEnabled]);

  const refreshSpotifyToken = () => {
    setSpotifyToken(spotifyService.getAccessToken());
  };

  useEffect(() => {
    if (!spotifyToken) {
      // Remover músicas do Spotify da fila ao deslogar
      setQueue(prev => {
        const filtered = prev.filter(t => t && t.source !== 'SPOTIFY' && !(t.uri && t.uri.includes('spotify')));
        if (filtered.length !== prev.length) {
          console.log("AudioContext: Limpando faixas do Spotify da fila (Logout)");
        }
        return filtered;
      });

      // Se a música atual or do Spotify, parar imediatamente
      const curr = currentTrackRef.current;
      if (curr && (curr.source === 'SPOTIFY' || (curr.uri && curr.uri.includes('spotify')))) {
        setCurrentTrack(null);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        console.log("AudioContext: Parando reprodução do Spotify (Logout)");
      }
    }
  }, [spotifyToken]);

  const fadeOutCurrentAudio = useCallback(() => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio || audio.paused || audio.volume === 0) {
        resolve();
        return;
      }

      const originalVolume = audio.volume;
      const steps = 10;
      const stepDuration = 40;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, originalVolume * (1 - currentStep / steps));

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.pause();
          audio.volume = originalVolume;
          resolve();
        }
      }, stepDuration);
    });
  }, []);

  // Lógica de Favoritos Global (Agora Otimizada: busca apenas IDs)
  const refreshFavorites = useCallback(async (force = false) => {
    const user = authService.getCurrentUser();
    if (!user || user.guest || (isFavoritesLoaded && !force) || isRefreshingFavorites) return;

    setIsRefreshingFavorites(true);
    try {
      // Pequeno fôlego para o navegador
      await new Promise(r => setTimeout(r, 100));
      
      const ids = await musicService.getFavoriteIds();
      setFavoriteIds(new Set(ids || []));
      
      // Carregamos apenas um pequeno lote inicial para contextos que precisam de dados básicos
      const firstPage = await musicService.getCollection(0, 50);
      setFavorites(firstPage.content || []);
      
      setIsFavoritesLoaded(true);
    } catch (err) {
      console.error("AudioContext: Erro ao carregar IDs de favoritos:", err);
    } finally {
      setIsRefreshingFavorites(false);
    }
  }, [isFavoritesLoaded, isRefreshingFavorites]);

  // Carregar favoritos ao logar
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && !user.guest && !isFavoritesLoaded) {
      refreshFavorites();
    } else if (!user || user.guest) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setIsFavoritesLoaded(false);
    }
  }, [spotifyToken, isFavoritesLoaded, refreshFavorites]);

  const toggleFavorite = useCallback(async (track) => {
    const user = authService.getCurrentUser();
    if (!user || user.guest || !track) return;

    const trackId = String(track.trackId || track.id);
    const isFavorite = favoriteIds.has(trackId);

    try {
      if (isFavorite) {
        // Encontrar o recordId (ID da relação na coleção) para deletar
        const record = favorites.find(f => 
          f.music && (String(f.music.trackId) === trackId || String(f.music.id) === trackId)
        );
        const idToDelete = record ? record.id : trackId;
        
        await musicService.removeFromCollection(idToDelete);
        
        // Update Local State
        setFavorites(prev => prev.filter(f => f.id !== idToDelete && 
          !(f.music && (String(f.music.trackId) === trackId || String(f.music.id) === trackId))
        ));
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(trackId);
          return next;
        });
      } else {
        const musicData = {
          trackId: track.trackId || String(track.id),
          nome: track.nome,
          artista: track.artista,
          album: track.album || "",
          capaUrl: track.capaUrl || "",
          previewUrl: track.previewUrl || track.preview_url || "",
          source: (track.isSpotify || track.source === "SPOTIFY" || (track.uri && track.uri.includes('spotify'))) ? "SPOTIFY" : "ITUNES"
        };
        
        const responseRecord = await musicService.saveToCollection(musicData);
        
        // Ensure newRecord has the structure { id, dataAdicao, music: { ... } }
        // If responseRecord.music is missing, we use the original track data
        const newRecord = {
          ...responseRecord,
          dataAdicao: responseRecord.dataAdicao || new Date().toISOString(),
          music: responseRecord.music || {
            ...musicData,
            id: responseRecord.trackId || musicData.trackId
          }
        };
        
        // Update Local State
        setFavorites(prev => [newRecord, ...prev]);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.add(trackId);
          return next;
        });
      }
    } catch (err) {
      console.error("AudioContext: Erro ao alternar favorito:", err);
    }
  }, [favoriteIds, favorites]);

  const stopProfileAudio = useCallback(() => {
    if (profileAudioRef.current) {
      profileAudioRef.current.pause();
      profileAudioRef.current.src = "";
      profileAudioRef.current = null;
    }
    setIsPlayingProfile(false);

    // Se tínhamos pausado a música principal, retomar agora
    if (wasPlayingMainRef.current) {
      wasPlayingMainRef.current = false;
      if (isSpotifyPlayback && spotifyPlayerRef.current) {
        spotifyPlayerRef.current.resume();
      } else if (audioRef.current && currentTrackRef.current) {
        audioRef.current.play();
      }
      setIsPlaying(true);
    }
  }, [isSpotifyPlayback]);

  const playOnSpotify = useCallback(async (track) => {
    if (!spotifyToken || !spotifyDeviceIdRef.current) return false;

    try {
      const spotifyId = track.trackId || track.id;
      const spotifyUri = track.uri || track.trackUri || 
        (track.source === 'SPOTIFY' || track.isSpotify ? `spotify:track:${spotifyId}` : null);
      
      if (!spotifyUri) {
        console.warn("Audio Context: Nenhuma URI do Spotify encontrada para a música:", track.nome);
        return false;
      }

      const isContextUri = spotifyUri.includes(':artist:') || spotifyUri.includes(':album:') || spotifyUri.includes(':playlist:');
      const body = isContextUri 
        ? { context_uri: spotifyUri } 
        : { uris: [spotifyUri] };

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceIdRef.current}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spotifyToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Spotify Playback API falhou:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          deviceId: spotifyDeviceIdRef.current,
          uri: spotifyUri
        });
        return false;
      }

      console.log("Spotify Playback: Successo!");
      setIsSpotifyPlayback(true);
      setIsPlaying(true);
      setIsBuffering(false);
      if (audioRef.current) audioRef.current.pause();
      return true;
    } catch (err) {
      console.error("Spotify Playback Error:", err);
      setIsBuffering(false);
      return false;
    }
  }, [spotifyToken]); 

  const playPreview = useCallback((track) => {
    const previewUrl = track.previewUrl || track.preview_url;
    
    if (!previewUrl) {
      console.warn("Audio Context: Música sem previewUrl disponível:", track.nome);
      setIsBuffering(false);
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      return false;
    }

    setIsSpotifyPlayback(false);

    if (audioRef.current) {
      audioRef.current.src = previewUrl;
      audioRef.current.load();
      return audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        return true;
      }).catch(err => {
        console.error("Audio Preview Error:", err);
        setIsPlaying(false);
        setIsBuffering(false);
        return false;
      });
    }
    return false;
  }, []);

  const playTrackInternal = useCallback(async (track) => {
    if (!track) return false;

    // Proteção: Se a música já é a atual e está tocando, ignorar.
    // Se estiver pausada, permitimos o play (para o botão de play/pause da UI)
    const trackId = track.id || track.trackId;
    const isSameTrack = currentTrackRef.current && (currentTrackRef.current.id === trackId || currentTrackRef.current.trackId === trackId);
    if (isSameTrack && isPlaying) {
        return true;
    }

    const isSpotifyTrack = track.isSpotify || track.source === "SPOTIFY" || (track.uri && track.uri.includes('spotify'));
    const isSpotifyReady = isSpotifyReadyRef.current && !!spotifyToken;

    // SÓ resetamos o estado global se for uma música REALMENTE diferente.
    // Se for a mesma (ex: tentativa de recuperação de autoplay), mantemos a UI estável.
    if (!isSameTrack) {
        setIsBuffering(true);
        setCurrentTrack(track);
        stopProfileAudio();

        // Pausar players ativos apenas se for mudar de música
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        if (spotifyPlayerRef.current) {
            spotifyPlayerRef.current.pause().catch(() => {});
        }
    }


    let success = false;
    if (isSpotifyTrack && isSpotifyReady) {
      success = await playOnSpotify(track);
    } else {
      success = await playPreview(track);
    }

    if (success && !authService.isGuest()) {
      const trackId = track.id || track.trackId;
      musicService.addToHistory(trackId, {
        trackId: String(trackId),
        nome: track.nome,
        artista: track.artista,
        album: track.album || "",
        capaUrl: track.capaUrl || "",
        source: isSpotifyTrack ? "SPOTIFY" : "ITUNES"
      }).catch(console.error);
    }

    if (!success) {
      setIsBuffering(false);
      setIsPlaying(false);
    }

    return success;
  }, [spotifyToken, stopProfileAudio, playPreview, playOnSpotify]); 

  const playFromQueue = useCallback((index) => {
    const currentQueue = queueRef.current;
    if (index >= 0 && index < currentQueue.length) {
      setQueueIndex(index);
      playTrackInternal(currentQueue[index]);
    }
  }, [playTrackInternal]);

  // Sincronizar Refs
  playTrackInternalRef.current = playTrackInternal;
  playFromQueueRef.current = playFromQueue;

  const syncSpotifyQueue = useCallback(async () => {
    if (!spotifyToken) return;
    try {
      if (playbackModeRef.current === 'NATURAL') {
        const data = await spotifyService.getQueue(spotifyToken);
        if (data && data.currently_playing) {
          const formatTrack = (t) => ({
            id: t.id,
            trackId: t.id,
            nome: t.name,
            artista: t.artists?.[0]?.name,
            capaUrl: t.album?.images?.[0]?.url || '/default-album.png',
            isSpotify: true,
            uri: t.uri
          });

          const current = formatTrack(data.currently_playing);
          const upcoming = (data.queue || []).map(formatTrack);
          
          setQueue([current, ...upcoming]);
          setQueueIndex(0);
          setCurrentTrack(current);
        }
      } else {
        const data = await spotifyService.getCurrentlyPlaying(spotifyToken);
        if (data && data.item) {
          const spotifyId = data.item.id;
          if (currentTrackRef.current?.trackId !== spotifyId) {
            const trackData = {
              id: spotifyId,
              trackId: spotifyId,
              nome: data.item.name,
              artista: data.item.artists[0]?.name,
              capaUrl: data.item.album.images[0]?.url,
              isSpotify: true
            };
            setCurrentTrack(trackData);
            
            // Localizar na fila manual
            const index = queueRef.current.findIndex(t => (t.trackId || t.id) === spotifyId);
            if (index !== -1) {
              setQueueIndex(index);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error syncing Spotify state:", err);
    }
  }, [spotifyToken]);

  const fetchRecommendations = useCallback(async (track, playImmediately = false) => {
    if (!isAutoplayRef.current || !spotifyToken || isFetchingRecommendationsRef.current) return;
    
    const trackId = track?.trackId || track?.id;
    if (!trackId || !track.isSpotify) return;

    if (playImmediately && lastTrackEndedIdRef.current === trackId) return;

    try {
      isFetchingRecommendationsRef.current = true;
      if (playImmediately) lastTrackEndedIdRef.current = trackId;

      console.log("Autoplay: Buscando recomendações para", track.nome);
      const recommendations = await spotifyService.getRecommendations(spotifyToken, trackId);
      
      if (recommendations && recommendations.length > 0) {
        const currentQueueIds = new Set(queueRef.current.map(t => t.trackId || t.id));
        const newTracks = recommendations.filter(t => !currentQueueIds.has(t.trackId || t.id));
        
        if (newTracks.length > 0) {
          const originalLength = queueRef.current.length;
          setQueue(prev => [...prev, ...newTracks]);
          
          for (const t of newTracks) {
            if (t.uri) {
              await spotifyService.addToQueue(spotifyToken, t.uri);
            }
          }

          if (playImmediately && originalLength > 0) {
            console.log("Autoplay: Iniciando primeira recomendação");
            setTimeout(() => {
              playFromQueue(originalLength);
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao buscar recomendações:", err);
    } finally {
      isFetchingRecommendationsRef.current = false;
    }
  }, [spotifyToken, playFromQueue]);
  
  // Resetar o ID de fim de track quando mudar de música manualmente
  useEffect(() => {
    if (currentTrack?.trackId) {
      if (lastTrackEndedIdRef.current !== currentTrack.trackId) {
        lastTrackEndedIdRef.current = null;
      }
    }
  }, [currentTrack]);

  const toggleShuffle = useCallback(() => {
    setIsShuffleEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('synfonia-shuffle', newValue);
      
      // Se ativou o aleatório agora, embaralhar o restante da fila
      if (newValue && queueRef.current.length > 0) {
        const q = [...queueRef.current];
        const currentIndex = queueIndexRef.current;
        
        if (currentIndex < q.length - 1) {
          const played = q.slice(0, currentIndex + 1);
          const remaining = q.slice(currentIndex + 1);
          
          // Fisher-Yates shuffle
          for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
          }
          
          setQueue([...played, ...remaining]);
        }
      }
      
      return newValue;
    });
  }, []);

  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
    if (isSpotifyPlayback && spotifyToken && track.uri) {
      spotifyService.addToQueue(spotifyToken, track.uri);
    }
  };

  const playNext = (track) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(queueIndex + 1, 0, track);
      return newQueue;
    });
    // Infelizmente o Spotify não tem "adicionar em seguida", apenas "adicionar à fila" (que é o fim da lista de espera)
    if (isSpotifyPlayback && spotifyToken && track.uri) {
      spotifyService.addToQueue(spotifyToken, track.uri);
    }
  };

  const removeFromQueue = (index) => {
    setQueue(prev => {
      const newQueue = prev.filter((_, i) => i !== index);
      if (newQueue.length === 0) {
        setQueueIndex(-1);
      } else if (index < queueIndex) {
        setQueueIndex(prevIdx => prevIdx - 1);
      } else if (index === queueIndex) {
        if (index >= newQueue.length) {
          setQueueIndex(newQueue.length - 1);
        }
      }
      return newQueue;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(-1);
  };

  const moveInQueue = (from, to) => {
    setQueue(prev => {
      const newQueue = [...prev];
      const [item] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, item);
      
      if (from === queueIndex) {
        setQueueIndex(to);
      } else if (from < queueIndex && to >= queueIndex) {
        setQueueIndex(prev => prev - 1);
      } else if (from > queueIndex && to <= queueIndex) {
        setQueueIndex(prev => prev + 1);
      }
      
      return newQueue;
    });
  };

  const initSpotifyPlayer = useCallback((token) => {
    const player = new window.Spotify.Player({
      name: 'Synfonia Web Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player: Pronto com ID', device_id);
      spotifyDeviceIdRef.current = device_id;
      setSpotifyDeviceId(device_id);
      isSpotifyReadyRef.current = true;
      setIsSpotifyReady(true);
      player.setVolume(volumeRef.current).catch(console.error);
    });

    player.addListener('not_ready', () => {
      isSpotifyReadyRef.current = false;
      setIsSpotifyReady(false);
    });

    player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player: Erro de inicialização. Se estiver usando Brave, desative os Shields.', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player: Erro de autenticação', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Spotify Player: Erro de conta (Certifique-se de ter Spotify Premium)', message);
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Spotify Player: Erro de reprodução', message);
    });

    player.addListener('player_state_changed', state => {
      if (!state) return;
      
      const track = state.track_window?.current_track;
      if (track) {
        // Sincronizar histórico se for uma nova música
        if (lastHistoryTrackIdRef.current !== track.id) {
          const spotifyId = track.id;
          const trackName = track.name;
          const artistName = track.artists?.[0]?.name;

          console.log(`Spotify Web Player: Nova música detectada: "${trackName}" por "${artistName}"`);
          lastHistoryTrackIdRef.current = spotifyId;

          // Sincronizar a fila do Spotify imediatamente ao mudar de música
          syncSpotifyQueue();
          
          if (!authService.isGuest()) {
            const syncHistory = async () => {
              try {
                const searchResults = await musicService.search(`${trackName} ${artistName}`, 'all');
                console.log(`Spotify Web Player: ${searchResults.length} resultados encontrados no banco.`);

                if (searchResults.length > 0) {
                  console.log("Spotify Web Player: Exemplo do 1º resultado:", {
                    id: searchResults[0].id,
                    trackId: searchResults[0].trackId || searchResults[0].music?.trackId,
                    nome: searchResults[0].nome || searchResults[0].music?.nome,
                    artista: searchResults[0].artista || searchResults[0].music?.artista
                  });
                }

                // Tenta encontrar a música que combine com o ID do Spotify ou o Nome/Artista (STRICT MATCH)
                const internalTrack = searchResults.map(item => item.music || item).find(music => {
                  const idMatch = music.trackId === spotifyId || String(music.id) === String(spotifyId);
                  const nameMatch = music.nome?.toLowerCase() === trackName.toLowerCase() && 
                                  (music.artista?.toLowerCase().includes(artistName.toLowerCase()) || 
                                   artistName.toLowerCase().includes(music.artista?.toLowerCase()));
                  return idMatch || nameMatch;
                });
                
                if (internalTrack) {
                  const trackIdToSave = internalTrack.id || internalTrack.trackId;
                  console.log("Spotify Web Player: Faixa mapeada encontrada:", trackIdToSave);
                  await musicService.addToHistory(trackIdToSave);
                  console.log("Spotify Web Player: Sucesso ao adicionar ao histórico!");
                } else {
                  console.warn("Spotify Web Player: Sem correspondência exata. Salvando nova no histórico online...");
                  const musicData = {
                    trackId: String(spotifyId),
                    nome: trackName,
                    artista: artistName,
                    album: track.album?.name || "",
                    capaUrl: track.album?.images?.[0]?.url || "/default-album.png",
                    previewUrl: track.preview_url || "",
                    source: "SPOTIFY"
                  };
                  await musicService.addToHistory(spotifyId, musicData);
                }
                
                // Fallback: Histórico Local (LocalStorage)
                  const localHistory = JSON.parse(localStorage.getItem('synfonia_local_history') || '[]');
                  const newEntry = {
                    id: `local-${spotifyId}`,
                    music: {
                      id: spotifyId,
                      trackId: spotifyId,
                      nome: trackName,
                      artista: artistName,
                      capaUrl: track.album.images[0]?.url,
                      isReady: true,
                      isSpotify: true
                    },
                    data: new Date().toISOString()
                  };
                  
                  const filtered = localHistory.filter(item => item.music.trackId !== spotifyId);
                  const updated = [newEntry, ...filtered].slice(0, 20);
                  localStorage.setItem('synfonia_local_history', JSON.stringify(updated));
                  console.log("Spotify Web Player: Adicionado ao histórico local!");
              } catch (err) {
                if (err.response?.status !== 500) {
                  console.error("Spotify Web Player: Erro ao sincronizar histórico:", err);
                }
              }
            };
            syncHistory();
          }
        }

        if (!currentTrackRef.current || (currentTrackRef.current.id !== track.id && currentTrackRef.current.trackId !== track.id)) {
          const newTrack = {
            id: track.id,
            trackId: track.id,
            nome: track.name,
            artista: track.artists[0]?.name,
            capaUrl: track.album.images[0]?.url,
            previewUrl: track.preview_url, 
            isSpotify: true
          };
          setCurrentTrack(newTrack);
          currentTrackRef.current = newTrack;

          // Sincronizar o queueIndex reativamente (sem disparar play)
          const index = queueRef.current.findIndex(t => (t.trackId || t.id) === track.id);
          if (index !== -1) {
            setQueueIndex(index);
            queueIndexRef.current = index;
          }
        }
      }

      setIsPlaying(!state.paused);
      if (!state.paused) setIsBuffering(false);
      setDuration(state.duration / 1000);
      setCurrentTime(state.position / 1000);

      // Autoplay Bridge Inteligente (SITE + SPOTIFY NATIVE)
      const isActuallyEnded = state.paused && state.position === 0 && state.duration > 0;
      
      if (isActuallyEnded && isAutoplayRef.current) {
        // SEGURANÇA: Só acionamos a ponte manual se o player estiver "preso" na música que ACABOU de tocar.
        // Se o player já mudou de ID nativamente para a próxima faixa (mesmo estando no pos:0 e paused enquanto buffera), 
        // o isSameAsPrevious será FALSE e nós NÃO acionamos a ponte redundante (evita o refresh).
        const qi = queueIndexRef.current;
        const q = queueRef.current;
        const trackInSite = q[qi];
        const isSameAsSynfoniaCurrent = trackInSite && (trackInSite.id === track.id || trackInSite.trackId === track.id);

          if (isActuallyEnded && isSameAsSynfoniaCurrent) {
            const nextInSynfonia = q[qi + 1];
            if (nextInSynfonia) {
               setTimeout(() => {
                  if (playFromQueueRef.current) playFromQueueRef.current(qi + 1);
               }, 600);
            }
          }
      } else if (isActuallyEnded && !isAutoplayRef.current) {
        player.pause().catch(() => {});
      }


    });

    player.connect();
    spotifyPlayerRef.current = player;
    setSpotifyPlayer(player);
  }, []); // Fixed: No longer depends on playFromQueue

  useEffect(() => {
    if (!spotifyToken) return;

    const updateNowPlaying = async () => {
      const data = await spotifyService.getCurrentlyPlaying(spotifyToken);
      if (data && data.item) {
        const trackData = {
          id: data.item.id,
          trackId: data.item.id,
          nome: data.item.name,
          artista: data.item.artists[0]?.name,
          capaUrl: data.item.album.images[0]?.url,
          previewUrl: data.item.preview_url, // Captura o preview para fallback
          isSpotify: true
        };

        setSpotifyNowPlaying({
          ...trackData,
          isPlaying: data.is_playing,
          progressMs: data.progress_ms,
          durationMs: data.item.duration_ms
        });

        if (data.is_playing) {
          setIsSpotifyPlayback(true);
          
          if (lastHistoryTrackIdRef.current !== data.item.id) {
            console.log("Spotify Sync: Nova música detectada no Spotify:", data.item.name);
            lastHistoryTrackIdRef.current = data.item.id;
            
            syncSpotifyQueue();

            if (!authService.isGuest()) {
              const syncHistory = async () => {
                try {
                  const trackName = data.item.name;
                  const artistName = data.item.artists[0]?.name;
                  const spotifyId = data.item.id;

                  console.log(`Spotify Sync: Resolvendo ID para "${trackName}" por "${artistName}"...`);
                  
                  const searchResults = await musicService.search(`${trackName} ${artistName}`, 'all');
                  
                  const internalTrack = searchResults.map(item => item.music || item).find(music => {
                    const idMatch = music.trackId === spotifyId || String(music.id) === String(spotifyId);
                    const nameMatch = music.nome?.toLowerCase() === trackName.toLowerCase() && 
                                    (music.artista?.toLowerCase().includes(artistName.toLowerCase()) || 
                                     artistName.toLowerCase().includes(music.artista?.toLowerCase()));
                    return idMatch || nameMatch;
                  });
                  
                  if (internalTrack && /^\d+$/.test(String(internalTrack.id))) {
                    await musicService.addToHistory(internalTrack.id);
                  } else {
                    const localHistory = JSON.parse(localStorage.getItem('synfonia_local_history') || '[]');
                    const newEntry = {
                      id: `local-${spotifyId}`,
                      music: {
                        id: spotifyId,
                        trackId: spotifyId,
                        nome: trackName,
                        artista: artistName,
                        capaUrl: data.item.album.images[0]?.url,
                        previewUrl: data.item.preview_url, // Importante para histórico local
                        isReady: true,
                        isSpotify: true
                      },
                      data: new Date().toISOString()
                    };
                    const filtered = localHistory.filter(item => item.music.trackId !== spotifyId);
                    localStorage.setItem('synfonia_local_history', JSON.stringify([newEntry, ...filtered].slice(0, 20)));
                  }
                } catch (err) {
                  if (err.response?.status !== 500) {
                    console.error("Spotify Sync: Erro ao sincronizar histórico:", err);
                  }
                }
              };
              syncHistory();
            }
          }

          if (!currentTrackRef.current || (currentTrackRef.current.id !== data.item.id && currentTrackRef.current.trackId !== data.item.id)) {
            setCurrentTrack(trackData);
          }
          setDuration(data.item.duration_ms / 1000);
          setCurrentTime(data.progress_ms / 1000);
          setIsPlaying(true);
        }
      } else {
        setSpotifyNowPlaying(null);
      }
    };

    const setupInterval = () => {
      const isVisible = document.visibilityState === 'visible';
      const delay = isVisible ? 5000 : 30000;
      return setInterval(updateNowPlaying, delay);
    };

    updateNowPlaying();
    let interval = setupInterval();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateNowPlaying();
      }
      clearInterval(interval);
      interval = setupInterval();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [spotifyToken, syncSpotifyQueue]);

  // Sincronização periódica da fila para capturar mudanças manuais no Spotify
  useEffect(() => {
    if (!isSpotifyPlayback || !spotifyToken) return;
    
    const interval = setInterval(() => {
      syncSpotifyQueue();
    }, 15000); // 15 segundos
    
    return () => clearInterval(interval);
  }, [isSpotifyPlayback, spotifyToken, syncSpotifyQueue]);

  useEffect(() => {
    if (!spotifyToken) return;

    const loadAndInit = () => {
      if (window.Spotify) {
        initSpotifyPlayer(spotifyToken);
        return;
      }

      const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
      if (existingScript) return;

      window.onSpotifyWebPlaybackSDKReady = () => {
        initSpotifyPlayer(spotifyToken);
      };

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    };

    loadAndInit();
  }, [spotifyToken, initSpotifyPlayer]);

  useEffect(() => {
    if (!audioRef.current || isSpotifyPlayback) return;

    const audio = audioRef.current;
    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [isSpotifyPlayback, currentTrack]);

  useEffect(() => {
    if (!spotifyPlayerRef.current || !isSpotifyPlayback || !isPlaying) return;

    const interval = setInterval(async () => {
      const state = await spotifyPlayerRef.current.getCurrentState();
      if (state) {
        setCurrentTime(state.position / 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSpotifyPlayback, isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const handleEnded = () => {
      if (isAutoplayRef.current) {
        const qi = queueIndexRef.current;
        setTimeout(() => playFromQueue(qi + 1), 300);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => console.error("Audio Context Error:", e);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [playFromQueue]);

  useEffect(() => {
    localStorage.setItem('synfonia-autoplay', isAutoplayEnabled);
  }, [isAutoplayEnabled]);

  useEffect(() => {
    localStorage.setItem('synfonia-favorite-autoplay', isFavoriteAutoplayEnabled);
  }, [isFavoriteAutoplayEnabled]);

  useEffect(() => {
    localStorage.setItem('synfonia-favorite-volume', favoriteTrackVolume);
  }, [favoriteTrackVolume]);

  useEffect(() => {
    localStorage.setItem('synfonia-shuffle', isShuffleEnabled);
  }, [isShuffleEnabled]);

  const resetPlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaylist([]);
    setQueue([]);
    setQueueIndex(-1);
  };

  const connectSpotify = () => {
    resetPlayer();
    window.location.href = spotifyService.getLoginUrl();
  };

  const disconnectSpotify = () => {
    spotifyService.logout();
    if (spotifyPlayerRef.current) {
      spotifyPlayerRef.current.disconnect();
    }
    resetPlayer();
    setSpotifyToken(null);
    isSpotifyReadyRef.current = false;
    setIsSpotifyReady(false);
    spotifyPlayerRef.current = null;
    setSpotifyPlayer(null);
    spotifyDeviceIdRef.current = null;
    setSpotifyDeviceId(null);
    setIsSpotifyPlayback(false);
  };

  const playProfileAudio = (url) => {
    if (!url) return;

    if (profileAudioRef.current) {
      profileAudioRef.current.pause();
      profileAudioRef.current.src = "";
    }

    if (isPlaying) {
      wasPlayingMainRef.current = true;
      if (isSpotifyPlayback && spotifyPlayerRef.current) {
        spotifyPlayerRef.current.pause();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = favoriteTrackVolume;
    profileAudioRef.current = audio;

    audio.addEventListener('play', () => setIsPlayingProfile(true));
    audio.addEventListener('pause', () => setIsPlayingProfile(false));

    audio.play().catch(err => {
      console.error("Erro ao tocar áudio do perfil:", err);
      setIsPlayingProfile(false);
    });
  };

  const playTrack = async (track, newPlaylist = []) => {
    if (!track) return;

    // Verificar autorização do Spotify (Exigência de Modal Premium)
    const isSpotifyTrack = track.isSpotify || (track.source === "SPOTIFY") || (track.uri && track.uri.includes('spotify'));
    if (isSpotifyTrack && !spotifyToken) {
      setShowPremiumModal(true);
      return;
    }

    // REMOVIDO: O check isSameById que causava o bug do "segundo clique"
    // Agora sempre iniciamos a reprodução ao clicar em uma música da lista

    let finalTracks = [track];

    if (newPlaylist && newPlaylist.length > 0) {
      finalTracks = [...newPlaylist];
      if (isShuffleRef.current) {
        const currentId = track.id || track.trackId;
        const otherTracks = finalTracks.filter(t => (t.id || t.trackId) !== currentId);
        // Shuffle other tracks
        for (let i = otherTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
        }
        finalTracks = [track, ...otherTracks];
      }

      setPlaylist(finalTracks);
      // Modo híbrido: NATURAL se for música única (busca), MANUAL se for lista
      setPlaybackMode(newPlaylist.length > 1 ? 'MANUAL' : 'NATURAL');
      setQueue(finalTracks);
      const idx = finalTracks.findIndex(t => t.id === track.id || (t.trackId && t.trackId === track.trackId));
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      // Quando tocado manualmente sem uma nova lista (ex: busca), resetar a fila
      setPlaybackMode('NATURAL'); // Uma única música é sempre NATURAL
      setQueue([track]);
      setQueueIndex(0);
    }

    // Carrega e inicia a música de forma direta e aguardada
    // 1. ATUALIZAÇÃO SÍNCRONA DA UI (Garante que a barra apareça no primeiro clique)
    
    // Forçar o estado de buffering e a música atual imediatamente
    setCurrentTrack({ ...track });
    setIsPlaying(false); // Será setado para true dentro do playTrackInternal
    setIsBuffering(true);

    // 2. Iniciar reprodução de fato
    // Não usamos 'await' aqui para o playTrackInternal se quisermos que a UI responda INSTANTANEAMENTE
    // Mas para o Spotify, precisamos saber se deu certo.
    playTrackInternal(track, finalTracks).then(success => {
      if (!success) {
        setIsBuffering(false);
        setIsPlaying(false);
      }
    }).catch(err => {
      console.error("Erro ao iniciar reprodução:", err);
      setIsBuffering(false);
      setIsPlaying(false);
    });
    
    // Ações de segundo plano (não bloqueiam o início da música)
    const runBackgroundTasks = async () => {
      const isSpotifyTrack = track.isSpotify || (track.source === "SPOTIFY") || (track.uri && track.uri.includes('spotify'));
      
      // 1. Sincronizar restante da playlist com Spotify (um por um) para evitar erros atômicos
      if (newPlaylist.length > 1 && isSpotifyTrack && spotifyToken) {
        const idx = newPlaylist.findIndex(t => (t.id || t.trackId) === (track.id || track.trackId));
        if (idx !== -1) {
          const remaining = newPlaylist.slice(idx + 1).slice(0, 10); // Limitar a 10 para evitar flood
          for (const t of remaining) {
            const uri = t.uri || (t.trackId ? `spotify:track:${t.trackId}` : null);
            if (uri) await spotifyService.addToQueue(spotifyToken, uri);
          }
        }
      }
      
      // 2. Sync rápido
      setTimeout(() => syncSpotifyQueue(), 2000);
      
      // 2. Buscar recomendações se for música única
      if ((!newPlaylist || newPlaylist.length <= 1) && isAutoplayRef.current && track.isSpotify) {
        fetchRecommendations(track);
      }
    };

    // Executa as tarefas de fundo sem 'await' para que o playTrack retorne imediatamente ao usuário
    runBackgroundTasks().catch(err => console.error("Erro nas tarefas de fundo de reprodução:", err));
  };

  const playPlaylist = async (trackData, options = {}) => {
    if (!trackData || trackData.length === 0) return;
    setPlaybackMode('MANUAL');
    
    setIsBuffering(true);
    try {
      let filteredTracks = [];
      
      // Se trackData já contém objetos de música (tem .nome ou .title)
      const isFullObjects = trackData[0] && (trackData[0].nome || trackData[0].name || trackData[0].trackId);
      
      if (isFullObjects) {
        filteredTracks = trackData.filter(Boolean);
      } else {
        // Se forem apenas IDs, buscar os objetos completos
        const trackPromises = trackData.map(id => musicService.getById(id));
        const tracks = await Promise.all(trackPromises);
        filteredTracks = tracks.filter(Boolean);
      }
      
      if (filteredTracks.length > 0) {
        let firstTrack = filteredTracks[0];
        
        if (options.shuffle || isShuffleRef.current) {
          // Escolher uma música aleatória para começar ou apenas embaralhar o resto
          const index = Math.floor(Math.random() * filteredTracks.length);
          firstTrack = filteredTracks[index];
          
          const others = filteredTracks.filter((_, i) => i !== index);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          filteredTracks = [firstTrack, ...others];
        }

        await playTrack(firstTrack, filteredTracks);
      }
    } catch (err) {
      console.error("Erro ao tocar playlist:", err);
    } finally {
      setIsBuffering(false);
    }
  };

  const togglePlay = () => {
    if (isSpotifyPlayback && spotifyPlayerRef.current) {
      setIsPlaying(prev => !prev);
      spotifyPlayerRef.current.togglePlay().catch(err => {
        console.error("Spotify Toggle Error:", err);
      });
      return;
    }

    if (!audioRef.current || !currentTrack) return;

    if (audioRef.current.paused) {
      setIsPlaying(true);
      audioRef.current.play().catch(err => {
        console.error("Audio Play Error:", err);
        setIsPlaying(false);
      });
    } else {
      setIsPlaying(false);
      audioRef.current.pause();
    }
  };

  const skipNext = async () => {
    if (isSpotifyPlayback && spotifyToken && playbackModeRef.current === 'NATURAL') {
      try {
        await fetch('https://api.spotify.com/v1/me/player/next', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        setTimeout(() => syncSpotifyQueue(), 1000);
      } catch (err) {
        console.error("Spotify Skip Next Error:", err);
      }
      return;
    }

    const q = queueRef.current;
    const qi = queueIndexRef.current;
    if (q.length === 0) return;
    
    if (qi < q.length - 1) {
      playFromQueue(qi + 1);
    } else {
      playFromQueue(0);
    }
  };

  const skipPrevious = async () => {
    if (isSpotifyPlayback && spotifyToken && playbackModeRef.current === 'NATURAL') {
      try {
        await fetch('https://api.spotify.com/v1/me/player/previous', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        setTimeout(() => syncSpotifyQueue(), 1000);
      } catch (err) {
        console.error("Spotify Skip Previous Error:", err);
      }
      return;
    }

    const q = queueRef.current;
    const qi = queueIndexRef.current;
    if (q.length === 0) return;

    if (qi > 0) {
      playFromQueue(qi - 1);
    } else {
      playFromQueue(q.length - 1);
    }
  };
  const setVolume = useCallback((val) => {
    setVolumeState(val);
    localStorage.setItem('synfonia-volume', val);
    
    if (isSpotifyPlayback && spotifyPlayerRef.current) {
      spotifyPlayerRef.current.setVolume(val).catch(console.error);
    } else if (audioRef.current) {
      audioRef.current.volume = val;
    }
  }, [isSpotifyPlayback]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      queueIndex,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
      moveInQueue,
      playFromQueue,
      playTrack,
      playPlaylist,
      togglePlay,
      skipNext,
      skipPrevious,
      isAutoplayEnabled,
      setIsAutoplayEnabled,
      isFavoriteAutoplayEnabled,
      setIsFavoriteAutoplayEnabled,
      isShuffleEnabled,
      toggleShuffle,
      favoriteTrackVolume,
      setFavoriteTrackVolume,
      volume,
      setVolume,
      connectSpotify,
      disconnectSpotify,
      refreshSpotifyToken,
      isSpotifyConnected: !!spotifyToken,
      isSpotifyReady,
      spotifyToken,
      currentTime,
      duration,
      isSpotifyPlayback,
      isBuffering,
      isPlayingProfile,
      spotifyNowPlaying,
      isSpotifySyncEnabled,
      setIsSpotifySyncEnabled,
      playbackMode,
      playProfileAudio,
      stopProfileAudio,
      seek: (time) => {
        if (isSpotifyPlayback && spotifyPlayerRef.current) {
          spotifyPlayerRef.current.seek(time * 1000);
          setCurrentTime(time);
        } else if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
      audioElement: audioRef.current,
      favorites,
      favoriteIds,
      isFavoritesLoaded,
      refreshFavorites,
      toggleFavorite
    }}>
      {children}

      <ConfirmationDialog
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onConfirm={() => {
          setShowPremiumModal(false);
          connectSpotify();
        }}
        title="Assine o Premium"
        message="Essa música completa está disponível apenas com uma conta do Spotify Premium. Conecte-se agora para ouvir sem limites."
        confirmText="Entrar com Spotify"
        cancelText="Cancelar"
        icon={Music}
        variant="primary"
      />

    </PlayerContext.Provider>
  );
};
