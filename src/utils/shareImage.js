import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar a capa'));
    img.src = src;
  });
}

// Fundo desfocado já "pintado" num canvas: o html2canvas ignora `filter: blur()`,
// então um blur via CSS some na imagem exportada. Desenhado aqui, o fundo sai
// igual na tela e no arquivo. Retorna null se o navegador não suporta ctx.filter.
function gerarFundoDesfocado(img, largura, altura, blurPx) {
  const escala = 2;
  const canvas = document.createElement('canvas');
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.filter !== 'string') return null;

  ctx.filter = `blur(${blurPx * escala}px)`;
  // "cover" com sobra nas bordas, para o blur não deixar a borda transparente
  const sobra = blurPx * escala * 2;
  const proporcao = Math.max((canvas.width + sobra * 2) / img.width, (canvas.height + sobra * 2) / img.height);
  const w = img.width * proporcao;
  const h = img.height * proporcao;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Baixa a capa UMA vez (via proxy do backend, sem CORS) e devolve fontes locais para o card:
 * - capaSrc: object URL da capa (liberar com URL.revokeObjectURL);
 * - fundoSrc: data URL do fundo já desfocado (ou null se o navegador não suportar).
 * Com fontes locais, o html2canvas não precisa buscar nada na rede na hora de capturar;
 * antes ele baixava o fundo de novo e, se o proxy demorasse, a imagem saía sem fundo.
 */
export async function prepararCapaCompartilhamento(capaUrl, { largura, altura, blurPx }) {
  const resposta = await api.get('/musicas/proxy-imagem', {
    params: { url: capaUrl },
    responseType: 'blob',
    timeout: 30000,
  });
  const capaSrc = URL.createObjectURL(resposta.data);
  try {
    const img = await carregarImagem(capaSrc);
    return { capaSrc, fundoSrc: gerarFundoDesfocado(img, largura, altura, blurPx) };
  } catch (err) {
    URL.revokeObjectURL(capaSrc);
    throw err;
  }
}

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

// text: legenda enviada junto da imagem (com o link da avaliação). Apps como WhatsApp/Telegram
// mostram o link clicável; o Instagram Stories ignora o texto.
export async function shareOrDownloadImage(blob, filename = 'avaliacao-album.png', { text } = {}) {
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
      text,
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
        ...(text ? { text } : {}),
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
