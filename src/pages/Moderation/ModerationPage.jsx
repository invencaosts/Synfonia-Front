import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Ban, ExternalLink, History, KeyRound, Loader2, Lock, Search, ShieldCheck,
  ShieldMinus, ShieldPlus, Undo2, Users, X
} from 'lucide-react';
import { adminService, apiErrorMessage } from '../../services/adminService';
import { authService } from '../../services/authService';
import { readPage, publicProfilePath } from '../../services/communityService';
import { PERMISSOES, ROLE_LABELS, hasPermission } from '../../utils/permissions';
import UserAvatar from '../../components/Community/UserAvatar';
import RoleBadges from '../../components/Moderation/RoleBadges';
import ModerationActionModal from '../../components/Moderation/ModerationActionModal';
import Button from '../../components/ui/Button';

const PAGE_SIZE = 20;

const ACAO_LABELS = {
  USUARIO_SUSPENDER: 'Suspendeu usuário',
  USUARIO_REATIVAR: 'Reativou usuário',
  PAPEL_CONCEDER: 'Concedeu papel',
  PAPEL_REMOVER: 'Removeu papel',
  AVALIACAO_OCULTAR: 'Ocultou avaliação',
  AVALIACAO_REEXIBIR: 'Reexibiu avaliação',
  PLAYLIST_BLOQUEAR: 'Bloqueou playlist',
  PLAYLIST_DESBLOQUEAR: 'Desbloqueou playlist',
  SEED_CRIAR_USUARIO: 'Seed: criou conta',
  SEED_CONCEDER_PAPEL: 'Seed: concedeu papel',
};

