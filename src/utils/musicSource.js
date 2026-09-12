// Só ITUNES é sempre preview de 30s. Spotify só é preview quando o usuário
// não está conectado (cai no fallback de previewUrl). YouTube Music toca
// a música inteira via player embutido, nunca é preview.
export const isPreviewOnlyTrack = (source, isSpotifyConnected) => {
  if (source === 'ITUNES') return true;
  if (source === 'SPOTIFY') return !isSpotifyConnected;
  return false;
};
