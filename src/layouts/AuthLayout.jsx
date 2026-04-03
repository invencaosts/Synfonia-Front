import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useOutlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const isLogin = location.pathname === '/login';
  const isRecovery = location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setDirection(isLogin ? 1 : -1);
  }, [isLogin]);

  const bgColors = {
    login: '#121214',    // Fully opaque Zinc 900
    register: '#2d1e55' // Fully opaque Purple
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 bg-dark relative overflow-hidden"
      style={{ 
        '--brand-color': '#8b5cf6', 
        '--color-brand': '#8b5cf6', 
        '--color-brand-rgb': '139, 92, 246',
        '--brand-rgb': '139, 92, 246' 
      }}
    >

      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg relative z-10">
        {/* Tabs - Folder metaphor */}
        <div className="flex items-end h-16 relative w-full"> 
          <motion.div 
            className="flex-1 h-full relative"
            animate={{ 
              y: isLogin ? 0 : 8,
              zIndex: isLogin ? 20 : 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <Link
              to="/login"
              className="auth-tab h-full"
              data-active={isLogin}
            >
              <motion.div
                className="absolute inset-x-0 -bottom-px border-t border-x border-white/10 rounded-t-[20px]"
                animate={{ 
                  top: isLogin ? 0 : 20,
                  backgroundColor: isLogin ? bgColors.login : 'transparent',
                  opacity: isLogin ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
              />
              <span className={`relative z-10 transition-opacity duration-300 ${isLogin ? 'opacity-100' : 'opacity-40'}`}>Entrar</span>
            </Link>
          </motion.div>

          <motion.div 
            className="flex-1 h-full relative"
            animate={{ 
              y: !isLogin ? 0 : 8,
              zIndex: !isLogin ? 20 : 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <Link
              to="/register"
              className="auth-tab h-full"
              data-active={!isLogin}
            >
              <motion.div
                className="absolute -left-px right-0 -bottom-px border-t border-x border-white/15 rounded-t-[20px]"
                animate={{ 
                  top: !isLogin ? 0 : 20,
                  backgroundColor: !isLogin ? bgColors.register : 'transparent',
                  opacity: !isLogin ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
              />
              <span className={`relative z-10 transition-opacity duration-300 ${!isLogin ? 'opacity-100' : 'opacity-40'}`}>
                {isRecovery ? 'Recuperação' : 'Registrar'}
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Container */}
        <motion.div 
          className="auth-window"
          animate={{ backgroundColor: isLogin ? bgColors.login : bgColors.register }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: direction * 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction * -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="p-6 md:p-8"

            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
