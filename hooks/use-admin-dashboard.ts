import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getPedidosDelDia, supabasePedidos } from '@/lib/supabase-pedidos';
import { Order, Stats, User, PedidoTest } from '@/lib/types';
import { API_URLS, apiRequest } from '@/lib/config';
import { LoaderStep } from '@/components/ui/progress-loader';

const CONTROL_TASK_NAME = 'Sincronizar_sheets_y_supabase';
const COSTA_RICA_UTC_OFFSET_MINUTES = 6 * 60;
const ORDERS_PER_PAGE = 10;

const getCostaRicaNowInfo = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const getPartValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? '0');

  const year = getPartValue('year');
  const month = getPartValue('month');
  const day = getPartValue('day');
  const hour = getPartValue('hour');
  const minute = getPartValue('minute');
  const second = getPartValue('second');

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) +
    COSTA_RICA_UTC_OFFSET_MINUTES * 60 * 1000;

  return { year, month, day, hour, minute, second, utcTimestamp };
};

const parseActivationTimeToUTC = (timeValue: string | null) => {
  if (!timeValue) return null;

  const match = timeValue.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, hourStr, minuteStr, secondStr] = match;
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  if ([hour, minute, second].some(value => Number.isNaN(value))) {
    return null;
  }

  const { year, month, day, utcTimestamp: nowUTC } = getCostaRicaNowInfo();
  let activationUTC =
    Date.UTC(year, month - 1, day, hour, minute, second) +
    COSTA_RICA_UTC_OFFSET_MINUTES * 60 * 1000;

  if (activationUTC > nowUTC) {
    activationUTC -= 24 * 60 * 60 * 1000;
  }

  return activationUTC;
};

const INITIAL_LOADER_STEPS: LoaderStep[] = [
  {
    id: 'fetch-today',
    label: 'Cargando pedidos del día',
    status: 'pending',
    description: 'Consultando pedidos recientes en Supabase...',
  },
  {
    id: 'fetch-all',
    label: 'Analizando historial',
    status: 'pending',
    description: 'Recopilando pedidos históricos para estadísticas...',
  },
  {
    id: 'transform-orders',
    label: 'Preparando órdenes',
    status: 'pending',
    description: 'Formateando pedidos para mostrar en el panel...',
  },
  {
    id: 'compute-stats',
    label: 'Generando métricas',
    status: 'pending',
    description: 'Calculando totales, tasas y montos globales...',
  },
  {
    id: 'finalize',
    label: 'Renderizando dashboard',
    status: 'pending',
    description: 'Aplicando datos a las vistas principales...',
  },
];

