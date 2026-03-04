import { create } from 'zustand';

export interface PRState {
  diffViewMode: 'side-by-side' | 'inline';
  toggleDiffViewMode: () => void;
  setDiffViewMode: (mode: 'side-by-side' | 'inline') => void;
}

export const usePRStore = create<PRState>((set) => ({
  diffViewMode: 'side-by-side',
  toggleDiffViewMode: () =>
    set((s) => ({ diffViewMode: s.diffViewMode === 'side-by-side' ? 'inline' : 'side-by-side' })),
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
}));
