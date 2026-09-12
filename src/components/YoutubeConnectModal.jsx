import { ExternalLink, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';

const YoutubeConnectModal = ({ deviceInfo, status, onClose }) => (
  <Modal
    isOpen={!!deviceInfo || status === 'error' || status === 'expired'}
    onClose={onClose}
    title="Conectar ao YouTube Music"
    maxWidth="max-w-sm"
  >
    {status === 'error' && (
      <p className="text-sm text-red-400 text-center">
        Não deu pra iniciar a conexão. Tenta de novo em alguns segundos.
      </p>
    )}
    {status === 'expired' && (
      <p className="text-sm text-red-400 text-center">
        O código expirou antes da autorização. Clica em "Conectar" de novo.
      </p>
    )}
    {deviceInfo && status === 'waiting' && (
      <div className="text-center space-y-4">
        <p className="text-sm text-dim">
          Abre o link abaixo em qualquer dispositivo e digita o código pra autorizar:
        </p>
        <a
          href={deviceInfo.verification_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-red-500 font-bold hover:underline"
        >
          {deviceInfo.verification_url}
          <ExternalLink size={14} />
        </a>
        <div className="text-2xl font-black tracking-[0.3em] bg-(--bg-side) rounded-2xl py-4 text-main">
          {deviceInfo.user_code}
        </div>
        <p className="text-[10px] text-dim flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          Aguardando autorização...
        </p>
      </div>
    )}
  </Modal>
);

export default YoutubeConnectModal;
