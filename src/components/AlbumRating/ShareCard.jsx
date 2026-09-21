import React, { forwardRef } from 'react';
import StarRating from './StarRating';

// Imagens externas (CDN do Apple/YouTube) muitas vezes não liberam CORS,
// o que "suja" o canvas e faz a captura (html2canvas) falhar silenciosamente
// — por isso sempre carregamos a capa via proxy do próprio backend (mesma
// origem, sem CORS).
const proxiedCapa = (url) => {
  if (!url) return url;
  const base = import.meta.env.VITE_API_URL || '/api/v1';
  return `${base}/musicas/proxy-imagem?url=${encodeURIComponent(url)}`;
};

// IMPORTANTE: este componente é capturado pelo html2canvas (utils/shareImage.js).
// html2canvas não entende funções CSS modernas que o Tailwind v4 gera pra cores
// com opacidade (oklch()/color-mix(), usadas em qualquer classe tipo "bg-black/60"
// ou em cores vindas de var(--brand-color)) — a captura falha silenciosamente
// (blob vira null) nesses casos. Por isso aqui só usamos estilo inline com
// cores hex/rgba puras, nunca classes Tailwind de cor nem variáveis CSS do tema.
const CORES = {
  overlayTop: 'rgba(0,0,0,0.6)',
  overlayMid: 'rgba(0,0,0,0.7)',
  overlayBottom: 'rgba(0,0,0,0.9)',
  branco: '#ffffff',
  brancoSuave: 'rgba(255,255,255,0.7)',
  brancoResenha: 'rgba(255,255,255,0.85)',
  brancoFraco: 'rgba(255,255,255,0.5)',
  roxo: '#8b5cf6',
  cinza: 'rgba(255,255,255,0.25)',
};

const ShareCard = forwardRef(({ rating }, ref) => {
  if (!rating) return null;

  const capaProxied = proxiedCapa(rating.capaUrl);

  const tituloResumido = rating.titulo && rating.titulo.length > 100
    ? `${rating.titulo.slice(0, 100)}…`
    : rating.titulo;

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: 270,
        height: 480,
        borderRadius: 24,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#09090b',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${capaProxied})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.1)',
          filter: 'blur(24px)',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to bottom, ${CORES.overlayTop}, ${CORES.overlayMid}, ${CORES.overlayBottom})`,
        }}
      />

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        {capaProxied && (
          <img
            src={capaProxied}
            alt={rating.albumName}
            style={{
              width: 128,
              height: 128,
              borderRadius: 12,
              objectFit: 'cover',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          />
        )}

        <div>
          <p style={{ color: CORES.branco, fontWeight: 700, fontSize: 18, lineHeight: 1.2, margin: 0 }}>
            {rating.albumName}
          </p>
          <p style={{ color: CORES.brancoSuave, fontSize: 14, marginTop: 4 }}>{rating.artista}</p>
        </div>

        <StarRating value={rating.nota} readOnly size={24} filledColor={CORES.roxo} emptyColor={CORES.cinza} />

        {tituloResumido && (
          <p style={{ color: CORES.brancoResenha, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }}>
            “{tituloResumido}”
          </p>
        )}

        <div style={{ position: 'absolute', bottom: 20, color: CORES.brancoFraco, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          SYNFONIA
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
