// Converte um link recebido pelo app (https://<host>/avaliacao/x ou synfonia://avaliacao/x)
// numa rota interna. Só aceita rotas conhecidas; o resto é ignorado.
export function rotaDoDeepLink(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const caminho = parsed.protocol === 'synfonia:'
    ? `/${parsed.host}${parsed.pathname}`
    : parsed.pathname;
  const rotaConhecida = /^\/(avaliacao|u)\/[^/]+\/?$/.test(caminho) || /^\/callback\/?$/.test(caminho);
  return rotaConhecida ? `${caminho}${parsed.search}` : null;
}
