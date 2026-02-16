import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  toggle: () => {
    const newVal = !get().isDark;
    set({ isDark: newVal });
    localStorage.setItem('theme', newVal ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newVal);
  },

  initialize: () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    set({ isDark });
    document.documentElement.classList.toggle('dark', isDark);
  },
}));
