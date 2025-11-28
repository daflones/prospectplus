import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-600/20',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-600/20',
  purple: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 ring-1 ring-primary-600/20',
};

const dotColors = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-primary-500',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}
          />
        </span>
      )}
      {children}
    </motion.span>
  );
}
