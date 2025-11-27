import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, LoginRequest, RegisterRequest, AuthResponse, AuthState } from '../types';

type AuthUser = AuthState['user']; // Usa o mesmo tipo que está no AuthState

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseAuthService {
  // Login com email e senha
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!authData.user || !authData.session) {
        throw new Error('Falha na autenticação');
      }

      // Buscar dados adicionais do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
        throw new Error('Erro ao carregar dados do usuário');
      }

      const user: Omit<User, 'password'> = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        role: userData.role,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      // Salvar dados localmente
      this.saveAuthData({
        user,
        token: authData.session.access_token,
        expiresIn: authData.session.expires_in || 3600,
      });

      return {
        user,
        token: authData.session.access_token,
        expiresIn: authData.session.expires_in || 3600,
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  // Registro de novo usuário
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('Iniciando registro para:', data.email);
      
      // 1. Apenas registrar no Supabase Auth - versão minimalista
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone,
          },
        },
      });

      console.log('Resposta do Supabase Auth:', { authData, authError });

      if (authError) {
        console.error('Erro do Supabase Auth:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário - sem dados retornados');
      }

      console.log('Usuário criado no auth:', authData.user.id);

      // 2. Se registro for imediato (sem verificação de email)
      if (authData.session) {
        console.log('Sessão criada, buscando dados...');
        
        // Aguardar trigger executar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Tentar buscar dados na tabela users
        let userData = null;
        let userError = null;
        
        try {
          const result = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          userData = result.data;
          userError = result.error;
          
          console.log('Dados da tabela users:', { userData, userError });
        } catch (err) {
          console.error('Erro ao buscar dados:', err);
          userError = err;
        }

        if (userError || !userData) {
          console.log('Usando fallback - dados do auth');
          // Se não encontrar na tabela users, usar dados básicos
          const user: AuthUser = {
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: 'user',
            isActive: true,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.saveAuthData({
            user,
            token: authData.session.access_token,
            expiresIn: authData.session.expires_in || 3600,
          });

          return {
            user,
            token: authData.session.access_token,
            expiresIn: authData.session.expires_in || 3600,
          };
        }

        const user: AuthUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          role: userData.role,
          isActive: userData.is_active,
          emailVerified: userData.email_verified,
          createdAt: new Date(userData.created_at),
          updatedAt: new Date(userData.updated_at),
        };

        console.log('Usuário final montado:', user);

        this.saveAuthData({
          user,
          token: authData.session.access_token,
          expiresIn: authData.session.expires_in || 3600,
        });

        return {
          user,
          token: authData.session.access_token,
          expiresIn: authData.session.expires_in || 3600,
        };
      }

      // Se precisar verificar email
      console.log('Registro precisa de verificação de email');
      throw new Error('Por favor, verifique seu email para confirmar o cadastro');
    } catch (error: any) {
      console.error('Erro completo no registro:', error);
      throw error;
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.clearAuthData();
    } catch (error: any) {
      console.error('Erro no logout:', error);
      this.clearAuthData(); // Limpar localmente mesmo se falhar
    }
  }

  // Obter usuário atual
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: authData, error } = await supabase.auth.getUser();

      if (error || !authData.user) {
        return null;
      }

      // Buscar dados completos na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
        return null;
      }

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        role: userData.role,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  // Atualizar perfil
  static async updateProfile(data: Partial<NonNullable<AuthUser>>): Promise<NonNullable<AuthUser>> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Atualizar metadados na auth
      if (data.name || data.phone) {
        await supabase.auth.updateUser({
          data: {
            name: data.name,
            phone: data.phone,
          },
        });
      }

      // Atualizar dados na tabela users
      const { data: userData, error } = await supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone,
          avatar: data.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        role: userData.role,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  // Alterar senha
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Verificar senha atual
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user?.email) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer login com senha atual para verificar
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: authData.user.email,
        password: currentPassword,
      });

      if (loginError) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  // Verificar se usuário está autenticado
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('@prospectplus:token');
    const user = localStorage.getItem('@prospectplus:user');
    
    if (!token || !user) {
      return false;
    }

    try {
      const userData = JSON.parse(user);
      return userData.isActive === true;
    } catch {
      return false;
    }
  }

  // Validar token (verificar se não expirou)
  static validateToken(token: string): boolean {
    try {
      // Supabase cuida da validação do token automaticamente
      // Aqui só verificamos se existe
      return token.length > 0;
    } catch {
      return false;
    }
  }

  // Salvar dados de autenticação localmente
  static saveAuthData(data: AuthResponse): void {
    localStorage.setItem('@prospectplus:token', data.token);
    localStorage.setItem('@prospectplus:user', JSON.stringify(data.user));
    localStorage.setItem('@prospectplus:expiresIn', data.expiresIn.toString());
  }

  // Limpar dados de autenticação
  static clearAuthData(): void {
    localStorage.removeItem('@prospectplus:token');
    localStorage.removeItem('@prospectplus:user');
    localStorage.removeItem('@prospectplus:expiresIn');
  }

  // Obter token atual
  static getToken(): string | null {
    return localStorage.getItem('@prospectplus:token');
  }

  // Obter usuário atual do localStorage
  static getStoredUser(): AuthUser | null {
    try {
      const userData = localStorage.getItem('@prospectplus:user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Verificar se token está expirado
  static isTokenExpired(): boolean {
    try {
      const token = this.getToken();
      const user = this.getStoredUser();
      
      if (!token || !user) {
        return true;
      }

      // Supabase cuida da expiração, mas podemos verificar timestamp
      const storedTime = localStorage.getItem('@prospectplus:loginTime');
      if (storedTime) {
        const loginTime = new Date(storedTime).getTime();
        const now = new Date().getTime();
        const hoursPassed = (now - loginTime) / (1000 * 60 * 60);
        
        // Token expira após 1 hora (3600 segundos)
        return hoursPassed > 1;
      }

      return false;
    } catch {
      return true;
    }
  }

  // Listener para mudanças na autenticação
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
