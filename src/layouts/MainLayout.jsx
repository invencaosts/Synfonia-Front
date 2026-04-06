import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Music, LayoutDashboard, Heart, Settings, LogOut, User, ListMusic, Instagram, Linkedin } from 'lucide-react';
import { authService } from '../services/authService';
import Logo from '../components/Logo';
import { useAudio } from '../hooks/useAudio';
import { useImport } from '../context/ImportContext';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const { currentTrack } = useAudio();
  const { isImporting, importProgress, isExporting, exportProgress } = useImport();
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

      {/* Background Import Progress Overlay */}
      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed right-4 md:right-8 z-100 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-sm transition-[bottom] duration-500 ease-in-out"
            style={{ bottom: 'calc(var(--player-offset, 0px) + 24px)' }}
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
            className="fixed right-4 md:right-8 z-100 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-sm transition-[bottom] duration-500 ease-in-out"
            style={{ bottom: 'calc(var(--player-offset, 0px) + 40px)' }}
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
