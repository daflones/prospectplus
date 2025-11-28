import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  MessageSquare,
  Crown,
} from 'lucide-react';

export default function LoginPremium() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await login({ email: formData.email, password: formData.password });
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    }
  };

  const features = [
    {
      icon: Users,
      title: 'Prospecção Inteligente',
      description: 'Encontre leads qualificados automaticamente',
    },
    {
      icon: MessageSquare,
      title: 'Disparo Automático',
      description: 'Envie mensagens em escala com intervalos humanizados',
    },
    {
      icon: Zap,
      title: 'Integração WhatsApp',
      description: 'Conecte seu WhatsApp em segundos',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <img 
                src="/logo.png" 
                alt="Prospect+" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">Prospect+</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Prospecção Inteligente</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bem-vindo de volta!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Entre na sua conta para continuar prospectando
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="input-premium pl-12"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-premium pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Lembrar de mim</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-premium py-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">ou</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-gray-600 dark:text-gray-400">
            Não tem uma conta?{' '}
            <Link
              to="/register"
              className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Criar conta grátis
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full w-fit mb-8"
          >
            <Crown className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium">Plataforma #1 em Prospecção</span>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-4"
          >
            Transforme sua prospecção em resultados
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/80 mb-12"
          >
            Automatize seus disparos de WhatsApp e conquiste mais clientes com menos esforço.
          </motion.p>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-white/70">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 pt-8 border-t border-white/20"
          >
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-bold">10k+</p>
                <p className="text-white/70 text-sm">Usuários ativos</p>
              </div>
              <div>
                <p className="text-3xl font-bold">1M+</p>
                <p className="text-white/70 text-sm">Mensagens enviadas</p>
              </div>
              <div>
                <p className="text-3xl font-bold">98%</p>
                <p className="text-white/70 text-sm">Satisfação</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
