import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Music, User, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
import Logo from '../../components/Logo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const containsEmoji = (str) => {
  if (!str) return false;
  return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(str);
};

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    confirmarEmail: '',
    senha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (containsEmoji(formData.displayName)) {
      setError('O Nome de Exibição não pode conter emojis.');
      return;
    }

    if (formData.email !== formData.confirmarEmail) {
      setError('Os e-mails não coincidem.');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.register(formData);
      // Login automático
      await authService.login(formData.email, formData.senha);
      navigate('/');
    } catch (err) {
      console.error('Registration/Login error:', err);
      const message = err.response?.data?.detalhe || 'Falha ao criar conta. Tente novamente.';
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
        <p className="text-dim mt-4 md:mt-6 text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium opacity-60 px-4">Junte-se ao Synfonia</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-custom flex items-start space-x-3 text-red-500">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="md:col-span-2">
          <Input 
            label="Nome de Exibição"
            name="displayName"
            required
            value={formData.displayName}
            onChange={handleChange}
            placeholder="Seu Nome ou Apelido"
            icon={User}
          />
          <p className="text-[9px] text-dim/60 uppercase tracking-widest mt-1.5 px-1 font-bold">O nome principal que todos verão</p>
        </div>

        <div className="md:col-span-2">
          <Input 
            label="Username Único (@)"
            name="username"
            required
            value={formData.username}
            onChange={handleChange}
            placeholder="seu_user"
            icon={User}
          />
          <p className="text-[9px] text-dim/60 uppercase tracking-widest mt-1.5 px-1 font-bold">Identidade permanente (usado para login)</p>
        </div>

        <div>
          <Input 
            label="E-mail"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="exemplo@email.com"
            icon={Mail}
          />
        </div>

        <div>
          <Input 
            label="Confirmar E-mail"
            type="email"
            name="confirmarEmail"
            required
            value={formData.confirmarEmail}
            onChange={handleChange}
            placeholder="Confirme o e-mail"
            icon={Mail}
          />
        </div>

        <div>
          <Input 
            label="Senha"
            type={showPassword ? "text" : "password"}
            name="senha"
            required
            minLength={8}
            value={formData.senha}
            onChange={handleChange}
            placeholder="••••••••"
            icon={Lock}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-dim hover:text-main transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <div className="mt-1 flex flex-wrap gap-2 px-1">
            <span className="text-[9px] text-dim uppercase tracking-tight flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-brand/40"></div>
              8+ caracteres
            </span>
          </div>
        </div>

        <div>
          <Input 
            label="Confirmar Senha"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmarSenha"
            required
            minLength={8}
            value={formData.confirmarSenha}
            onChange={handleChange}
            placeholder="••••••••"
            icon={Lock}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-dim hover:text-main transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          className="md:col-span-2 w-full py-3.5 mt-1"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>
      </form>
    </>
  );
};

export default RegisterPage;