const formatDateTime = (iso) => (iso
  ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');

const UsersTab = ({ currentUser }) => {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [onlyBanned, setOnlyBanned] = useState(false);
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null); // { type, user, role }
  const requestIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const load = useCallback(async (page) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.searchUsers({ q: debouncedTerm, banidos: onlyBanned, page, size: PAGE_SIZE });
      if (requestId !== requestIdRef.current) return;
      const pageData = readPage(data);
      setUsers(prev => (page === 0 ? pageData.content : [...prev, ...pageData.content]));
      setPageInfo({ number: pageData.number, totalPages: pageData.totalPages, totalElements: pageData.totalElements });
    } catch (err) {
      if (requestId === requestIdRef.current) setError(apiErrorMessage(err, 'Não foi possível carregar os usuários.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedTerm, onlyBanned]);

  useEffect(() => { load(0); }, [load]);

  const replaceUser = (updated) => setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));

  const actionConfig = (() => {
    if (!action) return null;
    const name = `@${action.user.username}`;
    switch (action.type) {
      case 'suspend':
        return {
          title: `Suspender ${name}`,
          description: 'A pessoa perde o acesso na hora e some da comunidade até a suspensão acabar.',
          confirmText: 'Suspender', askDuration: true,
          run: (payload) => adminService.suspend(action.user.id, payload),
        };
      case 'reactivate':
        return {
          title: `Reativar ${name}`, description: 'Remove a suspensão imediatamente.',
          confirmText: 'Reativar', danger: false,
          run: (payload) => adminService.reactivate(action.user.id, payload),
        };
      case 'grant':
        return {
          title: `Tornar ${name} ${ROLE_LABELS[action.role]}`,
          description: 'O papel dá novas permissões de moderação a esta conta.',
          confirmText: 'Conceder', danger: false,
          run: (payload) => adminService.grantRole(action.user.id, action.role, payload),
        };
      case 'revoke':
        return {
          title: `Remover ${ROLE_LABELS[action.role]} de ${name}`,
          description: 'As permissões do papel deixam de valer na próxima requisição da pessoa.',
          confirmText: 'Remover',
          run: (payload) => adminService.revokeRole(action.user.id, action.role, payload),
        };
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={18} />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={hasPermission(currentUser, PERMISSOES.USUARIOS_DADOS_SENSIVEIS) ? 'Buscar por @usuario, nome ou e-mail' : 'Buscar por @usuario ou nome'}
            maxLength={100}
            className="w-full bg-(--bg-side) border border-(--border-subtle) rounded-2xl pl-11 pr-4 py-3 text-main placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
            aria-label="Buscar usuários"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyBanned(v => !v)}
          aria-pressed={onlyBanned}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold transition-all ${onlyBanned ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'border-(--border-subtle) text-dim hover:text-main'}`}
        >
          <Ban size={16} />
          Só suspensos
        </button>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dim">
        {pageInfo.totalElements} {pageInfo.totalElements === 1 ? 'usuário' : 'usuários'}
      </p>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <li key={u.id} className={`p-4 rounded-3xl border bg-(--bg-card) space-y-3 ${u.banido ? 'border-red-500/30' : 'border-(--border-subtle)'}`}>
                <div className="flex items-start gap-3">
                  <UserAvatar user={u} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-main truncate">{u.displayName || u.username}</p>
                      <RoleBadges roles={u.roles} />
                      {isSelf && <span className="text-[10px] font-bold text-brand-legible">você</span>}
                    </div>
                    <p className="text-xs text-dim truncate">
                      @{u.username}{u.email ? ` · ${u.email}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-dim/70 font-bold uppercase tracking-wider">
                      <span>Desde {formatDateTime(u.dataCriacao).split(' ')[0]}</span>
                      {u.ultimoLogin && <span>Último login {formatDateTime(u.ultimoLogin)}</span>}
                      {!u.ativo && <span className="text-amber-500">Conta desativada</span>}
                      {!u.perfilPublico && <span className="flex items-center gap-1"><Lock size={10} />Perfil privado</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(publicProfilePath(u.username))}
                    className="p-2 rounded-xl text-dim hover:text-brand-legible hover:bg-brand/10 transition-all shrink-0"
                    title="Ver perfil"
                    aria-label={`Ver perfil de ${u.username}`}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                {u.banido && (
                  <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs text-red-500">
                    <span className="font-black uppercase tracking-wider">Suspenso {u.banidoAte ? `até ${formatDateTime(u.banidoAte)}` : 'permanentemente'}</span>
                    {u.banidoMotivo && <span className="block text-dim mt-1">Motivo: {u.banidoMotivo}</span>}
                  </div>
                )}

                {(u.podeSuspender || u.rolesConcediveis?.length > 0 || u.rolesRemoviveis?.length > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {u.podeSuspender && (u.banido ? (
                      <button type="button" onClick={() => setAction({ type: 'reactivate', user: u })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20">
                        <Undo2 size={13} /> Reativar
                      </button>
                    ) : (
                      <button type="button" onClick={() => setAction({ type: 'suspend', user: u })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20">
                        <Ban size={13} /> Suspender
                      </button>
                    ))}
                    {u.rolesConcediveis?.map(role => (
                      <button key={`g-${role}`} type="button" onClick={() => setAction({ type: 'grant', user: u, role })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand/10 text-brand-legible border border-brand/20 hover:bg-brand/20">
                        <ShieldPlus size={13} /> Tornar {ROLE_LABELS[role]}
                      </button>
                    ))}
                    {u.rolesRemoviveis?.map(role => (
                      <button key={`r-${role}`} type="button" onClick={() => setAction({ type: 'revoke', user: u, role })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-(--border-subtle) text-dim hover:text-red-500 hover:border-red-500/30">
                        <ShieldMinus size={13} /> Remover {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="text-center text-sm text-dim py-12">Nenhum usuário encontrado.</p>
      )}

      {pageInfo.number + 1 < pageInfo.totalPages && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loading} onClick={() => load(pageInfo.number + 1)}>Carregar mais</Button>
        </div>
      )}

      <ModerationActionModal
        isOpen={!!actionConfig}
        onClose={() => setAction(null)}
        title={actionConfig?.title}
        description={actionConfig?.description}
        confirmText={actionConfig?.confirmText}
        danger={actionConfig?.danger !== false}
        askDuration={actionConfig?.askDuration}
        onConfirm={async (payload) => replaceUser(await actionConfig.run(payload))}
      />
    </div>
  );
};

const AuditTab = () => {
  const [entries, setEntries] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (page) => {
    setLoading(true);
    setError(null);
    try {
      const pageData = readPage(await adminService.getAudit({ page }));
      setEntries(prev => (page === 0 ? pageData.content : [...prev, ...pageData.content]));
      setPageInfo({ number: pageData.number, totalPages: pageData.totalPages });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar a auditoria.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  if (loading && entries.length === 0) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {entries.length === 0 && !error && <p className="text-center text-sm text-dim py-12">Nenhuma ação registrada ainda.</p>}
      <ul className="divide-y divide-(--border-subtle)">
        {entries.map(e => (
          <li key={e.id} className="py-3 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-bold text-main">@{e.atorUsername || `#${e.atorId}`}</span>
              <span className="text-dim">{ACAO_LABELS[e.acao] || e.acao}</span>
              {e.alvoUsername && <span className="font-bold text-main">@{e.alvoUsername}</span>}
              {e.detalhe && <span className="text-dim/70 text-xs">· {e.detalhe}</span>}
            </div>
            {e.motivo && <p className="text-xs text-dim">Motivo: {e.motivo}</p>}
            <p className="text-[10px] font-bold uppercase tracking-wider text-dim/60">{formatDateTime(e.criadoEm)}</p>
          </li>
        ))}
      </ul>
      {pageInfo.number + 1 < pageInfo.totalPages && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loading} onClick={() => load(pageInfo.number + 1)}>Carregar mais</Button>
        </div>
      )}
    </div>
  );
};

const RolesTab = () => {
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminService.listRoles()
      .then(setRoles)
      .catch(err => setError(apiErrorMessage(err, 'Não foi possível carregar os papéis.')));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!roles) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-dim">
        Papéis e permissões são definidos no código. Ninguém age sobre contas de nível igual ou maior que o próprio,
        e Super Admin só é concedido pelo seed do servidor.
      </p>
      {roles.map(role => (
        <div key={role.nome} className="p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RoleBadges roles={[role.nome]} />
              {role.nome === 'USER' && <span className="text-sm font-bold text-main">{ROLE_LABELS.USER}</span>}
              <span className="text-[10px] font-bold text-dim/60 uppercase tracking-wider">nível {role.nivel}</span>
            </div>
            {role.concedivel && <span className="text-[10px] font-bold text-brand-legible uppercase tracking-wider">você pode conceder</span>}
          </div>
          <p className="text-sm text-dim">{role.descricao}</p>
          {role.permissoes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {role.permissoes.map(p => (
                <span key={p} className="px-2 py-0.5 rounded-md bg-(--bg-side) border border-(--border-subtle) text-[10px] font-mono text-dim">{p}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ModerationPage = () => {
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    const update = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('userUpdate', update);
    return () => window.removeEventListener('userUpdate', update);
  }, []);

  const tabs = [
    { id: 'usuarios', label: 'Usuários', icon: Users, allowed: hasPermission(currentUser, PERMISSOES.USUARIOS_LER) },
    { id: 'auditoria', label: 'Auditoria', icon: History, allowed: hasPermission(currentUser, PERMISSOES.AUDITORIA_LER) },
    { id: 'papeis', label: 'Papéis', icon: KeyRound, allowed: hasPermission(currentUser, PERMISSOES.PAINEL_MODERACAO_ACESSAR) },
  ].filter(t => t.allowed);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  if (!hasPermission(currentUser, PERMISSOES.PAINEL_MODERACAO_ACESSAR)) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-3 py-24 px-4">
        <X size={32} className="text-dim/50" />
        <h2 className="text-2xl font-black text-main">Acesso restrito</h2>
        <p className="text-dim/70">Esta área é só para a equipe de moderação.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 md:pb-8 animate-in fade-in duration-500">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold text-main flex items-center gap-3">
          <ShieldCheck className="text-brand" size={28} />
          Moderação
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dim font-medium">Você está como</span>
          <RoleBadges roles={currentUser?.roles} />
        </div>
      </header>

      <div role="tablist" className="flex gap-2 p-1 bg-(--bg-side) rounded-2xl border border-(--border-subtle)">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-brand text-brand-contrast shadow-lg' : 'text-dim hover:text-main'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' && <UsersTab currentUser={currentUser} />}
      {activeTab === 'auditoria' && <AuditTab />}
      {activeTab === 'papeis' && <RolesTab />}
    </div>
  );
};

export default ModerationPage;
