import React from 'react';
import { Download, X } from 'lucide-react';
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck';

const UpdateAvailableBanner = () => {
  const updateInfo = useAppUpdateCheck();
  const [dismissed, setDismissed] = React.useState(false);

  if (!updateInfo || dismissed) return null;

  const openDownload = async () => {
    // O link direto do .apk falha dentro do browser embutido do Capacitor
    // (não dispara o download manager do Android). A página da release
    // funciona, e o usuário toca no anexo lá dentro do Chrome de verdade.
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: updateInfo.releaseUrl });
    } catch {
      window.open(updateInfo.releaseUrl, '_blank');
    }
  };

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-brand/10 border-b border-brand/20 text-sm">
      <Download size={16} className="text-brand shrink-0" />
      <span className="flex-1 min-w-0 truncate text-brand-legible font-medium">
        Nova versão disponível: v{updateInfo.latestVersion}
      </span>
      <button
        type="button"
        onClick={openDownload}
        className="shrink-0 px-3 py-1.5 rounded-full bg-brand text-brand-contrast text-xs font-bold active:scale-95 transition-all"
      >
        Baixar
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-dim hover:text-main transition-colors"
        title="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default UpdateAvailableBanner;
