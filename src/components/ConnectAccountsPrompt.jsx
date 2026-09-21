import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Youtube } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const ConnectAccountsPrompt = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conecte suas contas" maxWidth="max-w-sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-green-500/15 border-2 border-(--bg-card) flex items-center justify-center text-green-500">
              <Music2 size={18} />
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/15 border-2 border-(--bg-card) flex items-center justify-center text-red-500">
              <Youtube size={18} />
            </div>
          </div>
        </div>
        <p className="text-sm text-dim leading-relaxed">
          Sem Spotify ou YouTube Music conectado, a busca fica limitada e a experiência não fica completa.
          Conecte pelo menos uma conta no seu perfil pra ter resultados melhores.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Agora não
          </Button>
          <Button onClick={() => { onClose(); navigate('/profile'); }} className="flex-1">
            Ir para o Perfil
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectAccountsPrompt;
