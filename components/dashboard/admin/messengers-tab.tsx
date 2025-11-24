import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { UserCheck, Truck } from 'lucide-react';
import { User } from '@/lib/types';

interface MessengerDailySummary {
  messenger: User;
  totalAsignados: number;
  totalEntregados: number;
  totalDevueltos: number;
  entregas: Array<{
    id: string;
    cliente: string;
    hora: string;
    estado: string;
    valor: number;
  }>;
}

interface MessengersTabProps {
  messengerDailySummary: MessengerDailySummary[];
  formatCurrency: (amount: number) => string;
}

export function MessengersTab({ messengerDailySummary, formatCurrency }: MessengersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Resumen Diario por Mensajero - Hoy ({messengerDailySummary.length})
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Solo se muestran mensajeros que tienen pedidos asignados hoy
        </p>
      </CardHeader>
      <CardContent>
        {messengerDailySummary.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay mensajeros con pedidos asignados hoy</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messengerDailySummary.map((summary) => (
              <Card key={summary.messenger.id} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-base font-semibold text-white">
                        {summary.messenger.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{summary.messenger.name}</CardTitle>
                        <p className="text-xs text-slate-500">Mensajero</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Asignados</p>
                        <p className="text-lg font-bold text-blue-600">{summary.totalAsignados}</p>
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
                  {summary.entregas.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Entregas del día:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 font-medium text-slate-600">Hora</th>
                              <th className="text-left p-2 font-medium text-slate-600">ID Pedido</th>
                              <th className="text-left p-2 font-medium text-slate-600">Cliente</th>
                              <th className="text-left p-2 font-medium text-slate-600">Estado</th>
                              <th className="text-right p-2 font-medium text-slate-600">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.entregas.map((entrega) => (
                              <tr key={entrega.id} className="border-b hover:bg-slate-50">
                                <td className="p-2 font-mono text-xs">{entrega.hora}</td>
                                <td className="p-2">
                                  <span className="font-medium">{entrega.id}</span>
                                </td>
                                <td className="p-2">{entrega.cliente}</td>
                                <td className="p-2">
                                  <OrderStatusBadge status={entrega.estado as any} />
                                </td>
                                <td className="p-2 text-right font-semibold">{formatCurrency(entrega.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No hay entregas registradas para hoy</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

