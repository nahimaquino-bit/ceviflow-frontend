export const getEmoji = (name) => {
  const n = name.toLowerCase();
  if (n.includes('ceviche')) return '🥘';
  if (n.includes('cola') || n.includes('gaseosa') || n.includes('fanta') || n.includes('sprite')) return '🥤';
  if (n.includes('agua')) return '💧';
  if (n.includes('chifle')) return '🍌';
  if (n.includes('cerveza')) return '🍺';
  if (n.includes('arroz') || n.includes('chaufa')) return '🍛';
  if (n.includes('pescado')) return '🐟';
  if (n.includes('marisco')) return '🦑';
  if (n.includes('leche')) return '🥛';
  return '🍽️';
};

export const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';
