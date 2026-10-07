import api from './api';

const encode = (username) => encodeURIComponent(username);

export const communityService = {
  searchUsers: async (q, page = 0, size = 20) => {
    const response = await api.get('/community/users', { params: { q, page, size } });
    return response.data;
  },

  getProfile: async (username) => {
    const response = await api.get(`/community/users/${encode(username)}`);
    return response.data;
  },

  getRatings: async (username, { ordem = 'recentes', page = 0, size = 20 } = {}) => {
    const response = await api.get(`/community/users/${encode(username)}/avaliacoes`, {
      params: { ordem, page, size }
    });
    return response.data;
  },

  getLikedSongs: async (username, { page = 0, size = 30 } = {}) => {
    const response = await api.get(`/community/users/${encode(username)}/curtidas`, {
      params: { page, size }
    });
    return response.data;
  },

  getPlaylists: async (username) => {
    const response = await api.get(`/community/users/${encode(username)}/playlists`);
    return response.data;
  },

  getPlaylist: async (username, playlistId) => {
    const response = await api.get(`/community/users/${encode(username)}/playlists/${encodeURIComponent(playlistId)}`);
    return response.data;
  },
};

// O backend serializa Page como { content, page: { number, totalPages, ... } }
// (Spring Data VIA_DTO); versões antigas devolviam os campos na raiz.
export const readPage = (data) => ({
  content: data?.content || [],
  number: data?.page?.number ?? data?.number ?? 0,
  totalPages: data?.page?.totalPages ?? data?.totalPages ?? 0,
  totalElements: data?.page?.totalElements ?? data?.totalElements ?? 0,
});

export const publicProfilePath = (username) => `/u/${encodeURIComponent(username)}`;
