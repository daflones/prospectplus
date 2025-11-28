import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'bordered';
  hover?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantClasses = {
  default: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800',
  glass: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
  gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-100 dark:border-gray-700',
  bordered: 'bg-white dark:bg-gray-900 border-2 border-primary-100 dark:border-primary-900/30',
};

export function Card({
  children,
  variant = 'default',
  hover = true,
  glow = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`
        rounded-2xl shadow-card
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? 'transition-all duration-300 hover:shadow-card-hover' : ''}
        ${glow ? 'hover:shadow-glow-sm' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  subtitle?: string;
}

export function CardTitle({ children, className = '', subtitle }: CardTitleProps) {
  return (
    <div>
      <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
        {children}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}
