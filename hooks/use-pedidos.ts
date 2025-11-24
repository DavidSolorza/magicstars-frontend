import { useState, useEffect, useCallback, useMemo } from 'react';
import { PedidoTest } from '@/lib/types';
import { getPedidos, getAllPedidos, updatePedido } from '@/lib/supabase-pedidos';

export interface PedidosFilters {
  searchTerm: string; // Término en el input (no se usa para filtrar hasta que se presione buscar)
  searchQuery: string; // Término real usado para filtrar
  statusFilter: string;
  distritoFilter: string;
  mensajeroFilter: string;
  dateFilter: string;
  specificDate: string;
  dateRange: { start: string; end: string };
  tiendaFilter: string;
  metodoPagoFilter: string;
  showFutureOrders: boolean;
}

export interface PedidosStats {
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
}

export interface PedidosPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalPedidos: number;
}

const initialFilters: PedidosFilters = {
  searchTerm: '',
  searchQuery: '',
  statusFilter: 'all',
  distritoFilter: 'all',
  mensajeroFilter: 'all',
  dateFilter: 'all',
  specificDate: '',
  dateRange: { start: '', end: '' },
  tiendaFilter: 'all',
  metodoPagoFilter: 'all',
  showFutureOrders: false,
};

export function usePedidos() {
  const [pedidos, setPedidos] = useState<PedidoTest[]>([]);
  const [allPedidos, setAllPedidos] = useState<PedidoTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filters, setFilters] = useState<PedidosFilters>(initialFilters);
  const [pagination, setPagination] = useState<PedidosPagination>({
    currentPage: 1,
    pageSize: 50,
    totalPages: 0,
    totalPedidos: 0,
  });

  // Función auxiliar para obtener fecha simple de Costa Rica
  const getCostaRicaDateSimple = useCallback((date: Date | string | null | undefined) => {
    // Verificar si la fecha es válida
    if (!date || date === null || date === undefined) {
      return null;
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Si es string, intentar parsearlo
      if (date.includes('-')) {
        // Formato YYYY-M-D o YYYY-MM-DD
        const parts = date.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Los meses en JS van de 0-11
          const day = parseInt(parts[2]);
          dateObj = new Date(year, month, day);
        } else {
          dateObj = new Date(date);
        }
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // Verificar si dateObj es válido antes de llamar getTime()
    if (!dateObj) {
      return null;
    }
    
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    // Verificar si es la fecha Unix epoch (1970-01-01) que se muestra como 1969-12-31 en UTC-6
    const timestamp = dateObj.getTime();
    if (timestamp === 0 || (timestamp > -86400000 && timestamp < 86400000)) {
      return null;
    }
    
    // Convertir a zona horaria de Costa Rica
    const crDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
    return crDate.toISOString().split('T')[0];
  }, []);

  // Verificar si hay filtros activos que requieren recarga de datos
  const hasServerSideFilters = useMemo(() => {
    const hasFilters = filters.statusFilter !== 'all' || 
           filters.distritoFilter !== 'all' || 
           filters.mensajeroFilter !== 'all' || 
           filters.dateFilter !== 'all' || 
           filters.specificDate !== '' || 
           (filters.dateRange.start !== '' && filters.dateRange.end !== '') || 
           filters.tiendaFilter !== 'all' || 
           filters.metodoPagoFilter !== 'all' ||
           filters.showFutureOrders ||
           filters.searchQuery !== ''; // Incluir búsqueda para que se recarguen los datos
    
    
    return hasFilters;
  }, [filters]);

  // Función de filtrado optimizada
  const filterPedidos = useCallback((pedidosToFilter: PedidoTest[]) => {
    
    const filtered = pedidosToFilter.filter(pedido => {
      if (!pedido.id_pedido) return false;

      // Filtro de búsqueda (usa searchQuery, no searchTerm)
      // Mejora: búsqueda más precisa por ID de pedido
      const searchTerm = filters.searchQuery.trim().toLowerCase();
      let matchesSearch = false;
      
      if (searchTerm === '') {
        matchesSearch = true;
      } else {
        const pedidoId = (pedido.id_pedido || '').toLowerCase();
        
        // Detectar si es una búsqueda por ID (formato típico: letras seguidas de números, ej: SL5807, VT5851, WS3057)
        // También acepta solo números si son 4+ dígitos (probablemente parte de un ID)
        const trimmedQuery = filters.searchQuery.trim();
        const isIdSearch = /^[A-Za-z]{1,4}\d{3,}$/i.test(trimmedQuery) || 
                          /^\d{4,}$/.test(trimmedQuery) ||
                          (trimmedQuery.length >= 4 && /^[A-Za-z0-9]+$/i.test(trimmedQuery));
        
        if (isIdSearch && pedidoId) {
          // Búsqueda precisa por ID: coincidencia exacta o que empiece con el ID
          // Priorizar coincidencia exacta
          if (pedidoId === searchTerm) {
            matchesSearch = true;
          } else if (pedidoId.startsWith(searchTerm)) {
            matchesSearch = true;
          } else {
            // Si no coincide exactamente ni empieza con, buscar como substring solo en el ID
            matchesSearch = pedidoId.includes(searchTerm);
          }
        } else {
          // Búsqueda general en múltiples campos
          matchesSearch = 
            pedidoId.includes(searchTerm) ||
            (pedido.cliente_nombre?.toLowerCase() || '').includes(searchTerm) ||
            (pedido.cliente_telefono?.toLowerCase() || '').includes(searchTerm) ||
            (pedido.distrito?.toLowerCase() || '').includes(searchTerm) ||
            (pedido.productos?.toLowerCase() || '').includes(searchTerm) ||
            !!(pedido.mensajero_asignado && pedido.mensajero_asignado.toLowerCase().includes(searchTerm));
        }
      }

      // Filtro de estado
      const matchesStatus = filters.statusFilter === 'all' || 
        (filters.statusFilter === 'asignado' && pedido.mensajero_asignado && !pedido.mensajero_concretado) ||
        (filters.statusFilter === 'entregado' && pedido.mensajero_concretado) ||
        (filters.statusFilter === 'sin_asignar' && !pedido.mensajero_asignado) ||
        (filters.statusFilter === 'devolucion' && pedido.estado_pedido === 'devolucion') ||
        (filters.statusFilter === 'reagendado' && pedido.estado_pedido === 'reagendado');

      // Filtros simples
      const matchesDistrito = filters.distritoFilter === 'all' || pedido.distrito === filters.distritoFilter;
      const matchesMensajero = filters.mensajeroFilter === 'all' || pedido.mensajero_asignado === filters.mensajeroFilter;
      const matchesTienda = filters.tiendaFilter === 'all' || pedido.tienda === filters.tiendaFilter;
      const matchesMetodoPago = filters.metodoPagoFilter === 'all' || 
        (pedido.metodo_pago && pedido.metodo_pago.toLowerCase() === filters.metodoPagoFilter.toLowerCase()) ||
        (filters.metodoPagoFilter === '2pagos' && pedido.metodo_pago && 
         (pedido.metodo_pago.toLowerCase() === '2pagos' || pedido.metodo_pago.toLowerCase() === '2 pagos'));

      // Filtro de fecha (usando fecha_creacion)
      let matchesDate = true;
      const orderDateSimple = getCostaRicaDateSimple(pedido.fecha_creacion);
      
      // Si no se puede parsear la fecha, excluir el pedido
      if (!orderDateSimple) {
        // Solo excluir si no hay filtros de fecha activos (para mostrar pedidos con fechas válidas)
        if (filters.dateFilter === 'all' && !filters.showFutureOrders) {
          matchesDate = false;
        } else {
          // Si hay filtros de fecha activos, excluir pedidos con fechas inválidas
          matchesDate = false;
        }
      } else {
        const today = new Date();
        const todaySimple = getCostaRicaDateSimple(today);
        
        // Filtro de pedidos futuros (si está desactivado, excluir pedidos futuros)
        if (!filters.showFutureOrders && todaySimple && orderDateSimple && orderDateSimple > todaySimple) {
          matchesDate = false;
        } else if (filters.dateFilter !== 'all' && todaySimple) {
          switch (filters.dateFilter) {
            case 'today':
              matchesDate = orderDateSimple === todaySimple;
              break;
            case 'yesterday':
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdaySimple = getCostaRicaDateSimple(yesterday);
              matchesDate = orderDateSimple === yesterdaySimple;
              break;
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              const weekAgoSimple = getCostaRicaDateSimple(weekAgo);
              matchesDate = orderDateSimple && weekAgoSimple ? orderDateSimple >= weekAgoSimple : false;
              break;
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              const monthAgoSimple = getCostaRicaDateSimple(monthAgo);
              matchesDate = orderDateSimple && monthAgoSimple ? orderDateSimple >= monthAgoSimple : false;
              break;
            case 'last_month':
              const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
              const lastMonthStartSimple = getCostaRicaDateSimple(lastMonthStart);
              const lastMonthEndSimple = getCostaRicaDateSimple(lastMonthEnd);
              matchesDate = orderDateSimple && lastMonthStartSimple && lastMonthEndSimple ? 
                           orderDateSimple >= lastMonthStartSimple && orderDateSimple <= lastMonthEndSimple : false;
              break;
            case 'year':
              const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
              const yearAgoSimple = getCostaRicaDateSimple(yearAgo);
              matchesDate = orderDateSimple && yearAgoSimple ? orderDateSimple >= yearAgoSimple : false;
              break;
            case 'specific':
              if (filters.specificDate) {
                const specificDateSimple = getCostaRicaDateSimple(filters.specificDate);
                matchesDate = orderDateSimple === specificDateSimple;
              }
              break;
            case 'range':
              if (filters.dateRange.start && filters.dateRange.end) {
                const startDateSimple = getCostaRicaDateSimple(filters.dateRange.start);
                const endDateSimple = getCostaRicaDateSimple(filters.dateRange.end);
                matchesDate = orderDateSimple && startDateSimple && endDateSimple ? 
                  orderDateSimple >= startDateSimple && orderDateSimple <= endDateSimple : false;
              }
              break;
          }
        }
      }

      const matches = matchesSearch && matchesStatus && matchesDistrito && matchesMensajero && 
                     matchesDate && matchesTienda && matchesMetodoPago;
      

      return matches;
    });
    
    
    // Ordenar pedidos por fecha de creación descendente (más recientes primero)
    const sorted = filtered.sort((a, b) => {
      const dateA = getCostaRicaDateSimple(a.fecha_creacion);
      const dateB = getCostaRicaDateSimple(b.fecha_creacion);
      
      // Si alguna fecha es inválida, ponerla al final
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // Ordenar por fecha descendente (más reciente primero)
      return dateB.localeCompare(dateA);
    });
    
    return sorted;
  }, [filters, getCostaRicaDateSimple]);

  // Cargar pedidos con paginación
  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      
      if (hasServerSideFilters) {
        // Con filtros activos, cargar todos los pedidos y filtrar del lado del cliente
        const allData = await getAllPedidos();
        
        
        const filtered = filterPedidos(allData);
        
        // Aplicar paginación
        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginatedData = filtered.slice(startIndex, endIndex);
        
        setPedidos(paginatedData);
        setPagination(prev => ({
          ...prev,
          totalPages: Math.ceil(filtered.length / pagination.pageSize),
          totalPedidos: filtered.length,
        }));
      } else {
        // Sin filtros, usar paginación del servidor
        const result = await getPedidos(pagination.currentPage, pagination.pageSize);
        
        setPedidos(result.data);
        setPagination(prev => ({
          ...prev,
          totalPages: result.totalPages,
          totalPedidos: result.total,
        }));
      }
    } catch (error) {
      console.error('Error loading pedidos:', error);
    } finally {
      setLoading(false);
    }
  }, [hasServerSideFilters, filterPedidos, pagination.currentPage, pagination.pageSize, getCostaRicaDateSimple]);

  // Cargar todos los pedidos para filtros
  const loadAllPedidosForFilters = useCallback(async () => {
    try {
      setLoadingFilters(true);
      const allData = await getAllPedidos();
      setAllPedidos(allData);
    } catch (error) {
      console.error('Error loading all pedidos for filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  // Calcular estadísticas
  const stats = useMemo((): PedidosStats => {
    const dataSource = allPedidos.length > 0 ? allPedidos : pedidos;
    
    if (!hasServerSideFilters && !filters.searchQuery) {
      return {
        total: dataSource.length,
        asignados: dataSource.filter(p => p.mensajero_asignado && !p.mensajero_concretado).length,
        entregados: dataSource.filter(p => p.mensajero_concretado).length,
        sinAsignar: dataSource.filter(p => !p.mensajero_asignado).length,
        devoluciones: dataSource.filter(p => p.estado_pedido === 'devolucion').length,
        reagendados: dataSource.filter(p => p.estado_pedido === 'reagendado').length,
        valorTotal: dataSource.reduce((sum, p) => sum + p.valor_total, 0),
        efectivo: dataSource.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'efectivo').length,
        sinpe: dataSource.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'sinpe').length,
        tarjeta: dataSource.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'tarjeta').length,
        dosPagos: dataSource.filter(p => p.metodo_pago && (p.metodo_pago.toLowerCase() === '2pagos' || p.metodo_pago.toLowerCase() === '2 pagos')).length,
      };
    }

    const filtered = filterPedidos(dataSource);
    return {
      total: filtered.length,
      asignados: filtered.filter(p => p.mensajero_asignado && !p.mensajero_concretado).length,
      entregados: filtered.filter(p => p.mensajero_concretado).length,
      sinAsignar: filtered.filter(p => !p.mensajero_asignado).length,
      devoluciones: filtered.filter(p => p.estado_pedido === 'devolucion').length,
      reagendados: filtered.filter(p => p.estado_pedido === 'reagendado').length,
      valorTotal: filtered.reduce((sum, p) => sum + p.valor_total, 0),
      efectivo: filtered.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'efectivo').length,
      sinpe: filtered.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'sinpe').length,
      tarjeta: filtered.filter(p => p.metodo_pago && p.metodo_pago.toLowerCase() === 'tarjeta').length,
      dosPagos: filtered.filter(p => p.metodo_pago && (p.metodo_pago.toLowerCase() === '2pagos' || p.metodo_pago.toLowerCase() === '2 pagos')).length,
    };
  }, [allPedidos, pedidos, hasServerSideFilters, filters.searchQuery, filterPedidos]);

  // Obtener listas únicas para filtros
  const filterOptions = useMemo(() => {
    const distritos = Array.from(new Set(allPedidos.map(p => p.distrito).filter(Boolean))).sort() as string[];
    const mensajerosAsignados = Array.from(new Set(allPedidos.map(p => p.mensajero_asignado).filter(Boolean))).sort() as string[];
    const tiendas = Array.from(new Set(allPedidos.map(p => p.tienda).filter(Boolean))).sort() as string[];
    const metodosPago = Array.from(new Set(allPedidos.map(p => p.metodo_pago).filter(Boolean))).sort() as string[];

    return {
      distritos,
      mensajeros: mensajerosAsignados,
      tiendas,
      metodosPago,
    };
  }, [allPedidos]);

  // Actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<PedidosFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset a la primera página
  }, []);

  // Función para ejecutar la búsqueda (se llama cuando se presiona Enter o el botón)
  const executeSearch = useCallback(() => {
    const trimmedSearch = filters.searchTerm.trim();
    setFilters(prev => ({ ...prev, searchQuery: trimmedSearch }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    // Forzar recarga inmediata después de actualizar el filtro
    // El useEffect se encargará de recargar cuando cambien los filtros
  }, [filters.searchTerm]);

  // Limpiar todos los filtros
  const clearAllFilters = useCallback(() => {
    setFilters(initialFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Actualizar paginación
  const updatePagination = useCallback((newPagination: Partial<PedidosPagination>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  // Actualizar pedido
  const updatePedidoStatus = useCallback(async (pedidoId: string, updates: Partial<PedidoTest>, usuario?: string) => {
    try {
      // Log del usuario que realiza la actualización (solo para debugging)
      console.log(`🔄 Actualizando pedido ${pedidoId} por usuario: ${usuario || 'Admin'}`);

      const success = await updatePedido(pedidoId, updates);
      if (success) {
        setPedidos(prevPedidos => 
          prevPedidos.map(pedido => 
            pedido.id_pedido === pedidoId 
              ? { ...pedido, ...updates }
              : pedido
          )
        );
        // Recargar todos los pedidos para actualizar filtros
        loadAllPedidosForFilters();
      }
      return success;
    } catch (error) {
      console.error('Error updating pedido:', error);
      return false;
    }
  }, [loadAllPedidosForFilters]);

  // Efectos
  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    loadAllPedidosForFilters();
  }, [loadAllPedidosForFilters]);

  return {
    pedidos,
    allPedidos,
    loading,
    loadingFilters,
    filters,
    pagination,
    stats,
    filterOptions,
    hasServerSideFilters,
    updateFilters,
    clearAllFilters,
    updatePagination,
    updatePedidoStatus,
    loadPedidos,
    executeSearch,
  };
}
