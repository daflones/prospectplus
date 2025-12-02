import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Phone, 
  Send, 
  CheckCircle, 
  XCircle,
  Loader2,
  Clock
} from 'lucide-react';

interface ProgressData {
  stage: string;
  stageLabel: string;
  percent: number;
  leadsFound?: number;
  leadsValidated?: number;
  leadsValid?: number;
  messagesSent?: number;
  messagesFailed?: number;
  currentAction?: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface CampaignProgressProps {
  campaignId: string;
  isActive: boolean;
}

export default function CampaignProgress({ campaignId, isActive }: CampaignProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/campaign/progress/${campaignId}`);
        const data = await response.json();
        setProgress(data.progress);
        setLogs(data.logs?.slice(-10) || []); // Últimos 10 logs
      } catch (error) {
        console.error('Erro ao buscar progresso:', error);
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 2000); // Atualiza a cada 2s

    return () => clearInterval(interval);
  }, [campaignId, isActive]);

  if (!isActive || !progress) return null;

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'searching':
        return <Search className="w-4 h-4 animate-pulse" />;
      case 'validating':
        return <Phone className="w-4 h-4 animate-pulse" />;
      case 'dispatching':
        return <Send className="w-4 h-4 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'warning':
        return <Clock className="w-3 h-3 text-amber-500" />;
      default:
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
    >
      {/* Stage Indicator */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          {getStageIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {progress.stageLabel || 'Processando...'}
            </span>
            {progress.currentAction && (
              <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                {progress.currentAction}
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 h-2 bg-purple-200 dark:bg-purple-900/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{progress.leadsFound || 0}</p>
          <p className="text-xs text-gray-500">Encontrados</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg font-bold text-purple-600">{progress.leadsValid || 0}</p>
          <p className="text-xs text-gray-500">WhatsApp</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg font-bold text-emerald-600">{progress.messagesSent || 0}</p>
          <p className="text-xs text-gray-500">Enviadas</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-lg font-bold text-red-600">{progress.messagesFailed || 0}</p>
          <p className="text-xs text-gray-500">Falhas</p>
        </div>
      </div>

      {/* Live Logs */}
      {logs.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
          <AnimatePresence mode="popLayout">
            {logs.map((log, index) => (
              <motion.div
                key={`${log.timestamp}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
              >
                {getLogIcon(log.type)}
                <span className="truncate">{log.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
