import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SupabaseAuthService } from '../services/supabaseService';
import type { AuthState, LoginRequest, RegisterRequest } from '../types';

type AuthUser = AuthState['user']; // Usa o mesmo tipo que está no AuthState

interface AuthStore extends AuthState {
  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<NonNullable<AuthUser>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (data: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await SupabaseAuthService.login(data);
          
          // Salvar dados no localStorage
          SupabaseAuthService.saveAuthData(response);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true });
        try {
          const response = await SupabaseAuthService.register(data);
          
          // Salvar dados no localStorage
          SupabaseAuthService.saveAuthData(response);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await SupabaseAuthService.logout();
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Erro no logout:', error);
          // Mesmo com erro, limpar estado
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        const { token, user } = get();
        
        if (!token || !user) {
          set({ isAuthenticated: false });
          return;
        }

        // Validar token
        if (!SupabaseAuthService.validateToken(token)) {
          SupabaseAuthService.clearAuthData();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          // Verificar se usuário ainda existe e está ativo
          const currentUser = await SupabaseAuthService.getCurrentUser();
          
          if (currentUser && currentUser.isActive) {
            set({
              user: currentUser,
              isAuthenticated: true,
            });
          } else {
            SupabaseAuthService.clearAuthData();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          SupabaseAuthService.clearAuthData();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      updateProfile: async (data: Partial<NonNullable<AuthUser>>) => {
        set({ isLoading: true });
        try {
          const updatedUser = await SupabaseAuthService.updateProfile(data);
          
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await SupabaseAuthService.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'prospectplus-auth',
      storage: createJSONStorage(() => localStorage),
      // Não persistir isLoading
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Ao rehidratar, verificar autenticação
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.checkAuth();
        }
      },
    }
  )
);
