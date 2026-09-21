# 🎵 Synfonia

Sua música, num só lugar. Junte Spotify, YouTube Music e sua biblioteca pessoal numa interface rápida, bonita e sem enrolação — favorite, monte playlists, avalie álbuns e descubra o que seus amigos estão ouvindo.

**[📲 Baixar o app (Android)](https://github.com/invencaosts/Synfonia-Front/releases/latest)**

---

## O que dá pra fazer

- **Toca tudo junto** — Spotify, YouTube Music e biblioteca própria numa fila só, sem trocar de app
- **Perfil social** — mostra o que você tá ouvindo agora, sua música favorita, avatar e playlists públicas
- **Avalia álbuns** — nota, resenha e compartilha o resultado com os amigos
- **Player imersivo** — tela cheia com a capa em destaque, sem distração

---

## O repositório

Este é o **frontend** (React + Vite + Capacitor). O backend fica em [`invencaosts/Synfonia`](https://github.com/invencaosts/Synfonia).

### Rodando local

```bash
npm install
npm run dev
```

Configure o `.env` com a URL do backend antes (veja `.env.example`). Pra empacotar o app Android via Capacitor, veja o workflow em `.github/workflows/release-android.yml`.

### Lançando uma nova versão

```bash
git tag v1.0.x
git push origin v1.0.x
```

O GitHub Actions builda, assina e publica o APK automaticamente em [Releases](https://github.com/invencaosts/Synfonia-Front/releases).
