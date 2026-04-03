import React, { useRef, useState, useEffect } from 'react';
import { useTheme, hexToRgb, getContrastColor, getLegibleColor, hasPoorContrast } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { Sun, Moon, Zap, Palette, Monitor, Layout, Type, Accessibility, Music2, Repeat, AlertTriangle, ShieldCheck, Eye, EyeOff, AlertCircle, LogOut } from 'lucide-react';
import ColorPicker from '../../components/ui/ColorPicker';
import Button from '../../components/ui/Button';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';

const SettingsPage = () => {
  const {
    theme, toggleTheme,
    accentColor, changeAccentColor,
    songTitleColor, changeSongTitleColor,
    fontSizeLevel, changeFontSizeLevel,
    reduceMotion, toggleMotion,
    queuePosition, setQueuePosition
  } = useTheme();

  const settingsRef = useRef(null);

  const [showContrastWarning, setShowContrastWarning] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [pendingColorConfig, setPendingColorConfig] = useState(null);
  const [showSpotifyDisconnect, setShowSpotifyDisconnect] = useState(false);

  // New Privacy States
  const isGuest = authService.isGuest();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [showPersonalName, setShowPersonalName] = useState(user?.showPersonalName ?? true);
  const [showSpotifyActivity, setShowSpotifyActivity] = useState(user?.showSpotifyActivity ?? true);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handlePrivacyToggle = async (key) => {
    try {
      if (key === 'personalName') {
        const newValue = !showPersonalName;
        setShowPersonalName(newValue);
        if (!isGuest) {
          const updatedUser = await userService.updateProfile({ showPersonalName: newValue });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('userUpdate'));
          setUser(updatedUser);
        }
      } else if (key === 'spotifyActivity') {
        const newValue = !showSpotifyActivity;
        setShowSpotifyActivity(newValue);
        if (!isGuest) {
          const updatedUser = await userService.updateProfile({ showSpotifyActivity: newValue });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('userUpdate'));
          setUser(updatedUser);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await userService.deactivateAccount();
      authService.logout();
    } catch (err) {
      alert(err.response?.data?.detalhe || 'Falha ao desativar conta.');
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleColorSelection = (type, color) => {
    if (!color || (type === 'accent' && color === '#8b5cf6')) {
      if (type === 'accent') changeAccentColor(color);
      else changeSongTitleColor(color);
      return;
    }

    if (hasPoorContrast(color, theme)) {
      const hideWarning = sessionStorage.getItem('hide-contrast-warning') === 'true';
      if (!hideWarning) {
        setPendingColorConfig({ type, color });
        setShowContrastWarning(true);
        return;
      }
    }

    if (type === 'accent') changeAccentColor(color);
    else changeSongTitleColor(color);
  };

  // Handlers locais para o "Preview" sem lag (HUD Only)
  const handleAccentInput = (color) => {
    if (!settingsRef.current) return;

    // Aplicamos as variáveis localmente apenas no container das configurações
    const container = settingsRef.current;
    container.style.setProperty('--color-brand', color);
    container.style.setProperty('--color-brand-rgb', hexToRgb(color));
    container.style.setProperty('--color-brand-contrast', getContrastColor(color));
    container.style.setProperty('--color-brand-legible', getLegibleColor(color, theme));
  };

  const handleSongTitleInput = (color) => {
    if (!settingsRef.current) return;
    const container = settingsRef.current;
    if (color) {
      container.style.setProperty('--user-song-color', color);
    } else {
      container.style.removeProperty('--user-song-color');
    }
  };

  const {
    isAutoplayEnabled, setIsAutoplayEnabled,
    isFavoriteAutoplayEnabled, setIsFavoriteAutoplayEnabled,
    favoriteTrackVolume, setFavoriteTrackVolume,
    connectSpotify, disconnectSpotify, isSpotifyConnected,
    isSpotifySyncEnabled, setIsSpotifySyncEnabled
  } = useAudio();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxFontSize = isMobile ? 2 : 4;

  const accentInputRef = useRef(null);
  const songInputRef = useRef(null);

  const themes = [
    { id: 'dark', name: 'Escuro (Padrão)', icon: Moon, desc: 'O clássico Synfonia.' },
    { id: 'oled', name: 'OLED Black', icon: Zap, desc: 'Preto puro para economizar bateria.' },
    { id: 'light', name: 'Synfonia White', icon: Sun, desc: 'Claro e moderno com toque roxo.' },
  ];

  const accents = [
    { name: 'Vibrant Violet', color: '#8b5cf6' },
    { name: 'Sky Blue', color: '#0ea5e9' },
    { name: 'Emerald Green', color: '#10b981' },
    { name: 'Rose Pink', color: '#f43f5e' },
    { name: 'Sun Yellow', color: '#f59e0b' },
  ];

  return (
    <div ref={settingsRef} className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-main">Configurações</h1>
        <p className="text-dim">Personalize sua experiência no Synfonia conforme seu estilo.</p>
      </div>

      {/* Seção de Aparência */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-(--border-subtle)">
          <Palette className="text-brand-legible" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-wider text-main">Aparência</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={(e) => toggleTheme(t.id, e)}
              className={`flex flex-col items-start p-5 rounded-[24px] border-2 transition-all duration-300 ${theme === t.id
                  ? 'bg-brand/10 border-brand'
                  : 'bg-(--bg-card) border-transparent hover:border-(--border-subtle)'
                }`}
            >
              <div className={`p-3 rounded-2xl mb-4 transition-colors duration-300 ${theme === t.id ? 'bg-brand text-brand-contrast shadow-[0_0_15px_rgba(var(--color-brand-rgb),0.2)]' : 'bg-(--bg-side) text-dim'}`}>
                <t.icon size={24} />
              </div>
              <h3 className="font-bold mb-1 text-main">{t.name}</h3>
              <p className="text-xs text-dim leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="p-6 rounded-[32px] bg-(--bg-card) border border-(--border-subtle)">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2 text-main">
              <Monitor size={18} className="text-brand-legible" />
              Cor de Destaque
            </h3>
            {accentColor !== '#8b5cf6' && (
              <Button
                variant="ghost"
                onClick={() => changeAccentColor('#8b5cf6')}
                className="text-[10px] uppercase font-bold py-1 px-3"
                title="Restaurar cor roxa padrão"
              >
                Restaurar Padrão
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {accents.map((acc) => (
              <button
                key={acc.color}
                onClick={() => handleColorSelection('accent', acc.color)}
                className={`group relative w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === acc.color ? 'scale-110 ring-4 ring-white/10' : 'hover:scale-105'
                  }`}
                style={{ backgroundColor: acc.color }}
                title={acc.name}
              >
                {accentColor === acc.color && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-contrast shadow-md animate-in zoom-in duration-300" />
                )}
              </button>
            ))}

            <ColorPicker
              color={accentColor}
              onInput={handleAccentInput}
              onChange={(c) => handleColorSelection('accent', c)}
              inputRef={accentInputRef}
              title="Escolher cor personalizada"
            />
          </div>
        </div>

        <div className="p-6 rounded-[32px] bg-(--bg-card) border border-(--border-subtle) space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-main">
              <Palette size={18} className="text-brand-legible" />
              Cor dos Nomes das Músicas
            </h3>
            {songTitleColor && (
              <Button
                variant="ghost"
                onClick={() => changeSongTitleColor('')}
                className="text-[10px] uppercase font-bold py-1 px-3"
                title="Restaurar cor padrão do tema"
              >
                Restaurar Padrão
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {accents.map((acc) => (
              <button
                key={acc.color}
                onClick={() => handleColorSelection('song', acc.color)}
                className={`group relative w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${songTitleColor === acc.color ? 'scale-110 ring-4 ring-white/10' : 'hover:scale-105'
                  }`}
                style={{ backgroundColor: acc.color }}
                title={acc.name}
              >
                {songTitleColor === acc.color && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-contrast shadow-md animate-in zoom-in duration-300" />
                )}
              </button>
            ))}

            <ColorPicker
              color={songTitleColor}
              onInput={handleSongTitleInput}
              onChange={(c) => handleColorSelection('song', c)}
              inputRef={songInputRef}
              title="Escolher cor personalizada para títulos"
            />
          </div>
          <p className="text-[10px] text-dim italic">Personalize como os títulos das músicas aparecem no sistema.</p>
        </div>
      </section>

      {/* Seção de Reprodução */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-(--border-subtle)">
          <Music2 className="text-brand-legible" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-wider text-main">Reprodução</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Repeat size={20} className="text-dim" />
              <div className="flex flex-col">
                <span className="font-bold text-main">Autoplay de Músicas</span>
                <span className="text-[10px] text-dim">Toca a próxima música automaticamente</span>
              </div>
            </div>
            <button
              onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isAutoplayEnabled ? 'bg-brand shadow-[0_0_10px_rgba(var(--color-brand-rgb),0.3)]' : 'bg-(--bg-side)'}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 ${isAutoplayEnabled ? 'right-1 bg-brand-contrast' : 'left-1 bg-white'}`} />
            </button>
          </div>

          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Music2 size={20} className="text-dim" />
              <div className="flex flex-col">
                <span className="font-bold text-main">Autoplay no Perfil</span>
                <span className="text-[10px] text-dim">Inicia sua música favorita ao abrir o perfil</span>
              </div>
            </div>
            <button
              onClick={() => setIsFavoriteAutoplayEnabled(!isFavoriteAutoplayEnabled)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isFavoriteAutoplayEnabled ? 'bg-brand shadow-[0_0_10px_rgba(var(--color-brand-rgb),0.3)]' : 'bg-(--bg-side)'}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 ${isFavoriteAutoplayEnabled ? 'right-1 bg-brand-contrast' : 'left-1 bg-white'}`} />
            </button>
          </div>

          {isSpotifyConnected && (
            <div className="p-6 rounded-[24px] bg-green-500/5 border border-green-500/20 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Music2 size={20} className="text-green-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-main">Sincronização Spotify</span>
                  <span className="text-[10px] text-zinc-500 font-medium tracking-tight">Espelhar curtidas e playlists no Spotify</span>
                </div>
              </div>
              <button
                onClick={() => setIsSpotifySyncEnabled(!isSpotifySyncEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isSpotifySyncEnabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-(--bg-side)'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 stroke-white ${isSpotifySyncEnabled ? 'right-1 bg-white' : 'left-1 bg-white'}`} />
              </button>
            </div>
          )}

          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music2 size={20} className="text-dim" />
                <div className="flex flex-col">
                  <span className="font-bold text-main">Volume da Música Favorita</span>
                  <span className="text-[10px] text-dim">Defina o volume padrão para músicas favoritas</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-legible uppercase tracking-widest">
                {Math.round(favoriteTrackVolume * 100)}%
              </span>
            </div>

            <div className="relative pt-1 px-1 flex items-center group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={favoriteTrackVolume}
                onChange={(e) => setFavoriteTrackVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand relative z-10 transition-all border border-transparent shadow-inner"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${favoriteTrackVolume * 100}%, rgba(120,120,120,0.15) ${favoriteTrackVolume * 100}%, rgba(120,120,120,0.15) 100%)`
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" width="20" height="20" className={isSpotifyConnected ? 'text-[#1DB954]' : 'text-dim'}>
                <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <div className="flex flex-col">
                <span className="font-bold text-main">Spotify</span>
                <span className="text-[10px] text-dim">
                  {isSpotifyConnected ? 'Conectado — músicas completas ativas' : 'Conecte para ouvir músicas completas'}
                </span>
              </div>
            </div>
            {isSpotifyConnected && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span className="text-[10px] font-bold text-[#1DB954] uppercase tracking-tight">Ativo</span>
              </div>
            )}
          </div>

          <div 
            className={`w-full ${isGuest && !isSpotifyConnected ? 'cursor-not-allowed' : ''}`}
            title={isGuest && !isSpotifyConnected ? "Apenas contas registradas" : ""}
          >
            <button
              onClick={isSpotifyConnected ? () => setShowSpotifyDisconnect(true) : (isGuest ? undefined : connectSpotify)}
              disabled={isGuest && !isSpotifyConnected}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                isGuest && !isSpotifyConnected
                  ? 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 opacity-50 pointer-events-none'
                  : isSpotifyConnected
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                    : 'bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20'
              }`}
            >
              {isSpotifyConnected ? 'Desconectar do Spotify' : 'Conectar ao Spotify'}
            </button>
          </div>

          {isGuest && !isSpotifyConnected && (
            <p className="text-[10px] text-red-400 text-center font-bold">
              Apenas usuários autenticados com conta podem conectar ao Spotify.
            </p>
          )}

          {!isSpotifyConnected && !isGuest && (
            <p className="text-[10px] text-dim italic">
              Sem Spotify, apenas prévias de 30 segundos serão reproduzidas.
            </p>
          )}
        </div>
      </section>

      {/* Seção de Acessibilidade */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-(--border-subtle)">
          <Accessibility className="text-brand-legible" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-wider text-main">Acessibilidade</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Type size={20} className="text-dim" />
                <span className="font-bold text-main">Tamanho da Fonte</span>
              </div>
              <span className="text-[10px] font-bold text-brand-legible uppercase">
                {fontSizeLevel === 0 ? 'Pequeno' : fontSizeLevel === 1 ? 'Padrão' : fontSizeLevel === 2 ? 'Grande' : fontSizeLevel === 3 ? 'Extra' : 'Máximo'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="relative pt-1 px-1">
                {/* Marcadores de passos (Background) */}
                <div className="absolute top-1/2 left-[calc(0.5rem+1px)] right-[calc(0.5rem+1px)] flex justify-between -translate-y-1/2 pointer-events-none px-[2px]">
                  {[...Array(maxFontSize + 1)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-0.5 h-3 rounded-full transition-colors duration-300 ${fontSizeLevel >= i ? 'bg-brand/40' : 'bg-dim/20'
                        }`}
                    />
                  ))}
                </div>

                <input
                  type="range"
                  min="0"
                  max={maxFontSize}
                  step="1"
                  value={fontSizeLevel > maxFontSize ? maxFontSize : fontSizeLevel}
                  onChange={(e) => changeFontSizeLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-transparent rounded-full appearance-none cursor-pointer accent-brand relative z-10"
                />
              </div>

              <div className="flex justify-between text-[8px] text-dim uppercase font-bold tracking-widest px-1">
                <span>A (Pequeno)</span>
                <span className="text-[12px]">A (Máximo)</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Layout size={20} className="text-dim" />
              <div className="flex flex-col">
                <span className="font-bold text-main">Reduzir Movimento</span>
                <span className="text-[10px] text-dim">Suaviza as animações visuais</span>
              </div>
            </div>
            <button
              onClick={toggleMotion}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${reduceMotion ? 'bg-brand shadow-[0_0_10px_rgba(var(--color-brand-rgb),0.3)]' : 'bg-(--bg-side)'}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 ${reduceMotion ? 'right-1 bg-brand-contrast' : 'left-1 bg-white'}`} />
            </button>
          </div>

          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layout size={20} className="text-dim" />
                <div className="flex flex-col">
                  <span className="font-bold text-main">Posição da Fila</span>
                  <span className="text-[10px] text-dim">Lado onde a lista de reprodução aparece</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-legible uppercase">
                {queuePosition === 'left' ? 'Esquerda' : 'Direita'}
              </span>
            </div>
            
            <div className="flex bg-(--bg-side) p-1 rounded-2xl border border-(--border-subtle)">
              <button
                onClick={() => setQueuePosition('left')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${queuePosition === 'left' ? 'bg-brand text-brand-contrast shadow-lg' : 'text-dim hover:text-main'}`}
              >
                Esquerda
              </button>
              <button
                onClick={() => setQueuePosition('right')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${queuePosition === 'right' ? 'bg-brand text-brand-contrast shadow-lg' : 'text-dim hover:text-main'}`}
              >
                Direita
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Privacidade e Conta */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-(--border-subtle)">
          <ShieldCheck className="text-brand-legible" size={20} />
          <h2 className="text-xl font-bold uppercase tracking-wider text-main">Privacidade e Conta</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between group opacity-100">
            <div className="flex items-center gap-3">
              <Type size={20} className="text-dim" />
              <div className="flex flex-col">
                <span className="font-bold text-main">Nome Pessoal Público</span>
                <span className="text-[10px] text-dim">Mostrar seu nome real no perfil</span>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyToggle('personalName')}
              disabled={isGuest}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${!isGuest && showPersonalName ? 'bg-brand shadow-[0_0_10px_rgba(var(--color-brand-rgb),0.3)]' : 'bg-(--bg-side)'} ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 ${!isGuest && showPersonalName ? 'right-1 bg-brand-contrast' : 'left-1 bg-white'}`} />
            </button>
          </div>

          <div className="p-6 rounded-[24px] bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between group opacity-100">
            <div className="flex items-center gap-3">
              <Music2 size={20} className="text-green-500" />
              <div className="flex flex-col">
                <span className="font-bold text-main">Atividade do Spotify</span>
                <span className="text-[10px] text-dim">Mostrar o que você está escutando</span>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyToggle('spotifyActivity')}
              disabled={isGuest}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${!isGuest && showSpotifyActivity ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-(--bg-side)'} ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-4 h-4 rounded-full absolute top-1 transition-all duration-300 stroke-white ${!isGuest && showSpotifyActivity ? 'right-1 bg-white' : 'left-1 bg-white'}`} />
            </button>
          </div>

          {!isGuest && (
            <div className="col-span-1 md:col-span-2 p-6 rounded-[24px] bg-red-500/5 border border-red-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogOut size={20} className="text-red-500" />
                  <div className="flex flex-col">
                    <span className="font-bold text-red-500">Desativar Conta</span>
                    <span className="text-[10px] text-red-500/80">Ocultar seu perfil e pausar seu uso por até 7 dias</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm transition-all duration-300 bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                Desativar Minha Conta
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="pt-10 flex justify-center">
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
          Synfonia Experience v1.0 • Made with ✨
        </p>
      </div>

      <ConfirmationDialog
        isOpen={showContrastWarning}
        onClose={() => setShowContrastWarning(false)}
        title="Atenção ao Contraste"
        message="A cor selecionada possui baixo contraste no tema atual. Isso pode dificultar a leitura de títulos de músicas e elementos visuais da interface principal. Deseja aplicar mesmo assim?"
        confirmText="Aplicar Cor"
        cancelText="Cancelar"
        variant="danger"
        icon={AlertTriangle}
        checkboxLabel="Não lembrar novamente nesta sessão"
        checkboxChecked={dontShowAgain}
        onCheckboxChange={setDontShowAgain}
        onConfirm={() => {
          if (dontShowAgain) {
            sessionStorage.setItem('hide-contrast-warning', 'true');
          }
          if (pendingColorConfig?.type === 'accent') {
            changeAccentColor(pendingColorConfig.color);
          } else if (pendingColorConfig?.type === 'song') {
            changeSongTitleColor(pendingColorConfig.color);
          }
          setShowContrastWarning(false);
          setPendingColorConfig(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showSpotifyDisconnect}
        onClose={() => setShowSpotifyDisconnect(false)}
        onConfirm={() => {
          disconnectSpotify();
          setShowSpotifyDisconnect(false);
        }}
        title="Desconectar do Spotify?"
        message="A reprodução completa das músicas será desativada. Você passará a ouvir apenas prévias de 30 segundos até conectar novamente."
        confirmText="Desconectar"
        cancelText="Cancelar"
        variant="danger"
        icon={Music2}
      />

      <ConfirmationDialog
        isOpen={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
        onConfirm={handleDeactivate}
        title="Desativar Conta"
        message="Sua conta ficará invisível. Você tem até 7 dias para fazer login novamente e reativá-la. Depois disso, ela será excluída permanentemente. Deseja continuar?"
        confirmText={isDeactivating ? "Processando..." : "Desativar Conta"}
        cancelText="Cancelar"
        icon={AlertCircle}
      />
    </div>
  );
};

export default SettingsPage;
