import React, { useEffect, useState } from 'react';
import { Search, Loader2, Disc3, Star } from 'lucide-react';
import { albumRatingService } from '../../services/albumRatingService';
import { authService } from '../../services/authService';
import RatingFormScreen from '../../components/AlbumRating/RatingFormScreen';
import ShareResultScreen from '../../components/AlbumRating/ShareResultScreen';
import AlbumDetailScreen from '../../components/AlbumRating/AlbumDetailScreen';
import StarRating from '../../components/AlbumRating/StarRating';

const AlbumRatingPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [detailAlbum, setDetailAlbum] = useState(null);
  const [ratingAlbum, setRatingAlbum] = useState(null);
  const [savedRating, setSavedRating] = useState(null);

  const [myRatings, setMyRatings] = useState([]);
  const [loadingMyRatings, setLoadingMyRatings] = useState(true);

  const user = authService.getCurrentUser();
  const preferredSource = user?.preferredMusicSource || 'ITUNES';
  const backendSource = preferredSource === 'YOUTUBE_MUSIC' ? 'YOUTUBE_MUSIC' : 'ITUNES';

  const loadMyRatings = async () => {
    setLoadingMyRatings(true);
    try {
      const results = await albumRatingService.listRatings();
      setMyRatings(results || []);
    } catch (err) {
      console.error('Erro ao carregar suas avaliações:', err);
    } finally {
      setLoadingMyRatings(false);
    }
  };

  useEffect(() => {
    loadMyRatings();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const results = await albumRatingService.searchAlbums(searchTerm, backendSource);
      setAlbums(results || []);
    } catch (err) {
      console.error('Erro ao buscar álbuns:', err);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-main flex items-center gap-2">
          <Disc3 className="text-brand" size={26} />
          Avaliar Álbum
        </h1>
        <p className="text-dim text-sm">Busque um álbum, veja as faixas e dê sua nota.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nome do álbum ou artista"
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) text-main placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-brand-contrast px-6 md:px-8 py-4 rounded-2xl text-sm font-bold hover:bg-brand/90 transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
        </button>
      </form>

      {hasSearched && !loading && albums.length === 0 && (
        <p className="text-dim text-center py-10">Nenhum álbum encontrado.</p>
      )}

      {albums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {albums.map((album) => (
            <button
              key={album.albumKey}
              type="button"
              onClick={() => setDetailAlbum(album)}
              className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border border-(--border-subtle) flex flex-col text-left"
            >
              <div className="relative aspect-square mb-3 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={album.capaUrl}
                  alt={album.albumName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  <span className="bg-brand/90 text-brand-contrast text-[7px] font-black px-1 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">Álbum</span>
                  {album.source === 'YOUTUBE_MUSIC' ? (
                    <span className="bg-red-600/90 text-white text-[7px] font-black px-1 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">YouTube</span>
                  ) : (
                    <span className="bg-zinc-800/90 text-white text-[7px] font-black px-1 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">{album.source === 'ITUNES' ? 'Apple' : 'Synfonia'}</span>
                  )}
                </div>
              </div>
              <p className="font-semibold text-main text-sm truncate">{album.albumName}</p>
              <p className="text-dim text-xs truncate">{album.artista}</p>
            </button>
          ))}
        </div>
      )}

      {!hasSearched && (
        <div className="space-y-4 pt-2">
          <h2 className="text-lg md:text-xl font-bold text-main flex items-center gap-2">
            <Star className="text-brand fill-brand" size={20} />
            Minhas avaliações
          </h2>

          {loadingMyRatings ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : myRatings.length === 0 ? (
            <p className="text-dim text-sm">Você ainda não avaliou nenhum álbum.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {myRatings.map((rating) => (
                <button
                  key={rating.albumKey}
                  type="button"
                  onClick={() => setRatingAlbum(rating)}
                  className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-brand/5 border border-(--border-subtle) flex flex-col text-left"
                >
                  <div className="relative aspect-square mb-3 rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={rating.capaUrl}
                      alt={rating.albumName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <p className="font-semibold text-main text-sm truncate">{rating.albumName}</p>
                  <p className="text-dim text-xs truncate mb-1.5">{rating.artista}</p>
                  <StarRating value={rating.nota} readOnly size={14} />
                  {rating.titulo && (
                    <p className="text-dim text-xs italic truncate mt-1.5">“{rating.titulo}”</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {detailAlbum && (
        <AlbumDetailScreen
          album={detailAlbum}
          onClose={() => setDetailAlbum(null)}
          onRate={(album) => setRatingAlbum(album)}
        />
      )}

      <RatingFormScreen
        album={ratingAlbum}
        isOpen={!!ratingAlbum}
        onClose={() => setRatingAlbum(null)}
        onSaved={(rating) => {
          setRatingAlbum(null);
          setDetailAlbum(null);
          setSavedRating(rating);
          loadMyRatings();
        }}
        onDeleted={() => {
          setRatingAlbum(null);
          setDetailAlbum(null);
          loadMyRatings();
        }}
      />

      {savedRating && (
        <ShareResultScreen rating={savedRating} onClose={() => setSavedRating(null)} />
      )}
    </div>
  );
};

export default AlbumRatingPage;
