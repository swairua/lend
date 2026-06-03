// Fallback implementation using localStorage
const localStorageImpl = {
  async get({ key }: { key: string }) {
    try {
      const value = localStorage.getItem(key);
      return { value };
    } catch {
      return { value: null };
    }
  },
  async set({ key, value }: { key: string; value: string }) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error setting in localStorage:', e);
    }
  },
  async remove({ key }: { key: string }) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

// Get the appropriate storage implementation
async function getStorageImpl() {
  const global = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
  // Check if Capacitor is available (native app context only)
  if (global && typeof global.Capacitor !== 'undefined') {
    try {
      const mod = await import('@capacitor/preferences');
      return mod.Preferences;
    } catch (e) {
      // Fallback if import fails
      return localStorageImpl;
    }
  }
  // Browser context - use localStorage
  return localStorageImpl;
}

let storageImpl: any = null;

// Initialize storage on first use
async function ensureStorage() {
  if (!storageImpl) {
    storageImpl = await getStorageImpl();
  }
  return storageImpl;
}

const TOKEN_KEY = 'app_token';
const USER_KEY = 'app_user';
const REFRESH_TOKEN_KEY = 'app_refresh_token';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      const storage = await ensureStorage();
      const { value } = await storage.get({ key: TOKEN_KEY });
      return value;
    } catch (error) {
      console.error('Error reading token from secure storage:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.set({ key: TOKEN_KEY, value: token });
    } catch (error) {
      console.error('Error saving token to secure storage:', error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.remove({ key: TOKEN_KEY });
    } catch (error) {
      console.error('Error removing token from secure storage:', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const storage = await ensureStorage();
      const { value } = await storage.get({ key: REFRESH_TOKEN_KEY });
      return value;
    } catch (error) {
      console.error('Error reading refresh token from secure storage:', error);
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.set({ key: REFRESH_TOKEN_KEY, value: token });
    } catch (error) {
      console.error('Error saving refresh token to secure storage:', error);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.remove({ key: REFRESH_TOKEN_KEY });
    } catch (error) {
      console.error('Error removing refresh token from secure storage:', error);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const storage = await ensureStorage();
      const { value } = await storage.get({ key: USER_KEY });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error reading user from secure storage:', error);
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.set({ key: USER_KEY, value: JSON.stringify(user) });
    } catch (error) {
      console.error('Error saving user to secure storage:', error);
    }
  },

  async removeUser(): Promise<void> {
    try {
      const storage = await ensureStorage();
      await storage.remove({ key: USER_KEY });
    } catch (error) {
      console.error('Error removing user from secure storage:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.removeToken(),
        this.removeRefreshToken(),
        this.removeUser(),
      ]);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  },
};
