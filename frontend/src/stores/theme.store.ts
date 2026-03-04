import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = localStorage.getItem('prv-theme');
  const dark = saved === 'dark';
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');

  return {
    dark,
    toggle: () => set((s) => {
      const next = !s.dark;
      localStorage.setItem('prv-theme', next ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
      return { dark: next };
    }),
  };
});
