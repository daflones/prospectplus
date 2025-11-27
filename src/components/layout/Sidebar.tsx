import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      name: 'Leads',
      icon: Users,
      path: '/leads',
    },
    {
      name: 'Campanhas',
      icon: MessageSquare,
      path: '/campaigns',
    },
    {
      name: 'WhatsApp',
      icon: Zap,
      path: '/instances',
    },
    {
      name: 'Relatórios',
      icon: BarChart3,
      path: '/reports',
    },
    {
      name: 'Configurações',
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Prospect+
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-1">
            Precisa de ajuda?
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Acesse nossa documentação
          </p>
          <button className="w-full bg-white hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium border border-gray-200 transition-colors">
            Ver Docs
          </button>
        </div>
      </div>
    </aside>
  );
}
