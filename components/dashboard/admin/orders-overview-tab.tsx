import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Order } from '@/lib/types';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface OrdersOverviewTabProps {
  orders: Order[];
  ordersPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isShowingTodayOrders: boolean;
  recentOrdersLabel: string;
  recentOrdersSummary: {
    total: number;
    delivered: number;
    inRoute: number;
    pending: number;
    returned: number;
    rescheduled: number;
    totalAmount: number;
  };
  recentOrdersHighlights: Array<{
    key: string;
    label: string;
    value: string;
    accent: string;
    bg: string;
  }>;
  formatCurrency: (amount: number) => string;
}

export function OrdersOverviewTab({
  orders,
  ordersPerPage,
  currentPage,
  onPageChange,
  isShowingTodayOrders,
  recentOrdersLabel,
  recentOrdersSummary,
  recentOrdersHighlights,
  formatCurrency,
}: OrdersOverviewTabProps) {
  const start = (currentPage - 1) * ordersPerPage;
  const end = start + ordersPerPage;
  const paginatedOrders = orders.slice(start, end);

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Package className="w-5 h-5 text-blue-600" />
                {recentOrdersLabel}
              </CardTitle>
              {!isShowingTodayOrders && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                  Sin pedidos hoy
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Mostrando {recentOrdersSummary.total.toLocaleString('es-CR')} pedidos{' '}
              {isShowingTodayOrders ? 'registrados hoy.' : 'más recientes disponibles.'}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-shrink-0">
            <Button
              asChild
              size="sm"
              className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Link href="/dashboard/admin/liquidation">Ir a liquidaciones</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl px-4 border-slate-200/80 hover:bg-slate-50">
              <Link href="/dashboard/admin/pedidos">Ver todos</Link>
            </Button>
          </div>
        </div>
        {orders.length > 0 && (
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentOrdersHighlights.map(({ key, label, value, accent, bg }) => (
              <div key={key} className={cn('rounded-xl border px-3 py-2 transition-colors duration-200', bg)}>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className={cn('text-lg font-semibold', accent)}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50">
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">ID Pedido</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">Cliente</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">Estado</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">Mensajero</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">Valor</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-slate-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-150">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-sm text-slate-900">{order.id}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{order.customerName}</p>
                      <p className="text-xs text-slate-500 truncate">{order.customerAddress}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {order.assignedMessenger ? (
                        <>
                          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
                            {order.assignedMessenger.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-900 truncate">{order.assignedMessenger.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500 italic">Sin asignar</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-sm text-slate-900">{formatCurrency(order.totalAmount)}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('es-CR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr className="border-b">
                  <td colSpan={6} className="p-8 sm:p-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">No se encontraron pedidos para la fecha actual.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {orders.length > ordersPerPage && (
          <div className="mt-4 sm:mt-5 p-4 sm:p-5 lg:p-6 pt-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-slate-200/80">
            <span className="text-sm text-slate-600 font-medium">
              Página {currentPage} de {Math.ceil(orders.length / ordersPerPage)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-xl border-slate-200/80 hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(orders.length / ordersPerPage)}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-xl border-slate-200/80 hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

