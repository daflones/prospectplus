import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40',
  secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white',
  outline: 'border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 bg-transparent',
  ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25',
  success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25',
};

const sizeClasses = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
  sm: 'px-3.5 py-2 text-sm rounded-xl gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  glow = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.15 }}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${glow && variant === 'primary' ? 'hover:shadow-glow' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
    </motion.button>
  );
}

// Icon Button variant
interface IconButtonProps {
  icon: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  tooltip?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

const iconSizeClasses = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-xl',
  lg: 'p-3 rounded-xl',
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  tooltip,
  disabled,
  className = '',
  onClick,
}: IconButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.05 } : undefined}
      whileTap={!isDisabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15 }}
      disabled={isDisabled}
      title={tooltip}
      className={`
        inline-flex items-center justify-center
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${iconSizeClasses[size]}
        ${className}
      `}
      onClick={onClick}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </motion.button>
  );
}
