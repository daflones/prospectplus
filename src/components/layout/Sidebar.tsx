import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Send,
  Smartphone,
  Target,
  Settings,
  HelpCircle,
  ExternalLink,
  Crown,
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      description: 'Visão geral',
    },
    {
      name: 'Prospecção',
      icon: Target,
      path: '/prospecting',
      description: 'Buscar leads',
    },
    {
      name: 'Leads',
      icon: Users,
      path: '/leads',
      description: 'Gerenciar contatos',
    },
    {
      name: 'Campanhas',
      icon: Send,
      path: '/campaigns',
      description: 'Disparos automáticos',
    },
    {
      name: 'WhatsApp',
      icon: Smartphone,
      path: '/instances',
      description: 'Conexão',
    },
    {
      name: 'Configurações',
      icon: Settings,
      path: '/settings',
      description: 'Preferências',
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <img 
                src="/logo.png" 
                alt="Prospect+" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Crown className="w-6 h-6 text-white hidden" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">
              Prospect+
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Prospecção Inteligente
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Menu Principal
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                }`}>
                  <item.icon className={`w-5 h-5 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <span className="block">{item.name}</span>
                  <span className={`text-xs ${
                    isActive 
                      ? 'text-white/70' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {item.description}
                  </span>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pro Banner */}
      <div className="p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-5 text-white"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-300">PRO</span>
            </div>
            <h3 className="font-bold text-lg mb-1">
              Prospect+ Premium
            </h3>
            <p className="text-sm text-white/80 mb-4">
              Automação completa para sua prospecção
            </p>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <HelpCircle className="w-4 h-4" />
              <span>Suporte 24/7</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <a 
          href="https://docs.prospectplus.com.br" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Central de Ajuda</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">Documentação</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
        </a>
      </div>
    </aside>
  );
}
