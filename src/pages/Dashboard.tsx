import { Users, MessageSquare, TrendingUp, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Total de Leads',
      value: '1,234',
      change: '+12.5%',
      isPositive: true,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Mensagens Enviadas',
      value: '5,678',
      change: '+8.2%',
      isPositive: true,
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Taxa de Conversão',
      value: '23.4%',
      change: '+3.1%',
      isPositive: true,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Campanhas Ativas',
      value: '12',
      change: '-2',
      isPositive: false,
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const recentActivities = [
    { id: 1, action: 'Novo lead adicionado', name: 'João Silva', time: 'Há 5 minutos' },
    { id: 2, action: 'Mensagem enviada', name: 'Maria Santos', time: 'Há 15 minutos' },
    { id: 3, action: 'Lead convertido', name: 'Pedro Costa', time: 'Há 1 hora' },
    { id: 4, action: 'Campanha iniciada', name: 'Black Friday 2024', time: 'Há 2 horas' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-gray-600">
            Aqui está um resumo das suas atividades hoje
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  stat.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-600">
                {stat.title}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg shadow-gray-100/50">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Atividades Recentes
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {activity.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100/50">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Ações Rápidas
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30">
                Adicionar Lead
              </button>
              <button className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold border-2 border-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                Nova Campanha
              </button>
              <button className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold border-2 border-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                Enviar Mensagem
              </button>
              <button className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold border-2 border-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                Ver Relatórios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
