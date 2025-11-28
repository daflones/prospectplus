import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'gradient' | 'glass';
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600 bg-green-50 dark:bg-green-900/30';
    if (trend.value < 0) return 'text-red-600 bg-red-50 dark:bg-red-900/30';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
  };

  const variantStyles = {
    default: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800',
    gradient: 'bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0',
    glass: 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        relative overflow-hidden rounded-2xl p-6 shadow-card hover:shadow-card-hover
        transition-all duration-300
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Background decoration */}
      {variant === 'default' && (
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
          <div className="w-full h-full bg-gradient-to-br from-primary-100/50 to-transparent dark:from-primary-900/20 rounded-full blur-2xl" />
        </div>
      )}

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${variant === 'gradient' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
              {title}
            </p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${variant === 'gradient' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`mt-1 text-sm ${variant === 'gradient' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                {subtitle}
              </p>
            )}
          </div>

          {icon && (
            <div className={`
              p-3 rounded-xl
              ${variant === 'gradient' 
                ? 'bg-white/20' 
                : 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/50 dark:to-primary-800/50'
              }
            `}>
              <div className={variant === 'gradient' ? 'text-white' : 'text-primary-600 dark:text-primary-400'}>
                {icon}
              </div>
            </div>
          )}
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              {Math.abs(trend.value)}%
            </span>
            {trend.label && (
              <span className={`text-xs ${variant === 'gradient' ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
