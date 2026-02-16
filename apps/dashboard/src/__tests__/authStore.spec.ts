/**
 * Tests for the auth Zustand store.
 * Validates login, logout, initialization from localStorage, and error handling.
 */
import { useAuthStore } from '../store/authStore';

// Mock axios-based API client
jest.mock('../api/client', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

import { authApi } from '../api/client';

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

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should set user and token on successful login', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-jwt-token',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            organizationId: 'org-1',
          },
        },
      };

      (authApi.login as jest.Mock).mockResolvedValue(mockResponse);

      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(state.token).toBe('mock-jwt-token');
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should store token and user in localStorage', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-jwt-token',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            organizationId: 'org-1',
          },
        },
      };

      (authApi.login as jest.Mock).mockResolvedValue(mockResponse);

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'accessToken',
        'mock-jwt-token',
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        expect.any(String),
      );
    });

    it('should set error on failed login', async () => {
      (authApi.login as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } },
      });

      try {
        await useAuthStore.getState().login('wrong@example.com', 'bad');
      } catch {
        // Expected
      }

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      (authApi.login as jest.Mock).mockReturnValue(loginPromise);

      const loginCall = useAuthStore.getState().login('test@example.com', 'pass');

      // Should be loading
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin!({
        data: {
          accessToken: 'token',
          user: { id: '1', email: 'test@example.com', firstName: 'T', lastName: 'U', role: 'admin', organizationId: 'o1' },
        },
      });

      await loginCall;

      // Should stop loading
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user, token, and localStorage', () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', firstName: 'T', lastName: 'U', role: 'admin', organizationId: 'o1' },
        token: 'some-token',
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('initialize', () => {
    it('should restore state from localStorage', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        organizationId: 'org-1',
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'accessToken') return 'saved-token';
        if (key === 'user') return JSON.stringify(user);
        return null;
      });

      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('saved-token');
      expect(state.user?.email).toBe('test@example.com');
    });

    it('should not authenticate if no token in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'accessToken') return 'saved-token';
        if (key === 'user') return 'not-valid-json';
        return null;
      });

      useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
    });
  });
});
