'use client';

import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determinar variante basada en el título si no se especifica
        let finalVariant = variant;
        if (!finalVariant && typeof title === 'string') {
          if (title.includes('✅') || title.includes('exitosamente') || title.includes('éxito')) {
            finalVariant = 'success';
          } else if (title.includes('❌') || title.includes('Error') || title.includes('error')) {
            finalVariant = 'destructive';
          } else if (title.includes('⚠️') || title.includes('Advertencia') || title.includes('advertencia')) {
            finalVariant = 'warning';
          } else if (title.includes('ℹ️') || title.includes('Info') || title.includes('info')) {
            finalVariant = 'info';
          }
        }
        
        return (
          <Toast key={id} variant={finalVariant} {...props}>
            <div className="flex-1 space-y-1.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
