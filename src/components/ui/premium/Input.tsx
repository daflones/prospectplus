import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'default' | 'filled' | 'ghost';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-500',
      filled: 'bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-primary-500',
      ghost: 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:border-primary-500',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-xl border-2 text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-4 focus:ring-primary-500/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${variantClasses[variant]}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {error || hint}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-gray-900 dark:text-white
            bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        />
        {(error || hint) && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {error || hint}
          </motion.p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-gray-900 dark:text-white
            bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
