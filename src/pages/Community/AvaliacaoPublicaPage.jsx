import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Star } from 'lucide-react';
import { albumRatingService } from '../../services/albumRatingService';
import { authService } from '../../services/authService';
import StarRating from '../../components/AlbumRating/StarRating';
import UserAvatar from '../../components/Community/UserAvatar';

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Destino do link/QR code da imagem de compartilhamento (deep link no app ou rota no web).
// Funciona sem login: logado, aparece dentro do layout normal; deslogado, sozinha com CTA de cadastro.
const AvaliacaoPublicaPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const chaveBusca = `${id || ''}:${token}`;
  const [estado, setEstado] = useState({ chave: chaveBusca, status: 'carregando', rating: null });
  const logado = authService.isAuthenticated();

  useEffect(() => {
    let cancelado = false;
    albumRatingService.getPublicRating(id, token)
      .then((rating) => { if (!cancelado) setEstado({ chave: chaveBusca, status: 'ok', rating }); })
      .catch(() => { if (!cancelado) setEstado({ chave: chaveBusca, status: 'erro', rating: null }); });
    return () => { cancelado = true; };
  }, [chaveBusca, id, token]);

  const { status, rating } = estado.chave === chaveBusca
    ? estado
    : { status: 'carregando', rating: null };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        {status === 'carregando' && (
          <div className="flex justify-center py-20 text-dim">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {status === 'erro' && (
          <div className="text-center space-y-2 py-16">
            <Star size={28} className="mx-auto text-dim opacity-50" />
            <p className="font-bold text-main">Avaliação não encontrada</p>
            <p className="text-sm text-dim">Ela pode ter sido apagada ou não está mais pública.</p>
          </div>
        )}

        {status === 'ok' && rating && (
          <>
            <div className="flex gap-4">
              {rating.capaUrl && (
                <img src={rating.capaUrl} alt={rating.albumName} className="w-28 h-28 rounded-2xl object-cover shadow-lg shrink-0" />
              )}
              <div className="min-w-0 space-y-1.5">
                <p className="font-black text-main text-xl leading-tight wrap-break-word">{rating.albumName}</p>
                <p className="text-dim text-sm truncate">{rating.artista}</p>
                <div className="flex items-center gap-2">
                  <StarRating value={rating.nota} readOnly size={18} />
                  <span className="text-sm font-black text-main">{rating.nota?.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {(rating.titulo || rating.review) ? (
              <div className="space-y-2 p-4 rounded-2xl bg-(--bg-side) border border-(--border-subtle)">
                {rating.titulo && <p className="font-bold text-main">“{rating.titulo}”</p>}
                {rating.review && (
                  <p className="text-sm text-dim whitespace-pre-line wrap-break-word">{rating.review}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-dim italic">Sem resenha escrita.</p>
            )}

            <Link
              to={logado ? `/u/${encodeURIComponent(rating.username)}` : '/register'}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-(--bg-side) transition-colors"
            >
              <UserAvatar user={rating} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-main truncate">{rating.displayName || rating.username}</p>
                <p className="text-xs text-dim truncate">
                  @{rating.username} · {formatDate(rating.atualizadoEm || rating.criadoEm)}
                </p>
              </div>
            </Link>
          </>
        )}

        {!logado && status !== 'carregando' && (
          <div className="text-center space-y-3 pt-4">
            <p className="text-sm text-dim">Avalie seus álbuns e veja o que a comunidade está ouvindo.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="rounded-full bg-brand text-brand-contrast font-semibold px-5 py-3">
                Criar conta
              </Link>
              <Link to="/login" className="rounded-full bg-white/10 text-main font-medium px-5 py-3">
                Entrar
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvaliacaoPublicaPage;
