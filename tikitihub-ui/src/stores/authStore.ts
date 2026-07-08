import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import apiClient from '../lib/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await apiClient.post('/auth/login', { email, password });
          console.log("=== RAW BACKEND LOGIN RESPONSE DATA ===", data);
          
          if (data && data.token) {
            set({ 
              user: data.user, 
              token: data.token,
              isAuthenticated: true,
              loading: false,
              error: null 
            });
          } else {
            set({ error: 'Invalid response format from server', loading: false });
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Invalid email or password. Please try again.';
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      register: async (userData) => {
        const { data } = await apiClient.post('/auth/register', userData);
        
        set({ 
          user: data.user, 
          token: data.token, 
          isAuthenticated: true 
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);