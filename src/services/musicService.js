import api from './api';

export const musicService = {
  search: async (nome, tipo = 'all') => {
    const response = await api.get('/musicas/search', {
      params: { nome, tipo }
    });
    return response.data;
  },

  saveToCollection: async (musicData) => {
    const response = await api.post('/users/me/songs', musicData);
    return response.data;
  },

  getCollection: async (page = 0, size = 50, sort = 'trackName,asc', query = '') => {
    const response = await api.get('/users/me/songs', {
      params: { page, size, sort, q: query }
    });
    return response.data; // Agora retorna um objeto Page (com content, totalPages, etc)
  },

  getFavoriteIds: async () => {
    const response = await api.get('/users/me/songs/ids');
    return response.data; // Lista simples de strings
  },

  removeFromCollection: async (trackId) => {
    await api.delete(`/users/me/songs/${trackId}`);
  },

  getById: async (id) => {
    const response = await api.get(`/musicas/${id}`);
    return response.data;
  },

  addToHistory: async (trackId, musicData) => {
    await api.post(`/historico/${trackId}`, musicData || {});
  },

  getHistory: async () => {
    const response = await api.get('/historico');
    return response.data;
  },

  // Remover músicas por fonte (Ex: SPOTIFY)
  deleteBySource: async (source) => {
    const response = await api.delete(`/users/me/songs/source/${source}`);
    return response.data;
  }

};

