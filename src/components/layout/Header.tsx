import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, User, LogOut, Settings, Search, Menu, Crown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useState } from 'react';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Breadcrumb based on current path
  const getBreadcrumb = () => {
    const paths: Record<string, { label: string; parent?: string }> = {
      '/dashboard': { label: 'Dashboard' },
      '/prospecting': { label: 'Prospecção' },
      '/leads': { label: 'Leads' },
      '/campaigns': { label: 'Campanhas' },
      '/instances': { label: 'WhatsApp' },
      '/settings': { label: 'Configurações' },
    };
    return paths[location.pathname] || { label: 'Dashboard' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Breadcrumb */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-gray-400 dark:text-gray-500">Home</span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              <span className="font-semibold text-gray-900 dark:text-white">{breadcrumb.label}</span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <motion.div 
              className="hidden md:flex items-center"
              animate={{ width: showSearch ? 280 : 44 }}
            >
              {showSearch ? (
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    autoFocus
                    onBlur={() => setShowSearch(false)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-700 transition-all"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setShowSearch(true)}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </motion.div>

            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors group">
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors outline-none">
                  <div className="relative">
                    <Avatar
                      src={user?.avatar}
                      alt={user?.name || 'User'}
                      fallback={user?.name ? getInitials(user.name) : 'U'}
                      className="w-9 h-9"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.name?.split(' ')[0] || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Pro</span>
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-2">
                {/* User Info */}
                <div className="px-3 py-3 mb-2 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user?.avatar}
                      alt={user?.name || 'User'}
                      fallback={user?.name ? getInitials(user.name) : 'U'}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Plano Pro</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Configurações</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Meu Perfil</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="rounded-lg text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
