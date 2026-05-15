import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'app_token';
const USER_KEY = 'app_user';
const REFRESH_TOKEN_KEY = 'app_refresh_token';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      return value;
    } catch (error) {
      console.error('Error reading token from secure storage:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    } catch (error) {
      console.error('Error saving token to secure storage:', error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch (error) {
      console.error('Error removing token from secure storage:', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      return value;
    } catch (error) {
      console.error('Error reading refresh token from secure storage:', error);
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: REFRESH_TOKEN_KEY, value: token });
    } catch (error) {
      console.error('Error saving refresh token to secure storage:', error);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    } catch (error) {
      console.error('Error removing refresh token from secure storage:', error);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      const { value } = await Preferences.get({ key: USER_KEY });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error reading user from secure storage:', error);
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
    } catch (error) {
      console.error('Error saving user to secure storage:', error);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await Preferences.remove({ key: USER_KEY });
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
