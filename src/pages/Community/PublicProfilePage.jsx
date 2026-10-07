import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Ban, Calendar, Check, Disc3, EyeOff, ExternalLink, Eye, Heart, Instagram, ListMusic, Loader2,
  Lock, Music2, Pause, Play, Settings2, Share2, ShieldAlert, Shuffle, Star, Undo2, UserX, Youtube
} from 'lucide-react';
import { communityService, readPage } from '../../services/communityService';
import { authService } from '../../services/authService';
import { useAudio } from '../../hooks/useAudio';
import { vibeIcon } from '../../utils/vibePresets';
import UserAvatar from '../../components/Community/UserAvatar';
import StarRating from '../../components/AlbumRating/StarRating';
import AlbumDetailScreen from '../../components/AlbumRating/AlbumDetailScreen';
import RatingFormScreen from '../../components/AlbumRating/RatingFormScreen';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import RoleBadges from '../../components/Moderation/RoleBadges';
import ModerationActionModal from '../../components/Moderation/ModerationActionModal';
import { adminService } from '../../services/adminService';
import { PERMISSOES, hasPermission } from '../../utils/permissions';

const RATINGS_PAGE_SIZE = 20;
const SONGS_PAGE_SIZE = 30;

const TABS = [
  { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'curtidas', label: 'Curtidas', icon: Heart },
];

