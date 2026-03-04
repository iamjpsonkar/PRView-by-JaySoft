import { create } from 'zustand';

export interface RepoState {
  repoId: string | null;
  repoName: string | null;
  repoPath: string | null;
  setRepo: (id: string, name: string, path: string) => void;
  clearRepo: () => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repoId: null,
  repoName: null,
  repoPath: null,
  setRepo: (id, name, path) => set({ repoId: id, repoName: name, repoPath: path }),
  clearRepo: () => set({ repoId: null, repoName: null, repoPath: null }),
}));
