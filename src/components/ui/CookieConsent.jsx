import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('synfonia-cookie-consent');
        if (!consent) {
            // Pequeno delay para não brotar de uma vez
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('synfonia-cookie-consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed z-9999 bottom-0 left-0 w-full p-4 md:bottom-6 md:left-auto md:right-6 md:w-auto md:max-w-md"
                >
                    <div className="glass-panel p-5 rounded-2xl md:rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-4">
                        <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center text-brand shrink-0">
                            <Cookie size={24} />
                        </div>
                        
                        <div className="flex-1 pr-6">
                            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                Uso de Cookies
                            </h4>
                            <p className="text-xs text-dim leading-relaxed">
                                Utilizamos cookies essenciais para garantir o funcionamento seguro e a melhor experiência na sua jornada musical.
                            </p>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-1 text-dim hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                            title="Fechar aviso"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