// Só aceita links http(s) vindos do perfil; handles simples viram URL da rede
const buildSocialUrl = (network, value) => {
  if (!value) return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '').replace(/^c\//, '');
  if (!/^[\w.-]+$/.test(handle)) return null;
  if (network === 'instagram') return `https://instagram.com/${handle}`;
  if (network === 'spotify') return `https://open.spotify.com/user/${handle}`;
  if (network === 'youtube') return `https://youtube.com/@${handle}`;
  return null;
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LockedTab = ({ label }) => (
  <div className="flex flex-col items-center text-center gap-2 py-16 text-dim">
    <Lock size={28} className="opacity-50" />
    <p className="font-bold text-main">{label} privadas</p>
    <p className="text-sm text-dim/70">Esta pessoa escolheu não mostrar isso no perfil.</p>
  </div>
);

const EmptyTab = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center text-center gap-2 py-16 text-dim">
    <Icon size={28} className="opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);

const PublicProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isGuest = authService.isGuest();
  const {
    playTrack, playPlaylist, currentTrack, isPlaying,
    isPlayingProfile, playProfileAudio, stopProfileAudio, isFavoriteAutoplayEnabled
  } = useAudio();

  const currentUser = authService.getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [modAction, setModAction] = useState(null);
  const [profileStatus, setProfileStatus] = useState('loading'); // loading | ok | notfound | error
  const [copied, setCopied] = useState(false);

  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some(t => t.id === requestedTab) ? requestedTab : 'avaliacoes';
  const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });

  // Avaliações
  const [ratings, setRatings] = useState([]);
  const [ratingsOrder, setRatingsOrder] = useState('recentes');
  const [ratingsPage, setRatingsPage] = useState({ number: 0, totalPages: 0 });
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [detailAlbum, setDetailAlbum] = useState(null);
  const [ratingAlbum, setRatingAlbum] = useState(null);

  // Playlists
  const [playlists, setPlaylists] = useState(null);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [openPlaylistLoading, setOpenPlaylistLoading] = useState(false);

  // Curtidas
  const [songs, setSongs] = useState([]);
  const [songsPage, setSongsPage] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [songsLoading, setSongsLoading] = useState(false);
  const songsLoadedRef = useRef(false);

  // Troca de perfil (ex.: navegar de um perfil para outro) zera tudo
  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setProfileStatus('loading');
    setRatings([]);
    setRatingsPage({ number: 0, totalPages: 0 });
    setPlaylists(null);
    setSongs([]);
    setSongsPage({ number: 0, totalPages: 0, totalElements: 0 });
    songsLoadedRef.current = false;

    if (isGuest) {
      setProfileStatus('error');
      return undefined;
    }

    communityService.getProfile(username)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setProfileStatus('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        setProfileStatus(err.response?.status === 404 ? 'notfound' : 'error');
      });

    return () => { cancelled = true; };
  }, [username, isGuest]);

  // Autoplay da música favorita segue a mesma preferência do próprio perfil
  useEffect(() => {
    if (profile?.favoriteTrackPreviewUrl && isFavoriteAutoplayEnabled) {
      playProfileAudio(profile.favoriteTrackPreviewUrl);
    }
    return () => {
      stopProfileAudio();
    };
    // playProfileAudio/stopProfileAudio não são memoizadas no AudioContext
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.favoriteTrackPreviewUrl, isFavoriteAutoplayEnabled]);

  const loadRatings = useCallback(async (page, order) => {
    setRatingsLoading(true);
    try {
      const data = await communityService.getRatings(username, { ordem: order, page, size: RATINGS_PAGE_SIZE });
      const pageData = readPage(data);
      setRatings(prev => (page === 0 ? pageData.content : [...prev, ...pageData.content]));
      setRatingsPage({ number: pageData.number, totalPages: pageData.totalPages });
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setRatingsLoading(false);
    }
  }, [username]);

  const loadSongs = useCallback(async (page) => {
    setSongsLoading(true);
    try {
      const data = await communityService.getLikedSongs(username, { page, size: SONGS_PAGE_SIZE });
      const pageData = readPage(data);
      setSongs(prev => (page === 0 ? pageData.content : [...prev, ...pageData.content]));
      setSongsPage({ number: pageData.number, totalPages: pageData.totalPages, totalElements: pageData.totalElements });
    } catch (err) {
      console.error('Erro ao carregar curtidas:', err);
    } finally {
      setSongsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (profileStatus !== 'ok' || !profile?.avaliacoesVisiveis) return;
    loadRatings(0, ratingsOrder);
  }, [profileStatus, profile?.avaliacoesVisiveis, ratingsOrder, loadRatings]);

  useEffect(() => {
    if (profileStatus !== 'ok' || activeTab !== 'playlists' || playlists !== null) return;
    let cancelled = false;
    setPlaylistsLoading(true);
    communityService.getPlaylists(username)
      .then((data) => { if (!cancelled) setPlaylists(data || []); })
      .catch((err) => {
        console.error('Erro ao carregar playlists:', err);
        if (!cancelled) setPlaylists([]);
      })
      .finally(() => { if (!cancelled) setPlaylistsLoading(false); });
    return () => { cancelled = true; };
  }, [profileStatus, activeTab, playlists, username]);

  useEffect(() => {
    if (profileStatus !== 'ok' || activeTab !== 'curtidas' || !profile?.curtidasVisiveis || songsLoadedRef.current) return;
    songsLoadedRef.current = true;
    loadSongs(0);
  }, [profileStatus, activeTab, profile?.curtidasVisiveis, loadSongs]);

  const openPlaylistDetail = async (playlist) => {
    setOpenPlaylist({ ...playlist, tracks: null });
    setOpenPlaylistLoading(true);
    try {
      const detail = await communityService.getPlaylist(username, playlist.id);
      setOpenPlaylist(detail);
    } catch (err) {
      console.error('Erro ao abrir playlist:', err);
      setOpenPlaylist(prev => (prev ? { ...prev, tracks: [] } : prev));
    } finally {
      setOpenPlaylistLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${encodeURIComponent(profile.username)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.displayName || profile.username} no Synfonia`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // usuário cancelou o compartilhamento
    }
  };

  const toggleFavoriteAudio = () => {
    if (isPlayingProfile) {
      stopProfileAudio();
    } else if (profile?.favoriteTrackPreviewUrl) {
      playProfileAudio(profile.favoriteTrackPreviewUrl);
    }
  };

  // Ao abrir um álbum avaliado por outra pessoa, nunca levamos a nota/resenha dela
  // para o formulário: o AlbumDetailScreen busca a avaliação do próprio usuário.
  const openAlbumFromRating = (rating) => {
    setSelectedRating(null);
    setDetailAlbum({
      albumKey: rating.albumKey,
      albumName: rating.albumName,
      artista: rating.artista,
      capaUrl: rating.capaUrl,
      source: rating.source,
    });
  };

  // O backend decide (podeModerar já considera hierarquia); aqui só escolhemos o que exibir
  const canModerateContent = !!profile?.podeModerar && hasPermission(currentUser, PERMISSOES.CONTEUDO_MODERAR);
  const canSuspend = !!profile?.podeModerar && hasPermission(currentUser, PERMISSOES.USUARIOS_BANIR);

  const reloadProfile = async () => {
    try {
      setProfile(await communityService.getProfile(username));
    } catch {
      // perfil pode ter sumido da visão após a ação; mantém o estado atual
    }
  };

  const askSuspension = () => {
    const suspenso = !!profile.banido;
    setModAction({
      title: suspenso ? `Reativar @${profile.username}` : `Suspender @${profile.username}`,
      description: suspenso ? 'Remove a suspensão imediatamente.' : 'A pessoa perde o acesso na hora e some da comunidade.',
      confirmText: suspenso ? 'Reativar' : 'Suspender',
      danger: !suspenso,
      askDuration: !suspenso,
      run: async (payload) => {
        if (suspenso) await adminService.reactivate(profile.id, payload);
        else await adminService.suspend(profile.id, payload);
        await reloadProfile();
      },
    });
  };

  const askRatingVisibility = (rating) => {
    const oculto = !!rating.oculto;
    setModAction({
      title: oculto ? 'Reexibir avaliação' : 'Ocultar avaliação',
      description: oculto
        ? 'A avaliação volta a aparecer para todos.'
        : 'A avaliação some da comunidade. O autor continua vendo, com o motivo.',
      confirmText: oculto ? 'Reexibir' : 'Ocultar',
      danger: !oculto,
      run: async (payload) => {
        const updated = oculto
          ? await adminService.unhideRating(rating.id, payload)
          : await adminService.hideRating(rating.id, payload);
        setRatings(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        setSelectedRating(updated);
        reloadProfile();
      },
    });
  };

  const askPlaylistBlock = (playlist) => {
    const bloqueada = !!playlist.bloqueada;
    setModAction({
      title: bloqueada ? 'Desbloquear playlist' : 'Bloquear playlist',
      description: bloqueada
        ? 'A playlist volta a aparecer na comunidade.'
        : 'A playlist some da comunidade e o dono não consegue torná-la pública de novo.',
      confirmText: bloqueada ? 'Desbloquear' : 'Bloquear',
      danger: !bloqueada,
      run: async (payload) => {
        if (bloqueada) await adminService.unblockPlaylist(playlist.id, payload);
        else await adminService.blockPlaylist(playlist.id, payload);
        const toggled = { bloqueada: !bloqueada, bloqueioMotivo: bloqueada ? null : payload.motivo };
        setPlaylists(prev => (prev || []).map(p => (p.id === playlist.id ? { ...p, ...toggled } : p)));
        setOpenPlaylist(prev => (prev?.id === playlist.id ? { ...prev, ...toggled } : prev));
      },
    });
  };

  const likedTracks = songs.map(s => s.music).filter(Boolean);

  if (profileStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 space-y-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <p className="text-dim font-medium">Carregando perfil...</p>
      </div>
    );
  }

  if (profileStatus !== 'ok') {
    const notFound = profileStatus === 'notfound';
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-4 py-24 px-4">
        <div className="w-16 h-16 rounded-3xl bg-(--bg-card) border border-(--border-subtle) text-dim flex items-center justify-center">
          <UserX size={30} />
        </div>
        <h2 className="text-2xl font-black text-main">
          {isGuest ? 'Entre para ver perfis' : notFound ? 'Perfil não encontrado' : 'Não foi possível abrir o perfil'}
        </h2>
        <p className="text-dim/70 max-w-sm">
          {isGuest
            ? 'Crie uma conta para explorar a comunidade.'
            : notFound
              ? `@${username} não existe ou é um perfil privado.`
              : 'Tente novamente em instantes.'}
        </p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/comunidade')}>
          Voltar para a comunidade
        </Button>
      </div>
    );
  }

  const socials = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500' },
    { id: 'spotify', label: 'Spotify', icon: Music2, color: 'hover:text-green-500' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'hover:text-red-500' },
  ]
    .map(s => ({ ...s, url: buildSocialUrl(s.id, profile.socialLinks?.[s.id]) }))
    .filter(s => s.url);

  const stats = [
    { label: 'Avaliações', value: profile.totalAvaliacoes, tab: 'avaliacoes', hidden: !profile.avaliacoesVisiveis },
    { label: 'Média', value: profile.mediaAvaliacoes != null ? profile.mediaAvaliacoes.toFixed(1) : '—', tab: 'avaliacoes', hidden: !profile.avaliacoesVisiveis, star: true },
    { label: 'Playlists', value: profile.totalPlaylistsPublicas, tab: 'playlists' },
    { label: 'Curtidas', value: profile.totalCurtidas, tab: 'curtidas', hidden: !profile.curtidasVisiveis },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32 md:pb-8 animate-in fade-in duration-500">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/comunidade'))}
        className="flex items-center gap-2 text-sm font-bold text-dim hover:text-main transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      {profile.proprioPerfil && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-brand/5 border border-brand/20">
          <Eye size={18} className="text-brand-legible shrink-0" />
          <p className="text-sm text-main flex-1">
            É assim que outras pessoas veem seu perfil. Abas privadas aparecem para você, mas não para elas.
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-legible hover:underline shrink-0"
          >
            <Settings2 size={14} />
            Privacidade
          </button>
        </div>
      )}

      {profile.banido && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">
              Conta suspensa {profile.banidoAte ? `até ${new Date(profile.banidoAte).toLocaleString('pt-BR')}` : 'permanentemente'}
            </p>
            {profile.banidoMotivo && <p className="text-dim mt-0.5">Motivo: {profile.banidoMotivo}</p>}
            <p className="text-dim/70 text-xs mt-1">Só a moderação vê este perfil enquanto durar a suspensão.</p>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-(--bg-card) p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-(--border-subtle) relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        <button
          type="button"
          onClick={handleShare}
          className={`absolute top-4 right-4 md:top-8 md:right-8 p-3 rounded-2xl transition-all z-20 ${copied ? 'bg-green-500/10 text-green-500' : 'bg-brand/5 text-dim hover:text-brand-legible hover:bg-brand/10'}`}
          title={copied ? 'Link copiado' : 'Compartilhar perfil'}
          aria-label="Compartilhar perfil"
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </button>

        {canSuspend && (
          <button
            type="button"
            onClick={askSuspension}
            className={`absolute top-4 left-4 md:top-8 md:left-auto md:right-24 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold z-20 transition-all ${profile.banido ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          >
            {profile.banido ? <Undo2 size={14} /> : <Ban size={14} />}
            {profile.banido ? 'Reativar' : 'Suspender'}
          </button>
        )}

        <UserAvatar user={profile} size="lg" className="relative z-10 shadow-2xl" />

        <div className="flex-1 min-w-0 text-center md:text-left relative z-10">
          <h1 className="text-3xl md:text-5xl font-black text-main tracking-tight leading-none wrap-break-word">
            {profile.displayName || profile.username}
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
            <p className="text-sm font-bold text-brand-legible">@{profile.username}</p>
            <RoleBadges roles={profile.papeis} />
          </div>
          {profile.personalName && (
            <p className="text-lg font-medium text-dim/60 italic truncate mt-1">{profile.personalName}</p>
          )}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-3 text-dim/60">
            {profile.dataCriacao && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={14} />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
                  Membro desde {new Date(profile.dataCriacao).getFullYear()}
                </span>
              </div>
            )}
            {socials.map(({ id, label, icon: Icon, color, url }) => (
              <a
                key={id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/5 border border-(--border-subtle) text-dim transition-colors ${color}`}
                title={label}
              >
                <Icon size={13} />
                <span className="text-[10px] font-bold">{label}</span>
                <ExternalLink size={10} className="opacity-50" />
              </a>
            ))}
          </div>
        </div>

        {profile.favoriteTrackId && (
          <div className="w-full md:w-[280px] shrink-0 flex items-center gap-3 bg-(--bg-side) p-3 md:p-4 rounded-3xl border border-(--border-subtle) relative z-10">
            <button
              type="button"
              onClick={toggleFavoriteAudio}
              disabled={!profile.favoriteTrackPreviewUrl}
              className="relative shrink-0 group/player disabled:cursor-default"
              aria-label={isPlayingProfile ? 'Pausar música favorita' : 'Tocar música favorita'}
            >
              {profile.favoriteTrackCapaUrl ? (
                <img
                  src={profile.favoriteTrackCapaUrl}
                  alt=""
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-brand/30 ${isPlayingProfile ? 'animate-[spin_8s_linear_infinite]' : 'opacity-80'}`}
                />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand/10 flex items-center justify-center text-brand"><Music2 size={20} /></div>
              )}
              {profile.favoriteTrackPreviewUrl && (
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-full transition-opacity ${isPlayingProfile ? 'opacity-0 group-hover/player:opacity-100' : 'opacity-100'}`}>
                  <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center">
                    {isPlayingProfile
                      ? <Pause className="text-brand-contrast fill-brand-contrast" size={10} />
                      : <Play className="text-brand-contrast fill-brand-contrast ml-0.5" size={10} />}
                  </div>
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Heart className="text-brand fill-brand" size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest text-brand">Favorite Beat</span>
              </div>
              <p className="text-sm font-bold text-brand truncate leading-tight">{profile.favoriteTrackName}</p>
              <p className="text-[10px] text-dim truncate font-medium">{profile.favoriteTrackArtist}</p>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setActiveTab(stat.tab)}
            className="bg-(--bg-card) border border-(--border-subtle) p-4 rounded-3xl hover:bg-brand/5 transition-all text-center"
          >
            <p className="text-2xl font-black text-main flex items-center justify-center gap-1">
              {stat.hidden ? <Lock size={18} className="text-dim/50" /> : (stat.value ?? 0)}
              {stat.star && !stat.hidden && <Star size={16} className="text-brand fill-brand" />}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-dim mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      <section className="bg-(--bg-card) p-4 md:p-8 rounded-3xl md:rounded-[40px] border border-(--border-subtle) space-y-6">
        <div role="tablist" className="flex gap-2 p-1 bg-(--bg-side) rounded-2xl border border-(--border-subtle)">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === id ? 'bg-brand text-brand-contrast shadow-lg' : 'text-dim hover:text-main'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'avaliacoes' && (
          !profile.avaliacoesVisiveis ? <LockedTab label="Avaliações" /> : (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2">
                {[{ id: 'recentes', label: 'Recentes' }, { id: 'nota', label: 'Maiores notas' }].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRatingsOrder(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${ratingsOrder === opt.id ? 'bg-brand/10 border-brand/30 text-brand-legible' : 'border-(--border-subtle) text-dim hover:text-main'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {ratingsLoading && ratings.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
              ) : ratings.length === 0 ? (
                <EmptyTab icon={Disc3} text="Nenhum álbum avaliado ainda." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                  {ratings.map((rating) => (
                    <button
                      key={rating.id}
                      type="button"
                      onClick={() => setSelectedRating(rating)}
                      className="glass-card rounded-xl md:rounded-2xl p-3 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border border-(--border-subtle) flex flex-col text-left"
                    >
                      <div className="relative aspect-square mb-3 rounded-xl overflow-hidden shadow-lg bg-(--bg-side)">
                        {rating.capaUrl && (
                          <img src={rating.capaUrl} alt={rating.albumName} loading="lazy" className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${rating.oculto ? 'opacity-40 grayscale' : ''}`} />
                        )}
                        {rating.oculto && (
                          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            <EyeOff size={9} /> Oculta
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-main text-sm truncate">{rating.albumName}</p>
                      <p className="text-dim text-xs truncate mb-1.5">{rating.artista}</p>
                      <StarRating value={rating.nota} readOnly size={14} />
                      {rating.titulo && (
                        <p className="text-dim text-xs italic truncate mt-1.5">“{rating.titulo}”</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {ratingsPage.number + 1 < ratingsPage.totalPages && (
                <div className="flex justify-center">
                  <Button variant="secondary" loading={ratingsLoading} onClick={() => loadRatings(ratingsPage.number + 1, ratingsOrder)}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'playlists' && (
          playlistsLoading || playlists === null ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
          ) : playlists.length === 0 ? (
            <EmptyTab icon={ListMusic} text="Nenhuma playlist pública." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {playlists.map((playlist) => {
                const VibeIcon = vibeIcon(playlist.vibe);
                return (
                  <div key={playlist.id} className="group">
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-(--bg-side) border border-(--border-subtle)">
                      <button
                        type="button"
                        onClick={() => openPlaylistDetail(playlist)}
                        className="absolute inset-0 w-full h-full"
                        aria-label={`Abrir ${playlist.nome}`}
                      >
                        {playlist.capaUrl ? (
                          <img src={playlist.capaUrl} alt={playlist.nome} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-brand/20 to-purple-600/20">
                            <VibeIcon size={40} className="text-brand/60" />
                          </div>
                        )}
                      </button>
                      {playlist.bloqueada && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter pointer-events-none">
                          <Ban size={9} /> Bloqueada
                        </span>
                      )}
                      {playlist.totalMusicas > 0 && (
                        <button
                          type="button"
                          onClick={() => playPlaylist(playlist.trackIds)}
                          className="absolute bottom-2 right-2 w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0 transition-all"
                          aria-label={`Tocar ${playlist.nome}`}
                        >
                          <Play size={16} className="text-brand-contrast fill-brand-contrast ml-0.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-bold text-main truncate px-1">{playlist.nome}</p>
                    <p className="text-[10px] text-dim/60 uppercase font-bold tracking-tight px-1">
                      {playlist.totalMusicas} {playlist.totalMusicas === 1 ? 'música' : 'músicas'}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'curtidas' && (
          !profile.curtidasVisiveis ? <LockedTab label="Curtidas" /> : (
            <div className="space-y-4">
              {likedTracks.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dim">
                    {songsPage.totalElements} músicas
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" icon={Shuffle} className="px-4! py-2! text-xs" onClick={() => playPlaylist(likedTracks, { shuffle: true })}>
                      Aleatório
                    </Button>
                    <Button icon={Play} className="px-4! py-2! text-xs" onClick={() => playTrack(likedTracks[0], likedTracks)}>
                      Tocar
                    </Button>
                  </div>
                </div>
              )}

              {songsLoading && songs.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
              ) : songs.length === 0 ? (
                <EmptyTab icon={Heart} text="Nenhuma música curtida ainda." />
              ) : (
                <ul className="divide-y divide-(--border-subtle)">
                  {songs.map((item) => {
                    const music = item.music;
                    if (!music) return null;
                    const isCurrent = currentTrack?.id === music.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => playTrack(music, likedTracks)}
                          className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-brand/5 transition-colors text-left group"
                        >
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-(--bg-side) shrink-0">
                            {music.capaUrl && <img src={music.capaUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              {isCurrent && isPlaying ? <Pause size={14} className="text-white fill-white" /> : <Play size={14} className="text-white fill-white ml-0.5" />}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold truncate ${isCurrent ? 'text-brand-legible' : 'text-main'}`}>{music.nome}</p>
                            <p className="text-xs text-dim truncate">{music.artista}{music.album ? ` · ${music.album}` : ''}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {songsPage.number + 1 < songsPage.totalPages && (
                <div className="flex justify-center">
                  <Button variant="secondary" loading={songsLoading} onClick={() => loadSongs(songsPage.number + 1)}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* Resenha completa */}
      <Modal isOpen={!!selectedRating} onClose={() => setSelectedRating(null)} title="Avaliação" maxWidth="max-w-lg">
        {selectedRating && (
          <div className="space-y-5">
            <div className="flex gap-4">
              {selectedRating.capaUrl && (
                <img src={selectedRating.capaUrl} alt={selectedRating.albumName} className="w-24 h-24 rounded-2xl object-cover shadow-lg shrink-0" />
              )}
              <div className="min-w-0 space-y-1.5">
                <p className="font-black text-main text-lg leading-tight wrap-break-word">{selectedRating.albumName}</p>
                <p className="text-dim text-sm truncate">{selectedRating.artista}</p>
                <div className="flex items-center gap-2">
                  <StarRating value={selectedRating.nota} readOnly size={18} />
                  <span className="text-sm font-black text-main">{selectedRating.nota?.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {(selectedRating.titulo || selectedRating.review) ? (
              <div className="space-y-2 p-4 rounded-2xl bg-(--bg-side) border border-(--border-subtle)">
                {selectedRating.titulo && <p className="font-bold text-main">“{selectedRating.titulo}”</p>}
                {selectedRating.review && (
                  <p className="text-sm text-dim whitespace-pre-line wrap-break-word">{selectedRating.review}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-dim italic">Sem resenha escrita.</p>
            )}

            <p className="text-[10px] uppercase font-bold tracking-widest text-dim/60">
              {selectedRating.atualizadoEm && selectedRating.atualizadoEm !== selectedRating.criadoEm
                ? `Atualizada em ${formatDate(selectedRating.atualizadoEm)}`
                : `Avaliada em ${formatDate(selectedRating.criadoEm)}`}
            </p>

            {selectedRating.oculto && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                <EyeOff size={14} className="shrink-0 mt-0.5" />
                <span>
                  Oculta pela moderação{selectedRating.ocultoMotivo ? `: ${selectedRating.ocultoMotivo}` : ''}. Só você{profile.proprioPerfil ? '' : ' (moderação)'} e o autor veem.
                </span>
              </div>
            )}

            <Button icon={Disc3} className="w-full" onClick={() => openAlbumFromRating(selectedRating)}>
              {profile.proprioPerfil ? 'Abrir álbum' : 'Ouvir e avaliar também'}
            </Button>

            {canModerateContent && (
              <Button
                variant={selectedRating.oculto ? 'secondary' : 'danger'}
                icon={selectedRating.oculto ? Eye : EyeOff}
                className="w-full"
                onClick={() => askRatingVisibility(selectedRating)}
              >
                {selectedRating.oculto ? 'Reexibir avaliação' : 'Ocultar avaliação'}
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Detalhe da playlist */}
      <Modal isOpen={!!openPlaylist} onClose={() => setOpenPlaylist(null)} title={openPlaylist?.nome || 'Playlist'} maxWidth="max-w-lg">
        {openPlaylist && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dim">
                {openPlaylist.totalMusicas} {openPlaylist.totalMusicas === 1 ? 'música' : 'músicas'} · de @{profile.username}
              </p>
              {openPlaylist.tracks?.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { playPlaylist(openPlaylist.tracks, { shuffle: true }); setOpenPlaylist(null); }}
                    className="p-2.5 rounded-full bg-brand/10 text-brand-legible hover:bg-brand/20 transition-all"
                    aria-label="Tocar aleatório"
                  >
                    <Shuffle size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { playTrack(openPlaylist.tracks[0], openPlaylist.tracks); setOpenPlaylist(null); }}
                    className="p-2.5 rounded-full bg-brand text-brand-contrast hover:scale-105 transition-all"
                    aria-label="Tocar playlist"
                  >
                    <Play size={16} className="fill-current ml-0.5" />
                  </button>
                </div>
              )}
            </div>

            {openPlaylist.bloqueada && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                <Ban size={14} className="shrink-0 mt-0.5" />
                <span>Bloqueada pela moderação{openPlaylist.bloqueioMotivo ? `: ${openPlaylist.bloqueioMotivo}` : ''}.</span>
              </div>
            )}

            {canModerateContent && (
              <button
                type="button"
                onClick={() => askPlaylistBlock(openPlaylist)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold border transition-all ${openPlaylist.bloqueada ? 'border-(--border-subtle) text-dim hover:text-main' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
              >
                {openPlaylist.bloqueada ? <Undo2 size={14} /> : <Ban size={14} />}
                {openPlaylist.bloqueada ? 'Desbloquear playlist' : 'Bloquear playlist'}
              </button>
            )}

            {openPlaylistLoading || !openPlaylist.tracks ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
            ) : openPlaylist.tracks.length === 0 ? (
              <EmptyTab icon={ListMusic} text="Playlist vazia." />
            ) : (
              <ul className="max-h-[55vh] overflow-y-auto custom-scrollbar -mx-2 px-2 divide-y divide-(--border-subtle)">
                {openPlaylist.tracks.map((track, index) => (
                  <li key={`${track.id}-${index}`}>
                    <button
                      type="button"
                      onClick={() => { playTrack(track, openPlaylist.tracks); setOpenPlaylist(null); }}
                      className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-brand/5 transition-colors text-left"
                    >
                      <span className="w-5 text-[11px] font-bold text-dim/60 text-right shrink-0">{index + 1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-(--bg-side) shrink-0">
                        {track.capaUrl && <img src={track.capaUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${currentTrack?.id === track.id ? 'text-brand-legible' : 'text-main'}`}>{track.nome}</p>
                        <p className="text-xs text-dim truncate">{track.artista}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {detailAlbum && (
        <AlbumDetailScreen
          album={detailAlbum}
          onClose={() => setDetailAlbum(null)}
          onRate={(album) => setRatingAlbum(album)}
        />
      )}

      <ModerationActionModal
        isOpen={!!modAction}
        onClose={() => setModAction(null)}
        title={modAction?.title}
        description={modAction?.description}
        confirmText={modAction?.confirmText}
        danger={modAction?.danger !== false}
        askDuration={modAction?.askDuration}
        onConfirm={(payload) => modAction.run(payload)}
      />

      <RatingFormScreen
        album={ratingAlbum}
        isOpen={!!ratingAlbum}
        onClose={() => setRatingAlbum(null)}
        onSaved={() => {
          setRatingAlbum(null);
          setDetailAlbum(null);
          if (profile.proprioPerfil) loadRatings(0, ratingsOrder);
        }}
        onDeleted={() => {
          setRatingAlbum(null);
          setDetailAlbum(null);
          if (profile.proprioPerfil) loadRatings(0, ratingsOrder);
        }}
      />
    </div>
  );
};

export default PublicProfilePage;
