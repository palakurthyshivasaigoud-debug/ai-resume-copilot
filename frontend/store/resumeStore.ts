import { create } from 'zustand';

interface ResumeState {
  isUploading: boolean;
  uploadError: string | null;
  parsedData: any | null;
  setUploading: (status: boolean) => void;
  setError: (error: string | null) => void;
  setParsedData: (data: any) => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  isUploading: false,
  uploadError: null,
  parsedData: null,
  setUploading: (status) => set({ isUploading: status }),
  setError: (error) => set({ uploadError: error }),
  setParsedData: (data) => set({ parsedData: data }),
}));
