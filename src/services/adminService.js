import api from './api';

export const adminService = {
  searchUsers: async ({ q = '', banidos = false, page = 0, size = 20 } = {}) => {
    const response = await api.get('/admin/usuarios', { params: { q, banidos, page, size } });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/admin/usuarios/${id}`);
    return response.data;
  },

  suspend: async (id, { motivo, dias }) => {
    const response = await api.post(`/admin/usuarios/${id}/suspensao`, { motivo, dias: dias || null });
    return response.data;
  },

  reactivate: async (id, { motivo }) => {
    const response = await api.post(`/admin/usuarios/${id}/reativacao`, { motivo });
    return response.data;
  },

  grantRole: async (id, role, { motivo }) => {
    const response = await api.post(`/admin/usuarios/${id}/roles/${role}`, { motivo });
    return response.data;
  },

  revokeRole: async (id, role, { motivo }) => {
    const response = await api.post(`/admin/usuarios/${id}/roles/${role}/remocao`, { motivo });
    return response.data;
  },

  listRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  hideRating: async (id, { motivo }) => {
    const response = await api.post(`/admin/avaliacoes/${encodeURIComponent(id)}/ocultar`, { motivo });
    return response.data;
  },

  unhideRating: async (id, { motivo }) => {
    const response = await api.post(`/admin/avaliacoes/${encodeURIComponent(id)}/reexibir`, { motivo });
    return response.data;
  },

  blockPlaylist: async (id, { motivo }) => {
    await api.post(`/admin/playlists/${encodeURIComponent(id)}/bloquear`, { motivo });
  },

  unblockPlaylist: async (id, { motivo }) => {
    await api.post(`/admin/playlists/${encodeURIComponent(id)}/desbloquear`, { motivo });
  },

  getAudit: async ({ usuarioId, page = 0, size = 30 } = {}) => {
    const response = await api.get('/admin/auditoria', { params: { usuarioId, page, size } });
    return response.data;
  },
};

export const apiErrorMessage = (err, fallback = 'Não foi possível concluir a ação.') =>
  err?.response?.data?.detalhe || err?.response?.data?.message || fallback;
