import { CheckCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncMessageProps {
  message: string | null;
}

export function SyncMessage({ message }: SyncMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 sm:px-5 sm:py-4 shadow-sm backdrop-blur-sm transition-all duration-200',
        message.includes('exitoso')
          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700'
          : 'border-rose-200/80 bg-rose-50/90 text-rose-700',
      )}
    >
      {message.includes('exitoso') ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
      ) : (
        <RotateCcw className="h-5 w-5 flex-shrink-0 text-rose-600" />
      )}
      <span className="text-sm font-medium leading-relaxed">{message}</span>
    </div>
  );
}

