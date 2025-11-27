import { useState, useEffect } from 'react';
import { Users, MessageSquare, TrendingUp, Zap, ArrowUpRight, Send, CheckCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabaseService';
import { Card } from '../components/ui/Card';

interface DashboardStats {
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesPending: number;
  conversionRate: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    messagesPending: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Total de Leads
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

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

      // Mensagens Enviadas
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('sent_messages, total_leads')
        .eq('user_id', user?.id);

      const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_messages || 0), 0) || 0;
      const totalLeadsInCampaigns = campaigns?.reduce((sum, c) => sum + (c.total_leads || 0), 0) || 0;
      const pending = totalLeadsInCampaigns - totalSent;

      // Taxa de Conversão (leads que viraram clientes)
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
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total de Leads',
      value: stats.totalLeads.toString(),
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Campanhas Ativas',
      value: stats.activeCampaigns.toString(),
      subtitle: `${stats.totalCampaigns} total`,
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Mensagens Enviadas',
      value: stats.messagesSent.toString(),
      subtitle: `${stats.messagesPending} pendentes`,
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Aqui está um resumo das suas atividades
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {stat.title}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stat.subtitle}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Resumo de Campanhas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Campanhas Recentes */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                Campanhas Recentes
              </h2>
              <RecentCampaigns userId={user?.id} />
            </div>
          </Card>

          {/* Leads Recentes */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Leads Recentes
              </h2>
              <RecentLeads userId={user?.id} />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/campaigns"
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Nova Campanha</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Criar campanha</p>
                </div>
              </a>

              <a
                href="/leads"
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Novo Lead</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Adicionar lead</p>
                </div>
              </a>

              <a
                href="/instances"
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Configurar instância</p>
                </div>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Componente de Campanhas Recentes
function RecentCampaigns({ userId }: { userId?: string }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadCampaigns();
  }, [userId]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    setCampaigns(data || []);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhuma campanha criada ainda
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {campaign.total_leads || 0} leads • {campaign.sent_messages || 0} enviadas
            </p>
          </div>
          <div>
            {campaign.status === 'active' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                <CheckCircle className="w-3 h-3" />
                Ativa
              </span>
            )}
            {campaign.status === 'draft' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                <Clock className="w-3 h-3" />
                Rascunho
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente de Leads Recentes
function RecentLeads({ userId }: { userId?: string }) {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    loadLeads();
  }, [userId]);

  const loadLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    setLeads(data || []);
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum lead cadastrado ainda
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{lead.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {lead.phone || lead.email || 'Sem contato'}
            </p>
          </div>
          {lead.tags && lead.tags.includes('campanha') && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              📢 Campanha
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
