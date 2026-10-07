import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import StarRating from './StarRating';

// Dimensões do card e do blur do fundo (usadas também para gerar o fundo desfocado).
export const CARD_LARGURA = 270;
export const CARD_ALTURA = 480;
export const CARD_BLUR = 24;

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

// capaSrc/fundoSrc são fontes locais (object URL / data URL) preparadas por
// prepararCapaCompartilhamento: assim a captura não depende de rede nenhuma.
// qrSrc: data URL do QR code com o link público da avaliação (null = sem link).
const ShareCard = forwardRef(({ rating, username, qrSrc, capaSrc, fundoSrc, capaCarregando }, ref) => {
  if (!rating) return null;

  const tituloResumido = rating.titulo && rating.titulo.length > 100
    ? `${rating.titulo.slice(0, 100)}…`
    : rating.titulo;

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: CARD_LARGURA,
        height: CARD_ALTURA,
        borderRadius: 24,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#09090b',
      }}
    >
      {fundoSrc ? (
        // Fundo já desfocado no canvas: sai igual na tela e na imagem exportada
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${fundoSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.6,
          }}
        />
      ) : capaSrc && (
        // Navegador sem ctx.filter: blur só via CSS (o html2canvas exporta sem desfoque)
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${capaSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.1)',
            filter: `blur(${CARD_BLUR}px)`,
            opacity: 0.6,
          }}
        />
      )}
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
          padding: '0 24px 18px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {rating.capaUrl && (
            <div style={{ position: 'relative', width: 128, height: 128 }}>
              {capaSrc && <img
                src={capaSrc}
                alt={rating.albumName}
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 12,
                  objectFit: 'cover',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
              />}
              {/* Só aparece antes da captura (botões ficam travados enquanto carrega). */}
              {capaCarregando && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: CORES.brancoSuave,
                  }}
                >
                  <Loader2 size={32} className="animate-spin" />
                </div>
              )}
            </div>
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

        </div>

        {/* Rodapé fora do fluxo centralizado: resenha longa não passa por cima do @ / QR. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
          {qrSrc && (
            <img
              src={qrSrc}
              alt=""
              style={{
                width: 88,
                height: 88,
                backgroundColor: CORES.branco,
                imageRendering: 'pixelated',
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center', transform: 'translateY(-4px)' }}>
            {username && (
              <span style={{ color: CORES.branco, fontSize: 13, fontWeight: 700 }}>
                @{username}
              </span>
            )}
            <span style={{ color: CORES.brancoFraco, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              {qrSrc ? 'VEJA A AVALIAÇÃO NO SYNFONIA' : 'SYNFONIA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
