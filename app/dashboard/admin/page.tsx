'use client';

import { useState, useMemo } from 'react';
import { Order, Stats, User } from '@/lib/types';
import { ProgressLoader } from '@/components/ui/progress-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, UserCheck, Users } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { DashboardHeader } from '@/components/dashboard/admin/dashboard-header';
import { StatsSection } from '@/components/dashboard/admin/stats-section';
import { ActionCardsSection } from '@/components/dashboard/admin/action-cards-section';
import { SyncMessage } from '@/components/dashboard/admin/sync-message';
import { OrdersOverviewTab } from '@/components/dashboard/admin/orders-overview-tab';
import { MessengersTab } from '@/components/dashboard/admin/messengers-tab';
import { TiendasTab } from '@/components/dashboard/admin/tiendas-tab';
import { MessengersModal } from '@/components/dashboard/admin/messengers-modal';
import { TiendasModal } from '@/components/dashboard/admin/tiendas-modal';
import { statsPaletteStyles, StatsPaletteKey } from '@/lib/constants/admin-dashboard-constants';
import {
  CheckCircle,
  RotateCcw,
  Truck,
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [showMessengersModal, setShowMessengersModal] = useState(false);
  const [showTiendasModal, setShowTiendasModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    recentOrders,
    paginatedOrders,
    ordersPage,
    ORDERS_PER_PAGE,
    stats,
    users,
    pedidosDelDiaRaw,
    isShowingTodayOrders,
    loaderSteps,
    loaderCurrentStep,
    loaderProgress,
    isLoaderVisible,
    setIsLoaderVisible,
    loaderHasError,
    syncing,
    syncMessage,
    lastSyncTime,
    canSync,
    getTimeUntilNextSync,
    syncRegistries,
    handlePageChange,
  } = useAdminDashboard();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const messengers = users.filter(u => u.role === 'mensajero' || u.role === 'mensajero-lider');
  const advisors = users.filter(u => u.role === 'asesor');

  // Función para obtener resumen diario por mensajero
  const getMessengerDailySummary = () => {
    const messengerSummary: Record<string, {
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
    }> = {};

    pedidosDelDiaRaw.forEach(pedido => {
      const mensajeroNombre = pedido.mensajero_asignado || pedido.mensajero_concretado;
      if (!mensajeroNombre) return;

      let messenger = messengers.find(m => m.name === mensajeroNombre);
      if (!messenger) {
        const slugSegment = mensajeroNombre.toLowerCase().replace(/\s+/g, '-');
        messenger = {
          id: `msg-${slugSegment}`,
          name: mensajeroNombre,
          email: `${slugSegment}@magicstars.com`,
          role: 'mensajero' as const,
          phone: '+506 0000-0000',
          isActive: true,
          createdAt: pedido.fecha_creacion || new Date().toISOString(),
        };
      }

      if (!messengerSummary[messenger.id]) {
        messengerSummary[messenger.id] = {
          messenger,
          totalAsignados: 0,
          totalEntregados: 0,
          totalDevueltos: 0,
          entregas: [],
        };
      }

      const summary = messengerSummary[messenger.id];
      summary.totalAsignados += 1;

      const estado = pedido.estado_pedido?.toLowerCase() || 
        (pedido.mensajero_concretado ? 'entregado' : pedido.mensajero_asignado ? 'en_ruta' : 'pendiente');
      
      if (estado === 'entregado' || pedido.mensajero_concretado) {
        summary.totalEntregados += 1;
      }
      if (estado === 'devolucion') {
        summary.totalDevueltos += 1;
      }

      if (estado === 'entregado' || estado === 'en_ruta' || estado === 'devolucion') {
        const fechaEntrega = pedido.fecha_entrega || pedido.fecha_creacion;
        try {
          const fecha = new Date(fechaEntrega);
          const hora = fecha.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
          
          summary.entregas.push({
            id: pedido.id_pedido,
            cliente: pedido.cliente_nombre || 'Sin nombre',
            hora,
            estado,
            valor: typeof pedido.valor_total === 'number' ? pedido.valor_total : Number.parseFloat(String(pedido.valor_total ?? '0')) || 0,
          });
        } catch (error) {
          // Error al parsear fecha, continuar sin esta entrega
        }
      }
    });

    Object.values(messengerSummary).forEach(summary => {
      summary.entregas.sort((a, b) => b.hora.localeCompare(a.hora));
    });

    return Object.values(messengerSummary).filter(s => s.totalAsignados > 0);
  };

  // Función para obtener resumen diario por tienda
  const getTiendaDailySummary = () => {
    const tiendaSummary: Record<string, {
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
    }> = {};

    pedidosDelDiaRaw.forEach(pedido => {
      const tienda = pedido.tienda || 'Sin tienda';
      
      if (!tiendaSummary[tienda]) {
        tiendaSummary[tienda] = {
          tienda,
          totalPedidos: 0,
          totalEntregados: 0,
          totalDevueltos: 0,
          pedidos: [],
        };
      }

      const summary = tiendaSummary[tienda];
      summary.totalPedidos += 1;

      const estado = pedido.estado_pedido?.toLowerCase() || 
        (pedido.mensajero_concretado ? 'entregado' : pedido.mensajero_asignado ? 'en_ruta' : 'pendiente');
      
      if (estado === 'entregado' || pedido.mensajero_concretado) {
        summary.totalEntregados += 1;
      }
      if (estado === 'devolucion') {
        summary.totalDevueltos += 1;
      }

      summary.pedidos.push({
        id: pedido.id_pedido,
        cliente: pedido.cliente_nombre || 'Sin nombre',
        valor: typeof pedido.valor_total === 'number' ? pedido.valor_total : Number.parseFloat(String(pedido.valor_total ?? '0')) || 0,
        estado,
        fechaCreacion: pedido.fecha_creacion,
      });
    });

    Object.values(tiendaSummary).forEach(summary => {
      summary.pedidos.sort((a, b) => {
        try {
          const fechaA = new Date(a.fechaCreacion).getTime();
          const fechaB = new Date(b.fechaCreacion).getTime();
          return fechaB - fechaA;
        } catch {
          return 0;
        }
      });
    });

    return Object.values(tiendaSummary).filter(s => s.totalPedidos > 0);
  };

  const messengerDailySummary = useMemo(() => getMessengerDailySummary(), [pedidosDelDiaRaw, messengers]);
  const tiendaDailySummary = useMemo(() => getTiendaDailySummary(), [pedidosDelDiaRaw]);

  const overviewMetrics = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        key: 'visibleOrders',
        title: 'Pedidos visibles (hoy)',
        value: recentOrders.length,
        icon: Package,
        palette: 'blue' as StatsPaletteKey,
      },
      {
        key: 'totalOrders',
        title: 'Total pedidos (hoy)',
        value: stats.totalOrders,
        icon: BarChart3,
        palette: 'slate' as StatsPaletteKey,
      },
      {
        key: 'pendingOrders',
        title: 'Pendientes (hoy)',
        value: stats.pendingOrders,
        icon: Clock,
        palette: 'amber' as StatsPaletteKey,
      },
      {
        key: 'deliveredOrders',
        title: 'Entregados (hoy)',
        value: stats.deliveredOrders,
        icon: CheckCircle,
        palette: 'emerald' as StatsPaletteKey,
      },
      {
        key: 'activeMessengers',
        title: 'Mensajeros activos (hoy)',
        value: messengers.length,
        icon: Truck,
        palette: 'violet' as StatsPaletteKey,
      },
      {
        key: 'activeAdvisors',
        title: 'Asesores activos (hoy)',
        value: advisors.length,
        icon: Users,
        palette: 'slate' as StatsPaletteKey,
      },
      {
        key: 'rescheduledOrders',
        title: 'Reagendados (hoy)',
        value: stats.rescheduledOrders,
        icon: RefreshCw,
        palette: 'indigo' as StatsPaletteKey,
      },
      {
        key: 'returnedOrders',
        title: 'Devueltos (hoy)',
        value: stats.returnedOrders,
        icon: RotateCcw,
        palette: 'rose' as StatsPaletteKey,
      },
      {
        key: 'deliveryRate',
        title: 'Tasa entrega (hoy)',
        value: `${stats.deliveryRate}%`,
        icon: TrendingUp,
        palette: 'teal' as StatsPaletteKey,
      },
      {
        key: 'revenue',
        title: 'Ingresos estimados (hoy)',
        value: formatCurrency(stats.totalCash),
        icon: DollarSign,
        palette: 'emerald' as StatsPaletteKey,
      },
    ];
  }, [stats, recentOrders.length, messengers.length, advisors.length, formatCurrency]);

  const metricsByKey = useMemo(() => 
    Object.fromEntries(overviewMetrics.map(metric => [metric.key, metric])) as Record<string, (typeof overviewMetrics)[number]>,
    [overviewMetrics]
  );

  const recentOrdersLabel = isShowingTodayOrders ? 'Pedidos de Hoy' : 'Pedidos Recientes';
  
  const recentOrdersSummary = useMemo(() => 
    recentOrders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc.totalAmount += order.totalAmount ?? 0;
        switch (order.status) {
          case 'entregado':
            acc.delivered += 1;
            break;
          case 'en_ruta':
            acc.inRoute += 1;
            break;
          case 'pendiente':
            acc.pending += 1;
            break;
          case 'devolucion':
            acc.returned += 1;
            break;
          case 'reagendado':
            acc.rescheduled += 1;
            break;
        }
        return acc;
      },
      { total: 0, delivered: 0, inRoute: 0, pending: 0, returned: 0, rescheduled: 0, totalAmount: 0 },
    ),
    [recentOrders]
  );

  const recentOrdersHighlights = useMemo(() => [
    {
      key: 'delivered',
      label: 'Entregados',
      value: recentOrdersSummary.delivered.toLocaleString('es-CR'),
      accent: 'text-emerald-700',
      bg: 'bg-emerald-50/80 border-emerald-100',
    },
    {
      key: 'inRoute',
      label: 'En ruta',
      value: recentOrdersSummary.inRoute.toLocaleString('es-CR'),
      accent: 'text-indigo-700',
      bg: 'bg-indigo-50/80 border-indigo-100',
    },
    {
      key: 'pending',
      label: 'Pendientes',
      value: recentOrdersSummary.pending.toLocaleString('es-CR'),
      accent: 'text-amber-700',
      bg: 'bg-amber-50/80 border-amber-100',
    },
    {
      key: 'returned',
      label: 'Devueltos',
      value: recentOrdersSummary.returned.toLocaleString('es-CR'),
      accent: 'text-rose-700',
      bg: 'bg-rose-50/80 border-rose-100',
    },
    {
      key: 'rescheduled',
      label: 'Reagendados',
      value: recentOrdersSummary.rescheduled.toLocaleString('es-CR'),
      accent: 'text-slate-700',
      bg: 'bg-slate-50/80 border-slate-200',
    },
    {
      key: 'totalAmount',
      label: 'Valor total',
      value: formatCurrency(recentOrdersSummary.totalAmount),
      accent: 'text-blue-700',
      bg: 'bg-blue-50/80 border-blue-100',
    },
  ], [recentOrdersSummary, formatCurrency]);

  const highlightMetrics = useMemo(() => [
    { metric: metricsByKey.totalOrders, span: 'lg:col-span-3' },
    { metric: metricsByKey.pendingOrders, span: 'lg:col-span-3' },
    { metric: metricsByKey.deliveredOrders, span: 'lg:col-span-3' },
    { metric: metricsByKey.revenue, span: 'lg:col-span-3' },
  ].filter(item => item.metric), [metricsByKey]);

  const secondaryMetrics = useMemo(() => [
    { metric: metricsByKey.visibleOrders, span: 'lg:col-span-3 xl:col-span-2' },
    { metric: metricsByKey.returnedOrders, span: 'lg:col-span-3 xl:col-span-2' },
    { metric: metricsByKey.rescheduledOrders, span: 'lg:col-span-3 xl:col-span-2' },
  ].filter(item => item.metric), [metricsByKey]);

  const operationalChips = useMemo(() => [
    {
      key: 'oper-messengers',
      label: 'Mensajeros',
      value: messengers.length.toLocaleString('es-CR'),
      icon: UserCheck,
      accent: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      key: 'oper-advisors',
      label: 'Asesores',
      value: advisors.length.toLocaleString('es-CR'),
      icon: Users,
      accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      key: 'oper-orders-today',
      label: 'Pedidos hoy',
      value: recentOrdersSummary.total.toLocaleString('es-CR'),
      icon: Package,
      accent: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    },
    {
      key: 'oper-value-today',
      label: 'Valor hoy',
      value: formatCurrency(recentOrdersSummary.totalAmount),
      icon: DollarSign,
      accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  ], [messengers.length, advisors.length, recentOrdersSummary, formatCurrency]);

  return (
    <div className="space-y-4 pb-4">
      <ProgressLoader
        isVisible={isLoaderVisible}
        title="Preparando dashboard"
        steps={loaderSteps}
        currentStep={loaderCurrentStep}
        overallProgress={loaderProgress}
        showCloseButton={loaderHasError}
        onClose={() => setIsLoaderVisible(false)}
      />

      <DashboardHeader
        lastSyncTime={lastSyncTime}
        canSync={canSync}
        getTimeUntilNextSync={getTimeUntilNextSync}
      />

      {stats && (
        <>
          <ActionCardsSection
            messengerCount={messengerDailySummary.length}
            tiendaCount={tiendaDailySummary.length}
            lastSyncTime={lastSyncTime}
            canSync={canSync}
            syncing={syncing}
            getTimeUntilNextSync={getTimeUntilNextSync}
            onSyncClick={syncRegistries}
            onMessengersClick={() => setShowMessengersModal(true)}
            onTiendasClick={() => setShowTiendasModal(true)}
          />

          <StatsSection
            highlightMetrics={highlightMetrics}
            secondaryMetrics={secondaryMetrics}
            deliveryRateMetric={metricsByKey.deliveryRate}
            operationalChips={operationalChips}
          />
        </>
      )}

      <SyncMessage message={syncMessage} />

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
        <div className="relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl border-0 bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/50 dark:to-indigo-950/50 p-1 shadow-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 rounded-xl transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">{recentOrdersLabel}</span>
                <span className="sm:hidden">Pedidos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="messengers" 
                className="flex items-center gap-2 rounded-xl transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mensajeros ({messengerDailySummary.length})</span>
                <span className="sm:hidden">Mens. ({messengerDailySummary.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="advisors" 
                className="flex items-center gap-2 rounded-xl transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Tiendas ({tiendaDailySummary.length})</span>
                <span className="sm:hidden">Tiendas ({tiendaDailySummary.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 sm:mt-5">
          <OrdersOverviewTab
            orders={recentOrders}
            ordersPerPage={ORDERS_PER_PAGE}
            currentPage={ordersPage}
            onPageChange={handlePageChange}
            isShowingTodayOrders={isShowingTodayOrders}
            recentOrdersLabel={recentOrdersLabel}
            recentOrdersSummary={recentOrdersSummary}
            recentOrdersHighlights={recentOrdersHighlights}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="messengers" className="mt-4 space-y-4">
          <MessengersTab
            messengerDailySummary={messengerDailySummary}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="advisors" className="mt-4 space-y-4">
          <TiendasTab
            tiendaDailySummary={tiendaDailySummary}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
          </Tabs>
        </div>
      </div>

      <MessengersModal
        open={showMessengersModal}
        onOpenChange={setShowMessengersModal}
        messengerDailySummary={messengerDailySummary}
        formatCurrency={formatCurrency}
      />

      <TiendasModal
        open={showTiendasModal}
        onOpenChange={setShowTiendasModal}
        tiendaDailySummary={tiendaDailySummary}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

