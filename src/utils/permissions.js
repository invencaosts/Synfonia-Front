// Espelho das permissões do backend (enum Permissao). Só decide o que EXIBIR:
// toda ação é autorizada de novo no backend.
export const PERMISSOES = {
  PAINEL_MODERACAO_ACESSAR: 'PAINEL_MODERACAO_ACESSAR',
  USUARIOS_LER: 'USUARIOS_LER',
  USUARIOS_DADOS_SENSIVEIS: 'USUARIOS_DADOS_SENSIVEIS',
  USUARIOS_BANIR: 'USUARIOS_BANIR',
  CONTEUDO_MODERAR: 'CONTEUDO_MODERAR',
  PAPEIS_GERENCIAR: 'PAPEIS_GERENCIAR',
  AUDITORIA_LER: 'AUDITORIA_LER',
};

export const hasPermission = (user, permissao) =>
  Array.isArray(user?.permissoes) && user.permissoes.includes(permissao);

export const ROLE_LABELS = {
  USER: 'Usuário',
  MODERATOR: 'Moderador',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
};

export const ROLE_STYLES = {
  MODERATOR: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  ADMIN: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  SUPER_ADMIN: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export const elevatedRoles = (roles) => (roles || []).filter(r => r !== 'USER');
