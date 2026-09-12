import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-md',
  showClose = true,
  closeOnOutsideClick = true
}) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && closeOnOutsideClick) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, closeOnOutsideClick]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-in-out"
          style={{ bottom: 'var(--player-offset, 10px)' }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOutsideClick ? onClose : undefined}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-(--bg-card) border border-(--border-subtle) rounded-[32px] w-full ${maxWidth} p-6 md:p-8 shadow-2xl overflow-y-auto transition-all duration-300 max-h-[calc(100vh-var(--player-offset,20px))]`}
          >
            {(title || showClose) && (
              <div className="flex justify-between items-center mb-6">
                {title && <h3 className="text-xl md:text-2xl font-bold text-main tracking-tight">{title}</h3>}
                {showClose && (
                  <button 
                    onClick={onClose}
                    className="text-dim hover:text-main transition-colors p-2 hover:bg-(--bg-side) rounded-full"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
