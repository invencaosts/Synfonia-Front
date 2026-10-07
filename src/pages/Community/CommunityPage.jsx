import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users, Loader2, X, AlertCircle, ChevronRight, LogIn } from 'lucide-react';
import { communityService, readPage, publicProfilePath } from '../../services/communityService';
import { authService } from '../../services/authService';
import UserAvatar from '../../components/Community/UserAvatar';
import Button from '../../components/ui/Button';

const PAGE_SIZE = 20;
const MIN_TERM = 2;

const CommunityPage = () => {
  const navigate = useNavigate();
  const isGuest = authService.isGuest();
  const currentUser = authService.getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTerm = searchParams.get('q') || '';

  const [term, setTerm] = useState(initialTerm);
  const [debouncedTerm, setDebouncedTerm] = useState(initialTerm.trim());
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTerm(term.trim()), 300);
    return () => clearTimeout(timeout);
  }, [term]);

  // Mantém o termo na URL para o "voltar" do perfil restaurar a busca
  useEffect(() => {
    setSearchParams(debouncedTerm ? { q: debouncedTerm } : {}, { replace: true });
  }, [debouncedTerm, setSearchParams]);

  const normalizedTerm = debouncedTerm.replace(/^@/, '').trim();
  const isTooShort = normalizedTerm.length > 0 && normalizedTerm.length < MIN_TERM;

  useEffect(() => {
    if (isGuest || isTooShort) {
      setUsers([]);
      setTotalPages(0);
      setTotalElements(0);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    communityService.searchUsers(debouncedTerm, 0, PAGE_SIZE)
      .then((data) => {
        if (requestId !== requestIdRef.current) return;
        const pageData = readPage(data);
        setUsers(pageData.content);
        setPage(0);
        setTotalPages(pageData.totalPages);
        setTotalElements(pageData.totalElements);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        console.error('Erro ao buscar usuários:', err);
        setError(err.response?.status === 429
          ? 'Muitas buscas seguidas. Espere alguns segundos.'
          : 'Não foi possível buscar usuários agora.');
        setUsers([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [debouncedTerm, isGuest, isTooShort]);

  const loadMore = async () => {
    if (loadingMore || page + 1 >= totalPages) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const data = await communityService.searchUsers(debouncedTerm, page + 1, PAGE_SIZE);
      if (requestId !== requestIdRef.current) return;
      const pageData = readPage(data);
      setUsers(prev => {
        const seen = new Set(prev.map(u => u.id));
        return [...prev, ...pageData.content.filter(u => !seen.has(u.id))];
      });
      setPage(pageData.number);
      setTotalPages(pageData.totalPages);
    } catch (err) {
      console.error('Erro ao carregar mais usuários:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (isGuest) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-4 py-24 px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand/10 text-brand flex items-center justify-center">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-black text-main">Comunidade</h2>
        <p className="text-dim/70 max-w-sm">
          Crie uma conta para encontrar outras pessoas, ver as avaliações, playlists e músicas curtidas delas.
        </p>
        <Button icon={LogIn} onClick={() => { authService.logout(); navigate('/register'); }}>
          Criar conta
        </Button>
      </div>
    );
  }

  const showingRecent = normalizedTerm.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32 md:pb-8 animate-in fade-in duration-500">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold text-main flex items-center gap-3">
          <Users className="text-brand" size={28} />
          Comunidade
        </h2>
        <p className="text-dim font-medium">Encontre pessoas e veja o que elas estão ouvindo e avaliando.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={18} />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por @usuario ou nome"
          autoFocus
          maxLength={50}
          className="w-full bg-(--bg-card) border border-(--border-subtle) rounded-2xl pl-11 pr-11 py-3.5 text-main placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
          aria-label="Buscar usuários"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-dim hover:text-main hover:bg-brand/10 transition-all"
            aria-label="Limpar busca"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-dim">
          {showingRecent ? 'Membros recentes' : isTooShort ? 'Digite pelo menos 2 caracteres' : `${totalElements} ${totalElements === 1 ? 'resultado' : 'resultados'}`}
        </h3>
        {loading && <Loader2 size={16} className="animate-spin text-brand" />}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && !isTooShort && users.length === 0 && (
        <div className="flex flex-col items-center text-center gap-2 py-16 text-dim">
          <Search size={32} className="opacity-40" />
          <p className="font-bold text-main">Ninguém encontrado</p>
          <p className="text-sm text-dim/70">Perfis privados não aparecem na busca.</p>
        </div>
      )}

      {users.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => navigate(publicProfilePath(u.username))}
                className="w-full flex items-center gap-4 p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:bg-brand/5 hover:border-brand/20 transition-all group text-left"
              >
                <UserAvatar user={u} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-main truncate group-hover:text-brand-legible transition-colors">
                    {u.displayName || u.username}
                  </p>
                  <p className="text-xs text-dim truncate">
                    @{u.username}
                    {currentUser?.id === u.id && <span className="ml-2 text-brand-legible font-bold">você</span>}
                  </p>
                </div>
                <ChevronRight size={18} className="text-dim/40 group-hover:text-brand-legible transition-colors shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {page + 1 < totalPages && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
