import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FileReviewState {
  reviewedFiles: Record<string, string[]>; // prId -> list of reviewed file paths
  isReviewed: (prId: string, filePath: string) => boolean;
  toggleReviewed: (prId: string, filePath: string) => void;
  getReviewedCount: (prId: string) => number;
  clearPR: (prId: string) => void;
}

export const useFileReviewStore = create<FileReviewState>()(
  persist(
    (set, get) => ({
      reviewedFiles: {},
      isReviewed: (prId, filePath) => {
        return (get().reviewedFiles[prId] || []).includes(filePath);
      },
      toggleReviewed: (prId, filePath) => {
        set((state) => {
          const current = state.reviewedFiles[prId] || [];
          const updated = current.includes(filePath)
            ? current.filter((f) => f !== filePath)
            : [...current, filePath];
          return { reviewedFiles: { ...state.reviewedFiles, [prId]: updated } };
        });
      },
      getReviewedCount: (prId) => {
        return (get().reviewedFiles[prId] || []).length;
      },
      clearPR: (prId) => {
        set((state) => {
          const { [prId]: _, ...rest } = state.reviewedFiles;
          return { reviewedFiles: rest };
        });
      },
    }),
    { name: 'prv-file-review' },
  ),
);
