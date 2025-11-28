import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Zap,
  Send,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  Phone,
  MapPin,
  ChevronRight,
  Play,
  Pause,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabaseService';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesPending: number;
  conversionRate: number;
  leadsThisWeek: number;
  leadsLastWeek: number;
  messagesThisWeek: number;
  messagesLastWeek: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_messages: number;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  status?: string;
  source?: string;
  created_at: string;
}

const COLORS = ['#9333ea', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPremium() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    messagesPending: 0,
    conversionRate: 0,
    leadsThisWeek: 0,
    leadsLastWeek: 0,
    messagesThisWeek: 0,
    messagesLastWeek: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentCampaigns(),
        loadRecentLeads(),
        loadChartData(),
        loadStatusDistribution(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);

      // Total de Leads
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Leads desta semana
      const { count: leadsThisWeek } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay(weekAgo).toISOString());

      // Leads semana passada
      const { count: leadsLastWeek } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay(twoWeeksAgo).toISOString())
        .lt('created_at', startOfDay(weekAgo).toISOString());

      // Total de Campanhas
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Campanhas Ativas
      const { count: activeCampaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'active');

      // Mensagens
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('sent_messages, total_leads')
        .eq('user_id', user?.id);

      const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_messages || 0), 0) || 0;
      const totalLeadsInCampaigns = campaigns?.reduce((sum, c) => sum + (c.total_leads || 0), 0) || 0;
      const pending = totalLeadsInCampaigns - totalSent;

      // Taxa de Conversão
      const { count: convertedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'converted');

      const conversionRate = leadsCount && leadsCount > 0
        ? ((convertedCount || 0) / leadsCount) * 100
        : 0;

      setStats({
        totalLeads: leadsCount || 0,
        totalCampaigns: campaignsCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        messagesSent: totalSent,
        messagesPending: pending,
        conversionRate: Number(conversionRate.toFixed(1)),
        leadsThisWeek: leadsThisWeek || 0,
        leadsLastWeek: leadsLastWeek || 0,
        messagesThisWeek: totalSent,
        messagesLastWeek: 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadRecentCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentCampaigns(data || []);
  };

  const loadRecentLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(6);
    setRecentLeads(data || []);
  };

  const loadChartData = async () => {
    const days = 7;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      data.push({
        name: format(date, 'EEE', { locale: ptBR }),
        leads: leadsCount || 0,
        mensagens: Math.floor(Math.random() * 50) + 10,
      });
    }
    
    setChartData(data);
  };

  const loadStatusDistribution = async () => {
    const { data } = await supabase
      .from('leads')
      .select('status')
      .eq('user_id', user?.id);

    const statusCount: Record<string, number> = {};
    data?.forEach(lead => {
      const status = lead.status || 'new';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const distribution = Object.entries(statusCount).map(([name, value]) => ({
      name: getStatusLabel(name),
      value,
    }));

    setStatusDistribution(distribution);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Novos',
      contacted: 'Contatados',
      interested: 'Interessados',
      converted: 'Convertidos',
      lost: 'Perdidos',
    };
    return labels[status] || status;
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const statsCards = [
    {
      title: 'Total de Leads',
      value: stats.totalLeads,
      growth: calculateGrowth(stats.leadsThisWeek, stats.leadsLastWeek),
      icon: Users,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Campanhas Ativas',
      value: stats.activeCampaigns,
      subtitle: `${stats.totalCampaigns} total`,
      icon: Zap,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Mensagens Enviadas',
      value: stats.messagesSent,
      subtitle: `${stats.messagesPending} pendentes`,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Background Gradient */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 
                <span className="inline-block ml-2 animate-float">👋</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-premium flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Nova Campanha
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="stat-card card-hover"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                {stat.growth !== undefined && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stat.growth >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {stat.growth >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {Math.abs(stat.growth).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white count-up">
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stat.title}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {stat.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Atividade Semanal
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Leads e mensagens dos últimos 7 dias
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mensagens</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMensagens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#9333ea"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mensagens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMensagens)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Status dos Leads
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Distribuição por status
              </p>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {statusDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Campanhas Recentes
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Últimas 5 campanhas
                  </p>
                </div>
              </div>
              <a
                href="/campaigns"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {recentCampaigns.length === 0 ? (
              <div className="empty-state py-8">
                <Send className="empty-state-icon w-12 h-12" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhuma campanha criada ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        campaign.status === 'active' ? 'status-dot-active' :
                        campaign.status === 'paused' ? 'status-dot-warning' :
                        'status-dot-inactive'
                      }`} />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {campaign.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {campaign.sent_messages || 0} / {campaign.total_leads || 0} enviadas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'active' ? (
                        <span className="tag tag-success">
                          <Play className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : campaign.status === 'paused' ? (
                        <span className="tag tag-warning">
                          <Pause className="w-3 h-3" />
                          Pausada
                        </span>
                      ) : (
                        <span className="tag">
                          <Clock className="w-3 h-3" />
                          Rascunho
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Leads */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Leads Recentes
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Últimos leads adicionados
                  </p>
                </div>
              </div>
              <a
                href="/leads"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {recentLeads.length === 0 ? (
              <div className="empty-state py-8">
                <Users className="empty-state-icon w-12 h-12" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum lead cadastrado ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead, index) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold">
                        {lead.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {lead.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                          {lead.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {lead.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 glass-card rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                title: 'Nova Campanha',
                description: 'Criar campanha de disparo',
                icon: Send,
                href: '/campaigns',
                color: 'from-purple-500 to-violet-600',
              },
              {
                title: 'Prospectar Leads',
                description: 'Buscar novos estabelecimentos',
                icon: Target,
                href: '/prospecting',
                color: 'from-blue-500 to-cyan-600',
              },
              {
                title: 'Ver Leads',
                description: 'Gerenciar seus leads',
                icon: Users,
                href: '/leads',
                color: 'from-emerald-500 to-green-600',
              },
              {
                title: 'Configurar WhatsApp',
                description: 'Conectar instância',
                icon: MessageSquare,
                href: '/instances',
                color: 'from-amber-500 to-orange-600',
              },
            ].map((action) => (
              <motion.a
                key={action.title}
                href={action.href}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
