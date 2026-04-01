import React, { useState, useEffect, useMemo } from 'react';
import { Search, Play, Pause, Heart, Loader2, Music as MusicIcon, ChevronDown, ChevronLeft, ChevronRight, Check, LayoutGrid, List, ListPlus, ListMusic, Plus, Lock } from 'lucide-react';
import { musicService } from '../../services/musicService';
import { spotifyService } from '../../services/spotifyService';
import { authService } from '../../services/authService';
import { useAudio } from '../../hooks/useAudio';
import { useTheme } from '../../context/ThemeContext';

const DashboardPage = () => {
  const { playTrack, currentTrack, isPlaying, addToQueue, playNext } = useAudio();
  const [addedIds, setAddedIds] = useState(new Set());
  const { viewMode, toggleViewMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all'); // all, title, artist, album
  const [musics, setMusics] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const user = authService.getCurrentUser();
  const spotifyToken = spotifyService.getAccessToken();

  const filteredHistory = useMemo(() => {
    if (spotifyToken) return history;
    return history.filter(item => item.music && item.music.source !== 'SPOTIFY' && !(item.music.uri && item.music.uri.includes('spotify')));
  }, [history, spotifyToken]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let dbHistory = [];
        if (!authService.isGuest()) {
          dbHistory = await musicService.getHistory();
        }
        
        // Buscar histórico local (fallback para Spotify)
        const localHistory = JSON.parse(localStorage.getItem('synfonia_local_history') || '[]');
        
        // Mesclar e remover duplicatas
        // Começamos com o histórico do banco
        const combined = [...dbHistory];
        
        localHistory.forEach(localItem => {
          const isAlreadyInDb = combined.some(dbItem => 
            (dbItem.music?.trackId && dbItem.music.trackId === localItem.music.trackId) ||
            (dbItem.music?.id && String(dbItem.music.id) === String(localItem.music.id))
          );
          
          if (!isAlreadyInDb) {
            combined.push(localItem);
          }
        });

        // Ordenar por data (MAIS RECENTE PRIMEIRO)
        const sorted = combined.sort((a, b) => {
          const dateA = new Date(a.data || a.playedAt || 0);
          const dateB = new Date(b.data || b.playedAt || 0);
          return dateB - dateA;
        });

        setHistory(sorted);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    // Carregar na mudança de música
    const timeoutId = setTimeout(fetchHistory, 1500);
    
    // Polling em tempo real enquanto na tela de início (cada 12s)
    const intervalId = setInterval(fetchHistory, 12000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [currentTrack?.id]); // Recarrega o histórico sempre que a música mudar ou a cada 12s

  const searchOptions = [
    { id: 'all', label: 'Tudo' },
    { id: 'title', label: 'Música' },
    { id: 'artist', label: 'Artista' },
    { id: 'album', label: 'Álbum' },
  ];

  const handleQuickSearch = (term, type) => {
    setSearchTerm(term);
    setSearchType(type);
    setLoading(true);
    setHasSearched(true);
    setMessage(null);
    setCurrentPage(1);

    const spotifyToken = spotifyService.getAccessToken();
    if (spotifyToken) {
      spotifyService.search(term, type, 0).then(data => {
        setMusics(data.items || []);
        setTotalItems(data.total || 0);
        setHasSearched(true);
        setLoading(false);
      }).catch(err => {
        console.error('Quick search error:', err);
        setLoading(false);
      });
    } else {
      musicService.search(term, type).then(data => {
        // Filtro para remover músicas do Spotify se não estiver logado
        const filtered = (data || []).filter(m => m.source !== 'SPOTIFY' && !(m.uri && m.uri.includes('spotify')));
        setMusics(filtered);
        setTotalItems(filtered.length);
        setHasSearched(true);
        setLoading(false);
      }).catch(err => {
        console.error('Quick search error:', err);
        setLoading(false);
      });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setMessage(null);
    setCurrentPage(1);

    try {
      if (spotifyToken) {
        const results = await spotifyService.search(searchTerm, searchType, 0);
        setMusics(results.items || []);
        setTotalItems(results.total || 0);
      } else {
        const results = await musicService.search(searchTerm, searchType);
        // Filtro para remover músicas do Spotify se não estiver logado
        const filtered = (results || []).filter(m => m.source !== 'SPOTIFY' && !(m.uri && m.uri.includes('spotify')));
        setMusics(filtered);
        setTotalItems(filtered.length);
      }
    } catch (err) {
      console.error('Search error:', err);
      setMessage({ type: 'error', text: 'Erro ao buscar músicas. Verifique sua conexão.' });
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Paginação Local
  const totalPages = Math.ceil((spotifyToken ? totalItems : musics.length) / itemsPerPage);
  const paginatedMusics = useMemo(() => {
    if (spotifyToken) {
      return musics;
    }
    const start = (currentPage - 1) * itemsPerPage;
    return musics.slice(start, start + itemsPerPage);
  }, [musics, currentPage, spotifyToken]);

  const handlePageChange = async (newPage) => {
    if (newPage === currentPage) return;
    setCurrentPage(newPage);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });

    const token = spotifyService.getAccessToken();
    if (token) {
      setLoading(true);
      try {
        const offset = (newPage - 1) * itemsPerPage;
        const results = await spotifyService.search(searchTerm, searchType, offset);
        setMusics(results.items || []);
        setTotalItems(results.total || 0);
      } catch (err) {
        console.error('Pagination search error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const saveMusic = async (track) => {
    if (authService.isGuest()) {
      setMessage({ type: 'error', text: 'Crie uma conta para salvar músicas na sua coleção!' });
      return;
    }

    try {
      const musicData = {
        trackId: String(track.trackId || track.id),
        nome: track.nome,
        artista: track.artista,
        album: track.album || '',
        capaUrl: track.capaUrl,
        previewUrl: track.previewUrl || '',
        source: track.source || (track.isSpotify ? 'SPOTIFY' : 'ITUNES')
      };

      await musicService.saveToCollection(user.id, musicData);
      
      setAddedIds(prev => {
        const next = new Set(prev);
        next.add(track.trackId || track.id);
        return next;
      });
      
      setMessage({ type: 'success', text: 'Música salva na sua coleção!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: 'Erro ao salvar música.' });
    }
  };


  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-32 md:pb-8">
      {/* Search Section */}
      <section className="relative">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-brand to-purple-400 bg-clip-text text-transparent">Descubra sons inacreditáveis</h1>
          <p className="text-dim mb-6 font-medium text-sm md:text-base">Explore milhões de faixas, adicione as melhores à sua coleção e compartilhe com outras pessoas no seu perfil.</p>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 md:gap-2">
            <div className="flex gap-2 flex-1">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand transition-colors w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchType === 'all' ? "Buscar..." : `Buscar por ${searchOptions.find(o => o.id === searchType).label.toLowerCase()}...`}
                  className="w-full bg-(--bg-card) border-(--border-subtle) rounded-2xl pl-12 pr-4 py-4 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-main placeholder:text-dim/40 transition-all shadow-xl"
                />
              </div>

              <div className="relative min-w-[100px] md:min-w-[140px]">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full h-full bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-4 appearance-none text-main font-medium focus:border-brand outline-none cursor-pointer transition-all hover:bg-(--bg-side) text-sm md:text-base"
                >
                  {searchOptions.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-(--bg-main) text-main">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dim pointer-events-none w-4 h-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-brand text-brand-contrast px-8 py-4 rounded-2xl text-sm font-bold hover:bg-brand/90 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-brand/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Buscar'}
            </button>
          </form>
        </div>
      </section>

      {/* Escute Novamente Section */}
      {!loadingHistory && history.length > 0 && !hasSearched && (
        <section className="space-y-4 pt-4 md:pt-6 animate-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-xl md:text-2xl font-bold text-main flex items-center gap-2">
             <Play className="text-brand fill-brand" size={20} />
             Escute novamente
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
             {filteredHistory.slice(0, 10).map((item) => (
                <div key={item.id} className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border border-(--border-subtle) flex flex-col h-full cursor-pointer" onClick={() => playTrack(item.music, filteredHistory.map(h => h.music))}>
                   <div className="relative aspect-square mb-3 rounded-xl overflow-hidden shadow-lg">
                      <img
                        src={item.music?.capaUrl?.replace('100x100', '400x400') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'}
                        alt={item.music?.nome}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${(item.music?.isSpotify || item.music?.source === 'SPOTIFY' || (item.music?.uri && item.music.uri.includes('spotify'))) && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                      />

                      {/* Source Badge */}
                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        {(item.music?.isSpotify || item.music?.source === 'SPOTIFY' || (item.music?.uri && item.music.uri.includes('spotify'))) ? (
                          <span className="bg-[#1DB954]/90 text-white text-[7px] font-black px-1 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Spotify</span>
                        ) : (
                          <span className="bg-brand/90 text-brand-contrast text-[7px] font-black px-1 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Synfonia</span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                         {(item.music?.isSpotify || item.music?.source === 'SPOTIFY' || (item.music?.uri && item.music.uri.includes('spotify'))) && !spotifyToken ? (
                           <div className="flex flex-col items-center gap-1">
                             <div className="w-8 h-8 bg-zinc-900/80 rounded-full flex items-center justify-center border border-white/10">
                               <Lock className="text-brand" size={14} />
                             </div>
                             <span className="text-[8px] font-bold text-white uppercase tracking-widest">Premium</span>
                           </div>
                         ) : (
                           <button
                             className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-90"
                           >
                              {currentTrack?.id === item.music?.id && isPlaying ? (
                                <Pause className="text-brand-contrast fill-current" size={16} />
                              ) : (
                                <Play className="text-brand-contrast fill-current ml-1" size={16} />
                              )}
                           </button>
                         )}
                      </div>
                   </div>
                   <h3 className="font-bold text-xs md:text-sm truncate text-song group-hover:opacity-80 transition-all music-title-wrap" title={item.music?.nome}>
                      <span className="title-text truncate">{item.music?.nome}</span>
                      {!((item.music?.trackId && String(item.music.trackId).length > 15) || (item.music?.id && String(item.music.id).length > 20) || item.music?.isSpotify || item.music?.trackUri || item.music?.uri) && <span className="music-badge-preview">(Preview)</span>}
                   </h3>
                   <p className="text-dim text-[10px] md:text-xs truncate text-center mt-0.5">{item.music?.artista}</p>
                </div>
             ))}
          </div>
        </section>
      )}

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-2xl border animate-in slide-in-from-right-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Grid Results */}
      <section className="space-y-6">
        {musics.length > 0 && !loading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
            <h2 className="text-lg md:text-xl font-bold text-main flex items-center gap-2">
              Resultados
            </h2>
            
            <div className="flex items-center gap-4">
              {/* Seletor de Visualização (Grid/List) */}
              <div className="flex items-center bg-(--bg-card) border border-(--border-subtle) rounded-xl p-1">
                <button 
                  onClick={() => viewMode !== 'grid' && toggleViewMode()}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main hover:bg-black/10 dark:hover:bg-white/10'}`}
                  title="Visualização em Grade"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => viewMode !== 'list' && toggleViewMode()}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main hover:bg-black/10 dark:hover:bg-white/10'}`}
                  title="Visualização em Lista"
                >
                  <List size={16} />
                </button>
              </div>

              {totalPages > 1 && (
                <p className="text-[10px] md:text-xs font-bold text-dim uppercase tracking-widest">
                  Página <span className="text-brand">{currentPage}</span> de {totalPages}
                </p>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-brand animate-spin" />
            <p className="text-dim font-medium tracking-wide">Sincronizando com a SYNFONIA...</p>
          </div>
        ) : musics.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {paginatedMusics.map((music) => (
                  <div key={music.id} className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border border-(--border-subtle) flex flex-col h-full">
                    <div className="relative aspect-square mb-3 md:mb-4 rounded-xl overflow-hidden shadow-2xl">
                      <img
                        src={music.capaUrl?.replace('100x100', '400x400') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'}
                        alt={music.nome}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${(music.isSpotify || music.source === 'SPOTIFY' || (music.uri && music.uri.includes('spotify'))) && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                      />

                      {/* Source Badge */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {(music.isSpotify || music.source === 'SPOTIFY' || (music.uri && music.uri.includes('spotify'))) ? (
                          <span className="bg-[#1DB954]/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Spotify</span>
                        ) : (
                          <span className="bg-brand/90 text-brand-contrast text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/10 uppercase tracking-tighter">{music.source === 'ITUNES' ? 'Apple' : 'Synfonia'}</span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">

                        {(music.isSpotify || music.source === 'SPOTIFY' || (music.uri && music.uri.includes('spotify'))) && !spotifyToken ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-zinc-900/80 rounded-full flex items-center justify-center border border-white/10">
                              <Lock className="text-brand" size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Premium</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => playNext(music)}
                              className="w-9 h-9 bg-zinc-800/80 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 hover:bg-zinc-700 text-white"
                              title="Tocar a seguir"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={() => playTrack(music, paginatedMusics)}
                              className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-90"
                            >
                              {currentTrack?.id === music.id && isPlaying ? (
                                <Pause className="text-brand-contrast fill-current" size={20} />
                              ) : (
                                <Play className="text-brand-contrast fill-current ml-1" size={20} />
                              )}
                            </button>
                            <button
                              onClick={() => addToQueue(music)}
                              className="w-9 h-9 bg-zinc-800/80 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 hover:bg-zinc-700 text-white"
                              title="Adicionar à fila"
                            >
                              <ListMusic size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-bold text-xs md:text-sm truncate text-song group-hover:opacity-80 transition-all music-title-wrap" title={music.nome}>
                        <span className="title-text truncate">{music.nome}</span>
                        {!((music.trackId && String(music.trackId).length > 15) || (music.id && String(music.id).length > 20) || music.isSpotify || music.trackUri || music.uri) && <span className="music-badge-preview">(Preview)</span>}
                      </h3>
                      <p className="text-dim text-[10px] md:text-xs truncate transition-colors">
                        {music.artista}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <p
                        className="text-dim/60 text-[10px] uppercase tracking-tighter truncate flex-1 mr-2"
                        title={music.album}
                      >
                        {music.album}
                      </p>

                      <button
                        onClick={() => saveMusic(music)}
                        className={`p-2 rounded-full transition-all shrink-0 ${
                          addedIds.has(music.trackId || music.id) 
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-110' 
                            : 'hover:bg-brand/20 text-brand'
                        }`}
                        title={addedIds.has(music.trackId || music.id) ? "Salva na coleção" : "Salvar na Coleção"}
                      >
                        {addedIds.has(music.trackId || music.id) ? <Check size={18} /> : <Heart size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {paginatedMusics.map((music) => (
                  <div key={music.id} className="music-list-item group">
                    <div className="item-image relative">
                      <img
                        src={music.capaUrl?.replace('100x100', '200x200') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                        alt={music.nome}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => playTrack(music, paginatedMusics)}
                        className="absolute inset-0 bg-brand/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-brand-contrast"
                      >
                        {currentTrack?.id === music.id && isPlaying ? (
                          <Pause size={16} fill="currentColor" />
                        ) : (
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="item-info">
                      <h3 className="font-bold text-sm truncate text-song flex items-center gap-2" title={music.nome}>
                        {(music.isSpotify || music.source === 'SPOTIFY' || (music.uri && music.uri.includes('spotify'))) && !spotifyToken && <Lock size={12} className="text-brand shrink-0" />}
                        <span className="truncate">{music.nome}</span>
                        {(music.isSpotify || music.source === 'SPOTIFY' || (music.uri && music.uri.includes('spotify'))) ? (
                          <span className="bg-[#1DB954]/20 text-[#1DB954] text-[8px] font-black px-1.5 py-0.5 rounded-md border border-[#1DB954]/20 uppercase tracking-tighter shrink-0">Spotify</span>
                        ) : (
                          <span className="bg-brand/10 text-brand text-[8px] font-black px-1.5 py-0.5 rounded-md border border-brand/20 uppercase tracking-tighter shrink-0">{music.source === 'ITUNES' ? 'Apple' : 'Synfonia'}</span>
                        )}
                        {!((music.trackId && String(music.trackId).length > 15) || (music.id && String(music.id).length > 20) || music.isSpotify || music.trackUri || music.uri) && <span className="music-badge-preview">(Preview)</span>}

                      </h3>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs">
                        <span 
                          className="text-brand"
                        >
                          {music.artista}
                        </span>
                        <span className="text-dim/40">•</span>
                        <span 
                          className="text-dim truncate"
                        >
                          {music.album}
                        </span>
                      </div>

                    </div>

                    <div className="item-actions">
                      <div className="flex items-center gap-1 md:gap-3 shrink-0">
                        <button
                          onClick={() => playNext(music)}
                          className="p-2 text-dim hover:text-brand transition-colors hidden md:block"
                          title="Tocar a seguir"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => addToQueue(music)}
                          className="p-2 text-dim hover:text-brand transition-colors"
                          title="Adicionar à fila"
                        >
                          <ListMusic size={18} />
                        </button>
                        <button
                          onClick={() => saveMusic(music)}
                          className={`p-2 rounded-full transition-all ${
                            addedIds.has(music.trackId || music.id) 
                              ? 'text-green-500' 
                              : 'text-dim hover:text-brand hover:bg-brand/10'
                          }`}
                          title={addedIds.has(music.trackId || music.id) ? "Salva na coleção" : "Salvar na Coleção"}
                        >
                          {addedIds.has(music.trackId || music.id) ? <Check size={18} /> : <Heart size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Controles de Paginação Adaptativos */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-6 pt-12">
                <div className="w-full h-px bg-linear-to-r from-transparent via-(--border-subtle) to-transparent" />
                
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 p-3 md:px-5 md:py-3 bg-(--bg-side) border border-(--border-subtle) rounded-2xl text-dim hover:text-main hover:bg-brand/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden md:inline">Anterior</span>
                  </button>
                  


                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 p-3 md:px-5 md:py-3 bg-(--bg-side) border border-(--border-subtle) rounded-2xl text-dim hover:text-main hover:bg-brand/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest"
                  >
                    <span className="hidden md:inline">Próxima</span>
                    <ChevronRight size={16} />
                  </button>
                </div>


              </div>
            )}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-20 animate-in fade-in">
            <MusicIcon className="w-16 h-16 text-dim/20 mx-auto mb-4" />
            <h3 className="text-dim text-lg font-medium">Nenhum resultado para "{searchTerm}"</h3>
          </div>
        ) : (
          <div className="text-center py-20 animate-in fade-in">
            <Search className="w-16 h-16 text-dim/20 mx-auto mb-4" />
            <h3 className="text-dim text-lg font-medium">Digite o nome da música para começar</h3>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
