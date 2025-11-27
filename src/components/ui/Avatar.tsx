import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  className?: string;
}

export default function Avatar({ src, alt, fallback, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl',
        className
      )}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={alt}
        className="aspect-square h-full w-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold text-sm"
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
