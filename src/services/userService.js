import api from './api';

export const userService = {
  updateFavoriteMusic: async (musicData) => {
    // musicData: { favoriteTrackId, favoriteTrackPreviewUrl, favoriteTrackName, favoriteTrackArtist, favoriteTrackCapaUrl }
    const response = await api.put('/users/me/favorite-music', musicData);
    return response.data;
  },

  getProfile: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  getCurrentUser: () => {
    if (localStorage.getItem('isGuest') === 'true') {
      return { displayName: 'Convidado', guest: true };
    }
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  removeFavoriteMusic: async () => {
    const response = await api.delete('/users/me/favorite-music');
    return response.data;
  },

  updateProfilePicture: async (fotoPerfil) => {
    const response = await api.put('/users/photo', { fotoPerfil });
    return response.data;
  },

  updateProfile: async (profileData) => {
    // profileData: { displayName, personalName, showPersonalName, showSpotifyActivity }
    const response = await api.put('/users/me', profileData);
    return response.data;
  },

  deactivateAccount: async () => {
    const response = await api.post('/users/me/deactivate');
    return response.data;
  }
};
