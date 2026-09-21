const STORAGE_KEY = 'synfonia_recent_albums';
const MAX_ITEMS = 10;

export function addRecentAlbum(album) {
  try {
    const atual = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const semDuplicata = atual.filter((a) => a.albumKey !== album.albumKey);
    semDuplicata.unshift({
      albumKey: album.albumKey,
      albumName: album.albumName,
      artista: album.artista,
      capaUrl: album.capaUrl,
      source: album.source,
      externalAlbumId: album.externalAlbumId,
      playedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(semDuplicata.slice(0, MAX_ITEMS)));
  } catch (err) {
    console.error('Erro ao salvar álbum recente:', err);
  }
}

export function getRecentAlbums() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
