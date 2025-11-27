import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

interface SwitchProps extends SwitchPrimitive.SwitchProps {
  label?: string;
}

export default function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <SwitchPrimitive.Root
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:to-blue-600',
          'data-[state=unchecked]:bg-gray-200',
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            'data-[state=checked]:translate-x-5',
            'data-[state=unchecked]:translate-x-0'
          )}
        />
      </SwitchPrimitive.Root>
      {label && (
        <label className="text-sm font-medium text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
