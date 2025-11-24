import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Users, Package } from 'lucide-react';

interface TiendaDailySummary {
  tienda: string;
  totalPedidos: number;
  totalEntregados: number;
  totalDevueltos: number;
  pedidos: Array<{
    id: string;
    cliente: string;
    valor: number;
    estado: string;
    fechaCreacion: string;
  }>;
}

interface TiendasTabProps {
  tiendaDailySummary: TiendaDailySummary[];
  formatCurrency: (amount: number) => string;
}

export function TiendasTab({ tiendaDailySummary, formatCurrency }: TiendasTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Resumen Diario por Tienda - Hoy ({tiendaDailySummary.length})
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Solo se muestran tiendas que tienen pedidos creados hoy
        </p>
      </CardHeader>
      <CardContent>
        {tiendaDailySummary.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay tiendas con pedidos creados hoy</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tiendaDailySummary.map((summary, index) => (
              <Card key={index} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-base font-semibold text-white">
                        {summary.tienda.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{summary.tienda}</CardTitle>
                        <p className="text-xs text-slate-500">Tienda</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Total Pedidos</p>
                        <p className="text-lg font-bold text-blue-600">{summary.totalPedidos}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Entregados</p>
                        <p className="text-lg font-bold text-emerald-600">{summary.totalEntregados}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Devueltos</p>
                        <p className="text-lg font-bold text-rose-600">{summary.totalDevueltos}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Pedidos generados hoy:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium text-slate-600">ID Pedido</th>
                            <th className="text-left p-2 font-medium text-slate-600">Cliente</th>
                            <th className="text-left p-2 font-medium text-slate-600">Estado</th>
                            <th className="text-left p-2 font-medium text-slate-600">Fecha Creación</th>
                            <th className="text-right p-2 font-medium text-slate-600">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.pedidos.map((pedido) => {
                            const fechaCreacion = new Date(pedido.fechaCreacion);
                            const fechaFormateada = fechaCreacion.toLocaleDateString('es-CR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            });
                            const horaFormateada = fechaCreacion.toLocaleTimeString('es-CR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            return (
                              <tr key={pedido.id} className="border-b hover:bg-slate-50">
                                <td className="p-2">
                                  <span className="font-medium">{pedido.id}</span>
                                </td>
                                <td className="p-2">{pedido.cliente}</td>
                                <td className="p-2">
                                  <OrderStatusBadge status={pedido.estado as any} />
                                </td>
                                <td className="p-2 text-xs text-slate-500">
                                  {fechaFormateada} {horaFormateada}
                                </td>
                                <td className="p-2 text-right font-semibold">{formatCurrency(pedido.valor)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

