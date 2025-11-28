import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lead, Campaign, DashboardStats, EvolutionAPIConfig, EvolutionInstance } from '../types';

interface AppState {
  // Leads
  leads: Lead[];
  addLead: (lead: Lead) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  
  // Campaigns
  campaigns: Campaign[];
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  
  // Evolution Instances
  instances: EvolutionInstance[];
  addInstance: (instance: EvolutionInstance) => void;
  updateInstance: (id: string, data: Partial<EvolutionInstance>) => void;
  deleteInstance: (id: string) => void;
  getInstanceByUserId: (userName: string) => EvolutionInstance | undefined;
  
  // Config
  evolutionConfig: EvolutionAPIConfig | null;
  setEvolutionConfig: (config: EvolutionAPIConfig) => void;
  
  // Stats
  stats: DashboardStats;
  updateStats: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      leads: [],
      campaigns: [],
      instances: [],
      evolutionConfig: null,
      stats: {
        totalLeads: 0,
        totalCampaigns: 0,
        messagesSent: 0,
        successRate: 0,
        leadsToday: 0,
        campaignsActive: 0,
        recentActivity: [],
      },
      
      // Leads actions
      addLead: (lead) =>
        set((state) => ({
          leads: [...state.leads, lead],
        })),
      
      updateLead: (id, data) =>
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? { ...lead, ...data } : lead
          ),
        })),
      
      deleteLead: (id) =>
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
        })),
      
      // Campaigns actions
      addCampaign: (campaign) =>
        set((state) => ({
          campaigns: [...state.campaigns, campaign],
        })),
      
      updateCampaign: (id, data) =>
        set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === id ? { ...campaign, ...data } : campaign
          ),
        })),
      
      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
        })),
      
      // Evolution Instances actions
      addInstance: (instance) =>
        set((state) => ({
          instances: [...state.instances, instance],
        })),
      
      updateInstance: (id, data) =>
        set((state) => ({
          instances: state.instances.map((instance) =>
            instance.id === id ? { ...instance, ...data } : instance
          ),
        })),
      
      deleteInstance: (id) =>
        set((state) => ({
          instances: state.instances.filter((instance) => instance.id !== id),
        })),
      
      getInstanceByUserId: (userName) =>
        get().instances.find((instance) => instance.userName === userName),
      
      // Config actions
      setEvolutionConfig: (config) =>
        set({ evolutionConfig: config }),
      
      // Stats actions
      updateStats: () => {
        const { leads, campaigns } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const leadsToday = leads.filter(
          (lead) => new Date(lead.createdAt) >= today
        ).length;
        
        const campaignsActive = campaigns.filter(
          (c) => c.status === 'running' || c.status === 'scheduled'
        ).length;
        
        const messagesSent = campaigns.reduce(
          (acc, c) => acc + c.stats.sentMessages,
          0
        );
        
        const totalSuccess = campaigns.reduce(
          (acc, c) => acc + c.stats.sentMessages - c.stats.failedMessages,
          0
        );
        
        const successRate = messagesSent > 0
          ? (totalSuccess / messagesSent) * 100
          : 0;
        
        set({
          stats: {
            totalLeads: leads.length,
            totalCampaigns: campaigns.length,
            messagesSent,
            successRate,
            leadsToday,
            campaignsActive,
            recentActivity: [], // TODO: Implement activity tracking
          },
        });
      },
    }),
    {
      name: 'prospect-plus-storage',
    }
  )
);
