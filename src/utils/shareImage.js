import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';

export async function captureNode(domNode) {
  const canvas = await html2canvas(domNode, {
    backgroundColor: null,
    useCORS: true,
    scale: 2,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível gerar a imagem (canvas vazio).'));
    }, 'image/png');
  });
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function shareOrDownloadImage(blob, filename = 'avaliacao-album.png') {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64Data = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: 'Minha avaliação no Synfonia',
      dialogTitle: 'Compartilhar avaliação',
      files: [saved.uri],
    });
    return;
  }

  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Minha avaliação no Synfonia',
      });
      return;
    } catch {
      // usuário cancelou o share ou navegador recusou — cai no fallback de download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
