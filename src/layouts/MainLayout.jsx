import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Music, LayoutDashboard, Heart, Settings, LogOut, User, ListMusic, Instagram, Linkedin, Youtube } from 'lucide-react';
import { authService } from '../services/authService';
import Logo from '../components/Logo';
import { useAudio } from '../hooks/useAudio';
import { useImport } from '../hooks/useImport';
import { useYoutubeConnect } from '../hooks/useYoutubeConnect';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import YoutubeConnectModal from '../components/YoutubeConnectModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const { currentTrack, connectSpotify, isSpotifyConnected } = useAudio();
  const { isImporting, importProgress, isExporting, exportProgress } = useImport();
  const { isConnected: isYoutubeConnected, deviceInfo: youtubeDeviceInfo, status: youtubeAuthStatus, connect: connectYoutube, cancel: cancelYoutubeConnect } = useYoutubeConnect();
  const isGuest = authService.isGuest();
  const [user, setUser] = React.useState(authService.getCurrentUser());
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  React.useEffect(() => {
    const handleUserUpdate = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('userUpdate', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('userUpdate', handleUserUpdate);
    };
  }, []);

  // Scrolla para o topo toda vez que a rota mudar
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', shortLabel: 'Início', path: '/' },
    { icon: Heart, label: 'Músicas Curtidas', shortLabel: 'Curtidas', path: '/library' },
    { icon: ListMusic, label: 'Playlists', shortLabel: 'Playlists', path: '/playlists' },
    { icon: User, label: 'Perfil', shortLabel: 'Perfil', path: '/profile' },
    { icon: Settings, label: 'Configurações', shortLabel: 'Ajustes', path: '/settings' },
  ];

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div
      className={`text-main font-sans h-screen flex overflow-hidden transition-all duration-300 ease-in-out ${currentTrack ? 'pb-24' : 'pb-0'
        }`}
    >
      {/* Sidebar */}
      <aside className="w-64 border-r border-(--border-subtle) hidden md:flex flex-col h-full shrink-0 bg-(--bg-side) z-30 overflow-y-auto custom-scrollbar">
        <div className="p-8 flex justify-center">
          <Logo size="sm" className="scale-110" id="sidebar" />
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-custom transition-all duration-200 group ${isActive
                  ? 'active-nav-item text-brand-legible'
                  : 'text-dim hover:bg-brand/5 hover:text-main'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {!isGuest && (!isSpotifyConnected || !isYoutubeConnected) && (
          <div className="px-4 pb-4 space-y-2">
            {!isSpotifyConnected && (
              <button
                onClick={connectSpotify}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-custom bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] text-sm font-bold hover:bg-[#1DB954]/20 transition-all active:scale-95"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                  <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="truncate">Conectar Spotify</span>
              </button>
            )}
            {!isYoutubeConnected && (
              <button
                onClick={connectYoutube}
                disabled={youtubeAuthStatus === 'waiting'}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-custom bg-red-600/10 border border-red-600/20 text-red-500 text-sm font-bold hover:bg-red-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Youtube size={16} className="shrink-0" />
                <span className="truncate">Conectar YouTube Music</span>
              </button>
            )}
          </div>
        )}

        <div className="p-6 border-t border-white/5 space-y-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-custom transition-all border ${isActive
                ? 'bg-brand/10 border-brand/20 text-brand-legible'
                : 'bg-brand/5 border-(--border-subtle) hover:bg-brand/10 text-dim hover:text-main'
              } ${authService.isGuest() ? 'cursor-pointer' : ''}`
            }
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden ${authService.isGuest()
              ? 'bg-zinc-800 border-zinc-700 text-zinc-500'
              : 'bg-brand/20 border border-brand/30 text-brand-legible'
              }`}>
              {user?.fotoPerfil && !authService.isGuest() ? (
                <img src={user.fotoPerfil} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0) || <User size={20} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-main">{user?.displayName || (authService.isGuest() ? 'Convidado' : 'Usuário')}</p>
              <p className="text-xs text-dim truncate">
                {authService.isGuest() ? 'Modo Visitante' : 'Membro Ativo'}
              </p>
            </div>
          </NavLink>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-custom text-dim hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair</span>
          </button>

          <div className="mt-4 pt-4 border-t border-(--border-subtle) space-y-2">
            <p className="text-[9px] font-bold text-dim/60 tracking-[0.2em] uppercase text-center">
              Projeto por
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/joao_paulojps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-dim hover:text-brand-legible transition-colors group"
                title="Instagram"
              >
                <Instagram size={14} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold tracking-tight">@joao_paulojps</span>
              </a>
              <a
                href="https://www.linkedin.com/in/joaopaulosantana-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-dim hover:text-[#0A66C2] transition-colors group"
                title="LinkedIn"
              >
                <Linkedin size={14} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 z-20 glass-panel border-b border-(--border-subtle) shrink-0">
          <div className="md:hidden flex items-center gap-3">
            <Logo size="sm" className="scale-75 -ml-2" id="header" />
          </div>
          <div className="hidden md:block">
            <div className="text-xs text-dim uppercase tracking-widest font-semibold">
              {authService.isGuest() ? 'Modo de Descoberta Ativo' : 'Symphony Experience'}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-4 mr-2">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[10px] text-dim font-bold uppercase tracking-tighter">Online</span>
              </div>
            </div>

            {/* Profile shortcut for Mobile */}
            <div
              onClick={handleProfileClick}
              className="md:hidden w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center overflow-hidden cursor-pointer active:scale-90 transition-transform"
            >
              {user?.fotoPerfil && !authService.isGuest() ? (
                <img src={user.fotoPerfil} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} className="text-brand" />
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 glass-panel border-t border-(--border-subtle) px-2 flex items-center justify-around z-40 pb-safe">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 transition-all text-center min-w-[64px] ${isActive ? 'text-brand-legible scale-110' : 'text-dim'
                }`
              }
            >
              <item.icon size={22} />
              <span className="text-[10px] font-black uppercase tracking-tight">{item.shortLabel}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Deseja mesmo sair?"
        message="Você precisará fazer login novamente para acessar suas músicas curtidas e playlists."
        confirmText="Sair da Conta"
        cancelText="Cancelar"
        icon={LogOut}
      />

      <YoutubeConnectModal
        deviceInfo={youtubeDeviceInfo}
        status={youtubeAuthStatus}
        onClose={cancelYoutubeConnect}
      />

      {/* Background Import Progress Overlay */}
      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed right-4 md:right-8 z-50 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-sm transition-all duration-500 ease-in-out"
            style={{ 
              bottom: 'calc(var(--player-offset, 0px) + 24px)',
              // Se estiver exportando também, z-index maior para o export que virá em cima
              zIndex: 100
            }}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${importProgress.status === 'completed' ? 'bg-green-500/20 text-green-500' :
              importProgress.status === 'error' ? 'bg-red-500/20 text-red-500' :
                'bg-brand/20 text-brand'
              }`}>
              {importProgress.status === 'completed' ? (
                <CheckCircle2 size={24} />
              ) : importProgress.status === 'error' ? (
                <AlertCircle size={24} />
              ) : (
                <Loader2 size={24} className="animate-spin" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
                {importProgress.status === 'completed' ? 'Sucesso' :
                  importProgress.status === 'error' ? 'Erro' : 'Importando do Spotify'}
              </p>
              <h4 className="text-sm font-bold text-white truncate">
                {importProgress.name || 'Processando...'}
              </h4>
              {importProgress.total > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {importProgress.current}/{importProgress.total}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Export Progress Overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed right-4 md:right-8 z-50 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-sm transition-all duration-500 ease-in-out"
            style={{ 
              bottom: isImporting 
                ? 'calc(var(--player-offset, 0px) + 120px)' 
                : 'calc(var(--player-offset, 0px) + 24px)',
              zIndex: 101
            }}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${exportProgress.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-brand/20 text-brand'
              }`}>
              {exportProgress.status === 'completed' ? (
                <CheckCircle2 size={24} />
              ) : (
                <Loader2 size={24} className="animate-spin" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
                {exportProgress.status === 'completed' ? 'Exportação Concluída' : 'Exportando para Spotify'}
              </p>
              <h4 className="text-sm font-bold text-white truncate">
                {exportProgress.name || 'Processando...'}
              </h4>
              {exportProgress.total > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {exportProgress.current}/{exportProgress.total}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
