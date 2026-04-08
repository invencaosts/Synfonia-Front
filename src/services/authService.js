import api from './api';
import { spotifyService } from './spotifyService';

export const authService = {
  login: async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha });
    // O token agora é armazenado via Cookie HttpOnly gerenciado pelo browser
    if (response.data.usuario) {
      localStorage.setItem('user', JSON.stringify(response.data.usuario));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    // 1. Limpeza IMEDIATA do estado local para UX instantânea
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('synfonia-theme');
    localStorage.removeItem('synfonia-accent');
    localStorage.removeItem('synfonia-song-color');
    localStorage.removeItem('synfonia-font-size');
    localStorage.removeItem('synfonia-reduce-motion');
    localStorage.removeItem('synfonia-autoplay');
    localStorage.removeItem('synfonia-favorite-autoplay');
    localStorage.removeItem('synfonia-favorite-volume');
    localStorage.removeItem('synfonia-volume');
    localStorage.removeItem('synfonia_local_history');

    // 2. Notifica o sistema ou redireciona imediatamente se necessário
    // (Opcional) window.dispatchEvent(new Event('userUpdate'));

    // 3. Logout no Spotify
    spotifyService.logout();

    // 4. Logout no servidor (não bloqueia a limpeza local)
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Falha ao deslogar no servidor (sessão pode já ter expirado):', err);
    }

    window.location.href = '/login';
  },

  enterAsGuest: () => {
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('user');
  },

  isGuest: () => {
    return localStorage.getItem('isGuest') === 'true';
  },

  getCurrentUser: () => {
    if (localStorage.getItem('isGuest') === 'true') {
      return { displayName: 'Convidado', guest: true };
    }
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    // Como o token está no cookie HttpOnly, o Front-end não "vê" o token.
    // Usamos a presença do objeto 'user' no localStorage ou uma flag como indicador inicial
    return !!localStorage.getItem('user') || localStorage.getItem('isGuest') === 'true';
  },

  validateSession: async () => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (isGuest) return;

    try {
      // Chama o endpoint /me para validar se o cookie da sessão ainda é válido
      const response = await api.get('/users/me');
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      // Se falhar (401), o interceptor em api.js já cuida do redirecionamento
      console.error('Sessão inválida:', err);
      localStorage.removeItem('user');
      throw err;
    }
  },

  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  verifyResetCode: async (email, code) => {
    return await api.post('/auth/verify-reset-code', { email, code });
  },

  resetPassword: async (email, code, newPassword) => {
    return await api.post('/auth/reset-password', { email, token: code, newPassword });
  }
};
