import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

// Usa URL relativa - o Vite proxy redireciona para o backend em dev
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@prospectplus:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@prospectplus:token');
      localStorage.removeItem('@prospectplus:user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class AuthService {
  // Simulação de banco local (em produção, usar API real)
  private static users: User[] = [];

  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Em produção: await api.post('/auth/login', data);
      
      // Simulação local
      const user = this.users.find(u => u.email === data.email);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Simulação de verificação de senha (em produção usar bcrypt)
      const isPasswordValid = this.hashPassword(data.password) === user.password;
      
      if (!isPasswordValid) {
        throw new Error('Senha incorreta');
      }

      if (!user.isActive) {
        throw new Error('Conta desativada');
      }

      // Atualizar último login
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();

      const token = this.generateToken(user);
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        expiresIn: 86400, // 24 horas
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    }
  }

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Em produção: await api.post('/auth/register', data);
      
      // Validações
      if (data.password !== data.confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      if (data.password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      // Verificar se email já existe
      const existingUser = this.users.find(u => u.email === data.email);
      if (existingUser) {
        throw new Error('Este email já está cadastrado');
      }

      // Criar novo usuário
      const newUser: User = {
        id: this.generateId(),
        name: data.name,
        email: data.email,
        password: this.hashPassword(data.password),
        phone: data.phone,
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.users.push(newUser);

      const token = this.generateToken(newUser);
      const { password, ...userWithoutPassword } = newUser;

      return {
        user: userWithoutPassword,
        token,
        expiresIn: 86400,
      };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      throw new Error(error.message || 'Erro ao criar conta');
    }
  }

  static async logout(): Promise<void> {
    try {
      // Em produção: await api.post('/auth/logout');
      
      // Limpar dados locais
      localStorage.removeItem('@prospectplus:token');
      localStorage.removeItem('@prospectplus:user');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      localStorage.removeItem('@prospectplus:token');
      localStorage.removeItem('@prospectplus:user');
    }
  }

  static async getCurrentUser(): Promise<Omit<User, 'password'> | null> {
    try {
      const token = localStorage.getItem('@prospectplus:token');
      if (!token) {
        return null;
      }

      // Em produção: await api.get('/auth/me');
      
      // Simulação - decodificar token
      const userData = localStorage.getItem('@prospectplus:user');
      if (userData) {
        return JSON.parse(userData);
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  static async updateProfile(data: Partial<Omit<User, 'password'>>): Promise<Omit<User, 'password'>> {
    try {
      // Em produção: await api.put('/auth/profile', data);
      
      const token = localStorage.getItem('@prospectplus:token');
      if (!token) {
        throw new Error('Não autenticado');
      }

      // Simulação local
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não encontrado');
      }

      const userIndex = this.users.findIndex(u => u.id === currentUser.id);
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado');
      }

      const updatedUser = {
        ...this.users[userIndex],
        ...data,
        updatedAt: new Date(),
      };

      this.users[userIndex] = updatedUser;
      const { password, ...userWithoutPassword } = updatedUser;

      // Atualizar localStorage
      localStorage.setItem('@prospectplus:user', JSON.stringify(userWithoutPassword));

      return userWithoutPassword;
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      throw new Error(error.message || 'Erro ao atualizar perfil');
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Em produção: await api.put('/auth/password', { currentPassword, newPassword });
      
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Não autenticado');
      }

      const userIndex = this.users.findIndex(u => u.id === currentUser.id);
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado');
      }

      const user = this.users[userIndex];
      
      // Verificar senha atual
      if (this.hashPassword(currentPassword) !== user.password) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar senha
      user.password = this.hashPassword(newPassword);
      user.updatedAt = new Date();

    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      throw new Error(error.message || 'Erro ao alterar senha');
    }
  }

  // Métodos utilitários
  private static generateToken(user: User): string {
    // Simulação de JWT (em produção usar biblioteca como jsonwebtoken)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    
    return btoa(JSON.stringify({
      ...payload,
      exp: Date.now() + 86400000, // 24 horas
    }));
  }

  private static hashPassword(password: string): string {
    // Simulação de hash (em produção usar bcrypt)
    return btoa(password + 'salt');
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Validação de token
  static validateToken(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  // Salvar dados no localStorage
  static saveAuthData(authResponse: AuthResponse): void {
    localStorage.setItem('@prospectplus:token', authResponse.token);
    localStorage.setItem('@prospectplus:user', JSON.stringify(authResponse.user));
  }

  // Limpar dados do localStorage
  static clearAuthData(): void {
    localStorage.removeItem('@prospectplus:token');
    localStorage.removeItem('@prospectplus:user');
  }
}

export const authService = AuthService;
