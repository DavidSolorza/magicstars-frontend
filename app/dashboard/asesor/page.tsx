'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Lazy load Calendar
const CalendarComponent = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  { ssr: false }
);
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { mockApi } from '@/lib/mock-api';

import { Order, Stats } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { mockMessengers } from '@/lib/mock-messengers';
import { 
  Plus,
  Upload,
  Download,
  Loader2,
  Package,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  Truck,
  Search,
  Filter,
  MapPin,
  Phone,
  User,
  Calendar,
  FileText,
  Edit3,
  MessageSquare,
  X,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Edit,
  Save,
  Trash2,
  CheckSquare,
  Square,
  MoreHorizontal,
  Copy,
  Clipboard,
  ClipboardPaste,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ProductosSelector } from '@/components/dashboard/productos-selector';
import { ProductoInventario, obtenerTodosProductosALLSTARS } from '@/lib/supabase-inventario';
import { UnmappedProductsManager } from '@/components/dashboard/unmapped-products-manager';
import { getProvincias, getCantones, getDistritos, getTipoEnvio } from '@/lib/zonas';
import { createPedidoPreconfirmacion, updatePedidoPreconfirmacion, getPedidosDelDiaByTiendaPreconfirmacion, getAllPedidosByTiendaPreconfirmacion, getPedidosCountByTiendaPreconfirmacion, getTotalPedidosPreconfirmacionCount } from '@/lib/supabase-pedidos';
import { API_URLS } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { DialogDescription } from '@/components/ui/dialog';
import { PedidoForm, type PedidoFormData } from '@/components/dashboard/pedido-form';

