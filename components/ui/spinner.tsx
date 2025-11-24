'use client';

import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function Spinner({ size = 'sm', className, text }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div className={cn('absolute inset-0 rounded-full border-2 border-sky-200/30', sizeClasses[size])}></div>
        <div className={cn('absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin', sizeClasses[size])}></div>
      </div>
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

// Spinner con gradiente circular
export function GradientSpinner({ size = 'sm', className, text }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-sky-200/30',
          sizeClasses[size]
        )}></div>
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin',
          sizeClasses[size]
        )}></div>
      </div>
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

// Spinner de carga completo (centrado)
export function LoadingSpinner({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}>
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
      </div>
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

