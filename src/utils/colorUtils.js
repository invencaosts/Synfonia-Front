export const getContrastColor = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1e1b4b' : '#ffffff';
};

export const getLegibleColor = (color, currentTheme) => {
  if (!color) return currentTheme === 'light' ? '#8b5cf6' : '#ffffff';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 180 && currentTheme === 'light') return '#1e1b4b';
  if (brightness < 60 && currentTheme !== 'light') return '#ffffff';
  return color;
};

export const hasPoorContrast = (color, currentTheme) => {
  if (!color) return false;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (currentTheme === 'light' && brightness > 180) return true;
  if (currentTheme !== 'light' && brightness < 60) return true;
  return false;
};

export const hexToRgb = (hex) => {
  if (!hex) return '139, 92, 246';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};