// Interfaces para datos de gráficos
interface PaymentMethodData {
  name: string;
  value: number;
  amount: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export default function AsesorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [asesorTienda, setAsesorTienda] = useState<string>('');
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  // Filtros de fecha y mensajero
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDateRange, setSelectedDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({from: undefined, to: undefined});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedMessenger, setSelectedMessenger] = useState<string>('all');
  const [selectedConfirmation, setSelectedConfirmation] = useState<string>('all'); // 'all', 'confirmed', 'unconfirmed'
  
  // Conteos de registros
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [filteredRecords, setFilteredRecords] = useState<number>(0);
  
  // Estados para edición masiva
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [editingOrders, setEditingOrders] = useState<Map<string, Partial<Order>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edición individual de pedido
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'confirm'>('view'); // 'view' o 'confirm'
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [editData, setEditData] = useState<{ confirmado: 'true' | 'false'; nota_asesor: string; numero_sinpe: string } | null>(null);
  
  // Modal de Maps (solo sección Adicional)
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [orderForMaps, setOrderForMaps] = useState<Order | null>(null);
  const [mapsFormData, setMapsFormData] = useState<{ link_ubicacion: string; nota_asesor: string }>({
    link_ubicacion: '',
    nota_asesor: '',
  });
  const [isSavingMaps, setIsSavingMaps] = useState(false);
  // Crear pedido
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState<{ nombre: string; stock: number; cantidad: number }[]>([]);
  const [productosSeleccionadosEdit, setProductosSeleccionadosEdit] = useState<{ nombre: string; stock: number; cantidad: number }[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoInventario[]>([]);
  const [newOrder, setNewOrder] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    direccion: '',
    provincia: '',
    canton: '',
    distrito: '',
    valor_total: '',
    productos: '',
    link_ubicacion: '',
    nota_asesor: '',
    confirmado: 'false',
    tipo_envio: '',
  } as any);
  const [editOrder, setEditOrder] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    direccion: '',
    provincia: '',
    canton: '',
    distrito: '',
    valor_total: '',
    productos: '',
    link_ubicacion: '',
    nota_asesor: '',
    confirmado: 'false',
    tipo_envio: '',
  } as any);

  // Obtener mensajeros del mock-messengers
  const availableMessengers = mockMessengers.filter(user => 
    user.role === 'mensajero' || user.role === 'mensajero-lider'
  );

  // Asesores de Beauty Fan y All Stars
  const asesores = [
    { id: '1', name: 'Ana García', store: 'BEAUTY FAN', email: 'ana@beautyfan.com' },
    { id: '2', name: 'Carlos López', store: 'BEAUTY FAN', email: 'carlos@beautyfan.com' },
    { id: '3', name: 'María Rodríguez', store: 'ALL STARS', email: 'maria@allstars.com' },
    { id: '4', name: 'José Martínez', store: 'ALL STARS', email: 'jose@allstars.com' },
    { id: '5', name: 'Laura Sánchez', store: 'BEAUTY FAN', email: 'laura@beautyfan.com' },
    { id: '6', name: 'Roberto Vega', store: 'ALL STARS', email: 'roberto@allstars.com' },
  ];

  // Función para determinar la tienda del asesor basada en su email
  const getAsesorTienda = (email: string): string => {
    if (email.includes('allstars')) return 'ALL STARS';
    if (email.includes('beautyfan')) return 'BEAUTY FAN';
    return 'ALL STARS'; // Default
  };

  // Función helper para obtener la fecha actual en zona horaria de Costa Rica
  const getCostaRicaDate = () => {
    const now = new Date();
    const costaRicaOffset = -6 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const costaRicaTime = new Date(utc + (costaRicaOffset * 60000));
    return costaRicaTime;
  };

  // Función helper para obtener la fecha ISO en zona horaria de Costa Rica
  const getCostaRicaDateISO = () => {
    const costaRicaDate = getCostaRicaDate();
    const year = costaRicaDate.getFullYear();
    const month = String(costaRicaDate.getMonth() + 1).padStart(2, '0');
    const day = String(costaRicaDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    return isoDate;
  };

  // Cargar productos disponibles
  useEffect(() => {
    const loadProductos = async () => {
      try {
        const productos = await obtenerTodosProductosALLSTARS();
        setProductosDisponibles(productos);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    loadProductos();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, dateFilter, selectedDate, selectedDateRange, selectedMonth]);

  useEffect(() => {
    let filtered = orders;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.customerAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por tienda (solo la tienda del asesor)
    if (selectedStore !== 'all' && asesorTienda) {
      filtered = filtered.filter(order => order.tienda === selectedStore);
    }

    // Filtrar por mensajero
    if (selectedMessenger !== 'all') {
      filtered = filtered.filter(order => 
        order.assignedMessenger?.name?.toLowerCase().includes(selectedMessenger.toLowerCase())
      );
    }

    // Filtrar por estado de confirmación
    if (selectedConfirmation === 'confirmed') {
      filtered = filtered.filter(order => (order as any).confirmado === true);
    } else if (selectedConfirmation === 'unconfirmed') {
      filtered = filtered.filter(order => !(order as any).confirmado || (order as any).confirmado === false);
    }

    setFilteredOrders(filtered);
    setFilteredRecords(filtered.length);
    setCurrentPage(1); // Reset paginación cuando cambian los filtros
  }, [orders, searchTerm, selectedStore, selectedMessenger, selectedConfirmation, asesorTienda]);

  const loadData = async () => {
    console.log('🔍 Cargando datos para asesor:', user);
    if (!user?.companyId) {
      console.log('❌ No hay companyId en el usuario');
      return;
    }
    
    try {
      setLoading(true);
      
      // Determinar la tienda del asesor
      const asesorTienda = (user.companyId || getAsesorTienda(user.email)).toUpperCase();
      setAsesorTienda(asesorTienda);
      console.log('🏪 Tienda del asesor:', asesorTienda);
      
      // Determinar la fecha objetivo basada en el filtro activo
      let targetDateISO: string | null = null;
      
      if (selectedDate) {
        // Si hay una fecha específica seleccionada, usar esa
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        targetDateISO = `${year}-${month}-${day}`;
        console.log('📅 Usando selectedDate:', targetDateISO);
      } else if (selectedDateRange.from && selectedDateRange.to) {
        // Si hay un rango de fechas seleccionado, usar el rango
        targetDateISO = null; // Se manejará en la consulta
        console.log('📅 Usando rango de fechas:', selectedDateRange);
      } else if (selectedMonth) {
        // Si hay un mes seleccionado, usar ese mes
        targetDateISO = null; // Se manejará en la consulta
        console.log('📅 Usando mes seleccionado:', selectedMonth);
      } else {
        // Usar el filtro de período por defecto con zona horaria de Costa Rica
        const costaRicaNow = getCostaRicaDate();
        switch (dateFilter) {
          case 'today':
            targetDateISO = getCostaRicaDateISO();
            console.log('📅 Filtro TODAY (Costa Rica):', targetDateISO);
            break;
          case 'yesterday':
            const yesterday = new Date(costaRicaNow);
            yesterday.setDate(yesterday.getDate() - 1);
            targetDateISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            console.log('📅 Filtro YESTERDAY (Costa Rica):', targetDateISO);
            break;
          case 'thisWeek':
            targetDateISO = getCostaRicaDateISO();
            console.log('📅 Filtro THIS WEEK (Costa Rica):', targetDateISO);
            break;
          case 'thisMonth':
            targetDateISO = getCostaRicaDateISO();
            console.log('📅 Filtro THIS MONTH (Costa Rica):', targetDateISO);
            break;
          case 'all':
          default:
            targetDateISO = null; // Mostrar todos los pedidos
            console.log('📅 Filtro ALL - Mostrando todos los pedidos');
            break;
        }
      }

      // Obtener conteos de registros de pedidos_preconfirmacion
      console.log('🔢 Obteniendo conteos de registros de pedidos_preconfirmacion...');
      const [totalCount, filteredCount] = await Promise.all([
        getTotalPedidosPreconfirmacionCount(),
        getPedidosCountByTiendaPreconfirmacion(asesorTienda, targetDateISO || undefined)
      ]);
      
      setTotalRecords(totalCount);
      setFilteredRecords(filteredCount);
      
      console.log(`📊 Total de registros en BD (preconfirmacion): ${totalCount}`);
      console.log(`📊 Registros filtrados (${asesorTienda}, ${targetDateISO}): ${filteredCount}`);

      // Obtener pedidos de pedidos_preconfirmacion filtrados por tienda y fecha
      console.log('🔍 [PRECONFIRMACION] Buscando pedidos para tienda:', asesorTienda, 'fecha:', targetDateISO);
      let ordersRes: any[] = [];
      
      if (targetDateISO) {
        // Filtro por fecha específica
        ordersRes = await getPedidosDelDiaByTiendaPreconfirmacion(asesorTienda, targetDateISO);
      } else if (selectedDateRange.from && selectedDateRange.to) {
        // Filtro por rango de fechas - obtener todos y filtrar manualmente
        const allOrders = await getAllPedidosByTiendaPreconfirmacion(asesorTienda);
        const fromDate = selectedDateRange.from.toISOString().split('T')[0];
        const toDate = selectedDateRange.to.toISOString().split('T')[0];
        ordersRes = allOrders.filter((pedido: any) => {
          const fechaPedido = pedido.fecha_creacion?.split('T')[0] || pedido.fecha_creacion;
          return fechaPedido >= fromDate && fechaPedido <= toDate;
        });
      } else if (selectedMonth) {
        // Filtro por mes - obtener todos y filtrar manualmente
        const allOrders = await getAllPedidosByTiendaPreconfirmacion(asesorTienda);
        ordersRes = allOrders.filter((pedido: any) => {
          const fechaPedido = pedido.fecha_creacion?.split('T')[0] || pedido.fecha_creacion;
          return fechaPedido?.startsWith(selectedMonth);
        });
      } else {
        // Mostrar todos los pedidos
        ordersRes = await getAllPedidosByTiendaPreconfirmacion(asesorTienda);
      }
      
      console.log('✅ [PRECONFIRMACION] Pedidos obtenidos:', ordersRes.length);
      console.log('📋 Primeros pedidos:', ordersRes.slice(0, 3));
      
      // Obtener estadísticas mock
      const statsRes = await mockApi.getStats({ userCompanyId: user.companyId });
      
      console.log('✅ Datos obtenidos:', { orders: ordersRes.length, stats: statsRes });
      
      // Asignar mensajeros y asesor a los pedidos
      const ordersWithStoreAndMessenger = ordersRes.map((pedido: any, index: number) => {
        const order = {
          id: pedido.id_pedido,
          customerName: pedido.cliente_nombre,
          customerPhone: pedido.cliente_telefono,
          customerAddress: pedido.direccion,
          customerProvince: pedido.provincia || '',
          customerCanton: pedido.canton || '',
          customerDistrict: pedido.distrito || '',
          totalAmount: pedido.valor_total,
          productos: pedido.productos || '',
          status: 'pendiente' as any, // Los pedidos preconfirmación no tienen estado_pedido
          paymentMethod: 'efectivo' as any, // Los pedidos preconfirmación no tienen metodo_pago
          origin: 'preconfirmacion' as any,
          deliveryMethod: pedido.tipo_envio === 'RED LOGISTIC' ? 'red_logistic' : 'mensajeria_propia' as any,
          createdAt: pedido.fecha_creacion,
          updatedAt: pedido.fecha_creacion,
          scheduledDate: undefined,
          deliveryDate: undefined,
          customerLocationLink: pedido.link_ubicacion || undefined,
          notes: undefined,
          asesorNotes: pedido.nota_asesor || undefined,
          numero_sinpe: pedido.numero_sinpe || undefined,
          confirmado: pedido.confirmado || false,
          fecha_creacion: pedido.fecha_creacion,
          link_ubicacion: pedido.link_ubicacion || undefined,
          tipo_envio: pedido.tipo_envio || undefined,
          tienda: asesorTienda,
          assignedMessenger: availableMessengers[index % availableMessengers.length],
          asesor: asesores.find(a => a.store === asesorTienda) || asesores[0],
          items: [], // Array vacío para compatibilidad con Order interface
          // Mantener también los campos originales para acceso directo
          provincia: pedido.provincia || '',
          canton: pedido.canton || '',
          distrito: pedido.distrito || '',
        } as any;
        
        // Log para debugging
        if (!pedido.provincia || !pedido.productos) {
          console.log('⚠️ [DATA LOAD] Pedido sin provincia o productos:', {
            id: pedido.id_pedido,
            provincia: pedido.provincia,
            productos: pedido.productos,
            pedidoCompleto: pedido
          });
        }
        
        return order;
      });

      // Ordenar por fecha de creación (más reciente primero)
      const sortedOrders = ordersWithStoreAndMessenger.sort((a: any, b: any) => {
        // Ordenar por fecha de creación (más reciente primero)
        const fechaA = new Date(a.fecha_creacion || a.createdAt || 0).getTime();
        const fechaB = new Date(b.fecha_creacion || b.createdAt || 0).getTime();
        
        // Si las fechas son diferentes, ordenar por fecha descendente (más reciente primero)
        if (fechaA !== fechaB) {
          return fechaB - fechaA; // Descendente
        }
        
        // Si las fechas son iguales, mantener el orden original o por ID
        return (b.id || '').localeCompare(a.id || '');
      });

      setOrders(sortedOrders);
      setStats(statsRes);
      console.log('✅ Datos cargados exitosamente:', { orders: sortedOrders.length, stats: statsRes });
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Finalizando carga de datos');
    }
  };

  
  // Calcular paginación
  const paginatedOrders = useMemo(() => {
    const itemsPerPage = 50;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);
  
  const totalPages = Math.ceil(filteredOrders.length / 50);
  
  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusRowColor = (status: string) => {
    switch (status) {
      case 'entregado':
        return 'bg-green-50 border-l-8 border-green-500';
      case 'en_ruta':
        return 'bg-blue-50 border-l-8 border-blue-500';
      case 'devolucion':
        return 'bg-red-50 border-l-8 border-red-500';
      case 'reagendado':
        return 'bg-orange-50 border-l-8 border-orange-500';
      default:
        return 'bg-gray-50 border-l-8 border-gray-500';
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case 'entregado':
        return 'bg-green-500';
      case 'en_ruta':
        return 'bg-blue-500';
      case 'devolucion':
        return 'bg-red-500';
      case 'reagendado':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedOrderForDetails(null);
    setIsDetailsModalOpen(false);
  };

  const handleAddNote = async () => {
    if (!selectedOrderForDetails || !newNote.trim()) return;
    
    setIsAddingNote(true);
    
    // Simular guardado de nota
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Actualizar el pedido con la nueva nota
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === selectedOrderForDetails.id
          ? { ...order, notes: (order.notes || '') + '\n' + newNote }
          : order
      )
    );
    
    setNewNote('');
    setIsAddingNote(false);
  };

  // Funciones para datos de gráficos
  const getPaymentMethodData = (): PaymentMethodData[] => {
    const completedOrders = filteredOrders.filter(order => order.status === 'entregado');
    const paymentMethods = completedOrders.reduce((acc, order) => {
      const method = order.paymentMethod || 'otro';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(paymentMethods).map(([method, count]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: count,
      amount: completedOrders
        .filter(order => (order.paymentMethod || 'otro') === method)
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    }));
  };

  const getStatusData = (): StatusData[] => {
    const statusCounts = {
      'entregado': filteredOrders.filter(order => order.status === 'entregado').length,
      'reagendado': filteredOrders.filter(order => order.status === 'reagendado').length,
      'devolucion': filteredOrders.filter(order => order.status === 'devolucion').length,
      'en_ruta': filteredOrders.filter(order => order.status === 'en_ruta').length,
      'pendiente': filteredOrders.filter(order => order.status === 'pendiente').length
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count,
      color: getStatusColor(status)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregado': return '#10b981';
      case 'reagendado': return '#f59e0b';
      case 'devolucion': return '#ef4444';
      case 'en_ruta': return '#3b82f6';
      case 'pendiente': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Funciones para edición masiva
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedOrders(new Set());
      setEditingOrders(new Map());
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    }
  };

  const updateOrderField = (orderId: string, field: keyof Order, value: any) => {
    const newEditingOrders = new Map(editingOrders);
    const currentEdit = newEditingOrders.get(orderId) || {};
    newEditingOrders.set(orderId, { ...currentEdit, [field]: value });
    setEditingOrders(newEditingOrders);
  };

  const getOrderValue = (order: Order, field: keyof Order) => {
    const editData = editingOrders.get(order.id);
    return editData?.[field] ?? order[field];
  };

  const saveOrderChanges = async (orderId: string) => {
    const editData = editingOrders.get(orderId);
    if (!editData) return;

    setIsSaving(true);
    try {
      // Simular guardado en backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar el pedido en el estado local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, ...editData } : order
        )
      );
      
      // Remover de edición
      const newEditingOrders = new Map(editingOrders);
      newEditingOrders.delete(orderId);
      setEditingOrders(newEditingOrders);
      
      console.log('✅ Pedido guardado:', orderId, editData);
    } catch (error) {
      console.error('❌ Error guardando pedido:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      // Simular guardado masivo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar todos los pedidos editados
      setOrders(prevOrders => 
        prevOrders.map(order => {
          const editData = editingOrders.get(order.id);
          return editData ? { ...order, ...editData } : order;
        })
      );
      
      // Limpiar ediciones
      setEditingOrders(new Map());
      setSelectedOrders(new Set());
      
      console.log('✅ Todos los cambios guardados');
    } catch (error) {
      console.error('❌ Error guardando cambios:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyBulkEdit = () => {
    if (!bulkEditField || !bulkEditValue) return;
    
    const newEditingOrders = new Map(editingOrders);
    
    selectedOrders.forEach(orderId => {
      const currentEdit = newEditingOrders.get(orderId) || {};
      newEditingOrders.set(orderId, { ...currentEdit, [bulkEditField]: bulkEditValue });
    });
    
    setEditingOrders(newEditingOrders);
    setShowBulkEditModal(false);
    setBulkEditField('');
    setBulkEditValue('');
  };

  const cancelEdit = (orderId: string) => {
    const newEditingOrders = new Map(editingOrders);
    newEditingOrders.delete(orderId);
    setEditingOrders(newEditingOrders);
  };

  const isOrderBeingEdited = (orderId: string) => {
    return editingOrders.has(orderId);
  };

  const hasUnsavedChanges = () => {
    return editingOrders.size > 0;
  };

  // Función helper para verificar si un campo existe y no es null/undefined
  const has = (obj: any, key: string): boolean => {
    return obj && obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined;
  };

  // Función para enviar datos al webhook
  const enviarAlWebhook = async (pedidoData: any, isEdit: boolean = false) => {
    try {
      const src = pedidoData;
      const webhookData = {
        id_pedido: has(src, 'id_pedido') ? src.id_pedido : null,
        fecha_creacion: has(src, 'fecha_creacion') ? src.fecha_creacion : null,
        cliente_nombre: has(src, 'cliente_nombre') ? src.cliente_nombre : null,
        cliente_telefono: has(src, 'cliente_telefono') ? src.cliente_telefono : null,
        direccion: has(src, 'direccion') ? src.direccion : null,
        provincia: has(src, 'provincia') ? src.provincia : null,
        canton: has(src, 'canton') ? src.canton : null,
        distrito: has(src, 'distrito') ? src.distrito : null,
        valor_total: has(src, 'valor_total') ? src.valor_total : null,
        productos: has(src, 'productos') ? src.productos : null,
        link_ubicacion: has(src, 'link_ubicacion') ? src.link_ubicacion : null,
        nota_asesor: has(src, 'nota_asesor') ? src.nota_asesor : null,
        confirmado: has(src, 'confirmado') ? src.confirmado : false,
        usuario: has(src, 'usuario') ? src.usuario : (user?.name || user?.email || null),
      };

      console.log('📤 Enviando al webhook:', webhookData);

      const response = await fetch(API_URLS.ADD_EDIT_CONFIRM_PEDIDO_ASESOR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        console.error('❌ Error al enviar al webhook:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error al enviar al webhook:', error);
      return false;
    }
  };

  // Función para abrir modal de confirmar
  const handleConfirmOrder = (order: Order) => {
    setOrderToView(order);
    setViewMode('confirm');
    setShowViewModal(true);
  };

  // Función para confirmar pedido
  const confirmarPedido = async () => {
    if (!orderToView) return;
    
    setIsConfirming(true);
    try {
      const updates = {
        confirmado: true,
      };
      
      const ok = await updatePedidoPreconfirmacion(orderToView.id, updates);
      
      if (ok) {
        // Enviar al webhook
        const pedidoActualizado = orders.find(o => o.id === orderToView.id);
        if (pedidoActualizado) {
          await enviarAlWebhook({
            id_pedido: pedidoActualizado.id,
            fecha_creacion: (pedidoActualizado as any).fecha_creacion || pedidoActualizado.createdAt,
            cliente_nombre: pedidoActualizado.customerName,
            cliente_telefono: pedidoActualizado.customerPhone,
            direccion: pedidoActualizado.customerAddress,
            provincia: pedidoActualizado.customerProvince,
            canton: pedidoActualizado.customerCanton,
            distrito: pedidoActualizado.customerDistrict,
            valor_total: pedidoActualizado.totalAmount,
            productos: (pedidoActualizado as any).productos,
            link_ubicacion: (pedidoActualizado as any).link_ubicacion,
            nota_asesor: (pedidoActualizado as any).nota_asesor || pedidoActualizado.asesorNotes,
            confirmado: true,
            usuario: user?.name || user?.email || null,
          }, true);
        }
        
        toast({
          title: '✅ Pedido confirmado exitosamente',
          description: `El pedido ${orderToView.id} ha sido confirmado`,
          variant: 'default',
        });
        
        setShowViewModal(false);
        setOrderToView(null);
        await loadData();
      } else {
        toast({
          title: '❌ Error al confirmar pedido',
          description: 'Ocurrió un error al confirmar el pedido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al confirmar pedido:', error);
      toast({
        title: '❌ Error al confirmar pedido',
        description: 'Ocurrió un error al confirmar el pedido',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Función para parsear productos con stock del inventario
  const parsearProductosConStock = (productosStr: string): { nombre: string; stock: number; cantidad: number }[] => {
    const productosParsed: { nombre: string; stock: number; cantidad: number }[] = [];
    if (productosStr && productosDisponibles.length > 0) {
      const productosArray = productosStr.split(',').map((p: string) => p.trim());
      productosArray.forEach((prod: string) => {
        const match = prod.match(/(.+?)\s*x(\d+)/);
        if (match) {
          const nombreProducto = match[1].trim();
          // Buscar el producto en productosDisponibles para obtener el stock real
          const productoDisponible = productosDisponibles.find(p => 
            p.producto.toLowerCase().trim() === nombreProducto.toLowerCase().trim()
          );
          productosParsed.push({
            nombre: nombreProducto,
            cantidad: parseInt(match[2]),
            stock: productoDisponible?.cantidad || 0, // Obtener stock real del inventario (cantidad)
          });
        }
      });
    }
    return productosParsed;
  };

  // Función para abrir modal de editar
  const openEditModalFor = (order: Order) => {
    console.log('🔍 [EDIT MODAL] Datos del pedido completo:', order);
    console.log('🔍 [EDIT MODAL] customerProvince:', order.customerProvince);
    console.log('🔍 [EDIT MODAL] customerCanton:', order.customerCanton);
    console.log('🔍 [EDIT MODAL] customerDistrict:', order.customerDistrict);
    console.log('🔍 [EDIT MODAL] productos:', (order as any).productos);
    
    setOrderToEdit(order);
    
    // Obtener datos directamente del objeto order y también de los campos originales
    const orderData = order as any;
    
    // Obtener provincia, canton y distrito de múltiples fuentes posibles
    const provincia = order.customerProvince || orderData.provincia || '';
    const canton = order.customerCanton || orderData.canton || '';
    const distrito = order.customerDistrict || orderData.distrito || '';
    const productos = orderData.productos || '';
    
    console.log('🔍 [EDIT MODAL] Valores extraídos:', { provincia, canton, distrito, productos });
    
    // Convertir Order a PedidoFormData - asegurarse de obtener todos los campos
    const formData: PedidoFormData = {
      cliente_nombre: order.customerName || '',
      cliente_telefono: order.customerPhone || '',
      direccion: order.customerAddress || '',
      provincia: provincia,
      canton: canton,
      distrito: distrito,
      valor_total: String(order.totalAmount || ''),
      productos: productos,
      link_ubicacion: orderData.link_ubicacion || order.customerLocationLink || '',
      nota_asesor: orderData.nota_asesor || order.asesorNotes || '',
      confirmado: orderData.confirmado === true ? 'true' : 'false',
      tipo_envio: orderData.tipo_envio || '',
    };
    
    console.log('🔍 [EDIT MODAL] FormData final preparado:', formData);
    console.log('🔍 [EDIT MODAL] FormData.provincia:', formData.provincia);
    console.log('🔍 [EDIT MODAL] FormData.canton:', formData.canton);
    console.log('🔍 [EDIT MODAL] FormData.distrito:', formData.distrito);
    console.log('🔍 [EDIT MODAL] FormData.productos:', formData.productos);
    
    setEditOrder(formData);
    
    // Parsear productos seleccionados desde el string con stock del inventario
    console.log('🔍 [EDIT MODAL] String de productos para parsear:', productos);
    
    if (productos && productos.trim()) {
      const productosParsed = parsearProductosConStock(productos);
      console.log('🔍 [EDIT MODAL] Productos parseados:', productosParsed);
      setProductosSeleccionadosEdit(productosParsed);
    } else {
      console.log('⚠️ [EDIT MODAL] No hay productos en el pedido o está vacío');
      setProductosSeleccionadosEdit([]);
    }
    
    setShowEditModal(true);
  };

  // Actualizar productos seleccionados cuando cambie productosDisponibles y haya un pedido en edición
  useEffect(() => {
    if (orderToEdit && productosDisponibles.length > 0 && showEditModal) {
      const productosStr = (orderToEdit as any).productos || '';
      console.log('🔄 [USE EFFECT] Actualizando productos desde orderToEdit:', productosStr);
      const productosParsed = parsearProductosConStock(productosStr);
      setProductosSeleccionadosEdit(productosParsed);
      
      // Asegurarse de que el editOrder tenga el texto de productos
      if (productosStr && productosStr.trim()) {
        setEditOrder((prev: PedidoFormData) => ({
          ...prev,
          productos: productosStr,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosDisponibles.length, orderToEdit?.id, showEditModal]);
  
  // Asegurarse de que los datos se actualicen cuando se abre el modal
  useEffect(() => {
    if (showEditModal && orderToEdit) {
      console.log('🔄 [USE EFFECT] Modal abierto, sincronizando datos de orderToEdit');
      const orderData = orderToEdit as any;
      
      // Actualizar editOrder con los datos más recientes del pedido
      setEditOrder((prev: PedidoFormData) => ({
        ...prev,
        provincia: orderToEdit.customerProvince || orderData.provincia || prev.provincia || '',
        canton: orderToEdit.customerCanton || orderData.canton || prev.canton || '',
        distrito: orderToEdit.customerDistrict || orderData.distrito || prev.distrito || '',
        productos: orderData.productos || prev.productos || '',
      }));
      
      console.log('🔄 [USE EFFECT] editOrder actualizado:', {
        provincia: orderToEdit.customerProvince || orderData.provincia || '',
        canton: orderToEdit.customerCanton || orderData.canton || '',
        distrito: orderToEdit.customerDistrict || orderData.distrito || '',
        productos: orderData.productos || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditModal, orderToEdit?.id]);

  // Función para abrir modal de ver
  const openViewModalFor = (order: Order) => {
    setOrderToView(order);
    setViewMode('view');
    setShowViewModal(true);
  };

  // Función para guardar edición
  const saveEditModal = async () => {
    if (!orderToEdit || !isEditFormValid) return;
    
    setIsSaving(true);
    try {
      const fechaCreacion = (orderToEdit as any).fecha_creacion || orderToEdit.createdAt;
      
      const updates: any = {
        cliente_nombre: editOrder.cliente_nombre,
        cliente_telefono: editOrder.cliente_telefono,
        direccion: editOrder.direccion,
        provincia: editOrder.provincia,
        canton: editOrder.canton,
        distrito: editOrder.distrito,
        valor_total: Number(editOrder.valor_total || 0),
        productos: editOrder.productos,
        link_ubicacion: editOrder.link_ubicacion || null,
        nota_asesor: editOrder.nota_asesor || null,
        confirmado: editOrder.confirmado === 'true',
      };
      
      const ok = await updatePedidoPreconfirmacion(orderToEdit.id, updates);
      
      if (ok) {
        // Enviar al webhook
        await enviarAlWebhook({
          id_pedido: orderToEdit.id,
          fecha_creacion: fechaCreacion,
          cliente_nombre: editOrder.cliente_nombre,
          cliente_telefono: editOrder.cliente_telefono,
          direccion: editOrder.direccion,
          provincia: editOrder.provincia,
          canton: editOrder.canton,
          distrito: editOrder.distrito,
          valor_total: Number(editOrder.valor_total || 0),
          productos: editOrder.productos,
          link_ubicacion: editOrder.link_ubicacion,
          nota_asesor: editOrder.nota_asesor,
          confirmado: editOrder.confirmado === 'true',
          usuario: user?.name || user?.email || null,
        }, true);
        
        toast({
          title: '✅ Pedido actualizado exitosamente',
          description: `El pedido ${orderToEdit.id} ha sido actualizado`,
          variant: 'default',
        });
        
        setShowEditModal(false);
        setOrderToEdit(null);
        setEditOrder({
          cliente_nombre: '', cliente_telefono: '', direccion: '', provincia: '', canton: '', distrito: '', valor_total: '', productos: '', link_ubicacion: '', nota_asesor: '', confirmado: 'false', tipo_envio: ''
        } as any);
        setProductosSeleccionadosEdit([]);
        await loadData();
      } else {
        toast({
          title: '❌ Error al actualizar pedido',
          description: 'Ocurrió un error al actualizar el pedido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al actualizar pedido:', error);
      toast({
        title: '❌ Error al actualizar pedido',
        description: 'Ocurrió un error al actualizar el pedido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Función para guardar datos del modal de Maps
  const saveMapsModal = async () => {
    if (!orderForMaps) return;
    
    // Validar URL si está presente
    if (mapsFormData.link_ubicacion && !/^https?:\/\/.+/.test(mapsFormData.link_ubicacion)) {
      toast({
        title: '❌ URL inválida',
        description: 'La URL debe comenzar con http:// o https://',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingMaps(true);
    try {
      const fechaCreacion = (orderForMaps as any).fecha_creacion || orderForMaps.createdAt;
      const orderData = orderForMaps as any;
      
      const updates: any = {
        link_ubicacion: mapsFormData.link_ubicacion || null,
        nota_asesor: mapsFormData.nota_asesor || null,
      };
      
      const ok = await updatePedidoPreconfirmacion(orderForMaps.id, updates);
      
      if (ok) {
        // Enviar al webhook con todos los datos del pedido
        await enviarAlWebhook({
          id_pedido: orderForMaps.id,
          fecha_creacion: fechaCreacion,
          cliente_nombre: orderForMaps.customerName || orderData.cliente_nombre || '',
          cliente_telefono: orderForMaps.customerPhone || orderData.cliente_telefono || '',
          direccion: orderForMaps.customerAddress || orderData.direccion || '',
          provincia: orderForMaps.customerProvince || orderData.provincia || '',
          canton: orderForMaps.customerCanton || orderData.canton || '',
          distrito: orderForMaps.customerDistrict || orderData.distrito || '',
          valor_total: orderForMaps.totalAmount || orderData.valor_total || 0,
          productos: orderData.productos || '',
          link_ubicacion: mapsFormData.link_ubicacion,
          nota_asesor: mapsFormData.nota_asesor,
          confirmado: orderData.confirmado === true,
          usuario: user?.name || user?.email || null,
        }, true);
        
        toast({
          title: '✅ Información actualizada exitosamente',
          description: `El link y nota del pedido ${orderForMaps.id} han sido actualizados`,
          variant: 'default',
        });
        
        setShowMapsModal(false);
        setOrderForMaps(null);
        setMapsFormData({ link_ubicacion: '', nota_asesor: '' });
        await loadData();
      } else {
        toast({
          title: '❌ Error al actualizar',
          description: 'Ocurrió un error al actualizar la información',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al actualizar información de Maps:', error);
      toast({
        title: '❌ Error al actualizar',
        description: 'Ocurrió un error al actualizar la información',
        variant: 'destructive',
      });
    } finally {
      setIsSavingMaps(false);
    }
  };

  // Validación del formulario de edición
  const [isEditFormValid, setIsEditFormValid] = useState(false);
  const [isCreateFormValid, setIsCreateFormValid] = useState(false);

  // Función para crear pedido
  const handleCreatePedido = async () => {
    if (!isCreateFormValid) return;
    
    setCreating(true);
    try {
      const fechaCreacion = getCostaRicaDateISO();
      const pedidoData = {
        tienda: asesorTienda,
        cliente_nombre: newOrder.cliente_nombre,
        cliente_telefono: newOrder.cliente_telefono,
        direccion: newOrder.direccion,
        provincia: newOrder.provincia,
        canton: newOrder.canton,
        distrito: newOrder.distrito,
        valor_total: Number(newOrder.valor_total || 0),
        productos: newOrder.productos,
        link_ubicacion: newOrder.link_ubicacion || null,
        nota_asesor: newOrder.nota_asesor || null,
        confirmado: newOrder.confirmado === 'true',
        fecha_creacion: fechaCreacion,
      } as any;
      
      const res = await createPedidoPreconfirmacion(pedidoData);
      
      if (res.success) {
        const pedidoId = res.pedido?.id_pedido || 'N/A';
        
        // Enviar al webhook
        await enviarAlWebhook({
          ...pedidoData,
          id_pedido: res.pedido?.id_pedido || null,
          fecha_creacion: res.pedido?.fecha_creacion || fechaCreacion,
          usuario: user?.name || user?.email || null,
        }, false);
        
        toast({
          title: '✅ Pedido creado exitosamente',
          description: (
            <div className="space-y-1 mt-1">
              <p className="font-semibold">ID: {pedidoId}</p>
              <p className="text-sm">Cliente: {newOrder.cliente_nombre}</p>
              <p className="text-sm">Teléfono: {newOrder.cliente_telefono}</p>
              <p className="text-sm">Dirección: {newOrder.direccion}, {newOrder.distrito}, {newOrder.canton}</p>
              <p className="text-sm">Valor: ₡{Number(newOrder.valor_total).toLocaleString('es-CR')}</p>
              <p className="text-sm">Estado: {newOrder.confirmado === 'true' ? '✅ Confirmado' : '⏳ Pendiente'}</p>
            </div>
          ),
          variant: 'default',
        });
        
        setShowCreateModal(false);
        setProductosSeleccionados([]);
        setNewOrder({
          cliente_nombre: '', cliente_telefono: '', direccion: '', provincia: '', canton: '', distrito: '', valor_total: '', productos: '', link_ubicacion: '', nota_asesor: '', confirmado: 'false', tipo_envio: ''
        } as any);
        await loadData();
      } else {
        toast({
          title: '❌ Error al crear pedido',
          description: res.error || 'Ocurrió un error al crear el pedido',
          variant: 'destructive',
        });
        console.error(res.error);
      }
    } catch (error) {
      console.error('Error al crear pedido:', error);
      toast({
        title: '❌ Error al crear pedido',
        description: 'Ocurrió un error al crear el pedido',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Función para copiar al portapapeles
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Mostrar notificación de éxito (puedes usar toast si tienes)
      console.log(`${type} copiado:`, text);
      // Aquí podrías añadir un toast de éxito
    } catch (err) {
      console.error('Error al copiar:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log(`${type} copiado (fallback):`, text);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos del asesor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard Asesor</h1>
            <p className="opacity-90">
              Gestiona pedidos y supervisa las métricas de ventas por tienda
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Tienda asignada</p>
            <p className="text-lg font-semibold">{asesorTienda}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Bento Style Mejoradas */}
      {(() => {
        const confirmedOrders = filteredOrders.filter(o => (o as any).confirmado === true);
        const unconfirmedOrders = filteredOrders.filter(o => !(o as any).confirmado || (o as any).confirmado === false);
        const totalValue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const confirmedValue = confirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const unconfirmedValue = unconfirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const confirmationRate = filteredOrders.length > 0 
          ? ((confirmedOrders.length / filteredOrders.length) * 100).toFixed(1)
          : '0';
        
        // Pedidos de hoy
        const todayISO = getCostaRicaDateISO();
        const todayOrders = filteredOrders.filter(o => {
          const orderDate = (o as any).fecha_creacion || o.createdAt;
          const orderDateISO = orderDate?.split('T')[0] || new Date(orderDate).toISOString().split('T')[0];
          return orderDateISO === todayISO;
        });

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Confirmados */}
            <Card 
              className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedConfirmation('confirmed')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-green-700">Confirmados</span>
                    </div>
                    <p className="text-3xl font-bold text-green-800">
                      {confirmedOrders.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-600">
                        {confirmationRate}% del total
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-green-700">
                      Valor: {formatCurrency(confirmedValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sin Confirmar */}
            <Card 
              className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedConfirmation('unconfirmed')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-orange-700">Sin Confirmar</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-800">
                      {unconfirmedOrders.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <p className="text-xs text-orange-600">
                        Pendientes de confirmación
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-orange-700">
                      Valor: {formatCurrency(unconfirmedValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Pedidos */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-purple-700">Total Pedidos</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-800">
                      {filteredOrders.length}
                    </p>
                    <p className="text-xs text-purple-600">Pedidos filtrados</p>
                    <p className="text-xs font-semibold text-purple-700">
                      Valor total: {formatCurrency(totalValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pedidos de Hoy */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-blue-700">Pedidos de Hoy</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-800">
                      {todayOrders.length}
                    </p>
                    <p className="text-xs text-blue-600">Creados hoy</p>
                    <p className="text-xs font-semibold text-blue-700">
                      Valor: {formatCurrency(todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Gestor de Productos No Encontrados */}
      {productosDisponibles.length > 0 && (
        <UnmappedProductsManager
          orders={filteredOrders}
          inventory={productosDisponibles}
          defaultStore={asesorTienda}
          onMappingSaved={() => {
            toast({
              title: '✅ Mapeo guardado',
              description: 'El producto ha sido mapeado correctamente y se aplicará en futuros pedidos.',
              variant: 'default',
            });
          }}
          onInventoryUpdate={(newProduct) => {
            // Agregar el nuevo producto al inventario local
            setProductosDisponibles(prev => [...prev, newProduct]);
            toast({
              title: '✅ Producto creado',
              description: `El producto "${newProduct.producto}" ha sido agregado al inventario.`,
              variant: 'default',
            });
          }}
        />
      )}

      {/* Filtros Mejorados */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-600" />
              <span className="text-purple-800">Filtros y Búsqueda</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">{filteredRecords}</span> de{' '}
              <span className="font-semibold text-gray-800">{totalRecords}</span> registros
            </div>
          </CardTitle>
        </CardHeader>
                 <CardContent className="space-y-3">
           {/* Primera fila: Filtros rápidos, Búsqueda y Limpiar */}
           <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Filtros rápidos */}
             <div className="md:col-span-5 space-y-1.5">
               <Label className="text-xs font-medium text-gray-700">Filtros rápidos</Label>
               <div className="grid grid-cols-4 gap-1.5">
                  <Button
                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDateFilter('all');
                      setSelectedDate(undefined);
                      setSelectedDateRange({from: undefined, to: undefined});
                      setSelectedMonth('');
                    }}
                   className={`h-8 text-xs ${dateFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDateFilter('today');
                      setSelectedDate(undefined);
                      setSelectedDateRange({from: undefined, to: undefined});
                      setSelectedMonth('');
                    }}
                   className={`h-8 text-xs ${dateFilter === 'today' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDateFilter('yesterday');
                      setSelectedDate(undefined);
                      setSelectedDateRange({from: undefined, to: undefined});
                      setSelectedMonth('');
                    }}
                   className={`h-8 text-xs ${dateFilter === 'yesterday' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  >
                    Ayer
                  </Button>
                  <Button
                    variant={dateFilter === 'thisWeek' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDateFilter('thisWeek');
                      setSelectedDate(undefined);
                      setSelectedDateRange({from: undefined, to: undefined});
                      setSelectedMonth('');
                    }}
                   className={`h-8 text-xs ${dateFilter === 'thisWeek' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                  >
                    Esta Semana
                  </Button>
                </div>
              </div>

             {/* Búsqueda */}
             <div className="md:col-span-5 space-y-1.5">
               <Label htmlFor="search" className="text-xs font-medium text-gray-700">Buscar pedidos</Label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                 <Input
                   id="search"
                   placeholder="ID, cliente, teléfono, dirección..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10 h-8 text-xs"
                 />
               </div>
             </div>

             {/* Limpiar filtros */}
             <div className="md:col-span-2 space-y-1.5">
               <Label className="text-xs font-medium text-gray-700 opacity-0">Limpiar</Label>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setSearchTerm('');
                   setSelectedStore('all');
                   setSelectedMessenger('all');
                   setSelectedConfirmation('all');
                   setDateFilter('all');
                   setSelectedDate(undefined);
                   setSelectedDateRange({from: undefined, to: undefined});
                   setSelectedMonth('');
                 }}
                 className="w-full h-8 text-xs"
               >
                 <X className="w-3 h-3 mr-1.5" />
                 Limpiar
               </Button>
             </div>
           </div>

           {/* Segunda fila: Filtros de fecha específicos y confirmación */}
           <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Fecha específica */}
             <div className="space-y-1.5">
               <Label className="text-xs font-medium text-gray-700">Fecha específica</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
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
                        setDateFilter('custom');
                        setSelectedDateRange({from: undefined, to: undefined});
                        setSelectedMonth('');
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Rango de fechas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Rango de fechas</Label>
                <Popover open={isDateRangePickerOpen} onOpenChange={setIsDateRangePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !selectedDateRange.from && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {selectedDateRange.from ? (
                        selectedDateRange.to ? (
                          `${selectedDateRange.from.toLocaleDateString('es-CR')} - ${selectedDateRange.to.toLocaleDateString('es-CR')}`
                        ) : (
                          `Desde ${selectedDateRange.from.toLocaleDateString('es-CR')}`
                        )
                      ) : (
                        "Seleccionar rango"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={selectedDateRange}
                      onSelect={(range) => {
                        setSelectedDateRange({
                          from: range?.from,
                          to: range?.to
                        });
                        setDateFilter('range');
                        setSelectedDate(undefined);
                        setSelectedMonth('');
                        if (range?.from && range?.to) {
                          setIsDateRangePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por mes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Filtrar por mes</Label>
                <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !selectedMonth && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {selectedMonth ? (
                        new Date(selectedMonth + '-01').toLocaleDateString('es-CR', {
                          year: 'numeric',
                          month: 'long'
                        })
                      ) : (
                        "Seleccionar mes"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({length: 12}, (_, i) => {
                          const date = new Date(2024, i, 1);
                          const monthValue = `2024-${String(i + 1).padStart(2, '0')}`;
                          return (
                            <Button
                              key={monthValue}
                              variant={selectedMonth === monthValue ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedMonth(monthValue);
                                setDateFilter('month');
                                setSelectedDate(undefined);
                                setSelectedDateRange({from: undefined, to: undefined});
                                setIsMonthPickerOpen(false);
                              }}
                              className="text-xs"
                            >
                              {date.toLocaleDateString('es-CR', { month: 'short' })}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

                            {/* Filtro por confirmación */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Estado de confirmación</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedConfirmation === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedConfirmation('all')}
                    className={`h-9 px-4 text-sm font-medium whitespace-nowrap transition-all ${
                      selectedConfirmation === 'all' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={selectedConfirmation === 'confirmed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedConfirmation('confirmed')}
                    className={`h-9 px-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedConfirmation === 'confirmed' 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmados
                  </Button>
                  <Button
                    variant={selectedConfirmation === 'unconfirmed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedConfirmation('unconfirmed')}
                    className={`h-9 px-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedConfirmation === 'unconfirmed' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Sin Confirmar
                  </Button>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Pedidos Mejorada */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800">Pedidos {selectedStore !== 'all' ? `- ${selectedStore}` : ''}</h2>
                <p className="text-sm text-purple-600">Gestiona y supervisa todos los pedidos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 px-4 py-2 text-lg font-semibold">
                {filteredOrders.length} pedidos
              </Badge>
              
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Pedido
              </Button>
              
                                          {/* Botones de edición masiva */}
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleEditMode}
                    variant="default"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar Edición
                  </Button>
                  
                  <Button
                    onClick={selectAllOrders}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {selectedOrders.size === filteredOrders.length ? (
                      <>
                        <Square className="w-4 h-4 mr-1" />
                        Deseleccionar Todo
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Seleccionar Todo
                      </>
                    )}
                  </Button>
                  
                  {selectedOrders.size > 0 && (
                    <Button
                      onClick={() => setShowBulkEditModal(true)}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <MoreHorizontal className="w-4 h-4 mr-1" />
                      Editar Seleccionados ({selectedOrders.size})
                    </Button>
                  )}
                  
                  {hasUnsavedChanges() && (
                    <Button
                      onClick={saveAllChanges}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Cambios ({editingOrders.size})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay pedidos para mostrar</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {searchTerm || selectedStore !== 'all' 
                  ? 'No se encontraron pedidos con los filtros aplicados. Intenta ajustar los criterios de búsqueda.'
                  : 'Los pedidos aparecerán aquí cuando estén disponibles para tu tienda.'
                }
              </p>
            </div>
          ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[1000px] border-0">
                <TableHeader className="bg-gray-50/80 border-0">
                  <TableRow className="border-l-0 border-r-0">
                    {isEditMode && (
                      <TableHead className="!p-0 font-bold text-gray-800 min-w-[30px] px-3 py-2 text-xs border-l-0">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={selectAllOrders}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </TableHead>
                    )}
                    <TableHead className="!p-0 font-bold text-gray-800 min-w-[120px] px-3 py-2 text-xs border-l-0">ID Pedido</TableHead>
                    <TableHead className="!p-0 font-bold text-gray-800 min-w-[300px] px-3 py-2 text-xs">Dirección</TableHead>
                    <TableHead className="!p-0 font-bold text-gray-800 min-w-[140px] px-3 py-2 text-xs">Productos</TableHead>
                    <TableHead className="!p-0 font-bold text-gray-800 min-w-[130px] px-3 py-2 text-xs border-r-0">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const isConfirmed = (order as any).confirmado === true;
                    return (
                    <TableRow 
                      key={order.id} 
                      className={`hover:bg-gray-50/50 transition-all duration-200 border-l-0 border-r-0 ${
                        isOrderBeingEdited(order.id) ? 'bg-yellow-50' : ''
                      } ${!isConfirmed ? 'bg-orange-50/30' : ''}`}
                    >
                      {/* Checkbox para selección */}
                      {isEditMode && (
                        <TableCell className="!p-0 px-3 py-2 border-l-0">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </TableCell>
                      )}
                      
                      {/* ID Pedido con Cliente */}
                      <TableCell className="!p-0 font-medium px-3 py-2 border-l-0">
                        <div className="flex flex-col gap-1 min-w-0 pr-2">
                          {/* Primera fila: ID con icono de warning si no está confirmado */}
                          <div className="flex items-center gap-1.5">
                            {!isConfirmed && (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 border border-orange-400 shadow-sm animate-pulse flex-shrink-0">
                                <AlertTriangle className="w-3 h-3 text-orange-600" />
                              </div>
                            )}
                            <span className="font-mono text-xs font-bold text-gray-900 leading-tight break-all">{order.id}</span>
                          </div>
                          {/* Segunda fila: Nombre */}
                          <span className="font-medium text-xs text-gray-900 truncate" title={order.customerName}>
                            {order.customerName}
                          </span>
                          {/* Tercera fila: Número y botones */}
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <span className="truncate font-mono text-[10px]">{order.customerPhone || 'Sin teléfono'}</span>
                            {order.customerPhone && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(order.customerPhone!, 'Número de teléfono')}
                                  className="h-5 w-5 p-0 bg-green-50/80 border-green-200 hover:bg-green-100 text-green-600 flex-shrink-0 hover:scale-110 transition-transform"
                                  title="Copiar número de teléfono"
                                  aria-label="Copiar número de teléfono"
                                >
                                  <Clipboard className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModalFor(order)}
                                  className="h-5 w-5 p-0 bg-blue-50/80 border-blue-200 hover:bg-blue-100 text-blue-600 flex-shrink-0 hover:scale-110 transition-transform"
                                  title="Editar pedido"
                                  aria-label="Editar pedido"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Dirección */}
                      <TableCell className="!p-0 px-3 py-2">
                        <div className="space-y-1.5">
                          {/* Dirección completa */}
                          <div className="text-sm text-gray-800 leading-tight max-w-[280px] font-medium" title={order.customerAddress}>
                            {order.customerAddress || 'Sin dirección'}
                          </div>
                          {/* Provincia, Cantón, Distrito - en una sola fila */}
                          <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap flex-wrap">
                            {order.customerProvince && (
                              <span className="whitespace-nowrap">
                                <span className="font-semibold text-gray-700">Provincia:</span> {order.customerProvince}
                              </span>
                            )}
                            {order.customerProvince && (order.customerCanton || order.customerDistrict) && (
                              <span className="text-gray-400">•</span>
                            )}
                            {order.customerCanton && (
                              <span className="whitespace-nowrap">
                                <span className="font-semibold text-gray-700">Cantón:</span> {order.customerCanton}
                              </span>
                            )}
                            {order.customerCanton && order.customerDistrict && (
                              <span className="text-gray-400">•</span>
                            )}
                            {order.customerDistrict && (
                              <span className="whitespace-nowrap">
                                <span className="font-semibold text-gray-700">Distrito:</span> {order.customerDistrict}
                              </span>
                            )}
                          </div>
                          {/* Botón Maps y Fecha */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {(order as any).link_ubicacion ? (() => {
                              const link = (order as any).link_ubicacion;
                              // Normalizar la URL para asegurar que tenga protocolo
                              const normalizedLink = link.startsWith('http://') || link.startsWith('https://')
                                ? link
                                : `https://${link}`;
                              return (
                                <a
                                  href={normalizedLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 whitespace-nowrap"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(normalizedLink, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Ver en Maps</span>
                                </a>
                              );
                            })() : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const orderData = order as any;
                                  setOrderForMaps(order);
                                  setMapsFormData({
                                    link_ubicacion: orderData.link_ubicacion || order.customerLocationLink || '',
                                    nota_asesor: orderData.nota_asesor || order.asesorNotes || '',
                                  });
                                  setShowMapsModal(true);
                                }}
                                className="h-7 px-3 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 whitespace-nowrap"
                                title="Añadir link de Google Maps"
                                aria-label="Añadir link de Google Maps"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Maps
                              </Button>
                            )}
                            {/* Fecha de creación en formato AAAA-MM-DD */}
                            {(() => {
                              const fechaCreacion = (order as any).fecha_creacion || order.createdAt;
                              let fechaFormateada = '';
                              if (fechaCreacion) {
                                try {
                                  // Si ya está en formato AAAA-MM-DD, usar directamente
                                  if (typeof fechaCreacion === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaCreacion)) {
                                    fechaFormateada = fechaCreacion.split('T')[0];
                                  } else {
                                    // Si es una fecha completa, extraer solo la parte de fecha
                                    const fecha = new Date(fechaCreacion);
                                    const year = fecha.getFullYear();
                                    const month = String(fecha.getMonth() + 1).padStart(2, '0');
                                    const day = String(fecha.getDate()).padStart(2, '0');
                                    fechaFormateada = `${year}-${month}-${day}`;
                                  }
                                } catch (e) {
                                  fechaFormateada = 'Fecha inválida';
                                }
                              }
                              return fechaFormateada ? (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                  <span className="font-mono">{fechaFormateada}</span>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </TableCell>

                      {/* Productos */}
                      <TableCell className="!p-0 px-3 py-2">
                        <div className="space-y-1.5">
                          {/* Productos */}
                          <div className="text-sm text-gray-800 leading-tight font-medium" title={order.productos || 'No especificados'}>
                            {order.productos || 'No especificados'}
                          </div>
                          {/* Monto */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm"></div>
                            <span className="text-sm font-bold text-green-700 whitespace-nowrap">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                          {/* Número SINPE */}
                          {order.numero_sinpe && (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                              <span className="text-xs text-blue-700 font-mono bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-200">
                                SINPE: {order.numero_sinpe}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(order.numero_sinpe!, 'Número SINPE')}
                                className="h-6 w-6 p-0 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 hover:scale-110 transition-transform"
                                title="Copiar número SINPE"
                                aria-label="Copiar número SINPE"
                              >
                                <Clipboard className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Estado y Acciones */}
                      <TableCell className="!p-0 px-3 py-2 border-r-0">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          {!isConfirmed && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConfirmOrder(order)}
                              className="h-8 px-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold flex items-center gap-1.5 w-full"
                              title="Confirmar pedido"
                              aria-label="Confirmar pedido"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="text-xs">Confirmar</span>
                            </Button>
                          )}
                          <div className="flex gap-2 items-center justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewModalFor(order)}
                              className="h-8 w-8 p-0 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 text-purple-700 shadow-sm transition-all hover:scale-110"
                              title="Ver detalles completos del pedido"
                              aria-label="Ver detalles del pedido"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModalFor(order)}
                              className="h-8 w-8 p-0 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 shadow-sm transition-all hover:scale-110"
                              title="Editar pedido"
                              aria-label="Editar pedido"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
          )}
              {/* Controles de Paginación */}
              {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t px-3 py-1.5 bg-gray-50/50">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  
                  {/* Indicadores de página con puntos */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      // Mostrar solo algunos puntos: primeros, últimos, y alrededor de la actual
                      const showDot = 
                        pageNum === 1 || 
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1) ||
                        (currentPage <= 3 && pageNum <= 5) ||
                        (currentPage >= totalPages - 2 && pageNum >= totalPages - 4);
                      
                      if (!showDot) {
                        // Mostrar puntos suspensivos
                        if (pageNum === currentPage - 2 && currentPage > 4) {
                          return <span key={pageNum} className="text-gray-400 text-[10px]">...</span>;
                        }
                        if (pageNum === currentPage + 2 && currentPage < totalPages - 3) {
                          return <span key={pageNum} className="text-gray-400 text-[10px]">...</span>;
                        }
                        return null;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`h-1.5 w-1.5 rounded-full transition-all ${
                            currentPage === pageNum
                              ? 'bg-purple-600 w-4'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          aria-label={`Ir a página ${pageNum}`}
                        />
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Pedido */}
      <Dialog 
        open={showCreateModal} 
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setProductosSeleccionados([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[1400px] w-[98vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1.5 border-b mb-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <div className="p-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Crear Pedido</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] pt-0.5 text-gray-500">
              Complete el formulario para crear un nuevo pedido
            </DialogDescription>
          </DialogHeader>

          <PedidoForm
            formData={newOrder}
            onFormDataChange={setNewOrder}
            productosSeleccionados={productosSeleccionados}
            onProductosChange={setProductosSeleccionados}
            productosDisponibles={productosDisponibles}
            asesorTienda={asesorTienda}
            mode="create"
            onValidationChange={setIsCreateFormValid}
          />

          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                setProductosSeleccionados([]);
              }}
              className="h-7 px-3 text-[11px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePedido}
              disabled={creating || !isCreateFormValid}
              className={`px-4 shadow-lg h-7 text-[11px] ${
                isCreateFormValid && !creating
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!isCreateFormValid ? 'Complete todos los campos obligatorios para crear el pedido' : ''}
            >
              {creating ? (<><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Creando...</>) : (<><Plus className="w-3 h-3 mr-1.5" />Crear</>)}
            </Button>
                </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Pedido */}
      <Dialog 
        open={showEditModal} 
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setProductosSeleccionadosEdit([]);
            setOrderToEdit(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[1400px] w-[98vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1.5 border-b mb-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <div className="p-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded">
                <Edit className="w-3 h-3 text-white" />
                </div>
              <span>Editar Pedido {orderToEdit?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] pt-0.5 text-gray-500">
              Modifique los campos necesarios del pedido
            </DialogDescription>
          </DialogHeader>

          {orderToEdit && (
            <>
              {/* Debug info - remover en producción */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <p><strong>Debug:</strong> Provincia: "{editOrder.provincia}", Cantón: "{editOrder.canton}", Distrito: "{editOrder.distrito}"</p>
                  <p>Productos: "{editOrder.productos}"</p>
                </div>
              )}
              <PedidoForm
                formData={editOrder}
                onFormDataChange={setEditOrder}
                productosSeleccionados={productosSeleccionadosEdit}
                onProductosChange={setProductosSeleccionadosEdit}
                productosDisponibles={productosDisponibles}
                asesorTienda={asesorTienda}
                mode="edit"
                onValidationChange={setIsEditFormValid}
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditModal(false);
                setProductosSeleccionadosEdit([]);
                setOrderToEdit(null);
              }}
              className="h-7 px-3 text-[11px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEditModal}
              disabled={isSaving || !isEditFormValid}
              className={`px-4 shadow-lg h-7 text-[11px] ${
                isEditFormValid && !isSaving
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (<><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Guardando...</>) : (<><Save className="w-3 h-3 mr-1.5" />Guardar</>)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ver Pedido / Confirmar Pedido */}
      <Dialog 
        open={showViewModal} 
        onOpenChange={(open) => {
          setShowViewModal(open);
          if (!open) {
            setOrderToView(null);
            setViewMode('view');
          }
        }}
      >
        <DialogContent className="sm:max-w-[1400px] w-[98vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1.5 border-b mb-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <div className="p-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <span>{viewMode === 'confirm' ? 'Confirmar Pedido' : 'Ver Pedido'} {orderToView?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] pt-0.5 text-gray-500">
              {viewMode === 'confirm' ? 'Revise la información del pedido antes de confirmarlo' : 'Detalles del pedido'}
            </DialogDescription>
          </DialogHeader>

          {orderToView && (() => {
            const viewOrderData: PedidoFormData = {
              cliente_nombre: orderToView.customerName || '',
              cliente_telefono: orderToView.customerPhone || '',
              direccion: orderToView.customerAddress || '',
              provincia: orderToView.customerProvince || '',
              canton: orderToView.customerCanton || '',
              distrito: orderToView.customerDistrict || '',
              valor_total: String(orderToView.totalAmount || ''),
              productos: (orderToView as any).productos || '',
              link_ubicacion: (orderToView as any).link_ubicacion || '',
              nota_asesor: (orderToView as any).nota_asesor || orderToView.asesorNotes || '',
              confirmado: (orderToView as any).confirmado === true ? 'true' : 'false',
              tipo_envio: (orderToView as any).tipo_envio || '',
            };
            
            const productosParsed: { nombre: string; stock: number; cantidad: number }[] = [];
            const productosStr = (orderToView as any).productos || '';
            if (productosStr) {
              const productosArray = productosStr.split(',').map((p: string) => p.trim());
              productosArray.forEach((prod: string) => {
                const match = prod.match(/(.+?)\s*x(\d+)/);
                if (match) {
                  productosParsed.push({
                    nombre: match[1].trim(),
                    cantidad: parseInt(match[2]),
                    stock: 0,
                  });
                }
              });
            }

            return (
              <>
                <PedidoForm
                  formData={viewOrderData}
                  onFormDataChange={() => {}}
                  productosSeleccionados={productosParsed}
                  onProductosChange={() => {}}
                  productosDisponibles={productosDisponibles}
                  asesorTienda={asesorTienda}
                  mode="view"
                />

                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowViewModal(false);
                      setOrderToView(null);
                      setViewMode('view');
                    }}
                    className="h-7 px-3 text-[11px]"
                  >
                    Cerrar
            </Button>
                  {viewMode === 'confirm' && (
                    <Button
                      onClick={confirmarPedido}
                      disabled={isConfirming}
                      className="px-4 shadow-lg h-7 text-[11px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    >
                      {isConfirming ? (
                        <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Confirmando...</>
                      ) : (
                        <><CheckCircle className="w-3 h-3 mr-1.5" />Confirmar este pedido</>
                      )}
                    </Button>
                  )}
          </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal de Maps (Solo sección Adicional) */}
      <Dialog 
        open={showMapsModal} 
        onOpenChange={(open) => {
          setShowMapsModal(open);
          if (!open) {
            setOrderForMaps(null);
            setMapsFormData({ link_ubicacion: '', nota_asesor: '' });
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1.5 border-b mb-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <div className="p-1 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <span>Información Adicional - {orderForMaps?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] pt-0.5 text-gray-500">
              Agregue o edite el link de Google Maps y la nota del asesor
            </DialogDescription>
          </DialogHeader>

          {orderForMaps && (
            <div className="space-y-4">
              {/* Card Adicional - Replicando el estilo del formulario */}
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 p-2">
                <CardHeader className="pb-1 px-0 pt-0">
                  <CardTitle className="text-[11px] font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3 text-indigo-600" />
                    Adicional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-0 pb-0">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium text-gray-700">Link</Label>
                    <div className="relative">
                      <Input 
                        type="url"
                        value={mapsFormData.link_ubicacion} 
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^https?:\/\/.+/.test(value)) {
                            setMapsFormData(prev => ({ ...prev, link_ubicacion: value }));
                          }
                        }} 
                        placeholder="https://maps.google.com/..." 
                        className="bg-white h-7 text-[11px] py-1 px-2 pr-8" 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              setMapsFormData(prev => ({ ...prev, link_ubicacion: text }));
                            }
                          } catch (err) {
                            console.error('Error al leer portapapeles:', err);
                          }
                        }}
                        className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-indigo-100 text-indigo-600"
                        title="Pegar desde portapapeles"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {mapsFormData.link_ubicacion && !/^https?:\/\/.+/.test(mapsFormData.link_ubicacion) && (
                      <p className="text-[9px] text-red-500 mt-0.5">Ingrese una URL válida (debe comenzar con http:// o https://)</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium text-gray-700">Nota asesor</Label>
                    <Textarea 
                      value={mapsFormData.nota_asesor} 
                      onChange={(e) => setMapsFormData(prev => ({ ...prev, nota_asesor: e.target.value }))} 
                      rows={2} 
                      className="bg-white resize-none text-[11px] py-1 px-2 min-h-[45px]" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMapsModal(false);
                setOrderForMaps(null);
                setMapsFormData({ link_ubicacion: '', nota_asesor: '' });
              }}
              className="h-7 px-3 text-[11px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveMapsModal}
              disabled={isSavingMaps}
              className={`px-4 shadow-lg h-7 text-[11px] ${
                !isSavingMaps
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSavingMaps ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Guardando...</>
              ) : (
                <><Save className="w-3 h-3 mr-1.5" />Guardar</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edición Masiva */}
      <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Edición Masiva de Pedidos
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>{selectedOrders.size}</strong> pedidos seleccionados para edición masiva.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bulkField">Campo a editar</Label>
              <Select value={bulkEditField} onValueChange={setBulkEditField}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Estado</SelectItem>
                  <SelectItem value="assignedMessenger">Mensajero</SelectItem>
                  <SelectItem value="paymentMethod">Método de Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {bulkEditField === 'status' && (
            <div className="space-y-2">
                <Label htmlFor="bulkValue">Nuevo estado</Label>
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">📝 Pendiente</SelectItem>
                    <SelectItem value="en_ruta">🚚 En Ruta</SelectItem>
                    <SelectItem value="entregado">✅ Entregado</SelectItem>
                    <SelectItem value="reagendado">📅 Reagendado</SelectItem>
                    <SelectItem value="devolucion">❌ Devolución</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {bulkEditField === 'assignedMessenger' && (
              <div className="space-y-2">
                <Label htmlFor="bulkValue">Nuevo mensajero</Label>
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mensajero" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMessengers.map((messenger) => (
                      <SelectItem key={messenger.id} value={messenger.name}>
                        {messenger.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {bulkEditField === 'paymentMethod' && (
              <div className="space-y-2">
                <Label htmlFor="bulkValue">Nuevo método de pago</Label>
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="sinpe">SINPE</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
            
          <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkEditField('');
                  setBulkEditValue('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={applyBulkEdit}
                disabled={!bulkEditField || !bulkEditValue}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Aplicar a {selectedOrders.size} pedidos
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
