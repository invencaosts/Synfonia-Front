import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  Share2, 
  Calendar, 
  ShieldCheck, 
  ExternalLink, 
  Instagram, 
  Music2, 
  Music, Camera, Play, Check, LogOut, Search as SearchIcon, 
  Loader2, Settings2, Globe, Youtube, AlertCircle, User as UserIcon, Type, Eye, EyeOff,
  Lock,
  Pause,
  Heart,
  Plus,
  ListMusic,
  Repeat,
  Smile,
  Frown,
  CloudRain,
  Moon,
  Sparkles,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../../hooks/useAudio';
import { useTheme } from '../../context/ThemeContext';
import { userService } from '../../services/userService';
import { playlistService } from '../../services/playlistService';
import { authService } from '../../services/authService';
import { musicService } from '../../services/musicService';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';

const containsEmoji = (str) => {
  if (!str) return false;
  return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(str);
};

const isValidPersonalName = (str) => {
  if (!str) return true;
  return /^[a-zA-ZÀ-ÖØ-öø-ÿ\s]*$/.test(str);
};

const VIBE_PRESETS = [
  { icon: Smile, label: 'Feliz', value: 'feliz' },
  { icon: Frown, label: 'Triste', value: 'triste' },
  { icon: CloudRain, label: 'Melancólica', value: 'melancolica' },
  { icon: Moon, label: 'Noite', value: 'noite' },
  { icon: Sparkles, label: 'Energia', value: 'energia' },
];

