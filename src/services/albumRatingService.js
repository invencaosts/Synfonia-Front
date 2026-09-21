import api from './api';

export const albumRatingService = {
  searchAlbums: async (nome, source = 'ITUNES') => {
    const response = await api.get('/musicas/albuns/busca', {
      params: { nome, source }
    });
    return response.data;
  },

  getTracks: async ({ albumName, artista, source, externalAlbumId }) => {
    const response = await api.get('/musicas/albuns/faixas', {
      params: { externalAlbumId, artista, album: albumName, source }
    });
    return response.data;
  },

  saveRating: async ({ source, artista, albumName, capaUrl, nota, titulo, review }) => {
    const response = await api.post('/avaliacoes-album', {
      source, artista, albumName, capaUrl, nota, titulo, review
    });
    return response.data;
  },

  getRating: async (albumKey) => {
    const response = await api.get(`/avaliacoes-album/${encodeURIComponent(albumKey)}`);
    return response.data;
  },

  listRatings: async () => {
    const response = await api.get('/avaliacoes-album');
    return response.data;
  },

  deleteRating: async (albumKey) => {
    await api.delete(`/avaliacoes-album/${encodeURIComponent(albumKey)}`);
  },
};
