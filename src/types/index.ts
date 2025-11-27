// Tipos principais da aplicação

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  expiresIn: number;
}

export interface Lead {
  id: string;
  userId: string; // Vinculado ao usuário autenticado
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  source: 'google-maps' | 'linkedin' | 'facebook' | 'instagram' | 'manual';
  category?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'interested' | 'not-interested' | 'converted' | 'lost';
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  customFields?: Record<string, any>;
  lastContactAt?: Date;
  nextContactAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  userId: string; // Vinculado ao usuário autenticado
  name: string;
  description?: string;
  type: 'email' | 'whatsapp' | 'sms' | 'mixed';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetAudience: string[]; // Array de lead IDs
  messageTemplate: string;
  scheduleConfig?: {
    startDate?: Date;
    endDate?: Date;
    sendTime?: string;
    timezone?: string;
  };
  instanceId?: string; // ID da instância WhatsApp a ser usada
  stats: {
    totalLeads: number;
    sentMessages: number;
    deliveredMessages: number;
    readMessages: number;
    repliedMessages: number;
    failedMessages: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProspectingConfig {
  sources: {
    googleMaps: boolean;
    linkedin: boolean;
    facebook: boolean;
    instagram: boolean;
  };
  filters: {
    category?: string;
    city?: string;
    state?: string;
    keywords?: string[];
  };
}

export interface DashboardStats {
  totalLeads: number;
  totalCampaigns: number;
  messagesSent: number;
  successRate: number;
  leadsToday: number;
  campaignsActive: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'lead_captured' | 'campaign_sent' | 'campaign_completed' | 'validation_completed';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface EvolutionAPIConfig {
  apiUrl: string;
  instanceName: string;
  token?: string;
}

export interface MessageStatus {
  id: string;
  leadId: string;
  campaignId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
}

// Evolution API types
export interface EvolutionInstance {
  id: string;
  userId: string; // Vinculado ao usuário autenticado
  instanceName: string;
  instanceId: string;
  userName: string;
  phoneNumber: string;
  status: 'created' | 'connecting' | 'connected' | 'disconnected' | 'error';
  qrcode?: string;
  pairingCode?: string;
  token: string;
  apikey: string;
  apiUrl?: string;
  integration?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  connectedAt?: Date;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstanceRequest {
  instanceName: string;
  token?: string;
  qrcode: boolean;
  number: string;
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  webhook?: string;
  webhook_by_events?: boolean;
  events?: string[];
  reject_call?: boolean;
  msg_call?: string;
  groups_ignore?: boolean;
  always_online?: boolean;
  read_messages?: boolean;
  read_status?: boolean;
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    webhook_wa_business: string | null;
    access_token_wa_business: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  settings: {
    reject_call: boolean;
    msg_call: string;
    groups_ignore: boolean;
    always_online: boolean;
    read_messages: boolean;
    read_status: boolean;
    sync_full_history: boolean;
  };
}

export interface ConnectInstanceResponse {
  pairingCode: string;
  code: string;
  count: number;
}

export interface ConnectionStateResponse {
  instance: string;
  state: 'open' | 'close' | 'connecting' | 'opening';
  battery: number;
  plugged: boolean;
}