const AVATAR_PRESETS = [
  { name: 'Pop Star', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop' },
  { name: 'DJ Vibes', url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop' },
  { name: 'Rock Icon', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop' },
  { name: 'Jazz Soul', url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop' },
  { name: 'Producer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop' },
  { name: 'Composer', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop' },
];

const NAME_REGEX = /^[a-zA-Z0-9_ ]{3,20}$/;

const ProfilePage = () => {
  const [user, setUser] = React.useState(authService.getCurrentUser());
  const [showAvatars, setShowAvatars] = React.useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [isUpdatingIdentity, setIsUpdatingIdentity] = useState(false);
  const [identityData, setIdentityData] = useState({
    username: '',
    displayName: '',
    personalName: '',
    showPersonalName: true,
    showSpotifyActivity: true
  });
  const [copied, setCopied] = React.useState(false);
  const [songCount, setSongCount] = React.useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [socialLinks, setSocialLinks] = React.useState(user?.socialLinks || {
    instagram: '',
    spotify: '',
    youtube: ''
  });
  const [playlists, setPlaylists] = React.useState([]);
  const [showMusicSearch, setShowMusicSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [librarySongs, setLibrarySongs] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = React.useState(false);
  const [profileAudio, setProfileAudio] = React.useState(null);
  const audioRef = React.useRef(null);

  const { 
    pauseTrack, 
    playTrack, 
    isFavoriteAutoplayEnabled, 
    favoriteTrackVolume,
    isPlayingProfile,
    playProfileAudio,
    stopProfileAudio,
    playPlaylist,
    spotifyNowPlaying,
    isSpotifyConnected,
    favorites,
    isFavoritesLoaded,
    refreshFavorites
  } = useAudio();
  const { 
    resetToDefaults, 
    queuePosition, 
    setQueuePosition 
  } = useTheme();
  const isGuest = authService.isGuest();

  React.useEffect(() => {
    const handleUserUpdate = () => {
      const updatedUser = authService.getCurrentUser();
      setUser(updatedUser);
      if (updatedUser?.socialLinks) {
        setSocialLinks(updatedUser.socialLinks);
      }
    };

    window.addEventListener('userUpdate', handleUserUpdate);
    
    const fetchStats = async () => {
      if (!isGuest && user?.id) {
        try {
          // Usamos o cache global se disponível, senão forçamos o carregamento
          if (!isFavoritesLoaded) {
            await refreshFavorites();
          }

          // Buscar playlists públicas (essa chamada é leve)
          const userPlaylists = await playlistService.getPublicByUserId(user.id);
          setPlaylists(userPlaylists || []);
        } catch (error) {
          console.error("Erro ao carregar estatísticas:", error);
        }
      }
    };
    fetchStats();

    return () => {
      window.removeEventListener('userUpdate', handleUserUpdate);
    };
  }, [user?.id, isGuest, isFavoritesLoaded]);

  // Sincroniza o contador de músicas reativamente com o contexto global
  React.useEffect(() => {
    setSongCount(favorites?.length || 0);
  }, [favorites]);

  // Autoplay da música favorita no perfil usando o contexto global
  React.useEffect(() => {
    if (user?.favoriteTrackPreviewUrl && !isGuest && isFavoriteAutoplayEnabled) {
      playProfileAudio(user.favoriteTrackPreviewUrl);
    }

    return () => {
      stopProfileAudio();
    };
  }, [user?.favoriteTrackPreviewUrl, isGuest, isFavoriteAutoplayEnabled]);

  const toggleProfileAudio = () => {
    if (isPlayingProfile) {
      stopProfileAudio();
    } else if (user?.favoriteTrackPreviewUrl) {
      playProfileAudio(user.favoriteTrackPreviewUrl);
    }
  };

  const fetchLibrarySongs = async () => {
    if (isGuest || !user?.id) return;
    setSearching(true);
    try {
      // Usar os favoritos globais já carregados
      const songs = Array.isArray(favorites) ? favorites.map(item => item?.music).filter(Boolean) : [];
      setSongCount(favorites?.length || 0);
      
      const filtered = !isSpotifyConnected 
        ? songs.filter(s => s && s.source !== 'SPOTIFY' && !(s.uri && s.uri.includes('spotify')))
        : songs;

      setLibrarySongs(filtered);
      setSearchResults(filtered);

    } catch (error) {
      console.error("Erro ao carregar biblioteca:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleLocalSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(librarySongs);
      return;
    }
    const filtered = librarySongs.filter(song => {
      const matchQuery = song.nome?.toLowerCase().includes(query.toLowerCase()) || 
                         song.artista?.toLowerCase().includes(query.toLowerCase());
      
      // Se não está no Spotify, OCULTA músicas do Spotify (independente de ter preview ou não)
      if (!isSpotifyConnected) {
        return matchQuery && song && song.source !== 'SPOTIFY' && !(song.uri && song.uri.includes('spotify'));
      }


      
      return matchQuery;
    });
    setSearchResults(filtered);

  };

  const selectFavoriteMusic = async (track) => {
    let previewUrl = track.previewUrl || track.preview_url;

    // Fallback: Se não tem preview (comum no Spotify), tenta buscar no iTunes
    if (!previewUrl) {
      console.log("Favorite Selection: Sem preview direto. Iniciando busca de fallback no iTunes...");
      const nome = track.nome || track.trackName;
      const artista = track.artista || track.artistName;
      const searchTerm = encodeURIComponent(`${nome} ${artista}`);
      
      try {
        // TENTA PRIMEIRO VIA FRONTEND (Bypass backend 403)
        console.log("Favorite Selection: Tentando busca direta via iTunes API no frontend...");
        const response = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=5`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const match = data.results.find(r => r.previewUrl);
            if (match) {
              previewUrl = match.previewUrl;
              console.log("Favorite Selection: Sucesso! Preview encontrado via frontend:", previewUrl);
            }
          }
        }
      } catch (frontErr) {
        console.warn("Favorite Selection: Busca direta falhou (CORS?), tentando via backend...", frontErr);
      }

      // Se ainda não tem (ou falhou o frontend), tenta via backend (que pode estar bloqueado)
      if (!previewUrl) {
        try {
          const results = await musicService.search(`${nome} ${artista}`, 'all');
          if (results && results.length > 0) {
            const fallbackTrack = results.find(r => r.previewUrl);
            if (fallbackTrack) {
              previewUrl = fallbackTrack.previewUrl;
              console.log("Favorite Selection: Preview encontrado via backend:", previewUrl);
            }
          }
        } catch (backErr) {
          console.error("Favorite Selection: Busca via backend também falhou.", backErr);
        }
      }
    }


    const musicData = {
      favoriteTrackId: track.id || track.trackId,
      favoriteTrackPreviewUrl: previewUrl,
      favoriteTrackName: track.nome || track.trackName,
      favoriteTrackArtist: track.artista || track.artistName,
      favoriteTrackCapaUrl: track.capaUrl || track.artworkUrl
    };

    // Tocar imediatamente ao selecionar (User Gesture bypass)
    if (previewUrl) {
      playProfileAudio(previewUrl);
    }

    // Atualiza localmente IMEDIATAMENTE para UX instantânea

    const updatedUser = { ...user, ...musicData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new Event('userUpdate'));
    setShowMusicSearch(false);
    setSearchQuery('');
    setSearchResults([]);


    try {
      await userService.updateFavoriteMusic(musicData);
    } catch (error) {
      console.error("Erro ao sincronizar música favorita com o servidor:", error);
    }
  };

  const removeFavoriteMusic = async () => {
    // Parar o áudio IMEDIATAMENTE
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlayingPreview(false);

    // Atualiza localmente IMEDIATAMENTE
    const newUserData = { ...user };
    delete newUserData.favoriteTrackId;
    delete newUserData.favoriteTrackPreviewUrl;
    delete newUserData.favoriteTrackName;
    delete newUserData.favoriteTrackArtist;
    delete newUserData.favoriteTrackCapaUrl;
    
    localStorage.setItem('user', JSON.stringify(newUserData));
    setUser(newUserData);
    window.dispatchEvent(new Event('userUpdate'));

    try {
      await userService.removeFavoriteMusic();
    } catch (error) {
      console.error("Erro ao sincronizar remoção com o servidor:", error);
    }
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id || 'me'}`;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarSelect = async (url) => {
    try {
      await userService.updateProfilePicture(url);
      const updatedUser = { ...user, fotoPerfil: url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('userUpdate'));
      setShowAvatars(false);
    } catch (error) {
      console.error("Erro ao atualizar foto de perfil:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        await userService.updateProfilePicture(base64String);
        const updatedUser = { ...user, fotoPerfil: base64String };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('userUpdate'));
        setShowAvatars(false);
      } catch (error) {
        console.error("Erro ao fazer upload da foto:", error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSocialSave = (e) => {
    e.preventDefault();
    const updatedUser = { ...user, socialLinks };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new Event('userUpdate'));
    setShowSocialModal(false);
  };

  const formattedJoinDate = user?.dataCriacao 
    ? new Date(user.dataCriacao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '...';

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-(--bg-side) rounded-3xl border border-dashed border-(--border-subtle) text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-(--bg-card) rounded-3xl flex items-center justify-center mb-4">
          <User className="text-dim/40 w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-dim">Crie uma conta para ver o seu perfil</h3>
        <p className="text-dim/70 max-w-sm">
          Como convidado, você pode explorar as músicas, mas para ter um perfil personalizado e salvar sua coleção, você precisa estar logado.
        </p>
        <Button 
          onClick={() => authService.logout()}
          className="mt-4 px-8"
        >
          Criar conta agora
        </Button>
      </div>
    );
  }

  const handleIdentityUpdate = async (e) => {
    if (e) e.preventDefault();
    
    if (containsEmoji(identityData.displayName)) {
      alert("O Nome de Exibição não pode conter emojis.");
      return;
    }

    if (!isValidPersonalName(identityData.personalName)) {
      alert("O Nome Pessoal deve conter apenas letras e espaços.");
      return;
    }

    setIsUpdatingIdentity(true);
    try {
      const updatedUser = await userService.updateProfile(identityData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowIdentityModal(false);
    } catch (err) {
      console.error('Failed to update identity:', err);
      alert(err.response?.data?.detalhe || 'Falha ao atualizar perfil.');
    } finally {
      setIsUpdatingIdentity(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setIdentityData({
        username: user.username || '',
        displayName: user.displayName || '',
        personalName: user.personalName || '',
        showPersonalName: user.showPersonalName ?? true,
        showSpotifyActivity: user.showSpotifyActivity ?? true
      });
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-0 space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-32 md:pb-8">
      <header className="flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-(--bg-card) p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-(--border-subtle) relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-[100px] -mr-40 -mt-40 transition-all duration-1000 group-hover:bg-brand/20 animate-pulse" />
        <button 
          onClick={() => setShowIdentityModal(true)}
          className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-brand/5 rounded-2xl text-dim hover:text-brand-legible hover:bg-brand/10 hover:scale-105 active:scale-95 transition-all outline outline-transparent hover:outline-brand/20 shadow-lg z-20 group/edit"
          title="Editar Nome do Perfil"
        >
          <Settings2 size={18} className="group-hover/edit:rotate-45 transition-transform" />
        </button>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-32 h-32 bg-linear-to-br from-brand via-purple-600 to-indigo-700 rounded-[32px] flex items-center justify-center text-5xl font-black text-brand-contrast shadow-2xl overflow-hidden group/avatar">
            {user?.fotoPerfil ? (
              <img src={user.fotoPerfil} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.nomeCompleto?.charAt(0)
            )}
          </div>
          
          <Button 
            variant="secondary"
            onClick={() => setShowAvatars(true)}
            icon={Camera}
            className="px-6 py-2.5 text-xs text-brand-legible! bg-brand/10! border-brand/20! font-bold hover:bg-brand/20!"
          >
            Mudar Foto
          </Button>
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-4xl md:text-5xl font-black text-main tracking-tight leading-none group-hover:text-brand transition-colors">
                        {user?.displayName || 'Usuário'}
                      </h1>
                      {user?.showPersonalName && user?.personalName && (
                        <span className="text-lg md:text-xl font-medium text-dim/60 italic truncate">
                          {user.personalName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-dim/60 overflow-hidden">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar size={14} className="shrink-0" />
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Membro desde {new Date(user?.dataCriacao).getFullYear()}</span>
                    </div>
                    {user?.papel === 'ADMIN' && (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand/10 text-brand rounded-full border border-brand/20">
                        <ShieldCheck size={12} className="shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Administrador</span>
                      </div>
                    )}
                  </div>
                </div>

        {/* Seção de Status de Música (Favorita + Spotify) */}
        <motion.div 
          layout
          className="flex flex-col gap-3 md:gap-4 md:ml-auto w-full md:w-[320px] shrink-0 relative z-10"
        >
          {/* Player de Música Favorita */}
          <AnimatePresence mode="popLayout">
            {user?.favoriteTrackId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="w-full relative flex items-center justify-between md:justify-start gap-4 bg-(--bg-card) p-3 md:p-4 rounded-3xl md:rounded-[32px] border border-(--border-subtle) shadow-lg group/favorite"
              >
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="relative shrink-0 group/player cursor-pointer" onClick={toggleProfileAudio}>
                    <img 
                      src={user.favoriteTrackCapaUrl} 
                      alt="Favorite Track" 
                      className={`w-10 h-10 md:w-16 md:h-16 rounded-full object-cover border-2 border-brand/30 shadow-2xl transition-all duration-700 ${isPlayingProfile ? 'animate-[spin_8s_linear_infinite]' : 'opacity-80'}`} 
                    />
                    {user?.favoriteTrackPreviewUrl && (
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-full transition-all duration-300 ${isPlayingProfile ? 'opacity-0 group-hover/player:opacity-100' : 'opacity-100'}`}>
                        <div className="w-5 h-5 md:w-8 md:h-8 bg-brand rounded-full flex items-center justify-center shadow-lg transform group-hover/player:scale-110 transition-transform">
                          {isPlayingProfile ? <Pause className="text-brand-contrast fill-brand-contrast" size={10} /> : <Play className="text-brand-contrast fill-brand-contrast ml-0.5" size={10} />}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Heart className="text-brand fill-brand animate-pulse" size={10} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand">Favorite Beat</span>
                    </div>
                    <p className="text-xs md:text-sm font-bold text-brand truncate leading-tight tracking-tight">{user.favoriteTrackName}</p>
                    <p className="text-[10px] text-dim truncate font-medium">{user.favoriteTrackArtist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setShowMusicSearch(true);
                      fetchLibrarySongs();
                    }}
                    className="p-2 bg-(--bg-side) rounded-full border border-(--border-subtle) text-dim hover:text-brand hover:bg-brand/10 transition-all"
                    title="Trocar música"
                  >
                    <Settings2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavoriteMusic();
                    }}
                    className="p-2 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 hover:text-red-700 hover:bg-red-500/20 transition-all"
                    title="Remover música"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Ouvindo Agora (Real-time Spotify) */}
          <AnimatePresence mode="popLayout">
            {user?.showSpotifyActivity && spotifyNowPlaying && spotifyNowPlaying.isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full relative flex items-center gap-4 bg-green-500/5 p-3 md:p-4 rounded-3xl md:rounded-[32px] border border-green-500/20 shadow-lg group/now-playing"
              >
                <div className="relative shrink-0">
                  <img 
                    src={spotifyNowPlaying.capaUrl} 
                    alt="Now Playing" 
                    className="w-10 h-10 md:w-16 md:h-16 rounded-2xl object-cover border border-green-500/30 shadow-xl" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-(--bg-card) flex items-center justify-center">
                    <div className="flex gap-px items-end h-2">
                      <div className="w-[2px] bg-white animate-[pulse_0.8s_ease-in-out_infinite] h-full" />
                      <div className="w-[2px] bg-white animate-[pulse_1.2s_ease-in-out_infinite] h-0.5" />
                      <div className="w-[2px] bg-white animate-[pulse_1s_ease-in-out_infinite] h-0.75" />
                    </div>
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Escutando Agora</span>
                  </div>
                  <p className="text-xs md:text-sm font-bold text-main truncate leading-tight tracking-tight">{spotifyNowPlaying.nome}</p>
                  <p className="text-[10px] text-dim truncate font-medium">{spotifyNowPlaying.artista}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!user?.favoriteTrackPreviewUrl && !spotifyNowPlaying && (
            <motion.button 
              onClick={() => {
                setShowMusicSearch(true);
                fetchLibrarySongs();
              }}
              className="w-full flex flex-col items-center justify-center gap-1 p-4 h-[72px] md:h-[96px] rounded-3xl border border-dashed border-white/10 hover:border-brand-legible/40 hover:bg-brand/5 transition-all text-zinc-600 hover:text-brand-legible"
            >
              <Music2 size={24} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Escolher Música Favorita</span>
            </motion.button>
          )}
        </motion.div>
      </header>

      {/* Stats Dashboard */}
      <div className="flex justify-center md:justify-start">
        <div className="bg-(--bg-card) border border-(--border-subtle) p-6 rounded-[28px] hover:bg-brand/5 transition-all hover:-translate-y-1 group min-w-[200px] text-center md:text-left">
          <div className="text-brand mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center md:justify-start">
            <Music2 size={24} />
          </div>
          <p className="text-3xl font-black text-main">{songCount}</p>
          <p className="text-[10px] uppercase font-bold tracking-widest text-dim mt-1">Músicas Salvas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Playlists Públicas */}
        <section className="md:col-span-2 bg-(--bg-card) p-6 md:p-8 rounded-3xl md:rounded-[40px] border border-(--border-subtle) space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-3 text-main">
              <ListMusic className="text-brand" size={24} />
              Playlists no Perfil
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">
              {playlists.length} Coleções
            </span>
          </div>

          {playlists.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {playlists.map((playlist) => {
                   const VibeIcon = VIBE_PRESETS.find(v => v.value === playlist.vibe)?.icon || ListMusic;
                   
                   return (
                     <div key={playlist.id} className="group cursor-pointer">
                       <div className="aspect-square bg-brand/5 rounded-3xl flex items-center justify-center mb-3 border border-(--border-subtle) group-hover:border-brand/30 transition-all relative overflow-hidden">
                         {playlist.capaUrl ? (
                           <img src={playlist.capaUrl} alt={playlist.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         ) : (
                           <VibeIcon className="text-dim/40 w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
                         )}
                         
                         {/* Botão de Play Hover */}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <div 
                             onClick={(e) => {
                               e.stopPropagation();
                               playPlaylist(playlist.trackIds);
                             }}
                             className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 active:scale-90 transition-all"
                           >
                             <Play className="text-brand-contrast fill-brand-contrast ml-0.5" size={20} />
                           </div>
                         </div>
                       </div>
                       <p className="text-sm font-bold text-main truncate px-1 group-hover:text-brand-legible transition-colors">{playlist.nome}</p>
                       <p className="text-[10px] text-dim/60 uppercase font-bold tracking-tight px-1">{playlist.vibe}</p>
                     </div>
                   );
                 })}
               </div>
          ) : (
            <div className="py-12 border border-dashed border-(--border-subtle) rounded-3xl flex flex-col items-center text-center px-6">
              <p className="text-dim text-sm mb-2">Sem playlists públicas.</p>
              <p className="text-dim/60 text-xs">Apenas as playlists marcadas como "Públicas" aparecerão aqui.</p>
            </div>
          )}
        </section>

        <section className="bg-brand/5 p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-(--border-subtle) space-y-6 relative overflow-hidden group/socials">
          <div className="flex justify-between items-center relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2 text-main">
              <Globe className="text-dim/60" size={20} />
              Links Sociais
            </h3>
            <button 
              onClick={() => setShowSocialModal(true)}
              className="p-2 bg-brand/5 rounded-xl text-dim hover:text-brand-legible hover:bg-brand/10 transition-all opacity-0 group-hover/socials:opacity-100"
            >
              <Settings2 size={16} />
            </button>
          </div>
          
          <div className="space-y-3 relative z-10">
            {[
              { id: 'instagram', label: 'Instagram', value: socialLinks.instagram, icon: <Instagram size={18} />, color: 'hover:text-pink-500', prefix: '@' },
              { id: 'spotify', label: 'Spotify', value: socialLinks.spotify, icon: <Music2 size={18} />, color: 'hover:text-green-500', prefix: '' },
              { id: 'youtube', label: 'YouTube', value: socialLinks.youtube, icon: <Youtube size={18} />, color: 'hover:text-red-500', prefix: 'c/' },
            ].map((social, i) => (
              <div key={i} className={`w-full flex items-center justify-between p-3 rounded-2xl bg-brand/5 border border-brand/5 transition-all ${social.color} hover:bg-brand/10 group`}>
                <div className="flex items-center gap-3">
                  <div className="text-dim/60 group-hover:text-inherit transition-colors">{social.icon}</div>
                  <div className="text-left">
                    <p className="text-[10px] text-dim/80 uppercase font-bold tracking-widest">{social.label}</p>
                    <p className="text-sm font-medium text-dim group-hover:text-main transition-colors">
                      {social.value ? `${social.prefix}${social.value}` : 'Não vinculado'}
                    </p>
                  </div>
                </div>
                {social.value && <ExternalLink size={14} className="text-dim/40 group-hover:text-dim" />}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-brand/5 p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-(--border-subtle) flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-main">
              <ShieldCheck className="text-dim/60" size={20} />
              Minha Conta
            </h3>
            <div className="space-y-4">
              {user?.username && (
                <div className="p-4 bg-brand/5 rounded-2xl border border-(--border-subtle) flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] text-dim/60 uppercase font-black tracking-widest mb-1">Meu user</p>
                    <p className="text-main font-bold text-sm">@{user.username}</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-brand/5 rounded-2xl border border-(--border-subtle) flex items-center justify-between group">
                <div>
                  <p className="text-[10px] text-dim/60 uppercase font-black tracking-widest mb-1">E-mail Principal</p>
                  <p className="text-main font-medium text-sm">{user?.email}</p>
                </div>
                <Button
                  variant={copied ? 'outline' : 'secondary'}
                  onClick={handleShare}
                  icon={copied ? Check : Share2}
                  className={`px-3! py-1.5! md:px-4! md:py-2! text-[10px] transition-all active:scale-90 font-bold ${copied ? 'text-green-600! dark:text-green-400! border-green-500/50! bg-green-500/10!' : 'text-brand-legible! bg-brand/10! border-brand/20! hover:bg-brand/20!'}`}
                >
                  <span className="hidden md:inline">{copied ? 'Copiado!' : 'Compartilhar'}</span>
                </Button>
              </div>
            </div>
          </div>

          <Button 
            variant="danger"
            onClick={() => setShowLogoutConfirm(true)}
            icon={LogOut}
            className="mt-8 py-4 text-sm font-bold w-full"
          >
            Finalizar Sessão
          </Button>
        </section>
      </div>

      <Modal
        isOpen={showMusicSearch}
        onClose={() => setShowMusicSearch(false)}
        title="Música do Perfil"
      >
        <div className="space-y-6">
          <p className="text-dim text-sm -mt-4">Esta música tocará automaticamente para quem visitar seu perfil.</p>

          <div className="relative">
            <Input 
              autoFocus
              placeholder="Filtrar suas músicas salvas..."
              value={searchQuery}
              onChange={(e) => handleLocalSearch(e.target.value)}
              icon={SearchIcon}
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {searching ? (
              <div className="py-10 flex flex-col items-center">
                <Loader2 className="animate-spin text-brand" size={32} />
                <p className="text-dim text-xs mt-4 uppercase tracking-widest font-bold">Vasculhando a biblioteca...</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((track) => (
                <button 
                  key={track.id || track.trackId}
                  onClick={() => selectFavoriteMusic(track)}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-brand/5 transition-all group border border-transparent hover:border-brand/10"
                >
                  <img src={track.capaUrl || track.artworkUrl} className="w-12 h-12 rounded-xl object-cover shadow-lg border border-(--border-subtle)" alt="" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-bold text-main truncate">{track.nome || track.trackName}</p>
                    <p className="text-xs text-dim truncate">{track.artista || track.artistName}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 p-2 bg-brand/10 text-brand rounded-lg transition-all">
                    <Check size={16} />
                  </div>
                </button>
              ))
            ) : searchQuery && (
              <p className="text-center py-10 text-dim text-sm italic">Nenhum resultado para "{searchQuery}"</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAvatars}
        onClose={() => setShowAvatars(false)}
        title="Escolha seu Avatar"
        maxWidth="max-w-xl"
      >
        <div className="space-y-8">
          <div className="flex justify-between items-center -mt-4">
            <p className="text-dim text-sm">Selecione um preset ou faça upload de sua própria foto</p>
            <label className="flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand border border-brand/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-brand/20 transition-all">
              <Camera size={14} />
              Fazer Upload
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {AVATAR_PRESETS.map((avatar, i) => (
              <button 
                key={i}
                onClick={() => handleAvatarSelect(avatar.url)}
                className="group flex flex-col items-center gap-3 transition-transform hover:scale-110"
              >
                <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-transparent group-hover:border-brand transition-all shadow-xl">
                  <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-dim group-hover:text-main transition-colors">{avatar.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        title="Links Sociais"
      >
        <form onSubmit={handleSocialSave} className="space-y-6">
          <Input 
            label="Instagram"
            value={socialLinks.instagram}
            onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
            placeholder="@seuusuario"
            icon={Instagram}
          />
          <Input 
            label="Spotify"
            value={socialLinks.spotify}
            onChange={(e) => setSocialLinks({...socialLinks, spotify: e.target.value})}
            placeholder="Nome no Spotify"
            icon={Music2}
          />
          <Input 
            label="YouTube"
            value={socialLinks.youtube}
            onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})}
            placeholder="Canal"
            icon={Youtube}
          />
          <Button type="submit" className="w-full py-4 mt-2">
            Salvar Links
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        title="Identidade do Perfil"
      >
        <form onSubmit={handleIdentityUpdate} className="space-y-6">
          <p className="text-dim text-sm -mt-4 mb-6">Customize como as pessoas te veem na plataforma.</p>

          <Input 
            label="Nick de Exibição"
            value={identityData.displayName}
            onChange={(e) => setIdentityData({...identityData, displayName: e.target.value})}
            placeholder="Ex: NoobMaster69"
            icon={UserIcon}
            helperText="Nome principal do seu perfil. Pode conter números e símbolos. Emojis não são permitidos."
          />

          {!user?.usernameChanged && (
            <Input 
              label="@ Nome de Usuário (Único)"
              value={identityData.username}
              onChange={(e) => setIdentityData({...identityData, username: e.target.value.toLowerCase().trim()})}
              placeholder="Ex: joao_silva"
              icon={ShieldCheck}
              helperText="⚠️ ATENÇÃO: Seus amigos te acharão por este @. Esta mudança é PERMANENTE e só pode ser feita UMA VEZ."
            />
          )}

          <Input 
            value={identityData.personalName}
            onChange={(e) => setIdentityData({...identityData, personalName: e.target.value})}
            label="Nome Pessoal"
            placeholder="Ex: Carlos Andrade"
            helperText="Seu nome real. Deixe em branco caso queira se manter totalmente anônimo. Caso preenchido, deve conter apenas letras."
          />

          <div className="flex flex-col gap-4 p-4 bg-brand/5 rounded-2xl border border-brand/10">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-main">Exibir Nome Pessoal</span>
                <span className="text-[10px] text-dim/60 uppercase font-bold">Mostrar seu nome real abaixo do nick</span>
              </div>
              <input 
                type="checkbox"
                checked={identityData.showPersonalName}
                onChange={(e) => setIdentityData({...identityData, showPersonalName: e.target.checked})}
                className="w-10 h-6 bg-brand/20 rounded-full appearance-none relative cursor-pointer outline-none transition-all checked:bg-brand after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all checked:after:translate-x-4"
              />
            </label>

            <div className="h-px bg-brand/5" />

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-main flex items-center gap-2">
                  Exibir Atividade do Spotify
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </span>
                <span className="text-[10px] text-dim/60 uppercase font-bold">Ocultar o que você está ouvindo agora</span>
              </div>
              <input 
                type="checkbox"
                checked={identityData.showSpotifyActivity}
                onChange={(e) => setIdentityData({...identityData, showSpotifyActivity: e.target.checked})}
                className="w-10 h-6 bg-brand/20 rounded-full appearance-none relative cursor-pointer outline-none transition-all checked:bg-green-500 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all checked:after:translate-x-4"
              />
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full py-4 mt-6 text-sm font-bold uppercase tracking-widest bg-brand!"
            isLoading={isUpdatingIdentity}
          >
            {isUpdatingIdentity ? 'Salvando Identidade...' : 'Salvar Alterações'}
          </Button>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          authService.logout();
        }}
        title="Deseja mesmo sair?"
        message="Você precisará fazer login novamente para acessar suas músicas curtidas e playlists."
        confirmText="Sair da Conta"
        cancelText="Cancelar"
        icon={LogOut}
      />
    </div>
  );
};

export default ProfilePage;
