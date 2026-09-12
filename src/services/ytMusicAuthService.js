import api from './api';

// Limpeza de versão antiga: chegamos a guardar o token OAuth em localStorage
// (vulnerável a XSS). Remove qualquer resquício de quem testou antes do fix.
localStorage.removeItem('ytmusic_oauth_token');

// O token OAuth nunca passa pelo navegador — fica só no backend, amarrado ao
// usuário logado. Aqui só chamamos os endpoints, sem guardar nada localmente.
export const ytMusicAuthService = {
  getStatus: async () => {
    try {
      const response = await api.post('/ytmusic/status');
      return !!response.data.connected;
    } catch {
      return false;
    }
  },

  disconnect: async () => {
    await api.post('/ytmusic/disconnect');
    window.dispatchEvent(new Event('ytmusicAuthChange'));
  },

  startDeviceAuth: async () => {
    const response = await api.post('/ytmusic/auth/device/start');
    return response.data; // { device_code, user_code, verification_url, interval, expires_in }
  },

  pollDeviceAuth: async (deviceCode) => {
    const response = await api.post('/ytmusic/auth/device/poll', { device_code: deviceCode });
    if (response.data.status === 'authorized') {
      window.dispatchEvent(new Event('ytmusicAuthChange'));
    }
    return response.data; // { status: 'pending' | 'authorized' }
  },

  getAccountInfo: async () => {
    const response = await api.post('/ytmusic/me/account');
    return response.data; // { accountName, channelHandle, accountPhotoUrl }
  },
};
