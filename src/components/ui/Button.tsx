import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    leftIcon, 
    rightIcon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 focus:ring-purple-500',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
      outline: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
      danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30 focus:ring-red-500',
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3',
      lg: 'px-6 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
