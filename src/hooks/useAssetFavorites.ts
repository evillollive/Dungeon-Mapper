import { useState } from 'react';

export function useAssetFavorites(kind: 'stamps' | 'materials') {
  const key = `dungeon-mapper:favorites:${kind}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      console.warn('Favorites could not be read. Project saving is unaffected.');
      return [];
    }
  });
  const [error, setError] = useState('');
  const toggle = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError('');
    } catch {
      setError('Favorites are available for this visit only because device preferences could not be saved.');
    }
  };
  return { favorites, toggle, error };
}
