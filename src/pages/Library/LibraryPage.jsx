import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Trash2, Clock, Heart,
  Loader2, Calendar, AlertTriangle, X, MoreHorizontal,
  ListPlus, ListMusic, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
  LayoutGrid, List, Plus, Shuffle, RefreshCw, Download, Upload, Lock, Search
} from 'lucide-react';
import AddToPlaylistMenu from '../../components/Playlist/AddToPlaylistMenu';
import { musicService } from '../../services/musicService';
import { authService } from '../../services/authService';
import { spotifyService } from '../../services/spotifyService';
import { useAudio } from '../../hooks/useAudio';
import { useTheme } from '../../context/ThemeContext';

const LibraryPage = () => {
  const {
    playTrack, currentTrack, isPlaying, addToQueue,
    playNext, playPlaylist, spotifyToken, isSpotifySyncEnabled
  } = useAudio();
  const { viewMode, toggleViewMode } = useTheme();
  
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showClearSpotifyConfirm, setShowClearSpotifyConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ total: 0, current: 0 });

  const [sortBy, setSortBy] = useState('recent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [hideSpotify, setHideSpotify] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const itemsPerPage = 50;
  const user = authService.getCurrentUser();

  const hasSpotifyTracks = useMemo(() => {
     return collection.some(item => 
       item.music?.source === 'SPOTIFY' || 
       (item.music?.uri && item.music.uri.includes('spotify')) ||
       item.music?.isSpotify === true
     );
  }, [collection]);

  const fetchCollection = async () => {
    if (!user || authService.isGuest()) return;
    setLoading(true);
    try {
      const data = await musicService.getCollection(user.id);
      setCollection(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching collection:", err);
      setMessage({ type: 'error', text: 'Erro ao carregar sua biblioteca.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, []);

  const handleImportSpotify = async () => {
    if (!spotifyToken || isSyncing) return;
    setIsSyncing(true);
    setSyncStatus({ total: 0, current: 0 });
    
    try {
      // Lógica simplificada de importação local
      let offset = 0;
      let hasMore = true;
      const existingIds = new Set(collection.map(item => item.music?.trackId || item.music?.id));

      while (hasMore) {
        const data = await spotifyService.getSavedTracks(spotifyToken, 50, offset);
        const tracks = data.items || [];
        
        if (offset === 0) setSyncStatus({ total: data.total || 0, current: 0 });
        if (tracks.length === 0) break;

        for (const item of tracks) {
          const t = item.track;
          if (t && !existingIds.has(t.id)) {
            await musicService.saveToCollection(user.id, {
              trackId: String(t.id),
              nome: t.name,
              artista: t.artists[0]?.name,
              album: t.album.name,
              capaUrl: t.album.images[0]?.url,
              previewUrl: t.preview_url || '',
              source: 'SPOTIFY'
            });
            existingIds.add(t.id);
          }
        }

        setSyncStatus(prev => ({ ...prev, current: Math.min(prev.total, offset + tracks.length) }));
        if (data.next) offset += 50; else hasMore = false;
        await new Promise(r => setTimeout(r, 100));
      }

      await fetchCollection();
      setMessage({ type: 'success', text: 'Importação concluída com sucesso!' });
    } catch (err) {
      console.error("Import error:", err);
      setMessage({ type: 'error', text: 'Falha na importação.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus({ total: 0, current: 0 }), 5000);
    }
  };

  const handleClearSpotify = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setShowClearSpotifyConfirm(false);
    try {
      const deletedCount = await musicService.deleteBySource(user.id, 'SPOTIFY');
      await fetchCollection();
      setMessage({ type: 'success', text: `${deletedCount} músicas removidas.` });
    } catch (err) {
      console.error("Clear error:", err);
      setMessage({ type: 'error', text: 'Falha ao limpar biblioteca.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const removeMusic = async (recordId) => {
    if (!user || !recordId) return;
    setDeletingId(recordId);
    try {
      await musicService.removeFromCollection(user.id, recordId);
      setCollection(prev => prev.filter(item => item.id !== recordId && (item.music?.id !== recordId && item.music?.trackId !== recordId)));
      setMessage({ type: 'success', text: 'Música removida.' });
    } catch (err) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: 'Erro ao remover música.' });
    } finally {
      setDeletingId(null);
      setShowConfirm(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      // Caso o backend retorne o array [year, month, day] do LocalDate do Spring
      if (Array.isArray(dateValue)) {
        const year = dateValue[0] || '----';
        const month = String(dateValue[1] || '').padStart(2, '0') || '--';
        const day = String(dateValue[2] || '').padStart(2, '0') || '--';
        return `${day}/${month}/${year}`;
      }
      return new Date(dateValue).toLocaleDateString();
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Lógica de ordenação robusta e filtragem condicional
  const sortedCollection = useMemo(() => {
    const safeBase = Array.isArray(collection) ? [...collection] : [];

    // Filtro inicial para remover itens nulos ou sem música
    let filtered = safeBase.filter(item => item && item.music);

    // Filtro de busca local
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.music.nome?.toLowerCase().includes(term) ||
        item.music.artista?.toLowerCase().includes(term) ||
        item.music.album?.toLowerCase().includes(term)
      );
    }

    // REGRA DE VISIBILIDADE CONDICIONAL: Ocultar Spotify se o usuário não estiver logado no Spotify,
    // se a sincronia estiver desligada OU se o filtro local de ocultar estiver ativo.
    if (!spotifyToken || !isSpotifySyncEnabled || hideSpotify) {
      filtered = filtered.filter(item => item.music && item.music.source !== 'SPOTIFY');
    }

    return filtered.sort((a, b) => {
      // Prioridade Absoluta: Músicas do Site (Synfonia) antes do Spotify
      const checkSpotify = (m) => 
        m?.source === 'SPOTIFY' || 
        m?.isSpotify === true || 
        (m?.id && String(m.id).length > 20) || 
        (m?.uri && m.uri.includes('spotify'));

      const isSpotifyA = checkSpotify(a.music);
      const isSpotifyB = checkSpotify(b.music);
      
      if (isSpotifyA && !isSpotifyB) return 1;  // Spotify vai para depois
      if (!isSpotifyA && isSpotifyB) return -1; // Synfonia vai para antes

      let comparison = 0;
      
      if (sortBy === 'recent') {
        const getTimestamp = (val) => {
          if (!val) return 0;
          if (Array.isArray(val)) {
            // Spring LocalDateTime array: [year, month, day, hour, minute, second]
            return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0).getTime();
          }
          return new Date(val).getTime();
        };
        const timeA = getTimestamp(a.dataAdicao);
        const timeB = getTimestamp(b.dataAdicao);
        
        if (timeA !== timeB) {
          comparison = timeA - timeB;
        } else {
          // Desempate por ID (ID maior = inserido depois no MongoDB)
          comparison = String(a.id || '').localeCompare(String(b.id || ''));
        }
      } else {
        const valA = (sortBy === 'name' ? a.music.nome : sortBy === 'artist' ? a.music.artista : a.music.album) || '';
        const valB = (sortBy === 'name' ? b.music.nome : sortBy === 'artist' ? b.music.artista : b.music.album) || '';
        comparison = valA.localeCompare(valB);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [collection, sortBy, sortOrder, isSpotifySyncEnabled, spotifyToken, hideSpotify, searchTerm]);

  // Paginação segura
  const totalPages = Math.max(1, Math.ceil(sortedCollection.length / itemsPerPage));
  const paginatedCollection = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCollection.slice(start, start + itemsPerPage);
  }, [sortedCollection, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, searchTerm]);

  // Extrair apenas as músicas para a playlist do player
  const playlist = sortedCollection.map(item => item.music).filter(Boolean);

  const SORT_OPTIONS = [
    { value: 'recent', label: 'Mais Recentes' },
    { value: 'name', label: 'Nome (A-Z)' },
    { value: 'artist', label: 'Artista' },
    { value: 'album', label: 'Álbum' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-zinc-500 font-medium">Abrindo seus arquivos musicais...</p>
      </div>
    );
  }

  const isGuest = authService.isGuest();

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 relative min-h-screen pb-32 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Músicas Curtidas</h2>
          <p className="text-zinc-500 font-medium mt-1">
            {isGuest
              ? "Suas músicas favoritas aparecerão aqui"
              : `Total de ${sortedCollection.length} músicas visíveis`}
          </p>
        </div>

        {!isGuest && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Controles de Sincronização */}
            {(spotifyToken || collection.some(item => item.music?.source === 'SPOTIFY' || (item.music?.uri && item.music.uri.includes('spotify')))) && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                {spotifyToken && !hasSpotifyTracks && (
                  <>
                    <button
                      onClick={handleImportSpotify}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
                      title="Importar do Spotify para sua biblioteca local"
                    >
                      <Download size={14} className={isSyncing ? 'animate-bounce' : ''} />
                      <span className="hidden sm:inline">Importar do Spotify</span>
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                  </>
                )}
                <button
                  onClick={() => setShowClearSpotifyConfirm(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-xs font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                  title="Remover todas as músicas do Spotify da sua biblioteca"
                >
                  <Trash2 size={14} className={isSyncing ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">Limpar Sincronia</span>
                </button>
              </div>
            )}



            {collection.length > 0 && (
              <button
                onClick={() => playPlaylist(playlist, { shuffle: true })}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand text-brand-contrast rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95"
              >
                <Shuffle size={18} />
                <span className="hidden sm:inline">Modo Aleatório</span>
              </button>
            )}

            {/* Seletor de Visualização (Grid/List) */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 grow max-w-md mx-2">
              <div className="flex items-center px-2 text-zinc-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Pesquisar em suas curtidas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none focus:ring-0 text-xs text-white placeholder:text-zinc-600 w-full py-1.5"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="p-1 px-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => viewMode !== 'grid' && toggleViewMode()}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                title="Visualização em Grade"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => viewMode !== 'list' && toggleViewMode()}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                title="Visualização em Lista"
              >
                <List size={16} />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2.5 glass-panel border border-white/10 rounded-xl text-xs font-bold text-dim hover:text-main hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              >
                <ArrowUpDown size={14} />
                <span>Ordenar: <span className="text-brand ml-1">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span></span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-48 glass-panel border border-white/10 rounded-2xl shadow-2xl py-2 z-50">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (sortBy === option.value) {
                          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(option.value);
                          setSortOrder('asc');
                        }
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between ${sortBy === option.value
                          ? 'text-brand bg-brand/10 dark:bg-brand/20'
                          : 'text-dim hover:text-main hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <ArrowUpDown 
                          size={12} 
                          className={`transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {isGuest ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
            <Heart className="text-zinc-700 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-zinc-400">Suas curtidas aparecerão aqui</h3>
          <p className="text-zinc-600 max-w-sm">Crie uma conta para começar a construir sua coleção pessoal.</p>
          <button
            onClick={() => authService.logout()}
            className="mt-4 px-8 py-3 bg-brand text-brand-contrast rounded-2xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95"
          >
            Criar conta agora
          </button>
        </div>
      ) : (
        <>
          {message && (
            <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {collection.length > 0 ? (
            <div className="space-y-6 md:space-y-8">
              {sortedCollection.length > 0 ? (
              <>{viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                  {paginatedCollection.map((item) => (
                    <div
                      key={item.id}
                      className={`glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-500 hover:scale-[1.02] hover:bg-white/6 border-2 flex flex-col h-full ${currentTrack?.id === item.music?.id
                          ? 'ring-4 ring-brand/20 shadow-[0_0_40px_rgba(var(--brand-rgb),0.3)] scale-[1.02]'
                          : 'border-white/5'
                        }`}
                      style={currentTrack?.id === item.music?.id ? {
                        borderColor: 'var(--brand-color)',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        backgroundColor: 'color-mix(in srgb, var(--brand-color) 10%, transparent)',
                        boxShadow: '0 0 40px color-mix(in srgb, var(--brand-color) 30%, transparent)'
                      } : {}}
                    >
                      <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-2xl">
                        <img
                          src={item.music?.capaUrl?.replace('100x100', '400x400') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'}
                          alt={item.music?.nome || 'Música'}
                          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${item.music?.source === 'SPOTIFY' && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                        />

                        {/* Source Badge */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {item.music?.source === 'SPOTIFY' ? (
                            <span className="bg-[#1DB954]/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Spotify</span>
                          ) : (
                            <span className="bg-brand/90 text-brand-contrast text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Synfonia</span>
                          )}
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">

                          {item.music?.source === 'SPOTIFY' && !spotifyToken ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-zinc-900/80 rounded-full flex items-center justify-center border border-white/10">
                                <Lock className="text-brand" size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Premium</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => item.music && playTrack(item.music, playlist)}
                              className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-90"
                            >
                              {currentTrack?.id === item.music?.id && isPlaying ? (
                                <Pause className="text-brand-contrast fill-current" size={20} />
                              ) : (
                                <Play className="text-brand-contrast fill-current ml-1" size={20} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 flex-1">
                        <h3 className="font-bold text-sm truncate text-song group-hover:opacity-80 transition-all music-title-wrap flex items-center justify-center gap-1.5 px-4">
                          {currentTrack?.id === item.music?.id && isPlaying && (
                            <div className="flex gap-0.5 items-end h-3 mb-0.5 shrink-0">
                              <motion.div animate={{ height: [4, 10, 6, 8, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 bg-brand rounded-full" />
                              <motion.div animate={{ height: [8, 4, 10, 5, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-brand rounded-full" />
                              <motion.div animate={{ height: [5, 9, 4, 10, 5] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-brand rounded-full" />
                            </div>
                          )}
                          <span className="title-text truncate">{item.music?.nome || 'Título desconhecido'}</span>
                          {!((item.music?.trackId && String(item.music.trackId).length > 15) || (item.music?.id && String(item.music.id).length > 20) || item.music?.isSpotify || item.music?.trackUri || item.music?.uri) && <span className="music-badge-preview">(Preview)</span>}
                        </h3>
                        <p className="text-zinc-500 text-xs truncate">
                          {item.music?.artista || 'Artista desconhecido'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar size={10} className="text-zinc-600" />
                          <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-tighter">
                            {formatDate(item.dataAdicao)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-tighter truncate max-w-[60px]">
                          {item.music?.album || 'N/A'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => playNext(item.music)}
                            className="p-2 text-zinc-500 hover:text-brand hover:bg-brand/10 rounded-full transition-all"
                            title="Tocar a seguir"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            onClick={() => addToQueue(item.music)}
                            className="p-2 text-zinc-500 hover:text-brand hover:bg-brand/10 rounded-full transition-all"
                            title="Adicionar à fila"
                          >
                            <ListMusic size={18} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === item.music?.id ? null : item.music?.id)}
                              className={`p-2 rounded-full transition-all ${activeMenu === item.music?.id ? 'bg-brand/20 text-brand' : 'text-zinc-500 hover:text-brand hover:bg-brand/10'}`}
                              title="Adicionar à Playlist"
                            >
                              <ListPlus size={18} />
                            </button>

                            {activeMenu === item.music?.id && (
                              <AddToPlaylistMenu
                                music={item.music}
                                onClose={() => setActiveMenu(null)}
                              />
                            )}
                          </div>

                          <button
                            onClick={() => setShowConfirm(item)}
                            disabled={deletingId === item.music?.id}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all disabled:opacity-30"
                            title="Remover das Curtidas"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {paginatedCollection.map((item) => (
                    <div
                      key={item.id}
                      className={`music-list-item group transition-all duration-500 border-2 ${currentTrack?.id === item.music?.id
                          ? 'shadow-[0_0_30px_rgba(var(--brand-rgb),0.2)] ring-1 ring-brand/30 translate-x-2'
                          : 'border-transparent'
                        }`}
                      style={currentTrack?.id === item.music?.id ? {
                        borderColor: 'var(--brand-color)',
                        borderWidth: '2.5px',
                        borderStyle: 'solid',
                        backgroundColor: 'color-mix(in srgb, var(--brand-color) 15%, transparent)',
                        boxShadow: '0 0 30px color-mix(in srgb, var(--brand-color) 20%, transparent)'
                      } : {}}
                    >
                      <div className="item-image relative">
                        <img
                          src={item.music?.capaUrl?.replace('100x100', '200x200') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                          alt={item.music?.nome}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => item.music && playTrack(item.music, playlist)}
                          className="absolute inset-0 bg-brand/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-brand-contrast"
                        >
                          {currentTrack?.id === item.music?.id && isPlaying ? (
                            <Pause size={16} fill="currentColor" />
                          ) : (
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="item-info">
                        <h3 className="font-bold text-sm truncate text-song flex items-center gap-2">
                          {currentTrack?.id === item.music?.id && isPlaying && (
                            <div className="flex gap-0.5 items-end h-3 mb-0.5 shrink-0">
                              <motion.div animate={{ height: [4, 12, 6, 10, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 bg-brand rounded-full" />
                              <motion.div animate={{ height: [8, 4, 12, 6, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-brand rounded-full" />
                              <motion.div animate={{ height: [6, 10, 4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-brand rounded-full" />
                            </div>
                          )}
                          {item.music?.source === 'SPOTIFY' && !spotifyToken && <Lock size={12} className="text-brand shrink-0" />}
                          <span className="truncate">{item.music?.nome || 'Título desconhecido'}</span>
                          {item.music?.source === 'SPOTIFY' ? (
                            <span className="bg-[#1DB954]/20 text-[#1DB954] text-[8px] font-black px-1.5 py-0.5 rounded-md border border-[#1DB954]/20 uppercase tracking-tighter shrink-0">Spotify</span>
                          ) : (
                            <span className="bg-brand/10 text-brand text-[8px] font-black px-1.5 py-0.5 rounded-md border border-brand/20 uppercase tracking-tighter shrink-0">Synfonia</span>
                          )}
                          {!((item.music?.trackId && String(item.music.trackId).length > 15) || (item.music?.id && String(item.music.id).length > 20) || item.music?.isSpotify || item.music?.trackUri || item.music?.uri) && <span className="music-badge-preview">(Preview)</span>}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs">
                          <span className="text-brand">{item.music?.artista}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500 truncate">{item.music?.album}</span>
                          <span className="text-zinc-600 hidden sm:inline">•</span>
                          <span className="text-zinc-600 text-[10px] hidden sm:inline">{formatDate(item.dataAdicao)}</span>
                        </div>
                      </div>

                      <div className="item-actions flex items-center gap-1 md:gap-2">
                        <button
                          onClick={() => playNext(item.music)}
                          className="p-2 text-zinc-500 hover:text-brand hover:bg-brand/10 rounded-full transition-all hidden md:block"
                          title="Tocar a seguir"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => addToQueue(item.music)}
                          className="p-2 text-zinc-500 hover:text-brand hover:bg-brand/10 rounded-full transition-all"
                          title="Adicionar à fila"
                        >
                          <ListMusic size={18} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === item.music?.id ? null : item.music?.id)}
                            className={`p-2 rounded-full transition-all ${activeMenu === item.music?.id ? 'bg-brand/20 text-brand' : 'text-zinc-500 hover:text-brand hover:bg-brand/10'}`}
                          >
                            <ListPlus size={18} />
                          </button>
                          {activeMenu === item.music?.id && (
                            <div className="absolute right-0 bottom-full mb-2">
                              <AddToPlaylistMenu
                                music={item.music}
                                onClose={() => setActiveMenu(null)}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowConfirm(item)}
                          disabled={deletingId === item.music?.id}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8">
                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 no-scrollbar">
                    {(() => {
                      const maxVisible = 5;
                      let start = Math.max(1, currentPage - 2);
                      let end = Math.min(totalPages, start + maxVisible - 1);

                      if (end === totalPages) {
                        start = Math.max(1, end - maxVisible + 1);
                      }

                      const pages = [];
                      for (let i = start; i <= end; i++) pages.push(i);

                      return pages.map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`min-w-[40px] h-10 px-2 rounded-xl font-bold text-xs transition-all ${currentPage === page
                              ? 'bg-brand text-brand-contrast shadow-lg shadow-brand/20'
                              : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'
                            }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>


                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
              </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center">
                    <Search className="text-zinc-700 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-400">Nenhum resultado encontrado</h3>
                  <p className="text-zinc-600 max-w-sm">Não encontramos "{searchTerm}" na sua biblioteca.</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-2 bg-brand/20 text-brand rounded-xl font-bold hover:bg-brand/30 transition-all text-xs"
                  >
                    Limpar pesquisa
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <Heart className="w-16 h-16 text-zinc-800 mb-4" />
              <h3 className="text-xl font-bold text-zinc-400">Suas curtidas estão em silêncio</h3>
              <p className="text-zinc-600 mt-2 mb-8 text-center max-w-md">Que tal curtir algumas músicas novas no Início ou trazer suas favoritas do Spotify?</p>
              {spotifyToken && !hasSpotifyTracks && (
                <button
                  onClick={handleImportSpotify}
                  disabled={isSyncing}
                  className="flex items-center gap-3 bg-brand text-brand-contrast font-bold py-4 px-8 rounded-2xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95"
                >
                  <Download size={22} className={isSyncing ? 'animate-bounce' : ''} />
                  Importar do Spotify
                </button>
              )}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="text-red-500" size={32} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Tem certeza?</h3>
                  <p className="text-zinc-500 mt-2">
                    Você está prestes a remover <span className="text-zinc-200 font-bold">"{showConfirm.music?.nome}"</span> das suas músicas curtidas.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                  <button
                    onClick={() => removeMusic(showConfirm.music?.id)}
                    disabled={deletingId === showConfirm.music?.id}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    {deletingId === showConfirm.music?.id ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : "Sim, remover música"}
                  </button>
                  <button
                    onClick={() => setShowConfirm(null)}
                    disabled={deletingId}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-4 rounded-2xl transition-all border border-white/5 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearSpotifyConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="text-red-500" size={32} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Limpar Sincronização?</h3>
                  <p className="text-zinc-500 mt-2">
                    Isso removerá <span className="text-red-500 font-bold">TODAS</span> as músicas importadas do Spotify da sua biblioteca. As músicas salvas manualmente (iTunes) não serão afetadas.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                  <button
                    onClick={handleClearSpotify}
                    disabled={isSyncing}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSyncing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : "Sim, confirmar limpeza"}
                  </button>
                  <button
                    onClick={() => setShowClearSpotifyConfirm(false)}
                    disabled={isSyncing}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-4 rounded-2xl transition-all border border-white/5 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>


  );
};

export default LibraryPage;
