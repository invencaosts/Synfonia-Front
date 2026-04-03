import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Eye, EyeOff, AlertCircle, Loader2, Lock, CheckCircle2, X } from 'lucide-react';
import { authService } from '../../services/authService';
import Logo from '../../components/Logo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verificar se redirecionado por sessão expirada
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired') === 'true') {
      setSessionExpired(true);
      // Limpar a URL para não mostrar a mensagem de novo no refresh
      navigate('/login', { replace: true });
    }
    
    // Verificar se há mensagem de sucesso do Register
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Limpar o estado para não repetir no refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(email, senha);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const message = err.response?.data?.detalhe || 'Falha na autenticação. Verifique suas credenciais.';
      const fieldErrors = err.response?.data?.erros;
      
      setError(fieldErrors ? Object.values(fieldErrors).join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mb-6 md:mb-10 text-center">
        <Logo size="lg" />
        <p className="text-dim mt-4 md:mt-6 text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium opacity-60 px-4">Sua jornada musical começa aqui</p>
      </div>


      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-custom flex items-start space-x-3 text-red-500 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-custom flex items-start space-x-3 text-green-500 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      <AnimatePresence>
        {sessionExpired && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="fixed bottom-8 left-8 z-50 p-5 bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-sm"
          >
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
              <AlertCircle size={28} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Sessão Expirada</p>
              <p className="text-xs text-dim leading-relaxed">Sua conexão caiu por inatividade. Faça login novamente.</p>
            </div>
            <button 
              type="button"
              onClick={() => setSessionExpired(false)} 
              className="p-1 text-dim hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemplo@email.com"
          icon={Music}
        />

        <Input 
          label="Senha"
          type={showPassword ? "text" : "password"}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
          icon={Lock}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-dim hover:text-main transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <div className="flex justify-end pr-1">
          <Link 
            to="/forgot-password" 
            className="text-[10px] font-semibold text-dim hover:text-brand transition-colors uppercase tracking-widest"
          >
            Esqueci minha senha?
          </Link>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full py-3.5 mt-2"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-(--bg-card) px-2 text-dim font-medium tracking-widest">Ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            authService.enterAsGuest();
            navigate('/');
          }}
          className="w-full py-3.5"
        >
          Experimentar o site
        </Button>
      </form>
    </>
  );
};

export default LoginPage;
