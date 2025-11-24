'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  AlertCircle
} from 'lucide-react';

interface PedidosStatsProps {
  stats: {
    total: number;
    asignados: number;
    entregados: number;
    sinAsignar: number;
    devoluciones: number;
    reagendados: number;
    valorTotal: number;
    efectivo: number;
    sinpe: number;
    tarjeta: number;
    dosPagos: number;
  };
  hasActiveFilters: boolean;
  totalPedidos: number;
}

export function PedidosStats({ stats, hasActiveFilters, totalPedidos }: PedidosStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getProgressWidth = (value: number, total: number) => {
    return total > 0 ? Math.min((value / total) * 100, 100) : 0;
  };

  const paymentChartData = [
    { name: 'Efectivo', value: stats.efectivo, color: '#10b981' },
    { name: 'SINPE', value: stats.sinpe, color: '#3b82f6' },
    { name: 'Tarjeta', value: stats.tarjeta, color: '#8b5cf6' },
    { name: '2 Pagos', value: stats.dosPagos, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Pedidos</p>
                <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters ? 'Filtrados' : `${totalPedidos.toLocaleString()} totales`}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pedidos Entregados</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.entregados.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.entregados / stats.total) * 100) : 0}% del total
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-rose-200 dark:border-rose-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/30 to-red-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sin Asignar</p>
                <p className="text-3xl font-bold text-rose-700 dark:text-rose-400">{stats.sinAsignar.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.sinAsignar / stats.total) * 100) : 0}% del total
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métodos de Pago Stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Distribución por Método de Pago</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {paymentChartData.map((method) => (
            <Card key={method.name} className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-20" style={{ background: `${method.color}20` }} />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${method.color}10` }}>
                    {method.name === 'Efectivo' && <DollarSign className="w-5 h-5" style={{ color: method.color }} />}
                    {method.name === 'SINPE' && <CreditCard className="w-5 h-5" style={{ color: method.color }} />}
                    {method.name === 'Tarjeta' && <CreditCard className="w-5 h-5" style={{ color: method.color }} />}
                    {method.name === '2 Pagos' && <FileText className="w-5 h-5" style={{ color: method.color }} />}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{method.name}</p>
                  <p className="text-xl font-bold" style={{ color: method.color }}>{method.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{getPercentage(method.value, stats.total)}%</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
