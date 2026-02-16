/**
 * Tests for the theme Zustand store.
 * Validates dark/light mode toggling and persistence.
 */
import { useThemeStore } from '../store/themeStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock document.documentElement.classList
const classListMock = {
  toggle: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};
Object.defineProperty(document.documentElement, 'classList', {
  value: classListMock,
  writable: true,
});

describe('ThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDark: false });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('toggle', () => {
    it('should toggle from light to dark', () => {
      useThemeStore.setState({ isDark: false });

      useThemeStore.getState().toggle();

      expect(useThemeStore.getState().isDark).toBe(true);
    });

    it('should toggle from dark to light', () => {
      useThemeStore.setState({ isDark: true });

      useThemeStore.getState().toggle();

      expect(useThemeStore.getState().isDark).toBe(false);
    });

    it('should persist theme preference to localStorage', () => {
      useThemeStore.setState({ isDark: false });

      useThemeStore.getState().toggle();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should toggle dark class on document element', () => {
      useThemeStore.setState({ isDark: false });

      useThemeStore.getState().toggle();

      expect(classListMock.toggle).toHaveBeenCalledWith('dark', true);
    });
  });

  describe('initialize', () => {
    it('should use saved theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      useThemeStore.getState().initialize();

      expect(useThemeStore.getState().isDark).toBe(true);
      expect(classListMock.toggle).toHaveBeenCalledWith('dark', true);
    });

    it('should use light if saved as light', () => {
      localStorageMock.getItem.mockReturnValue('light');

      useThemeStore.getState().initialize();

      expect(useThemeStore.getState().isDark).toBe(false);
      expect(classListMock.toggle).toHaveBeenCalledWith('dark', false);
    });

    it('should fall back to system preference if nothing saved', () => {
      localStorageMock.getItem.mockReturnValue(null);

      // System prefers dark
      (window.matchMedia as jest.Mock).mockReturnValue({ matches: true });

      useThemeStore.getState().initialize();

      expect(useThemeStore.getState().isDark).toBe(true);
    });
  });
});
