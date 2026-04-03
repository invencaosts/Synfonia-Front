# ✨ Synfonia - Immersive Music Experience (Frontend)

O **Synfonia** é uma interface musical de nível premium, projetada para oferecer uma experiência cinematográfica e fluida. Este repositório contém o **Frontend**, construído com as melhores práticas de UX/UI moderna, animações dinâmicas e integração profunda com ecossistemas musicais.

---

## 🎨 Design e Estética (Aesthetic)
O Synfonia foi desenhado para impressionar desde o primeiro clique:
- **Glassmorphism & Gradients**: Uma interface moderna com efeitos de desfoque e gradientes vibrantes que se adaptam ao contexto.
- **Player Fullscreen Imersivo**: Uma experiência de audição que elimina distrações, com artes de álbum em destaque e controles intuitivos.
- **Framer Motion**: Micro-animações suaves em cada interação, desde a expansão do player até transições de página.
- **Temas Dinâmicos**: O design se ajusta para refletir a "vibe" do usuário ou da música atual.

---

## 🔥 Funcionalidades Principais
- **Spotify Connect**: Integração via OAuth para sincronizar playlists, metadados e o status "Ouvindo Agora" em tempo real.
- **Perfis Sociais Personalizáveis**:
  - Escolha de avatares e links sociais.
  - **Favorite Beat**: Uma música que toca automaticamente ao visitar o perfil.
  - Exibição de playlists públicas.
- **Gerenciamento de Coleção**: Interface intuitiva para favoritar e organizar músicas de múltiplas fontes.
- **Busca Global**: Motor de busca integrado que vasculha a biblioteca local e serviços externos.

---

## 🏗️ Excelência Técnica
- **React 18 + Vite**: Performance ultrarrápida com Hot Module Replacement (HMR).
- **Gerenciamento de Estado (Context API)**: Lógica centralizada para Áudio, Temas e Autenticação, garantindo consistência em toda a aplicação.
- **UX Hardening**:
  - **Sessão Resiliente**: Logout instantâneo e limpeza de cache local proativa.
  - **Reatividade Real**: Contagens e estados sincronizados globalmente via hooks customizados.
- **CI/CD**: Workflow de verificação de build automatizado via **GitHub Actions**.

---

## 🚀 Como Iniciar
1. Certifique-se de ter o **Node.js 20+** instalado.
2. Configure as **Variáveis de Ambiente** no arquivo `.env`:
   ```env
   VITE_API_URL=http://localhost:8080/api/v1
   VITE_SPOTIFY_CLIENT_ID=seu_client_id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---
*Construído para amantes de música que valorizam cada detalhe visual.*
