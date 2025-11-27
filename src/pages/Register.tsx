import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  User,
  Phone,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import type { RegisterRequest } from '../types';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState<RegisterRequest>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterRequest>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterRequest> = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData);
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterRequest]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 p-8 space-y-6">
          {/* Logo e Título */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Criar Conta
            </h1>
            <p className="text-gray-600">
              Comece sua jornada com o Prospect+
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-purple-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all`}
                  placeholder="Seu nome"
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${
                    errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-purple-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all`}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Telefone <span className="text-gray-400">(opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 focus:ring-purple-500 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 bg-gray-50 border ${
                    errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-purple-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {/* Password Strength */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < strength
                            ? strength <= 1
                              ? 'bg-red-500'
                              : strength <= 2
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {strength <= 1 && 'Senha fraca'}
                    {strength === 2 && 'Senha média'}
                    {strength === 3 && 'Senha boa'}
                    {strength === 4 && 'Senha forte'}
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 bg-gray-50 border ${
                    errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-purple-500'
                  } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <Check className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-purple-500/30 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Criando conta...
                </span>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Já tem uma conta?{' '}
              <Link
                to="/login"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2024 Prospect+. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
