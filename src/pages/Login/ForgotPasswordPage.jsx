import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Mail, ArrowLeft, KeyRound, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password, 4: Success
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            setStep(2);
        } catch (err) {
            console.error('Erro ao enviar e-mail:', err);
            const message = err.response?.data?.detalhe || 'Não foi possível enviar o e-mail. Tente novamente.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await authService.verifyResetCode(email, code);
            setStep(3);
        } catch (err) {
            console.error('Erro ao verificar código:', err);
            const message = err.response?.data?.detalhe || 'Código inválido ou expirado.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setError('');
        setIsLoading(true);
        try {
            await authService.resetPassword(email, code, password);
            setStep(4);
            setTimeout(() => navigate('/login'), 5000);
        } catch (err) {
            console.error('Erro ao redefinir senha:', err);
            const message = err.response?.data?.detalhe || 'Erro ao redefinir senha. Tente novamente.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
                    {step === 4 ? "Tudo Pronto!" : "Recuperar Senha"}
                </h1>
                <p className="text-zinc-400">
                    {step === 1 && "Informe seu e-mail para receber o código de 6 dígitos."}
                    {step === 2 && "Digite o código que enviamos para o seu e-mail."}
                    {step === 3 && "Agora escolha uma nova senha segura."}
                    {step === 4 && "Sua senha foi alterada com sucesso."}
                </p>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-in fade-in duration-300">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSendEmail} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 ml-1">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all"
                                        placeholder="exemplo@email.com"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Enviar Código"}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="space-y-4 text-center">
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Enviamos o código para <span className="text-white font-medium">{email}</span>.<br />
                                    Ele deve chegar em sua caixa de entrada em alguns instantes.
                                </p>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-secondary transition-colors">
                                        <KeyRound size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all text-center font-bold text-xl tracking-[0.5em]"
                                        placeholder="000000"
                                        maxLength={6}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verificar Código"}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setStep(1)}
                                className="w-full text-zinc-500 hover:text-white text-sm transition-colors text-center"
                            >
                                Trocar e-mail
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 ml-1">Nova Senha</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all"
                                            placeholder="••••••••"
                                            minLength={6}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 ml-1">Confirmar Senha</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-brand transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all"
                                            placeholder="••••••••"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Alterar Senha"}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                >
                                    <CheckCircle2 size={80} className="text-brand" />
                                </motion.div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-white font-bold text-xl">Sua senha foi alterada!</p>
                                <p className="text-zinc-400 text-sm">
                                    Redirecionando para o login em instantes...
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                            >
                                Ir para Login Agora
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {step === 1 && (
                <div className="pt-4 border-t border-white/5">
                    <p className="text-center text-zinc-500 text-sm">
                        Lembrou a senha?{" "}
                        <Link to="/login" className="text-secondary hover:underline font-semibold">
                            Entrar
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
};

export default ForgotPasswordPage;