export function useAdminDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pedidosDelDiaRaw, setPedidosDelDiaRaw] = useState<PedidoTest[]>([]);
  const [loaderSteps, setLoaderSteps] = useState<LoaderStep[]>(() => INITIAL_LOADER_STEPS.map(step => ({ ...step })));
  const [loaderCurrentStep, setLoaderCurrentStep] = useState<string | undefined>(undefined);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [isLoaderVisible, setIsLoaderVisible] = useState(false);
  const [loaderHasError, setLoaderHasError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isShowingTodayOrders, setIsShowingTodayOrders] = useState(true);
  const activeLoaderStepRef = useRef<string | null>(null);

  const resetLoaderSteps = useCallback(() => {
    setLoaderSteps(INITIAL_LOADER_STEPS.map(step => ({ ...step })));
    setLoaderCurrentStep(undefined);
    setLoaderProgress(0);
    setLoaderHasError(false);
    activeLoaderStepRef.current = null;
  }, []);

  const setLoaderStepStatus = useCallback(
    (stepId: string, status: LoaderStep['status'], description?: string) => {
      setLoaderSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === stepId
            ? {
                ...step,
                status,
                ...(description !== undefined ? { description } : {}),
              }
            : step,
        ),
      );

      if (status === 'loading') {
        activeLoaderStepRef.current = stepId;
        setLoaderCurrentStep(stepId);
        setIsLoaderVisible(true);
      } else if (status === 'completed') {
        if (activeLoaderStepRef.current === stepId) {
          activeLoaderStepRef.current = null;
        }
        setLoaderCurrentStep(undefined);
      } else if (status === 'error') {
        activeLoaderStepRef.current = stepId;
        setLoaderCurrentStep(stepId);
      }
    },
    [],
  );

  useEffect(() => {
    const completed = loaderSteps.filter(step => step.status === 'completed').length;
    const total = loaderSteps.length || 1;
    setLoaderProgress((completed / total) * 100);
  }, [loaderSteps]);

  const getLatestSyncTimestamp = useCallback(async (): Promise<number | null> => {
    try {
      const { data, error } = await supabasePedidos
        .from('MSControl')
        .select('ultima_activacion')
        .eq('nombre', CONTROL_TASK_NAME)
        .limit(1)
        .maybeSingle<{ ultima_activacion: string | null }>();

      if (error) {
        console.error('Error al obtener última sincronización desde MSControl:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const parsedTime = parseActivationTimeToUTC(data.ultima_activacion as string | null);
      return parsedTime;
    } catch (error) {
      console.error('Error inesperado al consultar MSControl:', error);
      return null;
    }
  }, []);

  const fetchLastSyncTime = useCallback(async () => {
    const latest = await getLatestSyncTimestamp();
    if (latest === null) {
      setLastSyncTime(null);
    } else {
      setLastSyncTime(latest);
    }
  }, [getLatestSyncTimestamp]);

  const canSync = useCallback(() => {
    if (!lastSyncTime) return true;
    const fiveMinutes = 5 * 60 * 1000;
    const { utcTimestamp } = getCostaRicaNowInfo();
    const diff = utcTimestamp - lastSyncTime;
    return diff > fiveMinutes;
  }, [lastSyncTime]);

  const getTimeUntilNextSync = useCallback(() => {
    if (!lastSyncTime) return null;
    const fiveMinutes = 5 * 60 * 1000;
    const { utcTimestamp } = getCostaRicaNowInfo();
    const timeLeft = fiveMinutes - (utcTimestamp - lastSyncTime);
    if (timeLeft <= 0) return null;
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [lastSyncTime]);

  const syncRegistries = useCallback(async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      
      const syncPedidosResponse = await apiRequest(API_URLS.SYNC_PEDIDOS, {
        method: 'POST',
      });

      if (!syncPedidosResponse.ok) {
        throw new Error(`Error en la sincronización de pedidos: ${syncPedidosResponse.status}`);
      }

      setSyncMessage('Sincronización exitosa. Los datos se han actualizado.');
      const { utcTimestamp } = getCostaRicaNowInfo();
      const now = utcTimestamp;
      const previousSupabaseTimestamp = lastSyncTime;
      setLastSyncTime(now);

      const waitForSupabaseUpdate = async () => {
        const timeoutMs = 60 * 1000;
        const pollInterval = 2000;
        const start = Date.now();
        let latest: number | null = null;

        while (Date.now() - start < timeoutMs) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          latest = await getLatestSyncTimestamp();
          if (latest && (!previousSupabaseTimestamp || latest > previousSupabaseTimestamp + 1000)) {
            return latest;
          }
        }

        return latest;
      };

      const updatedTimestamp = await waitForSupabaseUpdate();
      if (updatedTimestamp) {
        setLastSyncTime(updatedTimestamp);
      } else {
        await fetchLastSyncTime();
      }
      
      await loadData();
      
      setTimeout(() => {
        setSyncMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error en la sincronización:', error);
      setSyncMessage('Error en la sincronización. Por favor, inténtalo de nuevo.');
      
      setTimeout(() => {
        setSyncMessage(null);
      }, 5000);
    } finally {
      setSyncing(false);
    }
  }, [lastSyncTime, getLatestSyncTimestamp, fetchLastSyncTime]);

  const loadData = useCallback(async () => {
    let encounteredError = false;
    try {
      resetLoaderSteps();
      setIsLoaderVisible(true);

      setLoaderStepStatus('fetch-today', 'loading');
      const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
      const today = getCostaRicaDateISO();
      const pedidosDelDia = await getPedidosDelDia(today);
      setPedidosDelDiaRaw(pedidosDelDia);
      setLoaderStepStatus('fetch-today', 'completed');

      const fetchAllPedidosWithProgress = async () => {
        let allPedidos: PedidoTest[] = [];
        let from = 0;
        const pageLimit = 1000;
        let hasMore = true;
        let page = 1;

        while (hasMore) {
          setLoaderStepStatus('fetch-all', 'loading', `Obteniendo página ${page}...`);

          const { data, error } = await supabasePedidos
            .from('pedidos_auto_test')
            .select('*')
            .order('fecha_creacion', { ascending: false })
            .range(from, from + pageLimit - 1);

          if (error) {
            throw error;
          }

          if (data && data.length > 0) {
            allPedidos = [...allPedidos, ...data];
            setLoaderStepStatus(
              'fetch-all',
              'loading',
              `Página ${page} obtenida · Total acumulado: ${allPedidos.length.toLocaleString('es-CR')}`,
            );
            from += pageLimit;
            page += 1;
            hasMore = data.length === pageLimit;
          } else {
            hasMore = false;
          }
        }

        setLoaderStepStatus(
          'fetch-all',
          'completed',
          `Historial cargado (${allPedidos.length.toLocaleString('es-CR')} registros)`,
        );
        return allPedidos;
      };

      const pedidosData = await fetchAllPedidosWithProgress();

      setLoaderStepStatus('transform-orders', 'loading');
      const pedidosParaMostrar = pedidosDelDia.length > 0 ? pedidosDelDia : pedidosData;
      const hayPedidosHoy = pedidosDelDia.length > 0;
      setIsShowingTodayOrders(hayPedidosHoy);

      const orders: Order[] = pedidosParaMostrar.map((pedido: PedidoTest) => {
        const valorTotal =
          typeof pedido.valor_total === 'number'
            ? pedido.valor_total
            : Number.parseFloat(String(pedido.valor_total ?? '0')) || 0;
        return {
          id: pedido.id_pedido,
          customerName: pedido.cliente_nombre || `Cliente ${pedido.id_pedido}`,
          customerPhone: pedido.cliente_telefono || 'No disponible',
          customerAddress: pedido.direccion || pedido.distrito,
          customerProvince: pedido.provincia || 'San José',
          customerCanton: pedido.canton || 'Central',
          customerDistrict: pedido.distrito,
          customerLocationLink: pedido.link_ubicacion || undefined,
          items: [],
          totalAmount: valorTotal,
          status:
            pedido.estado_pedido === 'entregado'
              ? 'entregado'
              : pedido.estado_pedido === 'devolucion'
              ? 'devolucion'
              : pedido.estado_pedido === 'reagendado'
              ? 'reagendado'
              : pedido.mensajero_concretado
              ? 'entregado'
              : pedido.mensajero_asignado
              ? 'en_ruta'
              : 'pendiente',
          paymentMethod: (pedido.metodo_pago?.toLowerCase() as any) || 'efectivo',
          origin: 'csv' as const,
          assignedMessenger: pedido.mensajero_asignado
            ? {
                id: `msg-${pedido.mensajero_asignado}`,
                name: pedido.mensajero_asignado,
                email: `${pedido.mensajero_asignado.toLowerCase()}@magicstars.com`,
                role: 'mensajero' as const,
                phone: '+506 0000-0000',
                company: {
                  id: 'company-1',
                  name: 'Magic Stars',
                  taxId: '123456789',
                  address: 'San José, Costa Rica',
                  phone: '+506 0000-0000',
                  email: 'info@magicstars.com',
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : undefined,
          deliveryNotes: pedido.nota_asesor || undefined,
          notes: pedido.notas || undefined,
          createdAt: pedido.fecha_creacion,
          updatedAt: pedido.fecha_creacion,
        };
      });
      setLoaderStepStatus('transform-orders', 'completed');

      setRecentOrders(orders);
      setOrdersPage(1);
      setPaginatedOrders(orders.slice(0, ORDERS_PER_PAGE));

      setLoaderStepStatus('compute-stats', 'loading');
      const pedidosParaEstadisticas = pedidosDelDia.length > 0 ? pedidosDelDia : [];
      const totalOrders = pedidosParaEstadisticas.length;
      const deliveredOrders = pedidosParaEstadisticas.filter(p => p.mensajero_concretado || p.estado_pedido?.toLowerCase() === 'entregado').length;
      const pendingOrders = pedidosParaEstadisticas.filter(p => !p.mensajero_asignado && !p.mensajero_concretado && p.estado_pedido?.toLowerCase() !== 'entregado').length;
      const returnedOrders = pedidosParaEstadisticas.filter(p => p.estado_pedido?.toLowerCase() === 'devolucion').length;
      const rescheduledOrders = pedidosParaEstadisticas.filter(p => p.estado_pedido?.toLowerCase() === 'reagendado').length;
      const totalCash = pedidosParaEstadisticas.reduce(
        (sum, p) =>
          sum +
          (typeof p.valor_total === 'number'
            ? p.valor_total
            : Number.parseFloat(String(p.valor_total ?? '0')) || 0),
        0,
      );
      const totalSinpe = 0;
      const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
      const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100) : 0;
      const rescheduleRate = totalOrders > 0 ? Math.round((rescheduledOrders / totalOrders) * 100) : 0;

      const realStats: Stats = {
        totalOrders,
        deliveredOrders,
        pendingOrders,
        returnedOrders,
        rescheduledOrders,
        totalCash,
        totalSinpe,
        deliveryRate,
        returnRate,
        rescheduleRate,
      };

      setStats(realStats);
      setLoaderStepStatus('compute-stats', 'completed');

      setLoaderStepStatus('finalize', 'loading');
      // Users will be derived from pedidos in the component
      setLoaderStepStatus('finalize', 'completed');
    } catch (error) {
      encounteredError = true;
      console.error('Error loading data:', error);
      setLoaderHasError(true);
      const failingStep = activeLoaderStepRef.current ?? 'fetch-all';
      setLoaderStepStatus(
        failingStep,
        'error',
        'Ocurrió un problema al cargar los datos. Por favor, inténtalo nuevamente.',
      );
    } finally {
      if (!encounteredError) {
        setTimeout(() => {
          setIsLoaderVisible(false);
        }, 300);
      }
    }
  }, [resetLoaderSteps, setLoaderStepStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchLastSyncTime();
  }, [fetchLastSyncTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLastSyncTime();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLastSyncTime]);

  const handlePageChange = useCallback((page: number) => {
    setOrdersPage(page);
    const start = (page - 1) * ORDERS_PER_PAGE;
    const end = start + ORDERS_PER_PAGE;
    setPaginatedOrders(recentOrders.slice(start, end));
  }, [recentOrders]);

  useEffect(() => {
    const start = (ordersPage - 1) * ORDERS_PER_PAGE;
    const end = start + ORDERS_PER_PAGE;
    setPaginatedOrders(recentOrders.slice(start, end));
  }, [recentOrders, ordersPage]);

  return {
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
  };
}

