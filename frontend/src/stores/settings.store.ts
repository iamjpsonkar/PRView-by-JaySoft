import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  displayName: string;
  diffViewMode: 'side-by-side' | 'inline';
  defaultMergeStrategy: 'merge' | 'squash' | 'rebase';
  theme: 'light' | 'dark';
  setDisplayName: (name: string) => void;
  setDiffViewMode: (mode: 'side-by-side' | 'inline') => void;
  setDefaultMergeStrategy: (s: 'merge' | 'squash' | 'rebase') => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayName: 'local-user',
      diffViewMode: 'side-by-side',
      defaultMergeStrategy: 'merge',
      theme: 'light',

      setDisplayName: (name) => set({ displayName: name }),

      setDiffViewMode: (mode) => set({ diffViewMode: mode }),

      setDefaultMergeStrategy: (s) => set({ defaultMergeStrategy: s }),

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
          return { theme: next };
        }),
    }),
    {
      name: 'prv-settings',
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      },
    },
  ),
);
