import { useState, useRef, useEffect, useCallback } from 'react';
import { ytMusicAuthService } from '../services/ytMusicAuthService';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

const syncYoutubeSocialLink = async () => {
  try {
    const account = await ytMusicAuthService.getAccountInfo();
    const handle = account?.channelHandle || account?.accountName;
    if (!handle) return;

    const user = authService.getCurrentUser();
    const updatedSocialLinks = { ...user?.socialLinks, youtube: handle };
    const updatedUser = await userService.updateProfile({ socialLinks: updatedSocialLinks });
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    window.dispatchEvent(new Event('userUpdate'));
  } catch (err) {
    console.error('Erro ao sincronizar link do YouTube Music no perfil:', err);
  }
};

// Hook compartilhado pelo botão da sidebar e pelo card de Settings — os dois
// reagem ao mesmo estado (evento 'ytmusicAuthChange' disparado pelo serviço).
// O token OAuth em si nunca chega no navegador, fica só no backend.
export const useYoutubeConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [status, setStatus] = useState(null); // null | 'waiting' | 'expired' | 'error'
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    ytMusicAuthService.getStatus().then(connected => {
      if (!cancelled) setIsConnected(connected);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleChange = () => {
      ytMusicAuthService.getStatus().then(setIsConnected);
    };
    window.addEventListener('ytmusicAuthChange', handleChange);
    return () => window.removeEventListener('ytmusicAuthChange', handleChange);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current.intervalId);
      clearTimeout(pollRef.current.timeoutId);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const connect = useCallback(async () => {
    setStatus('waiting');
    try {
      const info = await ytMusicAuthService.startDeviceAuth();
      setDeviceInfo(info);

      const intervalId = setInterval(async () => {
        try {
          const result = await ytMusicAuthService.pollDeviceAuth(info.device_code);
          if (result.status === 'authorized') {
            stopPolling();
            setDeviceInfo(null);
            setStatus(null);
            setIsConnected(true);
            syncYoutubeSocialLink();
          }
        } catch (err) {
          console.error('Erro ao verificar autorização do YouTube Music:', err);
        }
      }, (info.interval || 5) * 1000);

      const timeoutId = setTimeout(() => {
        stopPolling();
        setStatus('expired');
      }, (info.expires_in || 1800) * 1000);

      pollRef.current = { intervalId, timeoutId };
    } catch (err) {
      console.error('Erro ao iniciar conexão com YouTube Music:', err);
      setStatus('error');
    }
  }, [stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    setDeviceInfo(null);
    setStatus(null);
  }, [stopPolling]);

  const disconnect = useCallback(async () => {
    await ytMusicAuthService.disconnect();
    setIsConnected(false);
  }, []);

  return { isConnected, deviceInfo, status, connect, cancel, disconnect };
};
