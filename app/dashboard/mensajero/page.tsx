'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { mockApi } from '@/lib/mock-api';
import { Order, MessengerStats, PedidoTest, OrderStatus } from '@/lib/types';
import { getPedidos, getPedidosByDistrito, getPedidosByMensajero, updatePedido, debugMensajeros, testBusquedaAnibal, buscarPedidosEspecificos } from '@/lib/supabase-pedidos';
import { StatsCard } from '@/components/dashboard/stats-card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Lazy load Calendar
const CalendarComponent = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  { ssr: false }
);
import {
  Package,
  CheckCircle,
  RotateCcw,
  Truck,
  Clock,
  DollarSign,
  Smartphone,
  Navigation,
  Phone,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Eye,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock3,
  Edit3,
  MessageSquare,
  AlertTriangle,
  Building2,
  Route,
  CreditCard,
  FileText,
  Upload,
  ChevronDown
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MensajeroDashboard() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<MessengerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'pendiente' | 'en_ruta' | 'entregado' | 'reagendado' | 'devolucion'>('todos');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isDateFiltersOpen, setIsDateFiltersOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [orderComment, setOrderComment] = useState('');
  const [orderNovelty, setOrderNovelty] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Cargando pedidos de Supabase para mensajero:', user?.name);
      
      // Debug: Mostrar nombres de mensajeros en la base de datos
      await debugMensajeros();
      
      // Prueba específica para "Anibal"
      await testBusquedaAnibal();
      
      // Buscar pedidos específicos VT5851 y WS3057
      await buscarPedidosEspecificos();
      
      // Cargar pedidos de Supabase filtrados por mensajero
      const pedidosSupabase = await getPedidosByMensajero(user?.name || '');
      console.log('=== LOG DE PEDIDOS DESPUÉS DE AUTENTICAR ===');
      console.log('Usuario autenticado:', user?.name, '(', user?.email, ')');
      console.log('Rol del usuario:', user?.role);
      console.log('Total de pedidos cargados:', pedidosSupabase.length);
      console.log('Pedidos completos:', pedidosSupabase);
      console.log('=== FIN DEL LOG DE PEDIDOS ===');
      
      // Convertir pedidos de Supabase al formato de la aplicación
      console.log('🔄 Iniciando conversión de pedidos...');
      
      // Debug específico para VT5851 y WS3057
      const pedidosEspecificos = pedidosSupabase.filter(p => 
        p.id_pedido === 'VT5851' || p.id_pedido === 'WS3057'
      );
      console.log('🎯 PEDIDOS ESPECÍFICOS ENCONTRADOS EN SUPABASE:', pedidosEspecificos);
      
      const ordersConverted: Order[] = pedidosSupabase.map((pedido, index) => {
        try {
          // Determinar el estado del pedido basado en los campos disponibles
             let status: OrderStatus = 'pendiente';
             
             // Mapear estados específicos del CSV
             if (pedido.estado_pedido) {
               const estado = pedido.estado_pedido.toLowerCase();
               if (estado === 'entregado') {
                 status = 'entregado';
               } else if (estado === 'devolucion') {
                 status = 'devolucion';
               } else if (estado === 'reagendado' || estado === 'reagendo') {
                 status = 'reagendado';
               } else if (estado === 'en_ruta' || estado === 'en ruta') {
                 status = 'en_ruta';
               } else if (estado === 'pendiente') {
                 status = 'pendiente';
               } else {
                 // Para otros estados, usar lógica de mensajero
                 if (pedido.mensajero_concretado) {
                   status = 'entregado';
                 } else if (pedido.mensajero_asignado) {
                   status = 'en_ruta';
                 }
               }
             } else {
               // Si estado_pedido es null, vacío o empty, usar lógica de mensajero
               if (pedido.mensajero_concretado) {
                 status = 'entregado';
               } else if (pedido.mensajero_asignado) {
                 status = 'en_ruta';
               }
             }

          // Usar la fecha de creación del pedido si está disponible, sino usar la fecha actual
          const createdAt = pedido.fecha_creacion ? 
            new Date(pedido.fecha_creacion).toISOString() : 
            new Date().toISOString();

          // Debug específico para fechas de VT5851 y WS3057
          if (pedido.id_pedido === 'VT5851' || pedido.id_pedido === 'WS3057') {
            console.log('🕐 DEBUG FECHA para', pedido.id_pedido, {
              fecha_creacion_original: pedido.fecha_creacion,
              fecha_creacion_parsed: new Date(pedido.fecha_creacion),
              fecha_creacion_iso: new Date(pedido.fecha_creacion).toISOString(),
              createdAt_final: createdAt
            });
          }

          // Validar campos críticos
          if (!pedido.id_pedido) {
            console.warn(`⚠️ Pedido sin ID en índice ${index}:`, pedido);
          }
          if (pedido.valor_total === null || pedido.valor_total === undefined) {
            console.warn(`⚠️ Pedido sin valor_total en índice ${index}:`, pedido);
          }

        return {
          id: pedido.id_pedido ? `${pedido.id_pedido}-${index}` : `pedido-${index}`,
          customerName: pedido.cliente_nombre || `Cliente ${pedido.id_pedido || index}`,
          customerPhone: pedido.cliente_telefono || '0000-0000',
          customerAddress: pedido.direccion || pedido.distrito || 'Dirección no disponible',
          customerProvince: pedido.provincia || 'San José',
          customerCanton: pedido.canton || 'Central',
          customerDistrict: pedido.distrito || 'Distrito no disponible',
          customerLocationLink: pedido.link_ubicacion || undefined,
          items: [], // Items vacíos por ahora
          productos: pedido.productos || 'Productos no especificados',
          totalAmount: pedido.valor_total ? parseFloat(pedido.valor_total.toString()) : 0,
          status,
          paymentMethod: (() => {
            const metodo = pedido.metodo_pago?.toLowerCase();
            if (metodo === 'sinpe') return 'sinpe' as const;
            if (metodo === 'tarjeta') return 'tarjeta' as const;
            if (metodo === '2pagos' || metodo === '2 pagos') return '2pagos' as const;
            return 'efectivo' as const;
          })(),
          metodoPagoOriginal: pedido.metodo_pago || 'No especificado',
        origin: 'csv' as const,
          createdAt,
          updatedAt: createdAt,
          scheduledDate: pedido.fecha_entrega || undefined,
          deliveryDate: pedido.fecha_entrega || undefined,
        notes: pedido.notas || '',
        deliveryNotes: pedido.nota_asesor || '',
               assignedMessenger: pedido.mensajero_concretado ? {
                 id: '1',
                 name: pedido.mensajero_concretado,
                 email: '',
                 role: 'mensajero' as const,
                 createdAt: new Date().toISOString(),
                 isActive: true
               } : undefined,
        };
        } catch (error) {
          console.error(`❌ Error procesando pedido en índice ${index}:`, error);
          console.error('Pedido problemático:', pedido);
          // Devolver un pedido por defecto en caso de error
          return {
            id: `error-${index}`,
            customerName: 'Error en pedido',
            customerPhone: '0000-0000',
            customerAddress: 'Error',
            customerProvince: 'San José',
            customerCanton: 'Central',
            customerDistrict: 'Error',
            items: [],
            totalAmount: 0,
            status: 'pendiente' as const,
            paymentMethod: 'efectivo' as const,
            origin: 'csv' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: 'Error al procesar pedido',
            deliveryNotes: '',
          };
        }
      });
      
      console.log('✅ Conversión completada. Pedidos convertidos:', ordersConverted.length);
      
      // Debug específico para VT5851 y WS3057 después de la conversión
      const ordersEspecificos = ordersConverted.filter(o => 
        o.id.includes('VT5851') || o.id.includes('WS3057')
      );
      console.log('🎯 PEDIDOS ESPECÍFICOS DESPUÉS DE CONVERSIÓN:', ordersEspecificos);
      console.log('🎯 IDs de pedidos específicos:', ordersEspecificos.map(o => o.id));

      // Calcular estadísticas basadas en los datos de Supabase
      const totalOrders = ordersConverted.length;
      const deliveredOrders = ordersConverted.filter(o => o.status === 'entregado').length;
      const pendingOrders = ordersConverted.filter(o => o.status === 'pendiente').length;
      const inRouteOrders = ordersConverted.filter(o => o.status === 'en_ruta').length;
      const totalRevenue = ordersConverted.reduce((sum, o) => sum + o.totalAmount, 0);
      
      const statsRes: MessengerStats = {
        totalOrders,
        deliveredOrders,
        returnedOrders: 0,
        rescheduledOrders: 0,
        pendingOrders,
        totalCash: totalRevenue,
        totalSinpe: 0,
        deliveryRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
        assignedToday: inRouteOrders,
        completedToday: deliveredOrders,
        pendingToday: pendingOrders,
        inRouteToday: inRouteOrders,
      };
      
      setAllOrders(ordersConverted);
      setStats(statsRes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar pedidos
  const filteredAndSortedOrders = allOrders
    .filter(order => {
      // Debug específico para VT5851 y WS3057
      if (order.id.includes('VT5851') || order.id.includes('WS3057')) {
        console.log('🔍 DEBUGGING PEDIDO ESPECÍFICO:', order.id, {
          status: order.status,
          activeFilter,
          createdAt: order.createdAt,
          selectedDate,
          dateRange,
          dateFilter
        });
      }
      
      // Filtro por estado usando el nuevo sistema de botones
      const statusMatch = activeFilter === 'todos' || order.status === activeFilter;
      
      // Filtro por fecha
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      let dateMatch = true;

      // Si hay un rango de fechas seleccionado, usar ese
      // CORRECCIÓN: Usar zona horaria de Costa Rica para rangos de fechas
      if (dateRange.from && dateRange.to) {
        const fromCostaRica = new Date(dateRange.from.getTime() - (6 * 60 * 60 * 1000));
        const toCostaRica = new Date(dateRange.to.getTime() - (6 * 60 * 60 * 1000));
        const orderDateCostaRica = new Date(orderDate.getTime() - (6 * 60 * 60 * 1000));
        dateMatch = orderDateCostaRica >= fromCostaRica && orderDateCostaRica <= toCostaRica;
        console.log('🔍 FILTRO RANGO - Desde:', fromCostaRica.toDateString(), 'Hasta:', toCostaRica.toDateString(), 'Pedido:', orderDateCostaRica.toDateString(), 'Match:', dateMatch);
      } else if (dateRange.from) {
        const fromCostaRica = new Date(dateRange.from.getTime() - (6 * 60 * 60 * 1000));
        const orderDateCostaRica = new Date(orderDate.getTime() - (6 * 60 * 60 * 1000));
        dateMatch = orderDateCostaRica >= fromCostaRica;
        console.log('🔍 FILTRO DESDE - Desde:', fromCostaRica.toDateString(), 'Pedido:', orderDateCostaRica.toDateString(), 'Match:', dateMatch);
      } else if (dateRange.to) {
        const toCostaRica = new Date(dateRange.to.getTime() - (6 * 60 * 60 * 1000));
        const orderDateCostaRica = new Date(orderDate.getTime() - (6 * 60 * 60 * 1000));
        dateMatch = orderDateCostaRica <= toCostaRica;
        console.log('🔍 FILTRO HASTA - Hasta:', toCostaRica.toDateString(), 'Pedido:', orderDateCostaRica.toDateString(), 'Match:', dateMatch);
      } else if (selectedDate) {
        // Si hay una fecha específica seleccionada, usar esa
        // CORRECCIÓN: Comparar fechas en zona horaria de Costa Rica
        const orderDateCostaRica = new Date(orderDate.getTime() - (6 * 60 * 60 * 1000)); // UTC-6
        const selectedDateCostaRica = new Date(selectedDate.getTime() - (6 * 60 * 60 * 1000)); // UTC-6
        
        console.log('🔍 DEBUGGING FILTRO DE FECHA ESPECÍFICA:');
        console.log('📅 Fecha del pedido (UTC):', orderDate.toISOString());
        console.log('📅 Fecha del pedido (Costa Rica):', orderDateCostaRica.toISOString());
        console.log('📅 Fecha seleccionada (local):', selectedDate.toISOString());
        console.log('📅 Fecha seleccionada (Costa Rica):', selectedDateCostaRica.toISOString());
        console.log('📅 Comparación toDateString:', orderDateCostaRica.toDateString(), '===', selectedDateCostaRica.toDateString());
        
        dateMatch = orderDateCostaRica.toDateString() === selectedDateCostaRica.toDateString();
      } else {
        // Usar el filtro de período si no hay fechas específicas
        // CORRECCIÓN: Usar zona horaria de Costa Rica para todos los filtros
        const nowCostaRica = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // UTC-6
        const orderDateCostaRica = new Date(orderDate.getTime() - (6 * 60 * 60 * 1000)); // UTC-6
        
        switch (dateFilter) {
          case 'today':
            dateMatch = orderDateCostaRica.toDateString() === nowCostaRica.toDateString();
            console.log('🔍 FILTRO HOY - Pedido:', orderDateCostaRica.toDateString(), 'Hoy:', nowCostaRica.toDateString(), 'Match:', dateMatch);
            break;
          case 'yesterday':
            const yesterday = new Date(nowCostaRica.getTime() - 24 * 60 * 60 * 1000);
            dateMatch = orderDateCostaRica.toDateString() === yesterday.toDateString();
            console.log('🔍 FILTRO AYER - Pedido:', orderDateCostaRica.toDateString(), 'Ayer:', yesterday.toDateString(), 'Match:', dateMatch);
            break;
          case 'week':
            const weekAgo = new Date(nowCostaRica.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateMatch = orderDateCostaRica >= weekAgo;
            break;
          case 'lastWeek':
            const twoWeeksAgo = new Date(nowCostaRica.getTime() - 14 * 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(nowCostaRica.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateMatch = orderDateCostaRica >= twoWeeksAgo && orderDateCostaRica < oneWeekAgo;
            break;
          case 'month':
            const monthAgo = new Date(nowCostaRica.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateMatch = orderDateCostaRica >= monthAgo;
            break;
          case 'lastMonth':
            const twoMonthsAgo = new Date(nowCostaRica.getTime() - 60 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(nowCostaRica.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateMatch = orderDateCostaRica >= twoMonthsAgo && orderDateCostaRica < oneMonthAgo;
            break;
          case 'all':
          default:
            dateMatch = true;
            break;
        }
      }
      
      // Filtro por día de la semana
      let dayMatch = true;
      if (dayOfWeekFilter !== 'all') {
        const orderDay = orderDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const dayMap: { [key: string]: number } = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        dayMatch = orderDay === dayMap[dayOfWeekFilter];
      }
      
      // Debug específico para VT5851 y WS3057 - resultado de filtros
      if (order.id.includes('VT5851') || order.id.includes('WS3057')) {
        const searchMatch = searchTerm === '' || 
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          order.customerPhone.includes(searchTerm);
        
        const finalResult = statusMatch && dateMatch && dayMatch && searchMatch;
        
        console.log('🔍 RESULTADO DE FILTROS PARA:', order.id, {
          statusMatch,
          dateMatch,
          dayMatch,
          searchMatch,
          finalResult
        });
      }
      
      
      // Búsqueda por texto
      const searchMatch = searchTerm === '' || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.customerPhone.includes(searchTerm);
      
      return statusMatch && dateMatch && dayMatch && searchMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Debug específico para VT5851 y WS3057 después del filtrado
  const pedidosFiltradosEspecificos = filteredAndSortedOrders.filter(o => 
    o.id.includes('VT5851') || o.id.includes('WS3057')
  );
  console.log('🎯 PEDIDOS ESPECÍFICOS DESPUÉS DEL FILTRADO:', pedidosFiltradosEspecificos);
  console.log('🎯 IDs de pedidos específicos filtrados:', pedidosFiltradosEspecificos.map(o => o.id));
  console.log('🎯 TOTAL PEDIDOS FILTRADOS:', filteredAndSortedOrders.length);

  const updateOrderStatus = async (orderId: string, status: 'en_ruta' | 'entregado' | 'devolucion' | 'reagendado') => {
    try {
      setUpdatingOrder(orderId);
      
      // Actualizar en Supabase
      const updates: Partial<PedidoTest> = {};
      if (status === 'entregado') {
        updates.mensajero_concretado = user?.name || '';
      }
      
      await updatePedido(orderId, updates);
      
      // También actualizar en mock API para mantener consistencia
      await mockApi.updateOrderStatus(orderId, status);
      
      // Recargar datos
      await loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleOrderUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    try {
      setUpdatingOrder(selectedOrder.id);
      
      // Actualizar en Supabase
      const updates: Partial<PedidoTest> = {};
      
      if (newStatus === 'entregado') {
        updates.mensajero_concretado = user?.name || '';
        if (orderComment) {
          updates.notas = orderComment;
        }
      } else if (newStatus === 'en_ruta') {
        updates.mensajero_asignado = user?.name || '';
        if (orderComment) {
          updates.notas = orderComment;
        }
      }
      
      const success = await updatePedido(selectedOrder.id, updates);
      
      if (success) {
        await loadData(); // Recargar datos
        setIsUpdateModalOpen(false);
        setSelectedOrder(null);
        setNewStatus('');
        setOrderComment('');
      }
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'pendiente': return allOrders.filter(o => o.status === 'pendiente').length;
      case 'en_ruta': return allOrders.filter(o => o.status === 'en_ruta').length;
      case 'entregado': return allOrders.filter(o => o.status === 'entregado').length;
      case 'reagendado': return allOrders.filter(o => o.status === 'reagendado').length;
      case 'devolucion': return allOrders.filter(o => o.status === 'devolucion').length;
      default: return allOrders.length;
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(undefined);
    setDateRange({ from: undefined, to: undefined });
    setDateFilter('all');
    setDayOfWeekFilter('all');
  };

  const formatDate = (date: string) => {
    // Si la fecha no tiene hora (solo fecha), agregar hora local para evitar problemas de zona horaria
    const dateObj = new Date(date);
    
    // Si la fecha es solo fecha (sin hora), tratarla como fecha local
    if (date.includes('T00:00:00.000Z') || (!date.includes('T') && !date.includes(' '))) {
      // Es una fecha sin hora, crear una fecha local
      const [year, month, day] = date.split('T')[0].split('-');
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
      return localDate.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return dateObj.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'border-l-blue-500';
      case 'entregado': return 'border-l-green-500';
      case 'devolucion': return 'border-l-red-500';
      case 'reagendado': return 'border-l-orange-500';
      default: return 'border-l-gray-500';
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'bg-blue-500';
      case 'entregado': return 'bg-green-500';
      case 'devolucion': return 'bg-red-500';
      case 'reagendado': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getDateFilterDescription = () => {
    if (selectedDate) {
      return `Fecha: ${selectedDate.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
    }
    
    if (dateRange.from && dateRange.to) {
      return `Rango: ${dateRange.from.toLocaleDateString('es-CR', {
        month: 'short',
        day: 'numeric'
      })} - ${dateRange.to.toLocaleDateString('es-CR', {
        month: 'short',
        day: 'numeric'
      })}`;
    }
    
    if (dateRange.from) {
      return `Desde: ${dateRange.from.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
    }
    
    if (dateRange.to) {
      return `Hasta: ${dateRange.to.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
    }
    
    switch (dateFilter) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'week': return 'Esta semana';
      case 'lastWeek': return 'Semana pasada';
      case 'month': return 'Este mes';
      case 'lastMonth': return 'Mes pasado';
      default: return 'Todo el historial';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-md mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 rounded-xl shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">¡Hola, {user?.name}!</h1>
              <p className="text-sm opacity-90">{allOrders.length} pedidos en tu historial</p>
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">Estado actual</span>
            </div>
            <Badge className="bg-green-500 hover:bg-green-600 mt-1">
              Activo
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-16 bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/dashboard/mensajero/mi-ruta-hoy">
            <div className="flex flex-col items-center gap-1">
              <Route className="w-6 h-6" />
              <span className="text-sm font-medium">Mi Ruta Hoy</span>
            </div>
          </Link>
        </Button>
        <Button asChild className="h-16 bg-green-600 hover:bg-green-700 text-white">
          <Link href="/dashboard/mensajero/comprobante-sinpe">
            <div className="flex flex-col items-center gap-1">
              <CreditCard className="w-6 h-6" />
              <span className="text-sm font-medium">Comprobante SINPE</span>
            </div>
          </Link>
        </Button>
        <Button asChild className="h-16 bg-orange-600 hover:bg-orange-700 text-white">
          <Link href="/dashboard/mensajero/comprobante-reagendado">
            <div className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6" />
              <span className="text-sm font-medium">Reagendado</span>
            </div>
          </Link>
        </Button>
        <Button asChild className="h-16 bg-purple-600 hover:bg-purple-700 text-white">
          <Link href="/dashboard/mensajero/route-history">
            <div className="flex flex-col items-center gap-1">
              <History className="w-6 h-6" />
              <span className="text-sm font-medium">Historial</span>
            </div>
          </Link>
        </Button>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-green-600 font-medium">Completados</p>
                <p className="text-lg font-bold text-green-700">{allOrders.filter(o => o.status === 'entregado').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Efectividad</p>
                <p className="text-lg font-bold text-blue-700">
                  {allOrders.length > 0 ? Math.round((allOrders.filter(o => o.status === 'entregado').length / allOrders.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda Avanzada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Historial de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por ID, cliente, dirección o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros con botones similares a Mi Ruta Hoy */}
          <div className="space-y-3">
            {/* Todos - Ocupa las dos columnas */}
            <Button
              variant={activeFilter === 'todos' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('todos')}
              className={`justify-start gap-2 h-12 w-full ${
                activeFilter === 'todos' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                  : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Todos</span>
                <span className="text-xs opacity-75">({getFilterCount('todos')})</span>
              </div>
            </Button>
            
            {/* Pendiente y En Ruta - Primera fila de dos columnas */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeFilter === 'pendiente' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('pendiente')}
                className={`justify-start gap-2 h-12 ${
                  activeFilter === 'pendiente' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md' 
                    : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Pendiente</span>
                  <span className="text-xs opacity-75">({getFilterCount('pendiente')})</span>
                </div>
              </Button>
              <Button
                variant={activeFilter === 'en_ruta' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('en_ruta')}
                className={`justify-start gap-2 h-12 ${
                  activeFilter === 'en_ruta' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">En Ruta</span>
                  <span className="text-xs opacity-75">({getFilterCount('en_ruta')})</span>
                </div>
              </Button>
            </div>
            
            {/* Entregado y Reagendado - Segunda fila de dos columnas */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeFilter === 'entregado' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('entregado')}
                className={`justify-start gap-2 h-12 ${
                  activeFilter === 'entregado' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                    : 'border-green-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Entregado</span>
                  <span className="text-xs opacity-75">({getFilterCount('entregado')})</span>
                </div>
              </Button>
              <Button
                variant={activeFilter === 'reagendado' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('reagendado')}
                className={`justify-start gap-2 h-12 ${
                  activeFilter === 'reagendado' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md' 
                    : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Reagendado</span>
                  <span className="text-xs opacity-75">({getFilterCount('reagendado')})</span>
                </div>
              </Button>
            </div>
            
            {/* Devolución - Ocupa las dos columnas */}
            <Button
              variant={activeFilter === 'devolucion' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('devolucion')}
              className={`justify-start gap-2 h-12 w-full ${
                activeFilter === 'devolucion' 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' 
                  : 'border-red-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Devolución</span>
                <span className="text-xs opacity-75">({getFilterCount('devolucion')})</span>
              </div>
            </Button>
          </div>

          {/* Filtros de fecha reorganizados */}
          <div className="space-y-4">
            {/* Filtros de fecha específica y rango */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fecha específica */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Fecha específica</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          selectedDate.toLocaleDateString('es-CR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          "Seleccionar fecha"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setDateFilter('all');
                          setDateRange({ from: undefined, to: undefined });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Rango de fechas */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Rango de fechas</Label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-10 text-xs",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          {dateRange.from ? (
                            dateRange.from.toLocaleDateString('es-CR', {
                              month: 'short',
                              day: 'numeric'
                            })
                          ) : (
                            "Desde"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => {
                            setDateRange(prev => ({ ...prev, from: date }));
                            setSelectedDate(undefined);
                            setDateFilter('all');
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-10 text-xs",
                            !dateRange.to && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          {dateRange.to ? (
                            dateRange.to.toLocaleDateString('es-CR', {
                              month: 'short',
                              day: 'numeric'
                            })
                          ) : (
                            "Hasta"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => {
                            setDateRange(prev => ({ ...prev, to: date }));
                            setSelectedDate(undefined);
                            setDateFilter('all');
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible para filtros rápidos */}
            <Collapsible open={isDateFiltersOpen} onOpenChange={setIsDateFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-normal"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Filtros rápidos</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isDateFiltersOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('today');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Hoy
                  </Button>
                  <Button
                    variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('yesterday');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Ayer
                  </Button>
                  <Button
                    variant={dateFilter === 'week' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('week');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Esta semana
                  </Button>
                  <Button
                    variant={dateFilter === 'lastWeek' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('lastWeek');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Semana pasada
                  </Button>
                  <Button
                    variant={dateFilter === 'month' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('month');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Este mes
                  </Button>
                  <Button
                    variant={dateFilter === 'lastMonth' ? 'default' : 'outline'}
                    onClick={() => {
                      setDateFilter('lastMonth');
                      setSelectedDate(undefined);
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="h-10 text-sm"
                  >
                    Mes pasado
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible para filtros avanzados */}
            <Collapsible open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-normal"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Filtros avanzados</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isAdvancedFiltersOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Filtro por día de la semana */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Día de la semana</Label>
                    <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los días" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los días</SelectItem>
                        <SelectItem value="monday">Lunes</SelectItem>
                        <SelectItem value="tuesday">Martes</SelectItem>
                        <SelectItem value="wednesday">Miércoles</SelectItem>
                        <SelectItem value="thursday">Jueves</SelectItem>
                        <SelectItem value="friday">Viernes</SelectItem>
                        <SelectItem value="saturday">Sábado</SelectItem>
                        <SelectItem value="sunday">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenamiento */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Ordenar por</Label>
                    <Select value={sortBy} onValueChange={(value: 'date' | 'status' | 'amount') => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Fecha</SelectItem>
                        <SelectItem value="status">Estado</SelectItem>
                        <SelectItem value="amount">Monto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Orden</Label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Orden" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Más reciente primero</SelectItem>
                        <SelectItem value="asc">Más antiguo primero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Botón para limpiar filtros de fecha */}
            {(selectedDate || dateRange.from || dateRange.to || dateFilter !== 'all' || dayOfWeekFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateFilter}
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Limpiar filtros de fecha
              </Button>
            )}
          </div>

          {/* Resumen de resultados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {filteredAndSortedOrders.length} de {allOrders.length} pedidos
              </span>
            </div>
            
            {/* Indicador de filtros activos */}
            {(selectedDate || dateRange.from || dateRange.to || dateFilter !== 'all' || dayOfWeekFilter !== 'all') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Filtros activos:</span>
                  <span>{getDateFilterDescription()}</span>
                </div>
                {dayOfWeekFilter !== 'all' && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Filtro adicional:</span>
                    <span className="capitalize">
                      {dayOfWeekFilter === 'monday' ? 'Lunes' : 
                       dayOfWeekFilter === 'tuesday' ? 'Martes' :
                       dayOfWeekFilter === 'wednesday' ? 'Miércoles' :
                       dayOfWeekFilter === 'thursday' ? 'Jueves' :
                       dayOfWeekFilter === 'friday' ? 'Viernes' :
                       dayOfWeekFilter === 'saturday' ? 'Sábado' :
                       dayOfWeekFilter === 'sunday' ? 'Domingo' : dayOfWeekFilter}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Mis Pedidos
          </CardTitle>
          <div className="text-sm text-gray-600 mt-1">
            <span className="font-medium">{user?.name}</span> • Historial completo de pedidos
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAndSortedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                {searchTerm || activeFilter !== 'todos' || dateFilter !== 'all' || selectedDate || dateRange.from || dateRange.to || dayOfWeekFilter !== 'all'
                  ? 'No se encontraron pedidos con esos criterios' 
                  : 'No hay pedidos en el historial'
                }
              </p>
              {(searchTerm || activeFilter !== 'todos' || dateFilter !== 'all' || selectedDate || dateRange.from || dateRange.to || dayOfWeekFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveFilter('todos');
                    setDateFilter('all');
                    setSelectedDate(undefined);
                    setDateRange({ from: undefined, to: undefined });
                    setDayOfWeekFilter('all');
                  }}
                  className="mt-2"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            filteredAndSortedOrders.map((order, index) => (
              <div key={order.id} className={`border rounded-lg p-4 bg-white shadow-sm border-l-4 ${getStatusBorderColor(order.status)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${getStatusIndicatorColor(order.status)}`} />
                      <span className="text-2xl font-bold text-gray-700">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{order.id}</h3>
                      {order.company?.name && (
                        <Badge variant="secondary" className="text-xs mt-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {order.company.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{order.productos || 'No especificados'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Building2 className="w-3 h-3" />
                    <span>{order.customerProvince} • {order.customerCanton} • {order.customerDistrict}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {order.paymentMethod === '2pagos' ? '💰 2 Pagos' : (order.metodoPagoOriginal || 'No especificado').charAt(0).toUpperCase() + (order.metodoPagoOriginal || 'No especificado').slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  {order.notes && (
                    <div className="flex items-start gap-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded border-l-2 border-yellow-200">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{order.notes}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => order.customerPhone && window.open(`tel:${order.customerPhone}`)}
                    className="h-12 text-xs bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 text-green-700 font-medium transition-all duration-200"
                    disabled={!order.customerPhone}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Llamar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (order.customerPhone) {
                        // Crear mensaje personalizado
                        const messengerName = user?.name || 'Mensajero';
                        const companyName = order.company?.name || 'Empresa';
                        const products = order.items.map(item => `${item.quantity}x ${item.product?.name || 'Producto'}`).join(', ');
                        const orderNumber = order.id;
                        
                        const message = `¡Hola! Soy ${messengerName} de ${companyName}. 

Tengo su pedido ${orderNumber} listo para entregar:
${products}

Total: ${formatCurrency(order.totalAmount)}

¿En qué momento le conviene recibir su pedido?`;

                        // Limpiar el número de teléfono para WhatsApp
                        let cleanPhone = order.customerPhone.replace(/\D/g, '');
                        // Remover 506 del inicio si está presente
                        cleanPhone = cleanPhone.replace(/^506/, '');
                        // Asegurar que el número tenga el formato correcto para WhatsApp
                        const whatsappPhone = `506${cleanPhone}`;
                        
                        const encodedMessage = encodeURIComponent(message);
                        const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
                        window.open(whatsappUrl);
                      }
                    }}
                    className="h-12 text-xs bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-700 font-medium transition-all duration-200"
                    disabled={!order.customerPhone}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">WhatsApp</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (order.customerLocationLink) {
                        window.open(order.customerLocationLink, '_blank');
                      } else if (order.deliveryAddress) {
                        const encodedAddress = encodeURIComponent(order.deliveryAddress);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
                      }
                    }}
                    className="h-12 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 font-medium transition-all duration-200"
                    disabled={!order.customerLocationLink && !order.deliveryAddress}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Ubicación</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Aquí podrías agregar funcionalidad para ver notas
                      console.log('Ver notas del pedido:', order.id);
                    }}
                    className="h-12 text-xs bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300 text-yellow-700 font-medium transition-all duration-200"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Notas</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Aquí podrías agregar funcionalidad para ver timeline
                      console.log('Ver timeline del pedido:', order.id);
                    }}
                    className="h-12 text-xs bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 text-purple-700 font-medium transition-all duration-200"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Timeline</span>
                  </Button>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(order);
                      setNewStatus(order.status);
                      setIsUpdateModalOpen(true);
                    }}
                    className="w-full h-12 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 text-blue-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                    disabled={updatingOrder === order.id}
                  >
                    {updatingOrder === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Edit3 className="w-4 h-4 mr-2" />
                    )}
                    <span>Actualizar Estado</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal para actualizar pedido */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Pedido: {selectedOrder.id}</p>
                <p className="text-sm text-gray-600">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-600">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              
              <div className="space-y-3">
                <Label>Nuevo Estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_ruta">En Ruta</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                    <SelectItem value="reagendado">Reagendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Comentarios (opcional)</Label>
                <Textarea
                  placeholder="Añadir comentarios sobre el pedido..."
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedOrder(null);
                    setNewStatus('');
                    setOrderComment('');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleOrderUpdate}
                  disabled={!newStatus || updatingOrder === selectedOrder.id}
                  className="flex-1"
                >
                  {updatingOrder === selectedOrder.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Actualizar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}