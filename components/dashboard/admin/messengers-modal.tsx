import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface MessengersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messengerDailySummary: MessengerDailySummary[];
  formatCurrency: (amount: number) => string;
}

export function MessengersModal({
  open,
  onOpenChange,
  messengerDailySummary,
  formatCurrency,
}: MessengersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Resumen Diario por Mensajero - Hoy ({messengerDailySummary.length})
          </DialogTitle>
          <DialogDescription>
            Solo se muestran mensajeros que tienen pedidos asignados hoy
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {messengerDailySummary.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Truck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No hay mensajeros con pedidos asignados hoy</p>
              <p className="text-sm mt-2">Los mensajeros aparecerán aquí cuando tengan pedidos asignados</p>
            </div>
          ) : (
            messengerDailySummary.map((summary) => (
              <Card key={summary.messenger.id} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-4">
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
                        <p className="text-xl font-bold text-blue-600">{summary.totalAsignados}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Entregados</p>
                        <p className="text-xl font-bold text-emerald-600">{summary.totalEntregados}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Devueltos</p>
                        <p className="text-xl font-bold text-rose-600">{summary.totalDevueltos}</p>
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
                            <tr className="border-b bg-slate-50">
                              <th className="text-left p-3 font-medium text-slate-600">Hora</th>
                              <th className="text-left p-3 font-medium text-slate-600">ID Pedido</th>
                              <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                              <th className="text-left p-3 font-medium text-slate-600">Estado</th>
                              <th className="text-right p-3 font-medium text-slate-600">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.entregas.map((entrega) => (
                              <tr key={entrega.id} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono text-xs font-medium">{entrega.hora}</td>
                                <td className="p-3">
                                  <span className="font-medium">{entrega.id}</span>
                                </td>
                                <td className="p-3">{entrega.cliente}</td>
                                <td className="p-3">
                                  <OrderStatusBadge status={entrega.estado as any} />
                                </td>
                                <td className="p-3 text-right font-semibold">{formatCurrency(entrega.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-6">No hay entregas registradas para hoy</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

