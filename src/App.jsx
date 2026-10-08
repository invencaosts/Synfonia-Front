import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';
import ForgotPasswordPage from './pages/Login/ForgotPasswordPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LibraryPage from './pages/Library/LibraryPage';
import ProfilePage from './pages/Profile/ProfilePage';
import PlaylistsPage from './pages/Playlists/PlaylistsPage';
import AlbumRatingPage from './pages/AlbumRating/AlbumRatingPage';
import SettingsPage from './pages/Settings/SettingsPage';
import CommunityPage from './pages/Community/CommunityPage';
import PublicProfilePage from './pages/Community/PublicProfilePage';
import AvaliacaoPublicaPage from './pages/Community/AvaliacaoPublicaPage';
import ModerationPage from './pages/Moderation/ModerationPage';
import SpotifyCallback from './pages/SpotifyCallback';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import { AudioProvider } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';
import { ImportProvider } from './context/ImportContext';
import AudioPlayer from './components/AudioPlayer/AudioPlayer';
import { authService } from './services/authService';
import CookieConsent from './components/ui/CookieConsent';
import { Capacitor } from '@capacitor/core';
import { rotaDoDeepLink } from './utils/publicLinks';

// Links do QR code / da legenda compartilhada (https://<host>/a/{codigo}, https://<host>/avaliacao/{id} ou synfonia://avaliacao/{id})
// chegam aqui quando o app está instalado: tanto com o app aberto quanto abrindo do zero.
const useDeepLinks = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return undefined;
        let listener = null;
        let cancelado = false;

        (async () => {
            const { App } = await import('@capacitor/app');
            const abrir = (url) => {
                const rota = url && rotaDoDeepLink(url);
                if (rota) navigate(rota);
            };
            const launch = await App.getLaunchUrl();
            if (!cancelado) abrir(launch?.url);
            const handle = await App.addListener('appUrlOpen', ({ url }) => abrir(url));
            if (cancelado) handle.remove();
            else listener = handle;
        })().catch((err) => console.error('Erro ao configurar deep links:', err));

        return () => {
            cancelado = true;
            listener?.remove();
        };
    }, [navigate]);
};

const AppContent = () => {
    const [isLoading, setIsLoading] = useState(true);
    useDeepLinks();
  
    useEffect(() => {
        const checkAuth = async () => {
            const userInStorage = localStorage.getItem('user');
            const isGuest = localStorage.getItem('isGuest') === 'true';

            // Só validamos sessão se houver um usuário no storage e NÃO for convidado
            if (userInStorage && !isGuest) {
                try {
                    await authService.validateSession();
                } catch (err) {
                    console.error('Falha na validação de sessão:', err);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []); // Apenas no primeiro carregamento do app

    if (isLoading && localStorage.getItem('user') && localStorage.getItem('isGuest') !== 'true') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            
            <Route path="/callback" element={<SpotifyCallback />} />

            <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/playlists" element={<PlaylistsPage />} />
                    <Route path="/avaliar" element={<AlbumRatingPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/comunidade" element={<CommunityPage />} />
                    <Route path="/u/:username" element={<PublicProfilePage />} />
                    <Route path="/moderacao" element={<ModerationPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Route>

            {/* Aberta pelo link compartilhado: não exige login (logado, fica dentro do layout normal). */}
            <Route element={authService.isAuthenticated() ? <MainLayout /> : <div className="min-h-screen bg-(--bg-main)"><Outlet /></div>}>
                <Route path="/avaliacao/:id" element={<AvaliacaoPublicaPage />} />
                <Route path="/a/:codigo" element={<AvaliacaoPublicaPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AudioProvider>
                    <ImportProvider>
                        <AppContent />
                        <AudioPlayer />
                        <CookieConsent />
                    </ImportProvider>
                </AudioProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
