import React, { createContext, useContext, useState, useCallback } from 'react';
import { playlistService } from '../services/playlistService';
import { spotifyService } from '../services/spotifyService';
import { musicService } from '../services/musicService';

const ImportContext = createContext();

export const ImportProvider = ({ children }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, name: '', status: 'idle' });
  const [lastImportedPlaylist, setLastImportedPlaylist] = useState(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, name: '', status: 'idle' });

  const importPlaylist = useCallback(async (spotifyPlaylist, spotifyToken) => {
    if (!spotifyToken) return false;
    
    setIsImporting(true);
    setImportProgress({ current: 0, total: 1, name: spotifyPlaylist.name, status: 'starting' });

    try {
      setImportProgress(prev => ({ ...prev, status: 'fetching' }));

      try {
        const me = await spotifyService.getUserProfile(spotifyToken);
        console.log("[Import Diagnostic] Logado como:", me.email, "| ID:", me.id);
      } catch (meErr) {
        console.error("[Import Diagnostic] Falha ao verificar perfil:", meErr);
      }

      let tracks = [];
      try {
        const tracksResponse = await spotifyService.getPlaylistTracks(spotifyToken, spotifyPlaylist.id);
        console.log(`[Import] Faixas encontradas para ${spotifyPlaylist.name}:`, tracksResponse.items?.length || 0);
        
        tracks = (tracksResponse.items || [])
          .filter(item => item.track)
          .map(item => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists?.[0]?.name || 'Artista Desconhecido',
            album: item.track.album?.name || '',
            capaUrl: item.track.album?.images?.[0]?.url || null,
            uri: item.track.uri
          }));
      } catch (err) {
        console.warn("[Import] Não foi possível buscar as faixas do Spotify, a playlist será criada vazia:", err);
      }
      
      setImportProgress(prev => ({ ...prev, status: 'importing' }));

      const importData = {
        name: spotifyPlaylist.name,
        capaUrl: spotifyPlaylist.images?.[0]?.url || null,
        spotifyPlaylistId: spotifyPlaylist.id,
        accessToken: spotifyToken,
        tracks: tracks
      };

      console.log(`[Import] Enviando ${importData.tracks.length} músicas ao backend.`);
      if (importData.tracks.length > 0) {
        console.log(`[Import Diagnostic] Primeira música do lote:`, JSON.stringify(importData.tracks[0], null, 2));
      }

      const updatedPlaylist = await playlistService.importData(importData);

      setLastImportedPlaylist(updatedPlaylist);
      setImportProgress({ current: 1, total: 1, name: spotifyPlaylist.name, status: 'completed' });
      
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0, name: '', status: 'idle' });
      }, 3000);

      return true;
    } catch (err) {
      console.error('[Import] Erro completo da resposta do backend:', err.response?.data);
      const serverError = err.response?.data?.detalhe || err.response?.data?.message || err.message;
      console.error('[Import] Erro fatal na importação:', serverError);
      alert(`Falha na importação: ${serverError}`);
      throw err;
    }
  }, []);

  const importAllPlaylists = useCallback(async (playlists, spotifyToken) => {
    if (!spotifyToken || playlists.length === 0) return;

    setIsImporting(true);
    
    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      setImportProgress({ 
        current: i + 1, 
        total: playlists.length, 
        name: playlist.name, 
        status: 'importing' 
      });

      try {
        const tracksResponse = await spotifyService.getPlaylistTracks(spotifyToken, playlist.id);
        console.log(`[Import All] Faixas encontradas para ${playlist.name}:`, tracksResponse.items?.length || 0);

        const importData = {
          name: playlist.name,
          capaUrl: playlist.images?.[0]?.url || null,
          spotifyPlaylistId: playlist.id,
          accessToken: spotifyToken, // Corrigido: Estava faltando o token na importação em lote
          tracks: (tracksResponse.items || [])
            .filter(item => item.track)
            .map(item => ({
              id: item.track.id,
              name: item.track.name,
              artist: item.track.artists?.[0]?.name || 'Artista Desconhecido',
              album: item.track.album?.name || '',
              capaUrl: item.track.album?.images?.[0]?.url || null,
              uri: item.track.uri
            }))
        };

        console.log(`[Import All] Enviando ${importData.tracks.length} músicas ao backend para ${playlist.name}.`);
        if (importData.tracks.length > 0) {
          console.log(`[Import All Diagnostic] Exemplo da primeira música:`, importData.tracks[0]);
        }

        const updatedPlaylist = await playlistService.importData(importData);
        setLastImportedPlaylist(updatedPlaylist);
        
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Erro ao importar ${playlist.name}:`, err);
      }
    }

    setImportProgress({ 
      current: playlists.length, 
      total: playlists.length, 
      name: 'Todas as playlists', 
      status: 'completed' 
    });

    setTimeout(() => {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, name: '', status: 'idle' });
    }, 5000);
  }, []);

  const importSavedTracks = useCallback(async (spotifyToken) => {
    if (!spotifyToken) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0, name: 'Músicas Curtidas', status: 'fetching' });

    try {
      let allTracksFound = [];
      let nextUrl = `https://api.spotify.com/v1/me/tracks?limit=50&offset=0`;
      let totalToImport = 0;
      let importedCount = 0;

      // 1. Fase de Descoberta: Pega os metadados iniciais e calcula o total
      const initialResponse = await fetch(nextUrl, {
        headers: { 'Authorization': `Bearer ${spotifyToken}` }
      });
      if (!initialResponse.ok) throw new Error("Falha ao acessar Spotify API");
      
      const initialData = await initialResponse.json();
      totalToImport = initialData.total;
      setImportProgress(prev => ({ ...prev, total: totalToImport, status: 'importing' }));

      // 2. Loop de Importação em Lotes (Seguindo a paginação do Spotify)
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        
        if (!response.ok) {
          console.error("[Import] Falha no lote de músicas do Spotify.");
          break;
        }

        const data = await response.json();
        const items = data.items || [];
        
        if (items.length === 0) break;

        console.log(`[Import] Processando lote de ${items.length} músicas...`);

        // Enviar lote atual para o backend (Poderia ser um batch save se o backend suportasse, 
        // mas vamos manter individualmente por compatibilidade com musicService.js atual)
        for (const item of items) {
          if (!item.track) continue;

          const musicData = {
            trackId: item.track.id,
            nome: item.track.name,
            artista: item.track.artists?.map(a => a.name).join(', ') || 'Artista Desconhecido',
            album: item.track.album?.name || "",
            capaUrl: item.track.album?.images?.[0]?.url || "",
            previewUrl: item.track.preview_url || "",
            source: "SPOTIFY"
          };

          try {
            await musicService.saveToCollection(musicData);
            importedCount++;
            setImportProgress(prev => ({ ...prev, current: importedCount }));
          } catch (err) {
            console.error(`[Import] Erro ao salvar "${musicData.nome}":`, err);
          }
        }

        nextUrl = data.next; // URL da próxima página (vinda do Spotify)
      }

      setImportProgress(prev => ({ 
        ...prev, 
        current: importedCount, 
        status: 'completed' 
      }));
      
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0, name: '', status: 'idle' });
      }, 5000);

    } catch (err) {
      console.error("[Import] Erro fatal na importação de curtidas:", err);
      setImportProgress(prev => ({ ...prev, status: 'idle' }));
      setIsImporting(false);
    }
  }, []);

  const exportPlaylists = useCallback(async (playlistIds, allPlaylists, spotifyToken, urlToBase64Helper) => {
    if (!spotifyToken || playlistIds.length === 0) return;

    setIsExporting(true);
    setExportProgress({ current: 0, total: playlistIds.length, name: '', status: 'starting' });

    let successCount = 0;

    for (let i = 0; i < playlistIds.length; i++) {
      const playlist = allPlaylists.find(p => p.id === playlistIds[i]);
      if (!playlist || !playlist.trackIds || playlist.trackIds.length === 0) {
        setExportProgress(prev => ({ ...prev, current: i + 1, name: playlist?.nome || '' }));
        continue;
      }

      setExportProgress({ current: i + 1, total: playlistIds.length, name: playlist.nome, status: 'exporting' });

      try {
        const tracks = (await Promise.all(playlist.trackIds.map(id => musicService.getById(id)))).filter(Boolean);
        console.log(`[Export BG] "${playlist.nome}": ${tracks.length} faixas encontradas no banco.`);
        
        // Log para depuração de IDs
        if (tracks.length > 0) {
          console.log(`[Export BG] Amostra da primeira faixa:`, {
            nome: tracks[0].nome,
            id: tracks[0].id,
            uri: tracks[0].uri,
            source: tracks[0].source
          });
        }

        console.log(`[Export BG] Resolvendo URIs via Spotify para "${playlist.nome}"...`);

        const resolvedUris = [];
        for (let i = 0; i < tracks.length; i += 10) {
          const batch = tracks.slice(i, i + 10);
          const batchResults = await Promise.all(
            batch.map(t => spotifyService.resolveSpotifyUri(spotifyToken, t))
          );
          batchResults.forEach((uri, idx) => {
            if (uri) {
              resolvedUris.push(uri);
            } else {
              console.warn(`[Export BG] Faixa "${batch[idx]?.nome}" sem URI Spotify válida. Pulando.`);
            }
          });
        }

        const uris = resolvedUris;

        if (uris.length > 0) {
          const spotifyPl = await spotifyService.exportPlaylistWithTracks(
            spotifyToken,
            playlist.nome,
            `Vibe: ${playlist.vibe}. Exportada via Synfonia`,
            uris
          );

          if (spotifyPl) {
            await playlistService.update(playlist.id, { spotifyPlaylistId: spotifyPl.id });
            successCount++;

            if (playlist.capaUrl && urlToBase64Helper) {
              try {
                const base64Cover = await urlToBase64Helper(playlist.capaUrl);
                await spotifyService.uploadPlaylistCover(spotifyToken, spotifyPl.id, base64Cover);
              } catch (imgErr) {
                console.error(`[Export BG] Erro ao upload de capa para "${playlist.nome}":`, imgErr);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Export BG] Erro ao exportar "${playlist.nome}":`, err);
      }
    }

    const completedName = successCount === 1
      ? allPlaylists.find(p => p.id === playlistIds[0])?.nome || ''
      : `${successCount} playlists`;

    setExportProgress({
      current: playlistIds.length,
      total: playlistIds.length,
      name: completedName,
      status: 'completed'
    });

    setTimeout(() => {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0, name: '', status: 'idle' });
    }, 5000);
  }, []);

  return (
    <ImportContext.Provider value={{ 
      isImporting, 
      importProgress, 
      lastImportedPlaylist,
      importPlaylist,
      importAllPlaylists,
      importSavedTracks,
      isExporting,
      exportProgress,
      exportPlaylists
    }}>
      {children}
    </ImportContext.Provider>
  );
};

export const useImport = () => useContext(ImportContext);
