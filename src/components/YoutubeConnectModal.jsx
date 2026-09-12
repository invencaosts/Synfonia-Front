import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';

const YoutubeConnectModal = ({ deviceInfo, status, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [prevFullUrl, setPrevFullUrl] = useState(null);

  const fullUrl = deviceInfo
    ? `${deviceInfo.verification_url}?user_code=${encodeURIComponent(deviceInfo.user_code)}`
    : null;

  // Zera o QR antigo assim que a URL muda (ajuste durante o render, sem efeito)
  if (fullUrl !== prevFullUrl) {
    setPrevFullUrl(fullUrl);
    setQrDataUrl(null);
  }

  useEffect(() => {
    if (!fullUrl) return;

    let cancelled = false;
    QRCode.toDataURL(fullUrl, { width: 200, margin: 1 })
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(err => console.error('Erro ao gerar QR code:', err));

    return () => { cancelled = true; };
  }, [fullUrl]);

  return (
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
            Escaneia o QR code com o celular, ou abre o link no computador:
          </p>

          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR code para autorizar o YouTube Music"
              className="mx-auto rounded-2xl border border-(--border-subtle)"
              width={180}
              height={180}
            />
          )}

          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-red-500 font-bold hover:underline text-sm"
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
};

export default YoutubeConnectModal;
