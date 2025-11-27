import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, Settings, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
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
  const { user, logout } = useAuthStore();

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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Prospect+
            </h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full"></span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors outline-none">
                  <Avatar
                    src={user?.avatar}
                    alt={user?.name || 'User'}
                    fallback={user?.name ? getInitials(user.name) : 'U'}
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Configurações</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Meu Perfil</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
