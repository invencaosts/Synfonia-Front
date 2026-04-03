import api from './api';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://localhost:5173/callback';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-library-modify',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'ugc-image-upload'
];

export const spotifyService = {
  getLoginUrl: () => {
    // IMPORTANTE: Mudamos para response_type=code (Authorization Code Flow) e forçamos o diálogo para atualizar scopes
    return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}&show_dialog=true`;
  },

  handleCallback: async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      try {
        // Chamamos o NOSSO backend para trocar o código pelo token (mais seguro)
        const response = await api.get(`/spotify/callback?code=${code}`);
        const { access_token, expires_in } = response.data;

        if (access_token) {
          if (access_token.startsWith("BQBwY")) {
            const msg = "⚠️ ATENÇÃO: O Backend devolveu um TOKEN DE APP (BQBwY). Isso significa que as credenciais no IntelliJ/Backend estão incorretas ou incompletas!";
            console.error(msg);
            alert(msg);
          }
          
          localStorage.setItem('spotify_token', access_token);
          localStorage.setItem('spotify_token_expires', Date.now() + (expires_in * 1000));
          
          // Limpa a URL removendo o ?code=...
          window.history.replaceState({}, document.title, window.location.pathname);
          return access_token;
        }
      } catch (err) {
        console.error("Erro na troca de token do Spotify via Backend:", err);
      }
    }
    return null;
  },

  getAccessToken: () => {
    const token = localStorage.getItem('spotify_token');
    const expires = localStorage.getItem('spotify_token_expires');

    if (token && expires && Date.now() < parseInt(expires)) {
      return token;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expires');
  },

  getCurrentlyPlaying: async (token) => {
    if (!token) return null;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 204 || response.status > 400) return null;
      return await response.json();
    } catch (err) {
      console.error("Erro ao buscar música atual do Spotify:", err);
      return null;
    }
  },

  getUserProfile: async (token) => {
    if (!token) return null;
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("Erro ao buscar perfil do Spotify:", err);
      return null;
    }
  },

  getQueue: async (token) => {
    if (!token) return null;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 204 || response.status > 400) return null;
      return await response.json();
    } catch (err) {
      console.error("Erro ao buscar fila do Spotify:", err);
      return null;
    }
  },

  search: async (query, type = 'all', offset = 0) => {
    const token = spotifyService.getAccessToken();
    if (!token) return { items: [], total: 0 };

    try {
      // Se for 'all', buscamos tracks, artists e albums para garantir resultados
      const spotifyType = type === 'all' ? 'track,artist,album' : (type === 'title' ? 'track' : type);
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${spotifyType}&limit=10&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Token do Spotify expirado durante a busca.");
          spotifyService.logout();
        }
        return { items: [], total: 0 };
      }
      
      const data = await response.json();
      
      // Coletamos todos os itens e os formatamos
      const tracks = data.tracks?.items || [];
      const artists = data.artists?.items || [];
      const albums = data.albums?.items || [];
      
      const totalTracks = data.tracks?.total || 0;
      const totalArtists = data.artists?.total || 0;
      const totalAlbums = data.albums?.total || 0;
      const total = Math.max(totalTracks, totalArtists, totalAlbums);
      
      // Combinamos com prioridade para tracks
      const allItems = [...tracks, ...artists, ...albums].slice(0, 10);
      
      const mappedItems = allItems.map(t => ({
        id: t.id,
        trackId: t.id,
        nome: t.name,
        artista: t.artists?.map(a => a.name).join(', ') || (t.type === 'artist' ? 'Artista' : t.name),
        album: t.album?.name || (t.type === 'album' ? 'Álbum' : ''),
        capaUrl: t.album?.images?.[0]?.url || t.images?.[0]?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
        previewUrl: t.preview_url,
        uri: t.uri,
        isSpotify: true,
        source: 'SPOTIFY'
      }));
      
      return { items: mappedItems, total };
    } catch (err) {
      console.error("Erro na busca direta do Spotify:", err);
      return { items: [], total: 0 };
    }
  },

  getRecommendations: async (token, seedTrackId) => {
    if (!token || !seedTrackId) return [];
    try {
      const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackId}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.tracks || []).map(t => ({
        id: t.id,
        trackId: t.id,
        nome: t.name,
        artista: t.artists?.map(a => a.name).join(', '),
        album: t.album?.name,
        capaUrl: t.album?.images?.[0]?.url || '/default-album.png',
        previewUrl: t.preview_url,
        uri: t.uri,
        isSpotify: true,
        source: 'SPOTIFY'
      }));
    } catch (err) {
      console.error("Erro ao buscar recomendações do Spotify:", err);
      return [];
    }
  },

  addToQueue: async (token, uri) => {
    if (!token || !uri) return false;
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (err) {
      console.error("Erro ao adicionar à fila do Spotify:", err);
      return false;
    }
  },

  toggleLike: async (token, trackId, isLiked) => {
    if (!token || !trackId) return false;
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
        method: isLiked ? 'PUT' : 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (err) {
      console.error("Erro ao sincronizar curtida no Spotify:", err);
      return false;
    }
  },

  getUserPlaylists: async (token, limit = 50, offset = 0) => {
    if (!token) return { items: [] };
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return { items: [] };
      return await response.json();
    } catch (err) {
      console.error("Erro ao carregar playlists do Spotify:", err);
      return { items: [] };
    }
  },

  getPlaylist: async (token, playlistId) => {
    const pId = String(playlistId || '').trim();
    const url = `https://api.spotify.com/v1/playlists/${pId}`;
    
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error(`[Spotify API Error] Status: ${response.status}`, errorBody);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error("Erro ao buscar playlist no Spotify:", err);
      return null;
    }
  },

    getPlaylistTracks: async (token, playlistId, limit = 50, offset = 0) => {
      const pId = String(playlistId || '').trim();
      if (!token || !pId) return { items: [] };

      // Alerta para IDs algorítmicos (Daily Mix, etc.) que o Spotify não permite via API
      if (pId.startsWith('37i9dQZF')) {
        console.warn(`[Spotify] O ID ${pId} parece ser um Mix Algorítmico. O Spotify geralmente retorna 404 para estes via API.`);
      }

      const url = `https://api.spotify.com/v1/playlists/${pId}/items?limit=${limit}&offset=${offset}`;
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[Spotify API Error] Status: ${response.status}`, errorData);
          throw new Error(`Falha no Spotify (${response.status}): ${JSON.stringify(errorData)}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro detalhado no getPlaylistTracks:', error);
        throw error; // Repassa o erro para o ImportContext tratar
      }
    },
  
  getSavedTracks: async (token, limit = 50, offset = 0) => {
    if (!token) return { items: [] };
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return { items: [] };
      return await response.json();
    } catch (err) {
      console.error("Erro ao carregar músicas curtidas do Spotify:", err);
      return { items: [] };
    }
  },

  addTracksToPlaylist: async (token, playlistId, uris) => {
    if (!token || !playlistId || !uris.length) return false;
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris })
      });
      return response.ok;
    } catch (err) {
      console.error("Erro ao adicionar músicas à playlist no Spotify:", err);
      return false;
    }
  },

  resolveSpotifyUri: async (token, track) => {
    if (!token) return null;

    if (track.uri && track.uri.startsWith('spotify:track:')) {
      return track.uri.trim();
    }

    const candidateId = String(track.id || '').trim().split('?')[0];
    if (!/^[a-zA-Z0-9]{22}$/.test(candidateId)) return null;

    try {
      const res = await fetch(`https://api.spotify.com/v1/tracks/${candidateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.uri || `spotify:track:${candidateId}`;
    } catch {
      return null;
    }
  },

  exportPlaylistWithTracks: async (token, name, description, uris) => {
    if (!token) return null;
    try {
      const userProfile = await spotifyService.getUserProfile(token);
      const userId = userProfile?.id;

      const createRes = await fetch(`https://api.spotify.com/v1/me/playlists`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          description: description || 'Exportada via Synfonia',
          public: false
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Erro da API do Spotify ao CRIAR playlist:", errText);
        return null;
      }
      const spotifyPlaylist = await createRes.json();
      const playlistId = spotifyPlaylist.id;

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      if (uris && uris.length > 0) {
        // Aumentar o tempo de espera para garantir que a playlist esteja indexada
        await sleep(3000);

        const addTracksUrl = userId 
          ? `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`
          : `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

        console.log(`[Export Service] Tentando adicionar ${uris.length} faixas via ${addTracksUrl}`);

        for (let i = 0; i < uris.length; i += 100) {
          const chunk = uris.slice(i, i + 100);
          const addRes = await fetch(addTracksUrl, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: chunk })
          });
          
          if (!addRes.ok) {
            const errorBody = await addRes.text();
            console.error(`[Export Service] Lote ${i / 100} falhou (${addRes.status}). Corpo:`, errorBody);
            
            // Tentativa individual como fallback
            console.log(`[Export Service] Iniciando fallback 1-por-1 para lote ${i / 100}`);
            for (const singleUri of chunk) {
              await sleep(400);
              const singleRes = await fetch(addTracksUrl, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: [singleUri] })
              });
              if (!singleRes.ok) {
                const singleBody = await singleRes.text();
                console.error(`[Export Service] Falha na faixa (${singleRes.status}) ${singleUri}:`, singleBody);
              } else {
                console.log(`[Export Service] Faixa adicionada (Fallback): ${singleUri}`);
              }
            }
          } else {
            console.log(`[Export Service] Lote ${i / 100} adicionado com sucesso.`);
          }
        }
      }
      return spotifyPlaylist;
    } catch (err) {
      console.error("Erro ao exportar playlist para o Spotify:", err);
      return null;
    }
  },

  createPlaylist: async (token, name, description, isPublic) => {
    if (!token) return null;
    try {
      // Usar o endpoint 'me' é mais robusto que buscar o ID do usuário primeiro
      const response = await fetch(`https://api.spotify.com/v1/me/playlists`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          description: description || 'Criada via Synfonia',
          public: isPublic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro detalhado do Spotify (Playlist):", errorData);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error("Erro ao criar playlist no Spotify:", err);
      return null;
    }
  },

  uploadPlaylistCover: async (token, playlistId, base64Image) => {
    if (!token || !playlistId || !base64Image) return false;
    try {
      // Remover cabeçalhos de data URL se presentes (ex: data:image/jpeg;base64,)
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/jpeg'
        },
        body: cleanBase64
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro na resposta do Spotify (Capa):", errorData);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Erro ao fazer upload da capa no Spotify:", err);
      return false;
    }
  }
};
