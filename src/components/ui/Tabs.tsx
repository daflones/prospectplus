import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-gray-100 p-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5',
        'text-sm font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm',
        'data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  );
}
