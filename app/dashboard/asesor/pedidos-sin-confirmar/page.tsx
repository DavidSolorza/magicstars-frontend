'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Search, Package, Clock, CheckCircle, AlertCircle, Edit, Save, X, Warehouse, Filter, RefreshCw, TrendingUp, Building2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import {
  getAllPedidosByTiendaPreconfirmacion,
  getPedidosCountByTiendaPreconfirmacion,
  getTotalPedidosPreconfirmacionCount,
  updatePedidoPreconfirmacion
} from '@/lib/supabase-pedidos';
import { obtenerTodosProductosALLSTARS, ProductoInventario } from '@/lib/supabase-inventario';
import { Order } from '@/lib/types';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { ProductosSelector } from '@/components/dashboard/productos-selector';

// Función para obtener la tienda del asesor (igual que en dashboard)
const getAsesorTienda = (email: string): string => {
  const emailLower = email.toLowerCase();
  if (emailLower.includes('allstars') || emailLower.includes('all_stars')) {
    return 'ALL STARS';
  }
  return 'ALL STARS'; // Por defecto
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
  return `${year}-${month}-${day}`;
};

export default function PedidosSinConfirmarPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessenger, setSelectedMessenger] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filteredRecords, setFilteredRecords] = useState(0);
  const [recordsPerPage] = useState(20);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string>('');
  const [editingConfirmado, setEditingConfirmado] = useState<boolean>(false);
  
  // Estados para editar todos los campos
  const [editingCustomerName, setEditingCustomerName] = useState<string>('');
  const [editingCustomerPhone, setEditingCustomerPhone] = useState<string>('');
  const [editingCustomerAddress, setEditingCustomerAddress] = useState<string>('');
  const [editingProvince, setEditingProvince] = useState<string>('');
  const [editingCanton, setEditingCanton] = useState<string>('');
  const [editingDistrict, setEditingDistrict] = useState<string>('');
  const [editingProductos, setEditingProductos] = useState<string>('');
  const [editingProductosSeleccionados, setEditingProductosSeleccionados] = useState<{ nombre: string; stock: number; cantidad: number }[]>([]);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [hasUnmappedProducts, setHasUnmappedProducts] = useState<boolean>(false);
  const [unmappedProductsList, setUnmappedProductsList] = useState<string[]>([]);

  // Estado para productos disponibles del inventario
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoInventario[]>([]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [asesorTienda, setAsesorTienda] = useState<string>('ALL STARS');
  
  // Estados para filtros de fecha (igual que en dashboard)
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({from: undefined, to: undefined});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  // Estado para filtro de tipo de carrito
  const [cartTypeFilter, setCartTypeFilter] = useState<string>('all'); // 'all', 'abandonados', 'finalizados'

  // Función para cargar datos (igual que en dashboard)
  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Determinar la tienda del asesor (igual que en dashboard)
      const tienda = getAsesorTienda(user.email);
      setAsesorTienda(tienda);
      console.log('🏪 Tienda del asesor:', tienda);
      
      // Obtener todos los pedidos de la tienda (igual que en dashboard)
      console.log('🔍 Buscando pedidos para tienda:', tienda);
      const ordersRes = await getAllPedidosByTiendaPreconfirmacion(tienda);
      
      console.log('✅ Pedidos obtenidos de Supabase:', ordersRes.length);
      console.log('📋 Primeros pedidos:', ordersRes.slice(0, 3));
      
      // Mapear los datos al formato Order (igual que en dashboard)
      const ordersWithStoreAndMessenger = ordersRes.map((pedido, index) => ({
        id: pedido.id_pedido,
        customerName: pedido.cliente_nombre,
        customerPhone: pedido.cliente_telefono,
        customerAddress: pedido.direccion,
        customerProvince: pedido.provincia,
        customerCanton: pedido.canton,
        customerDistrict: pedido.distrito,
        totalAmount: pedido.valor_total,
        productos: pedido.productos,
        items: [],
        status: pedido.estado_pedido as any || 'pendiente',
        paymentMethod: pedido.metodo_pago as any || 'efectivo',
        origin: 'shopify' as any,
        deliveryMethod: 'mensajeria_propia' as any,
        createdAt: pedido.fecha_creacion,
        updatedAt: pedido.fecha_creacion,
        fecha_creacion: pedido.fecha_creacion,
        scheduledDate: pedido.fecha_entrega || undefined,
        deliveryDate: pedido.fecha_entrega || undefined,
        customerLocationLink: pedido.link_ubicacion || undefined,
        notes: pedido.notas || undefined,
        asesorNotes: pedido.nota_asesor || undefined,
        numero_sinpe: pedido.numero_sinpe || undefined,
        confirmado: pedido.confirmado !== undefined ? pedido.confirmado : false,
        assignedMessengerId: pedido.mensajero_asignado || undefined,
        assignedMessenger: pedido.mensajero_asignado ? {
          id: pedido.mensajero_asignado,
          name: pedido.mensajero_asignado,
          phone: undefined
        } : undefined,
        concretedMessengerId: pedido.mensajero_concretado || undefined,
        concretedMessenger: pedido.mensajero_concretado ? {
          id: pedido.mensajero_concretado,
          name: pedido.mensajero_concretado,
          phone: undefined
        } : undefined,
        store: tienda,
        jornadaRuta: pedido.jornada_ruta || undefined,
      }));

      // Establecer los pedidos (igual que en dashboard)
      setOrders(ordersWithStoreAndMessenger);
      setTotalRecords(ordersWithStoreAndMessenger.length);
      
      console.log(`✅ Todos los pedidos cargados: ${ordersWithStoreAndMessenger.length}`);
      console.log(`📊 Pedidos abandonados (#): ${ordersWithStoreAndMessenger.filter(o => o.id.startsWith('#')).length}`);
      console.log(`📊 Pedidos finalizados (A-Z): ${ordersWithStoreAndMessenger.filter(o => /^[A-Z]/.test(o.id)).length}`);
      
    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Cargar productos disponibles del inventario
  useEffect(() => {
    const loadProductos = async () => {
      try {
        const productos = await obtenerTodosProductosALLSTARS();
        setProductosDisponibles(productos);
        console.log('📦 Productos disponibles cargados:', productos.length);
      } catch (error) {
        console.error('❌ Error al cargar productos:', error);
      }
    };
    loadProductos();
  }, []);

  // Función para detectar productos con paréntesis (no mapeados)
  const detectarProductosNoMapeados = (productosStr: string): string[] => {
    if (!productosStr) return [];
    const productosArray = productosStr.split(',').map(p => p.trim());
    const noMapeados: string[] = [];

    productosArray.forEach(prod => {
      // Detectar si contiene paréntesis (formato: "1 X PRODUCTO (algo)")
      if (/\([^)]+\)/.test(prod)) {
        noMapeados.push(prod);
      }
    });

    return noMapeados;
  };

  // Función para parsear productos con stock del inventario
  const parsearProductosConStock = (productosStr: string): { nombre: string; stock: number; cantidad: number }[] => {
    const productosParsed: { nombre: string; stock: number; cantidad: number }[] = [];
    if (!productosStr) return productosParsed;

    const productosArray = productosStr.split(',').map(p => p.trim());
    productosArray.forEach(prod => {
      if (!prod) return;

      let nombreProducto = '';
      let cantidad = 1;

      // Formato 1: "2 X NOMBRE" o "2X NOMBRE" (cantidad al inicio)
      const matchCantidadInicio = prod.match(/^(\d+)\s*[xX]\s+(.+)$/);
      // Formato 2: "NOMBRE x2" o "NOMBRE X2" (cantidad al final)
      const matchCantidadFinal = prod.match(/^(.+?)\s*[xX](\d+)$/);

      if (matchCantidadInicio) {
        cantidad = parseInt(matchCantidadInicio[1]);
        nombreProducto = matchCantidadInicio[2].trim();
      } else if (matchCantidadFinal) {
        nombreProducto = matchCantidadFinal[1].trim();
        cantidad = parseInt(matchCantidadFinal[2]);
      } else {
        // Si no hay formato de cantidad, asumir cantidad 1 y el texto completo es el nombre
        nombreProducto = prod.trim();
        cantidad = 1;
      }

      // Saltar productos con paréntesis (no mapeados)
      if (/\([^)]+\)/.test(nombreProducto)) {
        return;
      }

      // Buscar el producto en productosDisponibles para obtener el stock real
      const productoDisponible = productosDisponibles.find(p =>
        p.producto.toLowerCase().trim() === nombreProducto.toLowerCase().trim()
      );

      productosParsed.push({
        nombre: nombreProducto,
        cantidad: cantidad,
        stock: productoDisponible?.cantidad || 0,
      });
    });

    return productosParsed;
  };

  // Función para convertir productos seleccionados a string
  const productosSeleccionadosAString = (productos: { nombre: string; cantidad: number }[]): string => {
    return productos.map(p => `${p.cantidad} X ${p.nombre}`).join(', ');
  };

  // Filtrar pedidos (igual que en dashboard)
  useEffect(() => {
    console.log('🔄 Filtrando pedidos...', { 
      totalOrders: orders.length, 
      searchTerm, 
      selectedMessenger,
      cartTypeFilter
    });
    
    let filtered = orders;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('🔍 Después de filtrar por búsqueda:', filtered.length);
    }

    // Filtrar por mensajero
    if (selectedMessenger !== 'all') {
      filtered = filtered.filter(order => {
        if (selectedMessenger === 'sin_asignar') {
          return !order.assignedMessengerId;
        }
        return order.assignedMessengerId === selectedMessenger;
      });
      console.log('🔍 Después de filtrar por mensajero:', filtered.length);
    }

    // Filtrar por tipo de carrito
    if (cartTypeFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (cartTypeFilter === 'abandonados') {
          return order.id.startsWith('#');
        } else if (cartTypeFilter === 'finalizados') {
          return /^[A-Z]/.test(order.id);
        }
        return true;
      });
      console.log('🔍 Después de filtrar por tipo de carrito:', filtered.length);
    }

    console.log('✅ Pedidos filtrados finales:', filtered.length);
    setFilteredOrders(filtered);
    setFilteredRecords(filtered.length);
    setCurrentPage(1);
  }, [orders, searchTerm, selectedMessenger, cartTypeFilter]);

  // Obtener mensajeros únicos
  const uniqueMessengers = Array.from(
    new Set(
      orders
        .map(order => order.assignedMessengerId)
        .filter((m): m is string => typeof m === 'string' && m.length > 0)
    )
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  console.log('📄 Paginación:', {
    filteredRecords,
    recordsPerPage,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    currentOrdersLength: currentOrders.length
  });

  // Función para manejar la edición
  const handleEdit = (order: Order) => {
    const productosStr = order.productos || '';

    // Detectar productos no mapeados (con paréntesis)
    const noMapeados = detectarProductosNoMapeados(productosStr);
    setUnmappedProductsList(noMapeados);
    setHasUnmappedProducts(noMapeados.length > 0);

    // Si no hay productos no mapeados, parsear productos
    if (noMapeados.length === 0) {
      const productosParsed = parsearProductosConStock(productosStr);
      setEditingProductosSeleccionados(productosParsed);
    } else {
      setEditingProductosSeleccionados([]);
    }

    setEditingOrder(order.id);
    setEditingStatus(order.status);
    setEditingPaymentMethod(order.paymentMethod);
    setEditingConfirmado(order.confirmado || false);
    setEditingCustomerName(order.customerName || '');
    setEditingCustomerPhone(order.customerPhone || '');
    setEditingCustomerAddress(order.customerAddress || '');
    setEditingProvince(order.customerProvince || '');
    setEditingCanton(order.customerCanton || '');
    setEditingDistrict(order.customerDistrict || '');
    setEditingProductos(productosStr);
    setEditingPrice(order.totalAmount || 0);
  };

  // Re-parsear productos cuando productosDisponibles se carga (para actualizar stock)
  useEffect(() => {
    if (editingOrder && editingProductos && productosDisponibles.length > 0 && !hasUnmappedProducts) {
      const productosParsed = parsearProductosConStock(editingProductos);
      if (productosParsed.length > 0) {
        setEditingProductosSeleccionados(productosParsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosDisponibles.length]);

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditingStatus('');
    setEditingPaymentMethod('');
    setEditingConfirmado(false);
    setEditingCustomerName('');
    setEditingCustomerPhone('');
    setEditingCustomerAddress('');
    setEditingProvince('');
    setEditingCanton('');
    setEditingDistrict('');
    setEditingProductos('');
    setEditingProductosSeleccionados([]);
    setEditingPrice(0);
    setHasUnmappedProducts(false);
    setUnmappedProductsList([]);
  };

  // Función para guardar cambios
  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    // No permitir guardar si hay productos no mapeados
    if (hasUnmappedProducts) {
      toast.error('No se puede guardar: hay productos sin asignar');
      return;
    }

    try {
      setIsUpdating(true);

      const orderToUpdate = orders.find(o => o.id === editingOrder);
      if (!orderToUpdate) return;

      // Convertir productos seleccionados a string
      const productosString = productosSeleccionadosAString(editingProductosSeleccionados);

      // Actualizar todos los campos editables
      await updatePedidoPreconfirmacion(editingOrder, {
        cliente_nombre: editingCustomerName,
        cliente_telefono: editingCustomerPhone,
        direccion: editingCustomerAddress,
        provincia: editingProvince,
        canton: editingCanton,
        distrito: editingDistrict,
        valor_total: editingPrice,
        productos: productosString,
        estado_pedido: editingStatus,
        metodo_pago: editingPaymentMethod,
        confirmado: editingConfirmado,
      });

      // Actualizar el estado local
      setOrders(prev => prev.map(order =>
        order.id === editingOrder
          ? {
              ...order,
              status: editingStatus as any,
              paymentMethod: editingPaymentMethod as any,
              confirmado: editingConfirmado,
              customerName: editingCustomerName,
              customerPhone: editingCustomerPhone,
              customerAddress: editingCustomerAddress,
              customerProvince: editingProvince,
              customerCanton: editingCanton,
              customerDistrict: editingDistrict,
              productos: productosString,
              totalAmount: editingPrice
            }
          : order
      ));

      toast.success('Pedido actualizado correctamente');
      handleCancelEdit();
    } catch (error) {
      console.error('❌ Error al actualizar pedido:', error);
      toast.error('Error al actualizar el pedido');
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para verificar si un pedido está siendo editado
  const isOrderBeingEdited = (orderId: string) => editingOrder === orderId;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <span className="text-sm text-muted-foreground">Cargando pedidos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header mejorado con gradiente */}
      <div className="relative rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20"></div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <AlertTriangle className="h-4 w-4" />
                Panel de gestión de carritos
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Carritos Abandonados y Finalizados
              </h1>
              <p className="text-white/90 text-base">
                Gestiona carritos abandonados (#) y finalizados (letra mayúscula)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={loadData} 
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              <RefreshCw className={cn('w-4 h-4', loading ? 'animate-spin' : '')} />
              <span>Recargar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Estadísticas - Mejoradas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-red-200 dark:border-red-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-red-400/30 to-rose-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Carritos Abandonados</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {filteredOrders.filter(o => o.id.startsWith('#')).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pedidos que empiezan con #</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Carritos Finalizados</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {filteredOrders.filter(o => /^[A-Z]/.test(o.id)).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pedidos que empiezan con letra mayúscula</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total de pedidos</p>
                <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{filteredRecords.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">De {totalRecords} registros</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-purple-200 dark:border-purple-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/30 to-indigo-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Página actual</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{currentPage}</p>
                <p className="text-xs text-muted-foreground mt-1">De {totalPages} páginas</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Filtros - Mejorada */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
        <Card className="relative border-0 shadow-lg bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/50 dark:to-indigo-950/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Filtros y Búsqueda</CardTitle>
                  <CardDescription className="mt-1">
                    Filtra pedidos por período, tipo de carrito, mensajero o búsqueda de texto
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {filteredRecords} resultado{filteredRecords === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Filtros por período */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Período</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateFilter('all');
                  setSelectedDate(undefined);
                  setSelectedDateRange({from: undefined, to: undefined});
                  setSelectedMonth('');
                }}
                className={`${dateFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
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
                className={`${dateFilter === 'today' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
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
                className={`${dateFilter === 'yesterday' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
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
                className={`${dateFilter === 'thisWeek' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
              >
                Esta Semana
              </Button>
            </div>
          </div>

          {/* Filtros por tipo de carrito */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Tipo de Carrito</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={cartTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCartTypeFilter('all')}
                className={`${cartTypeFilter === 'all' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}`}
              >
                Todos
              </Button>
              <Button
                variant={cartTypeFilter === 'abandonados' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCartTypeFilter('abandonados')}
                className={`${cartTypeFilter === 'abandonados' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              >
                🛒 Abandonados
              </Button>
              <Button
                variant={cartTypeFilter === 'finalizados' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCartTypeFilter('finalizados')}
                className={`${cartTypeFilter === 'finalizados' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              >
                ✅ Finalizados
              </Button>
            </div>
          </div>

          {/* Filtros por fecha específica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fecha específica */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Fecha Específica</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !selectedDate && "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      selectedDate.toLocaleDateString('es-CR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    ) : (
                      <span>Seleccionar fecha</span>
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
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Rango de fechas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Rango de Fechas</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !selectedDateRange.from && "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDateRange.from ? (
                      selectedDateRange.to ? (
                        `${selectedDateRange.from.toLocaleDateString('es-CR')} - ${selectedDateRange.to.toLocaleDateString('es-CR')}`
                      ) : (
                        `Desde ${selectedDateRange.from.toLocaleDateString('es-CR')}`
                      )
                    ) : (
                      <span>Seleccionar rango</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    defaultMonth={selectedDateRange.from}
                    selected={selectedDateRange as DateRange}
                    onSelect={(range) => {
                      setSelectedDateRange(range || {from: undefined, to: undefined});
                      setDateFilter('custom');
                      setSelectedDate(undefined);
                      setSelectedMonth('');
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Búsqueda */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, teléfono o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Filtro por mensajero */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Mensajero</Label>
            <Select value={selectedMessenger} onValueChange={setSelectedMessenger}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mensajero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                {uniqueMessengers.map(messenger => (
                  <SelectItem key={messenger} value={messenger}>
                    {messenger}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Tabla de pedidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Carritos Abandonados y Finalizados ({filteredRecords} de {totalRecords})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-800 min-w-[180px] px-4 py-3 text-sm">Cliente</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[130px] px-4 py-3 text-sm">Teléfono</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[250px] px-4 py-3 text-sm">Dirección</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[120px] px-4 py-3 text-sm">Monto</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[140px] px-4 py-3 text-sm">Método de Pago</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[140px] px-4 py-3 text-sm">Tipo</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[130px] px-4 py-3 text-sm">Mensajero</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[130px] px-4 py-3 text-sm">Fecha</TableHead>
                  <TableHead className="font-bold text-gray-800 min-w-[120px] px-4 py-3 text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mb-3 flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay pedidos para mostrar</h3>
                        <p className="text-sm text-gray-500">
                          {orders.length === 0 ? 'No hay pedidos disponibles' : 'No hay pedidos que coincidan con los filtros'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    {/* Cliente */}
                    <TableCell className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-gray-900">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          ID: {order.id}
                        </div>
                      </div>
                    </TableCell>

                    {/* Teléfono */}
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-gray-700 font-mono">
                        {order.customerPhone}
                      </div>
                    </TableCell>

                    {/* Dirección */}
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-gray-700 max-w-[250px]">
                        {order.customerAddress}
                      </div>
                    </TableCell>

                    {/* Monto */}
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        ₡{order.totalAmount.toLocaleString()}
                      </div>
                    </TableCell>

                    {/* Método de Pago */}
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-3 py-1.5 rounded ${
                          order.paymentMethod === 'efectivo' ? 'bg-green-50 text-green-700 border-green-200' :
                          order.paymentMethod === 'sinpe' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          order.paymentMethod === 'tarjeta' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Tipo de Carrito */}
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-3 py-1.5 rounded ${
                          order.id.startsWith('#') ? 'bg-red-50 text-red-700 border-red-200' :
                          /^[A-Z]/.test(order.id) ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {order.id.startsWith('#') ? '🛒 Abandonado' :
                         /^[A-Z]/.test(order.id) ? '⏳ Sin Confirmar' :
                         '❓ Otro'}
                      </Badge>
                    </TableCell>

                    {/* Mensajero */}
                    <TableCell className="px-4 py-3">
                      {order.assignedMessengerId ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {order.assignedMessengerId}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                          Sin asignar
                        </Badge>
                      )}
                    </TableCell>

                    {/* Fecha */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {order.fecha_creacion ? 
                            new Date(order.fecha_creacion).toLocaleDateString('es-CR') : 
                            'Sin fecha'
                          }
                        </span>
                      </div>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(order)}
                        className="text-xs h-8"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t px-3 py-1.5 bg-gray-50/50">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      {/* Modal de edición */}
      <Dialog open={!!editingOrder} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Información del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Cliente</Label>
                <Input
                  value={editingCustomerName}
                  onChange={(e) => setEditingCustomerName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={editingCustomerPhone}
                  onChange={(e) => setEditingCustomerPhone(e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Textarea
                value={editingCustomerAddress}
                onChange={(e) => setEditingCustomerAddress(e.target.value)}
                placeholder="Dirección completa"
                rows={2}
              />
            </div>

            {/* Provincia, Cantón, Distrito */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input
                  value={editingProvince}
                  onChange={(e) => setEditingProvince(e.target.value)}
                  placeholder="Provincia"
                />
              </div>

              <div className="space-y-2">
                <Label>Cantón</Label>
                <Input
                  value={editingCanton}
                  onChange={(e) => setEditingCanton(e.target.value)}
                  placeholder="Cantón"
                />
              </div>

              <div className="space-y-2">
                <Label>Distrito</Label>
                <Input
                  value={editingDistrict}
                  onChange={(e) => setEditingDistrict(e.target.value)}
                  placeholder="Distrito"
                />
              </div>
            </div>

            {/* Productos y Precio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Productos</Label>
                {hasUnmappedProducts ? (
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-800">
                          Productos sin asignar detectados
                        </p>
                        <p className="text-xs text-amber-700">
                          Este pedido contiene productos que no han sido mapeados.
                          Debes ir a la sección de &quot;Productos no encontrados&quot; y asignarlos antes de poder editar este pedido.
                        </p>
                        <div className="mt-2 space-y-1">
                          {unmappedProductsList.map((prod, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-amber-100 text-amber-800 border-amber-300 text-xs"
                            >
                              {prod}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ProductosSelector
                    productos={editingProductosSeleccionados}
                    productosDisponibles={productosDisponibles}
                    onProductosChange={(productos) => {
                      setEditingProductosSeleccionados(productos);
                      // También actualizar el string para mantener sincronizado
                      setEditingProductos(productosSeleccionadosAString(productos));
                    }}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  type="number"
                  value={editingPrice}
                  onChange={(e) => setEditingPrice(Number(e.target.value))}
                  placeholder="Precio total"
                  disabled={hasUnmappedProducts}
                />
              </div>
            </div>

            {/* Estado, Método de Pago y Confirmación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editingStatus} onValueChange={setEditingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="en_ruta">En Ruta</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={editingPaymentMethod} onValueChange={setEditingPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="sinpe">SINPE</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="2pagos">2 Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Confirmación</Label>
                <Select 
                  value={editingConfirmado ? 'true' : 'false'} 
                  onValueChange={(value) => setEditingConfirmado(value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Sin Confirmar</SelectItem>
                    <SelectItem value="true">Confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdating || hasUnmappedProducts}
                className="flex-1"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : hasUnmappedProducts ? (
                  'Asigne productos primero'
                ) : (
                  'Guardar'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
