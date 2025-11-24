'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { getLiquidacionesRealesByTienda, getCostaRicaDateISO } from '@/lib/supabase-pedidos';
import { PedidoTest } from '@/lib/types';
import { 
  Building2, 
  Package, 
  TrendingUp, 
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  ArrowRight,
  Plus,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  CreditCard,
  Smartphone,
  User,
  Calculator,
  FileText,
  Receipt,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LiquidacionTiendaData {
  tienda: string;
  pedidos: PedidoTest[];
  totalCollected: number;
  sinpePayments: number;
  cashPayments: number;
  tarjetaPayments: number;
  initialAmount: number;
  finalAmount: number;
  deliveredOrders: number;
  pendingOrders: number;
  returnedOrders: number;
  rescheduledOrders: number;
  averageOrderValue: number;
  topMessenger: string;
  topDistrict: string;
}

export default function TiendaLiquidacion() {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    return getCostaRicaDateISO();
  });
  
  const [liquidacion, setLiquidacion] = useState<LiquidacionTiendaData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filtros para la tabla
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState<string>('todos');
  
  // Modal de pedidos pendientes
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);

  useEffect(() => {
    if (user?.tiendaName) {
      loadLiquidacion();
    }
  }, [user, selectedDate]);

  const loadLiquidacion = async () => {
    if (!user?.tiendaName) return;
    
    try {
      setLoading(true);
      console.log(`💰 Cargando liquidación para tienda: ${user.tiendaName} en fecha: ${selectedDate}`);
      console.log(`📅 Fecha formateada: ${formatDate(selectedDate)}`);
      
      // Usar la misma función que admin pero filtrar solo por la tienda específica
      const liquidaciones = await getLiquidacionesRealesByTienda(selectedDate);
      console.log(`📊 Liquidaciones obtenidas: ${liquidaciones.length}`);
      
      // Filtrar solo la liquidación de la tienda actual
      const liquidacionTienda = liquidaciones.find(l => 
        l.tienda.toLowerCase().trim() === user.tiendaName?.toLowerCase().trim()
      );
      
      if (liquidacionTienda) {
        // Mapear el tipo de la función al tipo esperado
        const liquidacionMapeada: LiquidacionTiendaData = {
          tienda: liquidacionTienda.tienda,
          pedidos: liquidacionTienda.orders,
          totalCollected: liquidacionTienda.totalCollected,
          sinpePayments: liquidacionTienda.sinpePayments,
          cashPayments: liquidacionTienda.cashPayments,
          tarjetaPayments: liquidacionTienda.tarjetaPayments,
          initialAmount: liquidacionTienda.totalValue,
          finalAmount: liquidacionTienda.finalAmount,
          deliveredOrders: liquidacionTienda.deliveredOrders,
          pendingOrders: liquidacionTienda.pendingOrders,
          returnedOrders: liquidacionTienda.returnedOrders,
          rescheduledOrders: liquidacionTienda.rescheduledOrders,
          averageOrderValue: liquidacionTienda.averageOrderValue,
          topMessenger: liquidacionTienda.topMessenger,
          topDistrict: liquidacionTienda.topDistrict
        };
        
        setLiquidacion(liquidacionMapeada);
        console.log('✅ Liquidación encontrada:', liquidacionMapeada);
      } else {
        console.log('⚠️ No se encontró liquidación para la tienda');
        setLiquidacion(null);
      }
    } catch (error) {
      console.error('Error loading liquidacion:', error);
      setLiquidacion(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      // Si la fecha viene en formato YYYY-MM-DD, crear el objeto Date correctamente
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString;
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'entregado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'confirmado': return 'bg-blue-100 text-blue-800';
      case 'devolucion': return 'bg-red-100 text-red-800';
      case 'reagendado': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calcular métricas adicionales
  const metricasAdicionales = useMemo(() => {
    if (!liquidacion) return null;

    const totalPedidos = liquidacion.pedidos.length;
    const pedidosEntregados = liquidacion.deliveredOrders;
    const pedidosAsignados = liquidacion.pedidos.filter(p => p.mensajero_asignado).length;
    
    // Tasa de conversión (entregados / asignados)
    const tasaConversion = pedidosAsignados > 0 ? (pedidosEntregados / pedidosAsignados) * 100 : 0;
    
    // Pedidos restantes (asignados - entregados)
    const pedidosRestantes = pedidosAsignados - pedidosEntregados;
    
    // Pedidos pendientes (todos menos entregados) - esto incluye todos los estados excepto entregado
    const pedidosPendientes = liquidacion.pedidos.filter(p => 
      p.estado_pedido?.toLowerCase() !== 'entregado'
    ).length;
    
    // Tasa de entrega (entregados / total)
    const tasaEntrega = totalPedidos > 0 ? (pedidosEntregados / totalPedidos) * 100 : 0;
    
    // Desglose de pedidos restantes por estado
    const pedidosRestantesDesglose = liquidacion.pedidos
      .filter(p => p.mensajero_asignado && p.estado_pedido?.toLowerCase() !== 'entregado')
      .reduce((acc, pedido) => {
        const estado = pedido.estado_pedido || 'pendiente';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    // Pedidos pendientes para el modal
    const pedidosPendientesList = liquidacion.pedidos.filter(p => 
      p.estado_pedido?.toLowerCase() !== 'entregado'
    );

    return {
      tasaConversion,
      pedidosRestantes,
      pedidosAsignados,
      pedidosRestantesDesglose,
      pedidosPendientes,
      tasaEntrega,
      pedidosPendientesList
    };
  }, [liquidacion]);

  // Filtrar pedidos según los filtros seleccionados
  const pedidosFiltrados = useMemo(() => {
    if (!liquidacion) return [];

    return liquidacion.pedidos.filter(pedido => {
      const cumpleEstado = filtroEstado === 'todos' || pedido.estado_pedido === filtroEstado;
      const cumpleMetodoPago = filtroMetodoPago === 'todos' || 
        (pedido.metodo_pago?.toLowerCase() === filtroMetodoPago.toLowerCase());
      
      return cumpleEstado && cumpleMetodoPago;
    });
  }, [liquidacion, filtroEstado, filtroMetodoPago]);

  // Obtener opciones únicas para los filtros
  const opcionesEstado = useMemo(() => {
    if (!liquidacion) return [];
    const estados = Array.from(new Set(liquidacion.pedidos.map(p => p.estado_pedido).filter(Boolean)));
    return estados.sort();
  }, [liquidacion]);

  const opcionesMetodoPago = useMemo(() => {
    if (!liquidacion) return [];
    const metodos = Array.from(new Set(liquidacion.pedidos.map(p => p.metodo_pago).filter(Boolean)));
    return metodos.sort();
  }, [liquidacion]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 min-h-[60vh]">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground">Cargando liquidación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Liquidación de {user?.tiendaName || 'Mi Tienda'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la liquidación diaria de tu tienda
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/tienda/orders">
              <Filter className="w-4 h-4 mr-2" />
              Ver Pedidos
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/tienda/orders/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* Selector de Fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Seleccionar Fecha de Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Botones de filtro rápido */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros Rápidos
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fecha = new Date();
                    fecha.setDate(fecha.getDate() - 7);
                    setSelectedDate(fecha.toISOString().split('T')[0]);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Última semana (7 días pasados)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fecha = new Date();
                    fecha.setDate(fecha.getDate() - 14);
                    setSelectedDate(fecha.toISOString().split('T')[0]);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Últimos 14 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fecha = new Date();
                    fecha.setDate(fecha.getDate() - 30);
                    setSelectedDate(fecha.toISOString().split('T')[0]);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Últimos 30 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const hoy = new Date();
                    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                    setSelectedDate(primerDia.toISOString().split('T')[0]);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Mes actual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const hoy = new Date();
                    const primerDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                    setSelectedDate(primerDiaMesPasado.toISOString().split('T')[0]);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Mes pasado
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadLiquidacion} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Liquidación para el {formatDate(selectedDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {liquidacion && (
        <>
          {/* Resumen de Liquidación */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                      <p className="text-2xl font-bold">{liquidacion.pedidos.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">100%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">del día</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                      <p className="text-2xl font-bold text-green-600">{liquidacion.deliveredOrders}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-green-600">
                      {liquidacion.pedidos.length > 0 ? Math.round((liquidacion.deliveredOrders / liquidacion.pedidos.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">del total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => metricasAdicionales?.pedidosPendientes && metricasAdicionales.pedidosPendientes > 0 && setShowPendingOrdersModal(true)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pedidos Pendientes</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {metricasAdicionales?.pedidosPendientes ?? liquidacion.pendingOrders}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-medium text-yellow-600">
                          {metricasAdicionales?.tasaEntrega ? Math.round(metricasAdicionales.tasaEntrega) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Tasa de Entrega</p>
                      </div>
                    </div>
                  </div>
                </div>
                {metricasAdicionales?.pedidosPendientes && metricasAdicionales.pedidosPendientes > 0 && (
                  <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Click para ver detalles
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Recaudado</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(liquidacion.totalCollected)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">+8%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">vs ayer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métodos de Pago con Valores Monetarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Efectivo</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(liquidacion.cashPayments)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-green-600">
                      {liquidacion.totalCollected > 0 ? Math.round((liquidacion.cashPayments / liquidacion.totalCollected) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-green-500" 
                    style={{ 
                      width: `${liquidacion.totalCollected > 0 ? Math.min((liquidacion.cashPayments / liquidacion.totalCollected) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₡0</span>
                  <span className="font-medium">{formatCurrency(liquidacion.cashPayments)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">SINPE</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(liquidacion.sinpePayments)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-blue-600">
                      {liquidacion.totalCollected > 0 ? Math.round((liquidacion.sinpePayments / liquidacion.totalCollected) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-blue-500" 
                    style={{ 
                      width: `${liquidacion.totalCollected > 0 ? Math.min((liquidacion.sinpePayments / liquidacion.totalCollected) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₡0</span>
                  <span className="font-medium">{formatCurrency(liquidacion.sinpePayments)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tarjeta</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(liquidacion.tarjetaPayments)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-purple-600">
                      {liquidacion.totalCollected > 0 ? Math.round((liquidacion.tarjetaPayments / liquidacion.totalCollected) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-purple-500" 
                    style={{ 
                      width: `${liquidacion.totalCollected > 0 ? Math.min((liquidacion.tarjetaPayments / liquidacion.totalCollected) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₡0</span>
                  <span className="font-medium">{formatCurrency(liquidacion.tarjetaPayments)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Promedio</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(liquidacion.averageOrderValue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-orange-600">
                      por pedido
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-orange-500" 
                    style={{ 
                      width: `${liquidacion.pedidos.length > 0 ? Math.min((liquidacion.averageOrderValue / 50000) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₡0</span>
                  <span className="font-medium">{formatCurrency(liquidacion.averageOrderValue)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nuevas Métricas de Conversión y Pedidos Restantes */}
          {metricasAdicionales && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tasa de Conversión</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {Math.round(metricasAdicionales.tasaConversion)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-emerald-600">
                        {liquidacion.deliveredOrders}/{metricasAdicionales.pedidosAsignados}
                      </p>
                      <p className="text-xs text-muted-foreground">entregados/asignados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pedidos Restantes</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {metricasAdicionales.pedidosRestantes}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-600">
                        {metricasAdicionales.pedidosRestantes}
                      </p>
                      <p className="text-xs text-muted-foreground">por entregar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Asignados</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {metricasAdicionales.pedidosAsignados}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-indigo-600">
                        {liquidacion.pedidos.length > 0 ? Math.round((metricasAdicionales.pedidosAsignados / liquidacion.pedidos.length) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">del total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Sin Asignar</p>
                        <p className="text-2xl font-bold text-rose-600">
                          {liquidacion.pedidos.length - metricasAdicionales.pedidosAsignados}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-rose-600">
                        {liquidacion.pedidos.length > 0 ? Math.round(((liquidacion.pedidos.length - metricasAdicionales.pedidosAsignados) / liquidacion.pedidos.length) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">del total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Desglose de Pedidos Restantes */}
          {metricasAdicionales && metricasAdicionales.pedidosRestantes > 0 && (
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  Desglose de Pedidos Restantes por Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(metricasAdicionales.pedidosRestantesDesglose).map(([estado, cantidad]) => (
                    <div key={estado} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(estado)}>
                          {estado.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-lg font-bold text-amber-700">{cantidad}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Total de pedidos restantes:</strong> {metricasAdicionales.pedidosRestantes} pedidos 
                    que requieren seguimiento para completar la entrega del día.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen de Pedidos por Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Devoluciones</p>
                      <p className="text-2xl font-bold text-red-600">{liquidacion.returnedOrders}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-600">
                      {liquidacion.pedidos.length > 0 ? Math.round((liquidacion.returnedOrders / liquidacion.pedidos.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">del total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <RotateCcw className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reagendados</p>
                      <p className="text-2xl font-bold text-orange-600">{liquidacion.rescheduledOrders}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-orange-600">
                      {liquidacion.pedidos.length > 0 ? Math.round((liquidacion.rescheduledOrders / liquidacion.pedidos.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">del total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mensajero Principal</p>
                      <p className="text-lg font-bold text-purple-600">{liquidacion.topMessenger || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-purple-600">
                      más pedidos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Distrito Principal</p>
                      <p className="text-lg font-bold text-green-600">{liquidacion.topDistrict || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-green-600">
                      más pedidos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de Liquidación Detallado */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Resumen de Liquidación - {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">TOTALES GENERALES</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Pedidos:</span>
                      <span className="font-semibold">{liquidacion.pedidos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Recaudado:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(liquidacion.totalCollected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Promedio por pedido:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(liquidacion.averageOrderValue)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">ESTADOS DE PEDIDOS</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Entregados:</span>
                      <span className="font-semibold text-green-600">{liquidacion.deliveredOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pendientes:</span>
                      <span className="font-semibold text-yellow-600">{liquidacion.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Devoluciones:</span>
                      <span className="font-semibold text-red-600">{liquidacion.returnedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Reagendados:</span>
                      <span className="font-semibold text-orange-600">{liquidacion.rescheduledOrders}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">MÉTODOS DE PAGO</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Efectivo:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(liquidacion.cashPayments)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">SINPE:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(liquidacion.sinpePayments)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tarjeta:</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(liquidacion.tarjetaPayments)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total:</span>
                      <span className="font-semibold text-gray-600">{formatCurrency(liquidacion.totalCollected)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">MÉTRICAS</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">% Entregados:</span>
                      <span className="font-semibold text-green-600">
                        {liquidacion.pedidos.length > 0 ? Math.round((liquidacion.deliveredOrders / liquidacion.pedidos.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">% Efectivo:</span>
                      <span className="font-semibold text-green-600">
                        {liquidacion.totalCollected > 0 ? Math.round((liquidacion.cashPayments / liquidacion.totalCollected) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">% SINPE:</span>
                      <span className="font-semibold text-blue-600">
                        {liquidacion.totalCollected > 0 ? Math.round((liquidacion.sinpePayments / liquidacion.totalCollected) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">% Tarjeta:</span>
                      <span className="font-semibold text-purple-600">
                        {liquidacion.totalCollected > 0 ? Math.round((liquidacion.tarjetaPayments / liquidacion.totalCollected) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla Completa de Pedidos del Día */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Pedidos del Día - {formatDate(selectedDate)}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/tienda/orders">
                    <Filter className="w-4 h-4 mr-2" />
                    Ver Todos con Filtros
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" onClick={loadLiquidacion}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            
            {/* Filtros para la tabla */}
            <div className="px-6 pb-4 border-b">
              <div className="space-y-4">
                {/* Filtro por Estado */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Filtrar por Estado
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filtroEstado === 'todos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroEstado('todos')}
                      className="flex items-center gap-2"
                    >
                      Todos
                      <Badge variant="secondary" className="ml-1">
                        {liquidacion?.pedidos.length || 0}
                      </Badge>
                    </Button>
                    {opcionesEstado.map(estado => {
                      const cantidad = liquidacion?.pedidos.filter(p => p.estado_pedido === estado).length || 0;
                      return (
                        <Button
                          key={estado}
                          variant={filtroEstado === estado ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFiltroEstado(estado || 'todos')}
                          className="flex items-center gap-2"
                        >
                          <Badge className={`${getStatusColor(estado || 'pendiente')} text-xs`}>
                            {(estado || 'pendiente').charAt(0).toUpperCase() + (estado || 'pendiente').slice(1)}
                          </Badge>
                          <Badge variant="secondary" className="ml-1">
                            {cantidad}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Filtro por Método de Pago */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Filtrar por Método de Pago
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filtroMetodoPago === 'todos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroMetodoPago('todos')}
                      className="flex items-center gap-2"
                    >
                      Todos
                      <Badge variant="secondary" className="ml-1">
                        {liquidacion?.pedidos.length || 0}
                      </Badge>
                    </Button>
                    {opcionesMetodoPago.map(metodo => {
                      const cantidad = liquidacion?.pedidos.filter(p => p.metodo_pago?.toLowerCase() === (metodo || '').toLowerCase()).length || 0;
                      const getMetodoColor = (metodo: string) => {
                        switch (metodo.toLowerCase()) {
                          case 'efectivo': return 'bg-green-100 text-green-800';
                          case 'sinpe': return 'bg-blue-100 text-blue-800';
                          case 'tarjeta': return 'bg-purple-100 text-purple-800';
                          case '2pagos':
                          case '2 pagos': return 'bg-orange-100 text-orange-800';
                          default: return 'bg-gray-100 text-gray-800';
                        }
                      };
                      return (
                        <Button
                          key={metodo}
                          variant={filtroMetodoPago === metodo ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFiltroMetodoPago(metodo || 'todos')}
                          className="flex items-center gap-2"
                        >
                          <Badge className={`${getMetodoColor(metodo || 'sin_metodo')} text-xs`}>
                            {(metodo || 'sin_metodo').charAt(0).toUpperCase() + (metodo || 'sin_metodo').slice(1)}
                          </Badge>
                          <Badge variant="secondary" className="ml-1">
                            {cantidad}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen y acciones */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando <span className="font-semibold text-gray-900">{pedidosFiltrados.length}</span> de{' '}
                      <span className="font-semibold text-gray-900">{liquidacion?.pedidos.length || 0}</span> pedidos
                    </div>
                    {(filtroEstado !== 'todos' || filtroMetodoPago !== 'todos') && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Filtros activos
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFiltroEstado('todos');
                      setFiltroMetodoPago('todos');
                    }}
                    disabled={filtroEstado === 'todos' && filtroMetodoPago === 'todos'}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </div>
            <CardContent>
              {pedidosFiltrados && pedidosFiltrados.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID Pedido
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Método Pago
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Distrito
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mensajero
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Creación
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comprobantes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pedidosFiltrados.map((pedido) => (
                          <tr key={pedido.id_pedido} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-gray-900">{pedido.id_pedido}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {pedido.cliente_nombre || 'Sin nombre'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  📞 {pedido.cliente_telefono || 'Sin teléfono'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <Badge 
                                className={`${getStatusColor(pedido.estado_pedido)} font-semibold px-3 py-1`}
                              >
                                {pedido.estado_pedido?.toUpperCase() || 'PENDIENTE'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">
                                  {formatCurrency(pedido.valor_total)}
                                </p>
                                {pedido.estado_pedido === 'entregado' && (
                                  <p className="text-xs text-green-600">✓ Recaudado</p>
                                )}
                                {(pedido.estado_pedido === 'pendiente' || pedido.estado_pedido === 'confirmado') && (
                                  <p className="text-xs text-yellow-600">⏳ Pendiente</p>
                                )}
                                {pedido.estado_pedido === 'devolucion' && (
                                  <p className="text-xs text-red-600">↩ Devolución</p>
                                )}
                                {pedido.estado_pedido === 'reagendado' && (
                                  <p className="text-xs text-orange-600">🔄 Reagendado</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {pedido.metodo_pago?.toLowerCase() === 'efectivo' && <DollarSign className="w-4 h-4 text-green-600" />}
                                {pedido.metodo_pago?.toLowerCase() === 'sinpe' && <Smartphone className="w-4 h-4 text-blue-600" />}
                                {pedido.metodo_pago?.toLowerCase() === 'tarjeta' && <CreditCard className="w-4 h-4 text-purple-600" />}
                                {(pedido.metodo_pago?.toLowerCase() === '2pagos' || pedido.metodo_pago?.toLowerCase() === '2 pagos') && <TrendingUp className="w-4 h-4 text-orange-600" />}
                                <span className="text-sm text-gray-900">
                                  {(pedido.metodo_pago || 'Sin método').charAt(0).toUpperCase() + (pedido.metodo_pago || 'Sin método').slice(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <p className="text-sm text-gray-900">{pedido.distrito || 'Sin distrito'}</p>
                                <p className="text-xs text-gray-500">{pedido.canton || 'Sin cantón'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                {pedido.mensajero_asignado ? (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-blue-600" />
                                    <span className="text-sm text-gray-900">{pedido.mensajero_asignado}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">Sin asignar</span>
                                )}
                                {pedido.mensajero_concretado && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600">Concretado</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(pedido.fecha_creacion)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {pedido.comprobante_sinpe && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-blue-600" />
                                    <a 
                                      href={pedido.comprobante_sinpe} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      SINPE
                                    </a>
                                  </div>
                                )}
                                {pedido.link_ubicacion && (
                                  <div className="flex items-center gap-1">
                                    <Receipt className="w-3 h-3 text-green-600" />
                                    <a 
                                      href={pedido.link_ubicacion} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-600 hover:text-green-800 underline"
                                    >
                                      Ubicación
                                    </a>
                                  </div>
                                )}
                                {!pedido.comprobante_sinpe && !pedido.link_ubicacion && (
                                  <span className="text-xs text-gray-400">Sin comprobantes</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" asChild>
                                  <Link href="/dashboard/tienda/orders">
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Resumen de la tabla */}
                  <div className="bg-gray-50 px-4 py-3 border-t">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Mostrando {pedidosFiltrados.length} de {liquidacion.pedidos.length} pedidos del {formatDate(selectedDate)}
                        {filtroEstado !== 'todos' && ` (filtrado por estado: ${filtroEstado})`}
                        {filtroMetodoPago !== 'todos' && ` (filtrado por método: ${filtroMetodoPago})`}
                      </span>
                      <div className="flex items-center gap-4">
                        <span>Total Recaudado: {formatCurrency(liquidacion.totalCollected)}</span>
                        <span>Efectivo: {formatCurrency(liquidacion.cashPayments)}</span>
                        <span>SINPE: {formatCurrency(liquidacion.sinpePayments)}</span>
                        <span>Tarjeta: {formatCurrency(liquidacion.tarjetaPayments)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {liquidacion?.pedidos.length === 0 
                      ? "No hay pedidos para esta fecha" 
                      : "No hay pedidos que coincidan con los filtros"
                    }
                  </h3>
                  <p className="mb-4">
                    {liquidacion?.pedidos.length === 0 
                      ? `No se encontraron pedidos para el ${formatDate(selectedDate)}`
                      : `No se encontraron pedidos que coincidan con los filtros seleccionados`
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    {liquidacion?.pedidos.length === 0 ? (
                      <>
                        <Button asChild>
                          <Link href="/dashboard/tienda/orders/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Pedido
                          </Link>
                        </Button>
                        <Button variant="outline" onClick={loadLiquidacion}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Actualizar
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setFiltroEstado('todos');
                          setFiltroMetodoPago('todos');
                        }}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Limpiar Filtros
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!liquidacion && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No hay datos de liquidación</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron pedidos para la tienda {user?.tiendaName} en la fecha: {formatDate(selectedDate)}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={loadLiquidacion}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/tienda/orders/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Pedido
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Pedidos Pendientes */}
      <Dialog open={showPendingOrdersModal} onOpenChange={setShowPendingOrdersModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pedidos Pendientes - {formatDate(selectedDate)}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Total: {metricasAdicionales?.pedidosPendientes || 0} pedidos pendientes
              {metricasAdicionales?.tasaEntrega !== undefined && (
                <> • Tasa de entrega: {Math.round(metricasAdicionales.tasaEntrega)}%</>
              )}
            </p>
          </DialogHeader>
          
          {metricasAdicionales?.pedidosPendientesList && metricasAdicionales.pedidosPendientesList.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead>Distrito</TableHead>
                      <TableHead>Mensajero</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricasAdicionales.pedidosPendientesList.map((pedido) => (
                      <TableRow key={pedido.id_pedido}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            {pedido.id_pedido}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{pedido.cliente_nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-gray-500">
                              📞 {pedido.cliente_telefono || 'Sin teléfono'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(pedido.estado_pedido)} font-semibold px-2 py-1`}>
                            {pedido.estado_pedido?.toUpperCase() || 'PENDIENTE'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(pedido.valor_total)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {pedido.metodo_pago?.toLowerCase() === 'efectivo' && <DollarSign className="w-4 h-4 text-green-600" />}
                            {pedido.metodo_pago?.toLowerCase() === 'sinpe' && <Smartphone className="w-4 h-4 text-blue-600" />}
                            {pedido.metodo_pago?.toLowerCase() === 'tarjeta' && <CreditCard className="w-4 h-4 text-purple-600" />}
                            <span className="text-sm">
                              {(pedido.metodo_pago || 'Sin método').charAt(0).toUpperCase() + (pedido.metodo_pago || 'Sin método').slice(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{pedido.distrito || 'Sin distrito'}</p>
                            <p className="text-xs text-gray-500">{pedido.canton || 'Sin cantón'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pedido.mensajero_asignado ? (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-blue-600" />
                              <span className="text-sm">{pedido.mensajero_asignado}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(pedido.fecha_creacion)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Resumen del modal */}
              <div className="bg-gray-50 px-4 py-3 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Total de pedidos pendientes: <strong>{metricasAdicionales.pedidosPendientesList.length}</strong>
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      Valor total: <strong className="text-gray-900">
                        {formatCurrency(
                          metricasAdicionales.pedidosPendientesList.reduce((sum, p) => sum + p.valor_total, 0)
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay pedidos pendientes</h3>
              <p>Todos los pedidos han sido entregados.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
