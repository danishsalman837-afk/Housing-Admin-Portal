import { create } from 'zustand';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  solicitor_name: string;
}

export interface Snippet {
  id: string;
  folderId: string;
  title: string;
  content: string;
}

export interface Folder {
  id: string;
  name: string;
}

interface CommState {
  activeLead: Lead | null;
  setActiveLead: (lead: Lead | null) => void;
  snippets: Snippet[];
  folders: Folder[];
  addFolder: (name: string) => void;
  addSnippet: (folderId: string, title: string, content: string) => void;
}

export const useCommStore = create<CommState>((set) => ({
  activeLead: null,
  setActiveLead: (lead) => set({ activeLead: lead }),
  snippets: [],
  folders: [{ id: '1', name: 'Intro / Onboarding' }, { id: '2', name: 'Legal Follow-Ups' }],
  addFolder: (name) => set((state) => ({ 
    folders: [...state.folders, { id: Date.now().toString(), name }]
  })),
  addSnippet: (folderId, title, content) => set((state) => ({ 
    snippets: [...state.snippets, { id: Date.now().toString(), folderId, title, content }]
  })),
}));
