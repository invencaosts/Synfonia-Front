import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Importante para enviar e receber cookies HttpOnly
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  // Configuração automática para proteção CSRF do Spring Security
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});


// Interceptor para lidar com respostas e erros globais (ex: token expirado)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se for 401 e NÃO for uma tentativa de login, remove bandeiras locais e redireciona
    if (error.response && error.response.status === 401) {
      const isAuthRequest = error.config.url.includes('/auth/');
      
      if (!isAuthRequest) {
        localStorage.removeItem('user');
        localStorage.removeItem('isGuest');
        // Não resetamos o token aqui pois ele está em um cookie HttpOnly que deve ser limpo pelo servidor
        // No entanto, podemos redirecionar para o login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
