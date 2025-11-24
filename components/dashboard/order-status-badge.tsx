import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  confirmado: {
    label: 'Confirmado',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  en_ruta: {
    label: 'En Ruta',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  entregado: {
    label: 'Entregado',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  devolucion: {
    label: 'Devolución',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  reagendado: {
    label: 'Reagendado',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: 'Desconocido',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  return (
    <Badge
      variant="outline"
      className={cn(config.className, 'text-[10px] px-1.5 py-0.5 font-medium', className)}
    >
      {config.label}
    </Badge>
  );
}