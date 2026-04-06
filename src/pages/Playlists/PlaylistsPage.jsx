import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ListMusic, Search, Music2, MoreHorizontal, Play, Pause, Globe, Lock, Smile, Frown, CloudRain, Moon, Sparkles, Loader2, AlertCircle, ArrowLeft, Trash2, Settings2, Calendar, Camera, X, LayoutGrid, List, ChevronRight, Shuffle, Download, Upload, Check } from 'lucide-react';
import { playlistService } from '../../services/playlistService';
import { musicService } from '../../services/musicService';
import { authService } from '../../services/authService';
import { spotifyService } from '../../services/spotifyService';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useAudio } from '../../hooks/useAudio';
import { useImport } from '../../context/ImportContext';
import { useTheme } from '../../context/ThemeContext';

const VIBE_PRESETS = [
  { icon: Smile, label: 'Feliz', value: 'feliz' },
  { icon: Frown, label: 'Triste', value: 'triste' },
  { icon: CloudRain, label: 'Melancólica', value: 'melancolica' },
  { icon: Moon, label: 'Noite', value: 'noite' },
  { icon: Sparkles, label: 'Energia', value: 'energia' },
];

const PlaylistsPage = () => {
  const { viewMode, toggleViewMode } = useTheme();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState([]);
  const [newPlaylist, setNewPlaylist] = useState({
    nome: '',
    vibe: 'feliz',
    publico: true,
    syncSpotify: false
  });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importId, setImportId] = useState('');
  const [isImportingById, setIsImportingById] = useState(false);
  const fileInputRef = useRef(null);

  const { 
    playTrack, 
    currentTrack, 
    isPlaying, 
    addToQueue, 
    playNext, 
    playPlaylist,
    spotifyToken,
    isSpotifyConnected,
    isSpotifySyncEnabled
  } = useAudio();

  const filteredPlaylistTracks = useMemo(() => {
    if (spotifyToken) return playlistTracks;
    return playlistTracks.filter(t => t && t.source !== 'SPOTIFY' && !(t.uri && t.uri.includes('spotify')));
  }, [playlistTracks, spotifyToken]);

  const { importPlaylist, importAllPlaylists, lastImportedPlaylist, exportPlaylists } = useImport();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlaylist?.id]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const data = await playlistService.getAll();
      setPlaylists(data || []);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      // Mantendo vazio se der erro (provavelmente 404/500 se o backend não existir ainda)
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const processImageForSpotify = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 512; // Spotify recomenda 300-640px
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Exportar como JPEG com qualidade balanceada para garantir < 256KB
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };
      img.onerror = reject;
    });
  };

  const urlToBase64ForSpotify = async (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        } catch (e) {
          reject(new Error('Canvas CORS error'));
        }
      };
      img.onerror = () => reject(new Error('Erro ao baixar imagem da capa'));
      // Se a imagem for Base64 (data:), não precisamos de cache buster, se for http, talvez previna cache CORS.
      img.src = url.startsWith('http') ? url + (url.includes('?') ? '&' : '?') + 'not-from-cache-please' : url;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      let spotifyPlaylistId = null;
      
      // Sincronização opcional com Spotify
      if (newPlaylist.syncSpotify && spotifyToken) {
        try {
          const spotifyPlaylist = await spotifyService.createPlaylist(
            spotifyToken,
            newPlaylist.nome,
            `Criada via Synfonia - Vibe: ${newPlaylist.vibe}`,
            newPlaylist.publico
          );
          if (spotifyPlaylist) {
            spotifyPlaylistId = spotifyPlaylist.id;
            
            // Upload da capa para o Spotify se houver imagem
            if (imageFile) {
              try {
                const base64Image = await processImageForSpotify(imageFile);
                await spotifyService.uploadPlaylistCover(spotifyToken, spotifyPlaylistId, base64Image);
              } catch (imgErr) {
                console.error("Erro ao processar/upload de capa para Spotify:", imgErr);
              }
            }
          } else {
            console.warn("Spotify Sync: Falha ao criar playlist no Spotify (verifique permissões)");
            setError("Spotify: Falha ao criar playlist remota. Reconecte sua conta.");
            setTimeout(() => setError(null), 5000);
          }
        } catch (err) {
          console.error("Erro ao sincronizar com Spotify:", err);
          setError(`Erro Spotify: ${err.message || 'Falha na conexão'}`);
          setTimeout(() => setError(null), 5000);
        }
      }

      const playlistData = {
        ...newPlaylist,
        spotifyPlaylistId,
        capaUrl: imageFile ? await fileToBase64(imageFile) : null
      };

      const created = await playlistService.create(playlistData);
      setPlaylists(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewPlaylist({ nome: '', vibe: 'feliz', publico: true, syncSpotify: false });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError('Falha ao criar playlist.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const updatedData = {
        nome: playlistToEdit.nome,
        vibe: playlistToEdit.vibe,
        publico: playlistToEdit.publico
      };

      const updated = await playlistService.update(playlistToEdit.id, updatedData);
      setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPlaylist?.id === updated.id) {
        setSelectedPlaylist(updated);
      }
      setShowEditModal(false);
      setPlaylistToEdit(null);
    } catch (err) {
      console.error('Error updating playlist:', err);
      setError('Falha ao atualizar playlist.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      await playlistService.delete(playlistToDelete.id);
      setPlaylists(prev => prev.filter(p => p.id !== playlistToDelete.id));
      if (selectedPlaylist?.id === playlistToDelete.id) {
        setSelectedPlaylist(null);
      }
      setShowDeleteConfirm(false);
      setPlaylistToDelete(null);
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError('Falha ao excluir playlist.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenImportModal = async () => {
    if (!spotifyToken) {
      setError("Conecte seu Spotify primeiro!");
      return;
    }
    setShowImportModal(true);
    setLoadingSpotify(true);
    try {
      const data = await spotifyService.getUserPlaylists(spotifyToken);
      setSpotifyPlaylists(data.items || []);
    } catch (err) {
      console.error("Erro ao carregar playlists do Spotify:", err);
      setError("Falha ao carregar playlists do Spotify.");
    } finally {
      setLoadingSpotify(false);
    }
  };

   const handleImportPlaylist = (spotifyPlaylist) => {
    importPlaylist(spotifyPlaylist, spotifyToken);
    setShowImportModal(false);
  };

  const handleImportAll = () => {
    if (spotifyPlaylists.length === 0) return;
    importAllPlaylists(spotifyPlaylists, spotifyToken);
    setShowImportModal(false);
  };

  const handleImportBySpecificId = async () => {
    let cleanId = importId.trim();
    // Extração robusta do ID (Regex para 22 caracteres alfanuméricos após 'playlist/')
    const urlMatch = cleanId.match(/playlist\/([a-zA-Z0-9]{22})/);
    if (urlMatch) {
      cleanId = urlMatch[1];
    } else {
      // Se não for URL, limpa possíveis espaços e query params
      cleanId = cleanId.split('?')[0].split('/').pop().trim();
    }
    
    if (!cleanId) return;
    setIsImportingById(true);
    try {
      const playlistData = await spotifyService.getPlaylist(spotifyToken, cleanId);
      if (playlistData) {
        // Envolve em um objeto similar ao que o Spotify API retorna para o importPlaylist
        await importPlaylist({
          id: cleanId,
          name: playlistData.name,
          images: playlistData.images
        }, spotifyToken);
        setImportId('');
        setShowImportModal(false);
      } else {
        setError("Playlist não encontrada ou ID inválido.");
      }
    } catch (err) {
      console.error("Erro ao importar por ID:", err);
      setError("Falha ao buscar playlist por ID. Verifique se o ID existe.");
    } finally {
      setIsImportingById(false);
    }
  };
  
  const handleExportSelected = () => {
    if (selectedForExport.length === 0) return;
    exportPlaylists(selectedForExport, playlists, spotifyToken, urlToBase64ForSpotify);
    setSelectedForExport([]);
    setShowExportModal(false);
  };

  const toggleExportSelection = (id) => {
    setSelectedForExport(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };
  
  // Sincronizar playlists importadas em background
  useEffect(() => {
    if (lastImportedPlaylist) {
      setPlaylists(prev => {
        const exists = prev.some(p => p.id === lastImportedPlaylist.id);
        if (exists) return prev;
        return [lastImportedPlaylist, ...prev];
      });
    }
  }, [lastImportedPlaylist]);

  const handleUpdateCover = async (file) => {
    if (!selectedPlaylist) return;
    setIsCreating(true);
    try {
      const base64 = await fileToBase64(file);
      const updated = await playlistService.update(selectedPlaylist.id, {
        capaUrl: base64
      });
      
      // Sincronizar com Spotify se houver ID vinculado
      if (updated.spotifyPlaylistId && spotifyToken) {
        try {
          const base64Spotify = await processImageForSpotify(file);
          await spotifyService.uploadPlaylistCover(spotifyToken, updated.spotifyPlaylistId, base64Spotify);
        } catch (spotifyErr) {
          console.error("Erro ao sincronizar capa com Spotify:", spotifyErr);
        }
      }

      setSelectedPlaylist(updated);
      setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      console.error('Error updating cover:', err);
      setError('Falha ao atualizar capa.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Imagem muito grande. Máximo 5MB.');
        return;
      }

      if (selectedPlaylist && !showCreateModal) {
        handleUpdateCover(file);
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks();
    }
  }, [selectedPlaylist]);

  const fetchPlaylistTracks = async () => {
    if (!selectedPlaylist.trackIds || selectedPlaylist.trackIds.length === 0) {
      setPlaylistTracks([]);
      return;
    }
    setLoadingTracks(true);
    try {
      const trackPromises = selectedPlaylist.trackIds.map(id => musicService.getById(id));
      const tracks = await Promise.all(trackPromises);
      setPlaylistTracks(tracks.filter(Boolean));
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
      setError('Erro ao carregar músicas da playlist.');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await playlistService.removeTrack(selectedPlaylist.id, trackId);
      setPlaylistTracks(prev => prev.filter(t => t.id !== trackId));
      // Update the local playlists state to reflect count change
      setPlaylists(prev => prev.map(p => 
        p.id === selectedPlaylist.id 
          ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } 
          : p
      ));
    } catch (err) {
      console.error('Error removing track:', err);
      setError('Erro ao remover música da playlist.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-32 md:pb-8">
      {/* Header com Botão de Criar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-row items-center justify-between md:block">
          <div>
            <h2 className="text-3xl font-bold text-main tracking-tight">Minhas Playlists</h2>
            <p className="text-dim mt-1">Organize suas batidas favoritas por vibe</p>
          </div>
          
          <div className="md:hidden flex items-center bg-(--bg-card) border border-(--border-subtle) rounded-xl p-1">
            <button 
              onClick={() => viewMode !== 'grid' && toggleViewMode()}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => viewMode !== 'list' && toggleViewMode()}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="hidden md:flex items-center bg-(--bg-card) border border-(--border-subtle) rounded-xl p-1">
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

          <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
            {spotifyToken && (
              <>
                <button 
                  onClick={handleOpenImportModal}
                  className="flex-1 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 text-dim font-bold py-3 px-3 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:text-main transition-all active:scale-95 whitespace-nowrap text-xs sm:text-base min-w-0"
                >
                  <Download size={18} className="shrink-0" />
                  <span className="truncate">Importar</span>
                </button>
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 text-dim font-bold py-3 px-3 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:text-main transition-all active:scale-95 whitespace-nowrap text-xs sm:text-base min-w-0"
                >
                  <Upload size={18} className="shrink-0" />
                  <span className="truncate">Exportar</span>
                </button>
              </>
            )}

            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-brand text-brand-contrast font-bold py-3 px-3 rounded-2xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95 whitespace-nowrap text-xs sm:text-base min-w-0"
            >
              <Plus size={18} className="shrink-0" />
              <span className="truncate">Nova Playlist</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      {/* View de Detalhes da Playlist */}
      {selectedPlaylist ? (
        <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedPlaylist(null)}
              className="p-3 bg-brand/5 hover:bg-brand/10 rounded-2xl text-dim hover:text-main transition-all border border-(--border-subtle)"
            >
              <ArrowLeft size={24} />
            </button>
            
            <div className="flex items-center gap-4">
              <div 
                className="w-24 h-24 bg-brand/20 rounded-3xl flex items-center justify-center overflow-hidden border border-white/10 relative group cursor-pointer shadow-xl shadow-brand/10"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedPlaylist.capaUrl ? (
                  <img src={selectedPlaylist.capaUrl} alt={selectedPlaylist.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <ListMusic className="text-brand w-10 h-10 group-hover:scale-110 transition-transform" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1 backdrop-blur-[2px]">
                  <Camera className="text-white" size={20} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Alterar</span>
                </div>
              </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-4 overflow-hidden">
              <div className="min-w-0">
                <h3 className="text-2xl md:text-3xl font-bold text-main tracking-tight truncate">{selectedPlaylist.nome}</h3>
                <div className="flex items-center gap-2 text-dim text-sm md:text-base">
                  <span className="capitalize font-medium text-brand-legible">{selectedPlaylist.vibe}</span>
                  <span className="opacity-30">•</span>
                  <span>{playlistTracks.length} músicas</span>
                </div>
              </div>

              {playlistTracks.length > 0 && (
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <button 
                    onClick={() => playPlaylist(selectedPlaylist.trackIds, { shuffle: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-contrast rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95 text-xs"
                  >
                    <Shuffle size={14} />
                    <span>Aleatório</span>
                  </button>

                  <div className="flex items-center bg-(--bg-card) border border-(--border-subtle) rounded-xl p-1">
                    <button 
                      onClick={() => viewMode !== 'grid' && toggleViewMode()}
                      className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
                      title="Visualização em Grade"
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button 
                      onClick={() => viewMode !== 'list' && toggleViewMode()}
                      className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
                      title="Visualização em Lista"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {loadingTracks ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
              <p className="text-dim">Recuperando trilhas...</p>
            </div>
          ) : filteredPlaylistTracks.length > 0 ? (
            <div className="space-y-6 md:space-y-8">
              {(() => {
                const totalPages = Math.ceil(filteredPlaylistTracks.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedTracks = filteredPlaylistTracks.slice(startIndex, startIndex + itemsPerPage);

                return (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {paginatedTracks.map((music) => (
                    <div key={music.id} 
                      className={`glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border-2 ${
                        currentTrack?.id === music.id 
                          ? 'ring-4 ring-brand/20 shadow-[0_0_40px_rgba(var(--brand-rgb),0.3)] scale-[1.02]' 
                          : 'border-white/5'
                      }`}
                      style={currentTrack?.id === music.id ? {
                        borderColor: 'var(--brand-color)',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        backgroundColor: 'color-mix(in srgb, var(--brand-color) 10%, transparent)',
                        boxShadow: '0 0 40px color-mix(in srgb, var(--brand-color) 30%, transparent)'
                      } : {}}
                    >
                      <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-2xl">
                        <img
                          src={music.capaUrl?.replace('100x100', '400x400')}
                          alt={music.nome}
                          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${music.source === 'SPOTIFY' && !spotifyToken ? 'grayscale opacity-50' : ''}`}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          {music.source === 'SPOTIFY' && !spotifyToken ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-zinc-900/80 rounded-full flex items-center justify-center border border-white/10">
                                <Lock className="text-brand" size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Premium</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => playTrack(music, playlistTracks)}
                              className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-90"
                            >
                              {currentTrack?.id === music.id && isPlaying ? (
                                <Pause className="text-brand-contrast fill-current" size={20} />
                              ) : (
                                <Play className="text-brand-contrast fill-current ml-1" size={20} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-sm truncate text-song group-hover:opacity-80 transition-opacity music-title-wrap" title={music.nome}>
                          <span className="title-text truncate">{music.nome}</span>
                          {!((music.trackId && String(music.trackId).length > 15) || (music.id && String(music.id).length > 20) || music.isSpotify || music.trackUri || music.uri) && <span className="music-badge-preview">(Preview)</span>}
                        </h3>
                        <p className="text-dim text-xs truncate text-center">{music.artista}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-(--border-subtle) flex items-center justify-between">
                        <span className="text-dim/60 text-[10px] uppercase font-bold tracking-widest truncate max-w-[120px]">
                          {music.album}
                        </span>
                        <button 
                          onClick={() => handleRemoveTrack(music.id)}
                          className="p-2 text-dim/60 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                          title="Remover da Playlist"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playlistTracks.map((music) => (
                    <div key={music.id} 
                      className={`music-list-item group border-2 ${
                        currentTrack?.id === music.id 
                          ? 'shadow-[0_0_30px_rgba(var(--brand-rgb),0.2)] ring-1 ring-brand/30 translate-x-2' 
                          : 'border-transparent'
                      }`}
                      style={currentTrack?.id === music.id ? {
                        borderColor: 'var(--brand-color)',
                        borderWidth: '2.5px',
                        borderStyle: 'solid',
                        backgroundColor: 'color-mix(in srgb, var(--brand-color) 15%, transparent)',
                        boxShadow: '0 0 30px color-mix(in srgb, var(--brand-color) 20%, transparent)'
                      } : {}}
                    >
                      <div className="item-image relative">
                        <img
                          src={music.capaUrl?.replace('100x100', '200x200')}
                          alt={music.nome}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => playTrack(music, playlistTracks)}
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
                          {music.source === 'SPOTIFY' && !spotifyToken && <Lock size={12} className="text-brand shrink-0" />}
                          <span className="truncate">{music.nome}</span>
                          {!((music.trackId && String(music.trackId).length > 15) || (music.id && String(music.id).length > 20) || music.isSpotify || music.trackUri || music.uri) && <span className="music-badge-preview">(Preview)</span>}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs text-dim">
                          <span className="text-brand">{music.artista}</span>
                          <span className="opacity-30">•</span>
                          <span className="truncate">{music.album}</span>
                        </div>
                      </div>

                      <div className="item-actions flex items-center gap-1">
                        <button 
                          onClick={() => playNext(music)}
                          className="p-2 text-dim hover:text-brand transition-all hidden md:block"
                          title="Tocar a seguir"
                        >
                          <Plus size={18} />
                        </button>
                        <button 
                          onClick={() => addToQueue(music)}
                          className="p-2 text-dim hover:text-brand transition-all"
                          title="Adicionar à fila"
                        >
                          <ListMusic size={18} />
                        </button>
                        <button 
                          onClick={() => handleRemoveTrack(music.id)}
                          className="p-2 text-dim hover:text-red-500 transition-all"
                          title="Remover da Playlist"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8 border-t border-(--border-subtle)">
                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-dim hover:text-main transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-2">
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
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`min-w-[40px] h-10 px-2 rounded-xl font-bold text-xs transition-all ${
                            currentPage === page 
                              ? 'bg-brand text-brand-contrast shadow-lg shadow-brand/20' 
                              : 'bg-white/5 text-dim hover:text-main hover:bg-white/10'
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-dim hover:text-main transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-(--bg-side) rounded-[40px] border border-dashed border-(--border-subtle) text-center">
              <Music2 className="text-dim/20 w-16 h-16 mb-4" />
              <h4 className="text-lg font-bold text-dim">Nenhuma música aqui</h4>
              <p className="text-dim/60 text-sm max-w-xs mt-2">Curta músicas no Início e depois organize-as nesta playlist!</p>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
          <p className="text-dim animate-pulse">Carregando suas coleções...</p>
        </div>
      ) : playlists.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map((playlist) => {
                const VibeIcon = VIBE_PRESETS.find(v => v.value === playlist.vibe)?.icon || ListMusic;
                
                return (
                  <div 
                    key={playlist.id} 
                    onClick={() => setSelectedPlaylist(playlist)}
                    className="group bg-(--bg-card) border border-(--border-subtle) p-4 md:p-5 rounded-[24px] md:rounded-[32px] hover:bg-brand/5 transition-all hover:-translate-y-1 relative cursor-pointer shadow-sm hover:shadow-xl hover:shadow-brand/5"
                  >
                    <div className="aspect-square bg-linear-to-br from-brand/5 to-brand/10 rounded-[24px] mb-4 flex items-center justify-center relative overflow-hidden ring-1 ring-white/5">
                      {playlist.capaUrl ? (
                        <img 
                          src={playlist.capaUrl} 
                          alt={playlist.nome} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <VibeIcon className="w-16 h-16 text-brand/20 group-hover:scale-110 transition-transform duration-500" />
                      )}
                      
                      {/* Botão de Play Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            playPlaylist(playlist.trackIds);
                          }}
                          className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 active:scale-90 transition-all"
                        >
                          <Play className="text-brand-contrast fill-brand-contrast ml-1" size={24} />
                        </div>
                      </div>

                      {/* Botões de Opções */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2 z-20">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToEdit({...playlist});
                            setShowEditModal(true);
                          }}
                          className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-brand transition-all shadow-lg border border-white/10"
                          title="Editar Playlist"
                        >
                          <Settings2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToDelete(playlist);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-red-500 transition-all shadow-lg border border-white/10"
                          title="Excluir Playlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="absolute top-4 right-4">
                        {playlist.publico ? <Globe size={14} className="text-dim/40" /> : <Lock size={14} className="text-dim/40" />}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-main truncate group-hover:text-brand transition-colors mr-2">{playlist.nome}</h3>
                        {!playlist.publico && <Lock size={12} className="text-dim/40 shrink-0 md:hidden" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dim capitalize font-medium">{playlist.vibe}</span>
                        <span className="text-[10px] text-dim font-bold uppercase tracking-widest bg-black/5 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                          {playlist.trackIds?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {playlists.map((playlist) => {
                const VibeIcon = VIBE_PRESETS.find(v => v.value === playlist.vibe)?.icon || ListMusic;
                
                return (
                  <div 
                    key={playlist.id} 
                    onClick={() => setSelectedPlaylist(playlist)}
                    className="playlist-list-item group"
                  >
                    <div className="item-image relative">
                      {playlist.capaUrl ? (
                        <img 
                          src={playlist.capaUrl} 
                          alt={playlist.nome} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand/5">
                          <VibeIcon className="w-6 h-6 text-brand/40" />
                        </div>
                      )}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          playPlaylist(playlist.trackIds);
                        }}
                        className="absolute inset-0 bg-brand/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-brand-contrast cursor-pointer"
                      >
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    <div className="item-info">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm truncate text-main group-hover:text-brand transition-colors">{playlist.nome}</h3>
                        {!playlist.publico && <Lock size={12} className="text-dim/40" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-dim">
                        <span className="capitalize text-brand/80 font-medium">{playlist.vibe}</span>
                        <span className="opacity-30">•</span>
                        <span className="uppercase tracking-widest font-black text-[9px]">{playlist.trackIds?.length || 0} músicas</span>
                      </div>
                    </div>

                    <div className="item-actions flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToEdit({...playlist});
                          setShowEditModal(true);
                        }}
                        className="p-2 text-dim hover:text-brand hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                        title="Editar Playlist"
                      >
                        <Settings2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToDelete(playlist);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-dim hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                        title="Excluir Playlist"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={18} className="text-dim group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-brand/5 rounded-[40px] border border-dashed border-(--border-subtle) text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
            <ListMusic className="text-brand/60 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-main mb-2">Nenhuma playlist ainda</h3>
          <p className="text-dim max-w-xs mb-8">
            Você ainda não criou nenhuma playlist. Comece organizando suas músicas por vibe agora mesmo!
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-brand/10 text-brand rounded-2xl font-bold hover:bg-brand/20 transition-all border border-brand/20"
          >
            Criar Minha Primeira Playlist
          </button>
        </div>
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => !isCreating && setShowCreateModal(false)} 
        title="Nova Playlist"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Cover Upload Area */}
          <div className="flex justify-center mb-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer w-32 h-32 rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 hover:border-brand/40 transition-all flex flex-col items-center justify-center gap-2"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white" size={24} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg text-white/70 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl text-dim group-hover:text-brand transition-colors">
                    <Camera size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Capa</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-zinc-500 tracking-widest ml-1">Nome da Playlist</label>
            <input 
              autoFocus
              required
              type="text" 
              value={newPlaylist.nome}
              onChange={(e) => setNewPlaylist({...newPlaylist, nome: e.target.value})}
              placeholder="Minha Playlist Favorita"
              className="w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-brand/50 transition-all text-main placeholder:text-dim/40"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase font-bold text-zinc-500 tracking-widest ml-1">Qual a Vibe?</label>
            <div className="flex flex-wrap gap-2">
              {VIBE_PRESETS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setNewPlaylist({...newPlaylist, vibe: v.value})}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    newPlaylist.vibe === v.value 
                      ? 'bg-brand/20 border-brand/50 text-brand' 
                      : 'bg-black/5 dark:bg-white/5 border-transparent text-dim hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <v.icon size={14} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={newPlaylist.publico}
                  onChange={(e) => setNewPlaylist({...newPlaylist, publico: e.target.checked})}
                />
                <div className="w-12 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-brand transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform shadow-md"></div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-main group-hover:text-brand-legible transition-colors">Playlist Pública</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Aparecerá no seu perfil</p>
              </div>
            </label>

            {isSpotifyConnected && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={newPlaylist.syncSpotify}
                    onChange={(e) => setNewPlaylist({...newPlaylist, syncSpotify: e.target.checked})}
                  />
                  <div className="w-12 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform shadow-md"></div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-main group-hover:text-green-500 transition-colors">Sincronizar com Spotify</p>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Criar esta playlist também no Spotify</p>
                </div>
              </label>
            )}
          </div>

          <button 
            type="submit"
            disabled={isCreating}
            className="w-full py-4 bg-brand text-brand-contrast font-bold rounded-2xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
            {isCreating ? 'Criando...' : 'Criar Playlist'}
          </button>
        </form>
      </Modal>
      {/* Modal de Edição */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setPlaylistToEdit(null);
        }}
        title="Editar Playlist"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Nome da Playlist</label>
            <input 
              type="text"
              value={playlistToEdit?.nome || ''}
              onChange={(e) => setPlaylistToEdit({...playlistToEdit, nome: e.target.value})}
              placeholder="Ex: Treino Pesado, Relaxando..."
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-brand/50 transition-all text-main placeholder:text-dim/40"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Vibe</label>
            <div className="grid grid-cols-5 gap-2">
              {VIBE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlaylistToEdit({...playlistToEdit, vibe: p.value})}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${
                    playlistToEdit?.vibe === p.value 
                      ? 'bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10 scale-105' 
                      : 'bg-white/5 border-transparent text-zinc-500 hover:bg-white/10'
                  }`}
                >
                  <p.icon size={20} />
                  <span className="text-[10px] font-bold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-brand/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-all ${playlistToEdit?.publico ? 'bg-brand/20 text-brand' : 'bg-zinc-800 text-zinc-500'}`}>
                {playlistToEdit?.publico ? <Globe size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-main">Playlist Pública</p>
                <p className="text-[10px] text-dim">Outros usuários poderão ver esta playlist</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPlaylistToEdit({...playlistToEdit, publico: !playlistToEdit.publico})}
              className={`w-12 h-6 rounded-full transition-all relative ${playlistToEdit?.publico ? 'bg-brand' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${playlistToEdit?.publico ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              loading={isCreating}
              className="w-full py-4 text-base"
            >
              Salvar Alterações
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setPlaylistToEdit(null);
              }}
              className="w-full py-4 text-dim hover:text-main"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Importação do Spotify */}
      <div style={{ '--player-offset': '110px' }}>
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importar do Spotify"
          maxWidth={viewMode === 'grid' ? 'max-w-4xl' : 'max-w-md'}
        >
          <div className="space-y-6">
            {loadingSpotify ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-zinc-500 font-medium">Buscando suas playlists no Spotify...</p>
              </div>
            ) : (
              <>
                {/* Campo para Importar por ID direto (Diagnóstico) */}
                <div className="bg-black/5 dark:bg-zinc-800/20 p-4 rounded-2xl border border-black/10 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-dim uppercase tracking-widest">Importar por ID Direto</p>
                    <span className="text-[9px] text-brand font-medium">Útil para playlists de terceiros</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={importId}
                      onChange={(e) => setImportId(e.target.value)}
                      placeholder="Cole o ID da playlist (ex: 37i9dQZEVXbMDoHDw32BYs)"
                      className="flex-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand/40 transition-all text-main"
                    />
                    <button 
                      onClick={handleImportBySpecificId}
                      disabled={!importId || isImportingById}
                      className="px-6 py-2.5 bg-brand text-brand-contrast rounded-xl text-xs font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isImportingById ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Importar
                    </button>
                  </div>
                </div>

                {spotifyPlaylists.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-1">
                          <button 
                            onClick={() => viewMode !== 'grid' && toggleViewMode()}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
                            title="Visualização em Grade"
                          >
                            <LayoutGrid size={14} />
                          </button>
                          <button 
                            onClick={() => viewMode !== 'list' && toggleViewMode()}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-dim hover:text-main'}`}
                            title="Visualização em Lista"
                          >
                            <List size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-dim uppercase tracking-widest">{spotifyPlaylists.length} playlists</p>
                      </div>
                      <button
                        onClick={handleImportAll}
                        className="px-4 py-2 bg-brand text-brand-contrast text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                      >
                        Importar Tudo
                      </button>
                    </div>

                    <div className={`max-h-[420px] overflow-y-auto pr-2 custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}`}>
                      {spotifyPlaylists.map((sp) => (
                        <div key={sp.id} className={`${viewMode === 'grid' 
                          ? 'bg-white/5 border border-transparent hover:border-brand/30 rounded-2xl p-3 text-center flex flex-col items-center group' 
                          : 'flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 transition-all group'}`}>
                          
                          <div className={`${viewMode === 'grid' ? 'w-full aspect-square mb-3' : 'w-12 h-12'} bg-zinc-800 rounded-xl overflow-hidden shrink-0 relative`}>
                            {sp.images?.[0] ? (
                              <img src={sp.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music2 className="text-zinc-600" size={viewMode === 'grid' ? 32 : 20} />
                              </div>
                            )}
                            {viewMode === 'grid' && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => handleImportPlaylist(sp)}
                                  className="w-10 h-10 bg-brand text-brand-contrast rounded-full flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className={`${viewMode === 'grid' ? 'w-full' : 'flex-1 min-w-0'}`}>
                            <p className="text-sm font-bold text-main truncate">{sp.name}</p>
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{sp.tracks?.total} músicas</p>
                          </div>
                          
                          {viewMode === 'list' && (
                            <button
                              onClick={() => handleImportPlaylist(sp)}
                              className="p-2.5 bg-black/5 dark:bg-white/5 text-dim rounded-xl hover:bg-brand hover:text-brand-contrast transition-all group-hover:bg-black/10 dark:group-hover:bg-white/10"
                              title="Importar esta playlist"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-zinc-800/50 rounded-3xl">
                      <AlertCircle className="text-zinc-600" size={32} />
                    </div>
                    <p className="text-zinc-500 max-w-xs">Nenhuma playlist pública encontrada na sua conta do Spotify.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      </div>

      {/* Confirmação de Exclusão */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPlaylistToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Excluir Playlist"
        message={`Tem certeza que deseja excluir a playlist "${playlistToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, excluir"
        cancelText="Não, manter"
        variant="danger"
        loading={isDeleting}
        icon={Trash2}
      />

      {/* Modal de Exportação */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Exportar para o Spotify">
        <div className="space-y-4">
          <p className="text-sm text-dim mb-4">
            Selecione as playlists que deseja criar no seu Spotify. Apenas músicas que vieram do Spotify serão exportadas.
          </p>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {playlists.length === 0 ? (
              <p className="text-center text-dim py-4">Nenhuma playlist local encontrada.</p>
            ) : playlists.map(playlist => (
              <div 
                key={playlist.id}
                onClick={() => toggleExportSelection(playlist.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  selectedForExport.includes(playlist.id) 
                    ? 'border-brand bg-brand/10' 
                    : 'border-(--border-subtle) hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                  selectedForExport.includes(playlist.id) ? 'bg-brand border-brand' : 'border-zinc-500'
                }`}>
                  {selectedForExport.includes(playlist.id) && <Check size={14} className="text-brand-contrast" />}
                </div>
                <div className="w-10 h-10 rounded bg-(--bg-card) overflow-hidden shrink-0">
                  {playlist.capaUrl ? (
                    <img src={playlist.capaUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic className="w-full h-full p-2 text-brand" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-main truncate">{playlist.nome}</p>
                  <p className="text-xs text-dim">{playlist.trackIds?.length || 0} músicas</p>
                </div>
                {playlist.spotifyPlaylistId ? (
                  <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-1 rounded">Já Sincronizada</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <Button 
              onClick={handleExportSelected}
              disabled={selectedForExport.length === 0}
              className="w-full justify-center"
            >
              {`Exportar (${selectedForExport.length}) Playlists`}
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setShowExportModal(false)}
              className="w-full justify-center"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default PlaylistsPage;
