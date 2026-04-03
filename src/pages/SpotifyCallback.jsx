import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyService } from '../services/spotifyService';
import { useAudio } from '../hooks/useAudio';
import { userService } from '../services/userService';

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const { refreshSpotifyToken } = useAudio();
  const authStarted = useRef(false);

  useEffect(() => {
    if (authStarted.current) return;
    authStarted.current = true;

    const handleAuth = async () => {
      const token = await spotifyService.handleCallback();
      if (token) {
        console.log('Spotify: Autenticado com sucesso!');
        
        // Sincronizar nome do Spotify com as redes sociais do perfil
        try {
          const profile = await spotifyService.getUserProfile(token);
          if (profile) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);
              user.socialLinks = { 
                ...user.socialLinks, 
                spotify: profile.display_name || profile.id 
              };
              localStorage.setItem('user', JSON.stringify(user));
              window.dispatchEvent(new Event('userUpdate'));
              
              // Persiste a mudança no backend para não sumir ao deslogar/recarregar
              try {
                await userService.updateProfile({ socialLinks: user.socialLinks });
              } catch (backendErr) {
                console.error("Erro ao persistir link do Spotify no backend:", backendErr);
              }
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar perfil do Spotify:", err);
        }

        refreshSpotifyToken();
        navigate('/', { replace: true });
      } else {
        console.error('Spotify: Falha na autenticação.');
        navigate('/', { replace: true });
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-white">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-bold">Conectando ao Spotify...</h2>
      <p className="text-zinc-500 mt-2">Estamos finalizando sua conexão segura.</p>
    </div>
  );
};

export default SpotifyCallback;
