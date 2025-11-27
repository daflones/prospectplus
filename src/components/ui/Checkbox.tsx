import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', checked, ...props }, ref) => {
    return (
      <label className="inline-flex items-center cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={checked}
            {...props}
          />
          <div
            className={`
              w-5 h-5 border-2 rounded-md transition-all duration-200
              ${
                checked
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-slate-300 group-hover:border-primary-400'
              }
              ${className}
            `}
          >
            {checked && (
              <Check className="w-full h-full text-white p-0.5" strokeWidth={3} />
            )}
          </div>
        </div>
        {label && (
          <span className="ml-2 text-sm font-medium text-slate-700 select-none">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
