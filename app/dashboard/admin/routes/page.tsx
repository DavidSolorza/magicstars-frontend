'use client';

import { useState, useEffect } from 'react';
import { mockMessengers } from '@/lib/mock-messengers';
import { Order, User, OrderStatus } from '@/lib/types';
import { API_URLS, apiRequest } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { getPedidosByFecha, getCostaRicaDateISO, supabasePedidos } from '@/lib/supabase-pedidos';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Truck,
  Download,
  MapPin,
  Route,
  UserCheck,
  Clock,
  Package,
  Navigation,
  Zap,
  Calendar,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminRoutesPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [unassignedAllDates, setUnassignedAllDates] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [messengerFilter, setMessengerFilter] = useState<string>('all');
  const [provinciaFilter, setProvinciaFilter] = useState<string>('all');
  const [cantonFilter, setCantonFilter] = useState<string>('all');
  const [distritoFilter, setDistritoFilter] = useState<string>('all');

  // Nuevo: Estado para fecha seleccionada (por defecto día actual)
  const [selectedDate, setSelectedDate] = useState(getCostaRicaDateISO());

  // Estados para generar rutas
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateRouteDate, setGenerateRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [capacidadNomina, setCapacidadNomina] = useState<string>('30');
  const [capacidadExtra, setCapacidadExtra] = useState<string>('0');
  const [generatingRoutes, setGeneratingRoutes] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultMessage, setResultMessage] = useState({ title: '', description: '', isError: false });

  // Estados para reasignación masiva de mensajero
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [oldMessengerId, setOldMessengerId] = useState<string>('');
  const [newMessengerId, setNewMessengerId] = useState<string>('');
  const [reassignRouteDate, setReassignRouteDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados para asignar pedido individual - mapa de pedido ID a mensajero NOMBRE
  const [messengerSelections, setMessengerSelections] = useState<Record<string, string>>({});

  // Estado para diálogo de resumen por ubicación
  const [showLocationSummaryDialog, setShowLocationSummaryDialog] = useState(false);

  // Auto-refresh cuando el componente se monta
  useEffect(() => {
    loadData();
    loadUnassignedAllDates();
  }, []);

  // Recargar cuando cambia la fecha
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Función helper para normalizar estados de pedido
  const normalizeOrderStatus = (status: string | null | undefined): OrderStatus => {
    if (!status) return 'pendiente';

    const normalizedStatus = status.toLowerCase().trim();

    // Mapeo de variantes de estados a los estados válidos
    const statusMap: Record<string, OrderStatus> = {
      'pendiente': 'pendiente',
      'confirmado': 'confirmado',
      'en_ruta': 'en_ruta',
      'en ruta': 'en_ruta',
      'entregado': 'entregado',
      'devolucion': 'devolucion',
      'devolución': 'devolucion',
      'reagendado': 'reagendado',
      'reagendo': 'reagendado',  // ← Mapear REAGENDO a reagendado
      'cancelado': 'pendiente',  // Cancelado lo mapeamos a pendiente
    };

    return statusMap[normalizedStatus] || 'pendiente';
  };

  // Función para convertir PedidoTest de Supabase a Order del frontend
  const convertPedidoToOrder = (pedido: any): Order => {
    // IMPORTANTE: Solo mirar mensajero_asignado para determinar si está asignado
    // Si mensajero_asignado es null -> pedido SIN asignar
    // Si mensajero_asignado tiene valor -> pedido ASIGNADO
    const mensajeroAsignado = pedido.mensajero_asignado;

    let assignedMessenger = undefined;

    // Si hay un valor en mensajero_asignado, SIEMPRE tratarlo como asignado
    if (mensajeroAsignado && mensajeroAsignado.trim()) {
      const mensajeroNameTrimmed = mensajeroAsignado.trim();
      const mensajeroNameUpper = mensajeroNameTrimmed.toUpperCase();

      // Intentar encontrar el mensajero en mockMessengers (por nombre o ID)
      assignedMessenger = mockMessengers.find(m =>
        m.name.toUpperCase() === mensajeroNameUpper || m.id === mensajeroNameTrimmed
      );

      // Si NO está en mockMessengers, crear un objeto User temporal
      // Esto garantiza que CUALQUIER mensajero en Supabase se muestre como asignado
      if (!assignedMessenger) {
        assignedMessenger = {
          id: `temp-${mensajeroNameUpper}`,
          name: mensajeroNameTrimmed,
          email: `${mensajeroNameUpper.toLowerCase()}@magicstars.com`,
          role: 'mensajero' as const,
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          company: {
            id: 'company-1',
            name: 'Magic Stars',
            taxId: '123456789',
            address: 'San José, Costa Rica',
            phone: '+506 0000-0000',
            email: 'info@magicstars.com',
            isActive: true,
            createdAt: '2024-01-01T08:00:00Z',
            updatedAt: '2024-01-01T08:00:00Z',
          }
        };
      }
    }

    return {
      id: pedido.id_pedido,
      customerName: pedido.cliente_nombre,
      customerPhone: pedido.cliente_telefono,
      customerAddress: pedido.direccion || '',
      customerProvince: pedido.provincia || '',
      customerCanton: pedido.canton || '',
      customerDistrict: pedido.distrito,
      customerLocationLink: pedido.link_ubicacion || undefined,
      items: [],
      productos: pedido.productos,
      totalAmount: Number(pedido.valor_total),
      status: normalizeOrderStatus(pedido.estado_pedido),
      paymentMethod: pedido.metodo_pago?.toLowerCase() as any || 'efectivo',
      createdAt: pedido.fecha_creacion,
      updatedAt: pedido.fecha_creacion,
      origin: 'manual' as const,
      assignedMessenger: assignedMessenger,
      deliveryAddress: pedido.direccion || '',
      notes: pedido.notas || undefined
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando pedidos para fecha:', selectedDate);

      // Consultar pedidos desde Supabase por fecha
      const pedidosSupabase = await getPedidosByFecha(selectedDate);
      console.log('📦 Pedidos obtenidos de Supabase para fecha ' + selectedDate + ':', pedidosSupabase.length);

      // Log de muestra de estados originales con información detallada de mensajero
      if (pedidosSupabase.length > 0) {
        console.log('📋 Primeros 10 pedidos (RAW de Supabase) para ' + selectedDate + ':');
        pedidosSupabase.slice(0, 10).forEach((p: any, index: number) => {
          console.log(`  ${index + 1}. ${p.id_pedido}:`, {
            mensajero_asignado: p.mensajero_asignado,
            mensajero_concretado: p.mensajero_concretado,
            estado_pedido: p.estado_pedido,
            fecha_creacion: p.fecha_creacion,
            cliente: p.cliente_nombre
          });
        });
      }

      // Convertir a formato Order
      const ordersConverted = pedidosSupabase.map(convertPedidoToOrder);
      setOrders(ordersConverted);

      // Log después de conversión con detalles completos
      console.log('📊 Pedidos convertidos para fecha ' + selectedDate + ':', ordersConverted.length);
      if (ordersConverted.length > 0) {
        console.log('📋 Primeros 10 pedidos convertidos:');
        ordersConverted.slice(0, 10).forEach((o: Order, index: number) => {
          console.log(`  ${index + 1}. ${o.id}:`, {
            assignedMessenger: o.assignedMessenger?.name || null,
            hasMessenger: !!o.assignedMessenger,
            status: o.status,
            customerName: o.customerName,
            createdAt: o.createdAt
          });
        });
      }

      // Usar mockMessengers como fuente de usuarios mensajeros
      setUsers(mockMessengers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error al cargar pedidos",
        description: "No se pudieron cargar los pedidos desde la base de datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar pedidos sin asignar de todas las fechas
  const loadUnassignedAllDates = async () => {
    try {
      setLoadingUnassigned(true);
      console.log('🔍 Cargando pedidos sin asignar de todas las fechas');

      // Consultar todos los pedidos sin mensajero asignado
      const { data, error } = await supabasePedidos
        .from('pedidos_auto_test')
        .select('*')
        .is('mensajero_asignado', null)
        .in('estado_pedido', ['PENDIENTE', 'CONFIRMADO', 'REAGENDADO'])
        .order('fecha_creacion', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error al cargar pedidos sin asignar:', error);
        return;
      }

      console.log('📦 Pedidos sin asignar obtenidos de Supabase:', data?.length || 0);

      // Log detallado de los primeros 5 pedidos sin asignar
      if (data && data.length > 0) {
        console.log('📋 Primeros 5 pedidos sin asignar (RAW de Supabase):');
        data.slice(0, 5).forEach((pedido: any, index: number) => {
          console.log(`  ${index + 1}. ${pedido.id_pedido}:`, {
            mensajero_asignado: pedido.mensajero_asignado,
            mensajero_concretado: pedido.mensajero_concretado,
            estado_pedido: pedido.estado_pedido,
            fecha_creacion: pedido.fecha_creacion,
            cliente: pedido.cliente_nombre
          });
        });
      }

      // Convertir a formato Order
      const ordersConverted = (data || []).map(convertPedidoToOrder);

      // Log después de conversión
      console.log('📊 Pedidos sin asignar después de conversión:', ordersConverted.length);
      if (ordersConverted.length > 0) {
        console.log('📋 Primeros 5 pedidos convertidos:');
        ordersConverted.slice(0, 5).forEach((order: Order, index: number) => {
          console.log(`  ${index + 1}. ${order.id}:`, {
            assignedMessenger: order.assignedMessenger?.name || null,
            hasMessenger: !!order.assignedMessenger,
            status: order.status,
            customerName: order.customerName
          });
        });
      }

      setUnassignedAllDates(ordersConverted);
    } catch (error) {
      console.error('❌ Error loading unassigned orders:', error);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  // Función para refrescar toda la vista
  const handleRefreshAll = async () => {
    console.log('🔄 ==================== INICIO REFRESH ====================');
    console.log('🔄 Refrescando vista completa de rutas...');
    await Promise.all([
      loadData(),
      loadUnassignedAllDates()
    ]);
    console.log('✅ ==================== FIN REFRESH ====================');
    toast({
      title: "Vista actualizada",
      description: "Los datos se han recargado correctamente",
    });
  };

  // 1. Función para generar rutas automáticamente
  const handleGenerateRoutes = () => {
    setShowGenerateDialog(true);
  };

  const confirmGenerateRoutes = async () => {
    try {
      setGeneratingRoutes(true);
      setShowGenerateDialog(false);

      console.log('🚀 ==================== GENERAR RUTAS ====================');
      console.log('🚀 Fecha:', generateRouteDate);
      console.log('🚀 Capacidad Nómina:', capacidadNomina);
      console.log('🚀 Capacidad Extra:', capacidadExtra);
      console.log('🚀 Endpoint:', API_URLS.GENERAR_RUTAS);

      const response = await apiRequest(API_URLS.GENERAR_RUTAS, {
        method: 'POST',
        body: JSON.stringify({
          fecha: generateRouteDate,
          capacidad_nomina: parseInt(capacidadNomina) || 30,
          capacidad_extra: parseInt(capacidadExtra) || 0
        })
      });

      console.log('📡 Status de respuesta:', response.status, response.statusText);

      // Intentar parsear la respuesta como JSON
      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      console.log('📡 Respuesta del servidor:', result);
      console.log('📡 Tipo de respuesta:', typeof result);

      if (response.ok) {
        // Respuesta exitosa
        let successMessage = '';

        // Intentar extraer información útil de la respuesta
        if (typeof result === 'string') {
          successMessage = result;
        } else if (result && typeof result === 'object') {
          successMessage = result.message || result.status || JSON.stringify(result);
        }

        console.log('✅ Rutas generadas exitosamente');
        console.log('✅ Mensaje:', successMessage);

        // Mostrar dialog de resultado exitoso
        setResultMessage({
          title: '✅ ¡Rutas generadas exitosamente!',
          description: successMessage || `Las rutas para ${generateRouteDate} se han generado correctamente.`,
          isError: false
        });
        setShowResultDialog(true);

        // Recargar datos
        console.log('🔄 Recargando datos...');
        await handleRefreshAll();
        console.log('✅ ==================== FIN GENERAR RUTAS ====================');
      } else {
        // Error del servidor
        let errorMessage = 'Error al generar rutas';

        if (typeof result === 'string') {
          errorMessage = result;
        } else if (result && typeof result === 'object') {
          errorMessage = result.message || result.error || JSON.stringify(result);
        }

        console.error('❌ Error del servidor:', errorMessage);

        // Mostrar dialog de error con nota adicional
        setResultMessage({
          title: '❌ Error al generar rutas',
          description: `${errorMessage}\n\nNota: Revisa que la cantidad y capacidad de mensajeros activos sea suficiente para cubrir todos los pedidos del día.`,
          isError: true
        });
        setShowResultDialog(true);
      }
    } catch (error) {
      console.error('❌ Error al generar rutas:', error);
      console.error('❌ ==================== FIN GENERAR RUTAS (ERROR) ====================');

      // Mostrar dialog de error
      setResultMessage({
        title: '❌ Error al generar rutas',
        description: error instanceof Error ? error.message : 'Error desconocido al procesar la solicitud',
        isError: true
      });
      setShowResultDialog(true);
    } finally {
      setGeneratingRoutes(false);
    }
  };

  // 2. Función para asignar TODOS los pedidos con cambios pendientes
  const handleAssignAllPendingOrders = async () => {
    try {
      setLoading(true);

      // Obtener todos los pedidos (unassigned, assigned, historical)
      const allOrders = [...unassignedOrders, ...assignedOrdersAll, ...unassignedAllDates];

      // Filtrar solo los pedidos que tienen una selección de mensajero
      const pendingAssignments = Object.entries(messengerSelections)
        .map(([orderId, messengerName]) => {
          const order = allOrders.find(o => o.id === orderId);
          return { orderId, messengerName, currentMessenger: order?.assignedMessenger?.name };
        })
        .filter(({ messengerName, currentMessenger }) => {
          // Solo incluir si hay un mensajero seleccionado Y es diferente al actual
          return messengerName && messengerName !== currentMessenger;
        });

      if (pendingAssignments.length === 0) {
        toast({
          title: "No hay cambios pendientes",
          description: "No se encontraron pedidos con cambios de mensajero.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('🚀 ==================== ASIGNACIÓN MASIVA ====================');
      console.log(`🚀 Asignando ${pendingAssignments.length} pedidos con cambios pendientes`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Procesar cada asignación (con delay para evitar conflictos en Google Sheets)
      for (const { orderId, messengerName } of pendingAssignments) {
        try {
          console.log(`📦 Asignando pedido ${orderId} a ${messengerName}`);

          const response = await apiRequest(API_URLS.ASIGNAR_PEDIDO_INDIVIDUAL, {
            method: 'POST',
            body: JSON.stringify({
              id_pedido: orderId,
              mensajero_asignado: messengerName
            })
          });

          const result = await response.json();
          console.log(`📡 Respuesta para ${orderId}:`, result);

          // El endpoint puede devolver "generado exitosamente" o { "response": "generado exitosamente" }
          const mensaje = typeof result === 'string' ? result : result.response || result.message;
          const esExitoso = response.ok && (
            mensaje === 'generado exitosamente' ||
            mensaje === 'asignado exitosamente' ||
            (typeof mensaje === 'string' && mensaje.toLowerCase().includes('exitosa'))
          );

          if (esExitoso) {
            console.log(`✅ Pedido ${orderId} asignado exitosamente`);
            successCount++;
          } else {
            throw new Error(mensaje || 'Error al asignar pedido');
          }

          // Delay de 500ms entre cada asignación para evitar conflictos en Google Sheets
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Error al asignar pedido ${orderId}:`, error);
          errorCount++;
          errors.push(`${orderId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Limpiar selecciones después de procesar
      setMessengerSelections({});

      // Mostrar resultado
      if (successCount > 0) {
        toast({
          title: `¡${successCount} pedido(s) asignado(s) exitosamente!`,
          description: errorCount > 0
            ? `${errorCount} pedido(s) fallaron. Revisa la consola para más detalles.`
            : 'Todos los pedidos fueron asignados correctamente.',
        });
      }

      if (errorCount > 0) {
        console.error('❌ Errores en asignaciones:', errors);
        if (successCount === 0) {
          toast({
            title: "Error al asignar pedidos",
            description: `Fallaron ${errorCount} asignaciones. Revisa la consola para más detalles.`,
            variant: "destructive",
          });
        }
      }

      console.log(`✅ Completado: ${successCount} éxitos, ${errorCount} errores`);
      console.log('🔄 Recargando datos desde Supabase...');
      await handleRefreshAll();
      console.log('✅ ==================== FIN ASIGNACIÓN MASIVA ====================');

    } catch (error) {
      console.error('❌ Error general al asignar pedidos:', error);
      toast({
        title: "Error al asignar pedidos",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Función para reasignar todos los pedidos de un mensajero a otro
  const confirmReassignMessenger = async () => {
    try {
      setLoading(true);
      setShowReassignDialog(false);

      console.log('🚀 ==================== REASIGNACIÓN MASIVA ====================');
      console.log('🚀 Reasignando pedidos masivamente:', {
        mensajero_antiguo_nombre: oldMessengerId,
        mensajero_actual_nombre: newMessengerId,
        fecha_ruta: reassignRouteDate
      });
      console.log('⚠️  IMPORTANTE: El endpoint recibe NOMBRES, no IDs');

      const response = await apiRequest(API_URLS.REASIGNAR_PEDIDOS_MENSAJERO, {
        method: 'POST',
        body: JSON.stringify({
          mensajero_antiguo: oldMessengerId,
          mensajero_actual: newMessengerId,
          fecha_ruta: reassignRouteDate
        })
      });

      const result = await response.json();
      console.log('📡 Respuesta del servidor:', result);

      // El endpoint puede devolver "generado exitosamente" o { "response": "generado exitosamente" }
      const mensaje = typeof result === 'string' ? result : result.response || result.message;

      // Aceptar múltiples mensajes de éxito
      const successMessages = ['generado exitosamente', 'asignado exitosamente', 'reasignado exitosamente'];
      const isSuccess = response.ok && (
        successMessages.includes(mensaje) ||
        (typeof mensaje === 'string' && mensaje.toLowerCase().includes('exitosa'))
      );

      if (isSuccess) {
        console.log('✅ Reasignación exitosa según servidor');
        toast({
          title: "¡Pedidos reasignados exitosamente!",
          description: `Todos los pedidos de ${oldMessengerId} han sido reasignados a ${newMessengerId}.`,
        });

        // Limpiar selecciones
        setOldMessengerId('');
        setNewMessengerId('');

        console.log('🔄 Recargando datos desde Supabase...');
        await handleRefreshAll();
        console.log('✅ ==================== FIN REASIGNACIÓN ====================');
      } else {
        throw new Error(mensaje || 'Error al reasignar pedidos');
      }
    } catch (error) {
      console.error('❌ Error al reasignar pedidos:', error);
      console.error('❌ ==================== FIN REASIGNACIÓN (ERROR) ====================');
      toast({
        title: "Error al reasignar pedidos",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
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

  const formatDate = (date: string) => {
    // Si la fecha es solo YYYY-MM-DD (sin hora), añadir la hora local para evitar desfase de zona horaria
    let dateObj: Date;

    if (date && date.length === 10 && !date.includes('T')) {
      // Fecha en formato YYYY-MM-DD, añadir hora local para evitar conversión UTC
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }

    return dateObj.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessengerName = (messengerId: string) => {
    const messenger = users.find(
      u => u.id === messengerId && (u.role === 'mensajero' || u.role === 'mensajero-lider')
    );
    return messenger?.name || 'Sin asignar';
  };

  // Handlers para filtros en cascada
  const handleProvinciaChange = (value: string) => {
    setProvinciaFilter(value);
    // Limpiar cantón y distrito cuando cambia la provincia
    setCantonFilter('all');
    setDistritoFilter('all');
  };

  const handleCantonChange = (value: string) => {
    setCantonFilter(value);
    // Limpiar distrito cuando cambia el cantón
    setDistritoFilter('all');
  };

  const handleLimpiarFiltrosUbicacion = () => {
    setProvinciaFilter('all');
    setCantonFilter('all');
    setDistritoFilter('all');
  };

  const getUnassignedOrders = () => {
    const filtered = orders.filter((order: Order) => {
      const hasNoMessenger = !order.assignedMessenger;
      const status = order.status.toLowerCase();
      // Excluir solo estados finales (entregado, devolucion) o eliminados
      const excludedStatuses = ['entregado', 'devolucion', 'cancelado', 'eliminado'];
      const isNotExcluded = !excludedStatuses.includes(status);

      return hasNoMessenger && isNotExcluded;
    });

    // Log detallado de los pedidos sin asignar del día actual
    console.log('🔍 getUnassignedOrders() - Filtrando pedidos sin asignar del día actual');
    console.log(`  - Total orders en estado: ${orders.length}`);
    console.log(`  - Pedidos sin asignar filtrados: ${filtered.length}`);

    if (filtered.length > 0) {
      console.log('📋 Primeros 5 pedidos sin asignar (día actual):');
      filtered.slice(0, 5).forEach((order: Order, index: number) => {
        console.log(`  ${index + 1}. ${order.id}:`, {
          assignedMessenger: order.assignedMessenger?.name || null,
          hasMessenger: !!order.assignedMessenger,
          status: order.status,
          customerName: order.customerName,
          createdAt: order.createdAt
        });
      });
    }

    return filtered;
  };

  const getAssignedOrders = () => {
    const filtered = orders.filter((order: Order) => {
      const hasMessenger = !!order.assignedMessenger;
      // Mostrar todos los pedidos asignados, sin importar el estado
      // Esto permite ver pedidos en cualquier etapa del proceso
      return hasMessenger;
    });

    // Log detallado de los pedidos asignados del día actual
    console.log('🔍 getAssignedOrders() - Filtrando pedidos asignados del día actual');
    console.log(`  - Total orders en estado: ${orders.length}`);
    console.log(`  - Pedidos asignados filtrados: ${filtered.length}`);

    if (filtered.length > 0) {
      console.log('📋 Primeros 5 pedidos asignados (día actual):');
      filtered.slice(0, 5).forEach((order: Order, index: number) => {
        console.log(`  ${index + 1}. ${order.id}:`, {
          assignedMessenger: order.assignedMessenger?.name || null,
          hasMessenger: !!order.assignedMessenger,
          status: order.status,
          customerName: order.customerName,
          createdAt: order.createdAt
        });
      });
    }

    return filtered;
  };

  const unassignedOrders = getUnassignedOrders();
  const assignedOrdersAll = getAssignedOrders();

  // Obtener mensajeros únicos por NOMBRE que tienen pedidos asignados en el día seleccionado
  const messengersMap = new Map<string, User>();

  // Primero, obtener nombres de mensajeros que tienen pedidos asignados
  const messengersWithOrdersToday = new Set<string>();
  assignedOrdersAll.forEach(order => {
    if (order.assignedMessenger?.name) {
      messengersWithOrdersToday.add(order.assignedMessenger.name);
    }
  });

  // Filtrar usuarios por mensajeros que tienen pedidos hoy
  users
    .filter(u => (u.role === 'mensajero' || u.role === 'mensajero-lider') && u.isActive && messengersWithOrdersToday.has(u.name))
    .forEach(messenger => {
      if (!messengersMap.has(messenger.name)) {
        messengersMap.set(messenger.name, messenger);
      }
    });
  const messengers = Array.from(messengersMap.values());

  // Obtener TODOS los mensajeros activos del sistema (para reasignación)
  const allMessengersMap = new Map<string, User>();
  users
    .filter(u => (u.role === 'mensajero' || u.role === 'mensajero-lider') && u.isActive)
    .forEach(messenger => {
      if (!allMessengersMap.has(messenger.name)) {
        allMessengersMap.set(messenger.name, messenger);
      }
    });
  const allMessengers = Array.from(allMessengersMap.values());

  // Obtener provincias únicas de todos los pedidos del día
  const provinciasUnicas = Array.from(
    new Set(
      orders
        .filter(o => o.customerProvince && o.customerProvince.trim() !== '')
        .map(o => o.customerProvince)
    )
  ).sort();

  // Obtener cantones únicos filtrados por provincia seleccionada
  const cantonesUnicos = Array.from(
    new Set(
      orders
        .filter(o => {
          const hasData = o.customerCanton && o.customerCanton.trim() !== '';
          const matchesProvincia = provinciaFilter === 'all' || o.customerProvince === provinciaFilter;
          return hasData && matchesProvincia;
        })
        .map(o => o.customerCanton)
    )
  ).sort();

  // Obtener distritos únicos filtrados por provincia y cantón seleccionados
  const distritosUnicos = Array.from(
    new Set(
      orders
        .filter(o => {
          const hasData = o.customerDistrict && o.customerDistrict.trim() !== '';
          const matchesProvincia = provinciaFilter === 'all' || o.customerProvince === provinciaFilter;
          const matchesCanton = cantonFilter === 'all' || o.customerCanton === cantonFilter;
          return hasData && matchesProvincia && matchesCanton;
        })
        .map(o => o.customerDistrict)
    )
  ).sort();

  // Aplicar filtros a pedidos asignados (usando NOMBRE en vez de ID)
  const assignedOrders = assignedOrdersAll.filter(order => {
    const matchesMessenger = messengerFilter === 'all' || order.assignedMessenger?.name === messengerFilter;
    const matchesProvincia = provinciaFilter === 'all' || order.customerProvince === provinciaFilter;
    const matchesCanton = cantonFilter === 'all' || order.customerCanton === cantonFilter;
    const matchesDistrito = distritoFilter === 'all' || order.customerDistrict === distritoFilter;

    return matchesMessenger && matchesProvincia && matchesCanton && matchesDistrito;
  });

  // Función para organizar pedidos por ubicación (Provincia -> Cantón -> Distrito)
  const getLocationSummary = () => {
    interface DistritoData {
      distrito: string;
      totalPedidos: number;
      mensajeros: Set<string>;
    }

    interface CantonData {
      canton: string;
      distritos: DistritoData[];
    }

    interface ProvinciaData {
      provincia: string;
      cantones: CantonData[];
    }

    const locationMap = new Map<string, Map<string, Map<string, DistritoData>>>();

    // Procesar todos los pedidos asignados del día
    assignedOrdersAll.forEach(order => {
      const provincia = order.customerProvince || 'Sin Provincia';
      const canton = order.customerCanton || 'Sin Cantón';
      const distrito = order.customerDistrict || 'Sin Distrito';
      const mensajero = order.assignedMessenger?.name;

      if (!locationMap.has(provincia)) {
        locationMap.set(provincia, new Map());
      }

      const provinciaMap = locationMap.get(provincia)!;
      if (!provinciaMap.has(canton)) {
        provinciaMap.set(canton, new Map());
      }

      const cantonMap = provinciaMap.get(canton)!;
      if (!cantonMap.has(distrito)) {
        cantonMap.set(distrito, {
          distrito,
          totalPedidos: 0,
          mensajeros: new Set()
        });
      }

      const distritoData = cantonMap.get(distrito)!;
      distritoData.totalPedidos++;
      if (mensajero) {
        distritoData.mensajeros.add(mensajero);
      }
    });

    // Convertir a estructura de array ordenada
    const result: ProvinciaData[] = [];
    locationMap.forEach((cantonesMap, provincia) => {
      const cantones: CantonData[] = [];
      cantonesMap.forEach((distritosMap, canton) => {
        const distritos: DistritoData[] = Array.from(distritosMap.values()).sort((a, b) =>
          a.distrito.localeCompare(b.distrito)
        );
        cantones.push({ canton, distritos });
      });
      cantones.sort((a, b) => a.canton.localeCompare(b.canton));
      result.push({ provincia, cantones });
    });
    result.sort((a, b) => a.provincia.localeCompare(b.provincia));

    return result;
  };

  // Log para depuración
  useEffect(() => {
    console.log('📊 Estado actual de pedidos:');
    console.log('  - Total orders:', orders.length);
    console.log('  - Unassigned orders:', unassignedOrders.length);
    console.log('  - Assigned orders:', assignedOrders.length);

    if (orders.length > 0 && unassignedOrders.length === 0 && assignedOrders.length === 0) {
      console.warn('⚠️ Hay pedidos pero ninguno aparece en las listas!');
      console.log('📋 Muestra de pedidos disponibles:',
        orders.slice(0, 3).map((o: Order) => ({
          id: o.id,
          status: o.status,
          statusType: typeof o.status,
          hasMessenger: !!o.assignedMessenger,
          messenger: o.assignedMessenger?.name
        }))
      );
    }
  }, [orders, unassignedOrders, assignedOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <span className="text-sm text-muted-foreground">Cargando rutas...</span>
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
              <Route className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Truck className="h-4 w-4" />
                Panel de gestión de rutas
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Asignación de Rutas
              </h1>
              <p className="text-white/90 text-base">
                Optimiza y asigna rutas a mensajeros para máxima eficiencia
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRefreshAll}
              disabled={loading || loadingUnassigned}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || loadingUnassigned) ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>
            <Button 
              onClick={handleGenerateRoutes} 
              disabled={loading || generatingRoutes}
              className="flex items-center gap-2 bg-white text-sky-600 hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              {generatingRoutes ? (
                <>
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                  </div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Route className="w-4 h-4" />
                  <span>Generar Rutas</span>
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowReassignDialog(true)} 
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reasignar Mensajero</span>
            </Button>
            <Button 
              onClick={() => setShowLocationSummaryDialog(true)} 
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              variant="outline"
            >
              <MapPin className="w-4 h-4" />
              <span>Resumen por Ubicación</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Selector de Fecha */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <Label htmlFor="date-filter" className="font-semibold">Fecha de rutas:</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(getCostaRicaDateISO())}
            >
              Hoy
            </Button>
            <span className="text-sm text-muted-foreground">
              Mostrando {orders.length} pedidos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-amber-200 dark:border-amber-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/30 to-yellow-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sin Asignar</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{unassignedOrders.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Asignados</p>
                <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{assignedOrders.length}</p>
                <p className="text-xs text-muted-foreground mt-1">En ruta</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                <Truck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mensajeros Activos</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{messengers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Disponibles</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-purple-200 dark:border-purple-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/30 to-indigo-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">En Ruta</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                  {orders.filter(o => o.status === 'en_ruta').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Entregando</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
                <Navigation className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Filtro de Mensajero */}
            <div className="flex items-center gap-4">
              <Label htmlFor="messenger-filter" className="font-semibold whitespace-nowrap min-w-[120px]">
                Mensajero:
              </Label>
              <Select value={messengerFilter} onValueChange={setMessengerFilter}>
                <SelectTrigger id="messenger-filter" className="w-full max-w-[250px]">
                  <SelectValue placeholder="Todos los mensajeros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los mensajeros</SelectItem>
                  {messengers.map(messenger => (
                    <SelectItem key={messenger.name} value={messenger.name}>
                      {messenger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {messengerFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessengerFilter('all')}
                >
                  Limpiar
                </Button>
              )}
            </div>

            {/* Filtros de Ubicación */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro de Provincia */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="provincia-filter" className="font-semibold">
                    Provincia:
                  </Label>
                  <Select value={provinciaFilter} onValueChange={handleProvinciaChange}>
                    <SelectTrigger id="provincia-filter">
                      <SelectValue placeholder="Todas las provincias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las provincias</SelectItem>
                      {provinciasUnicas.map(provincia => (
                        <SelectItem key={provincia} value={provincia}>
                          {provincia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Cantón */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="canton-filter" className="font-semibold">
                    Cantón:
                  </Label>
                  <Select
                    value={cantonFilter}
                    onValueChange={handleCantonChange}
                    disabled={provinciaFilter === 'all'}
                  >
                    <SelectTrigger id="canton-filter">
                      <SelectValue placeholder="Todos los cantones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cantones</SelectItem>
                      {cantonesUnicos.map(canton => (
                        <SelectItem key={canton} value={canton}>
                          {canton}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Distrito */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="distrito-filter" className="font-semibold">
                    Distrito:
                  </Label>
                  <Select
                    value={distritoFilter}
                    onValueChange={setDistritoFilter}
                    disabled={cantonFilter === 'all'}
                  >
                    <SelectTrigger id="distrito-filter">
                      <SelectValue placeholder="Todos los distritos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los distritos</SelectItem>
                      {distritosUnicos.map(distrito => (
                        <SelectItem key={distrito} value={distrito}>
                          {distrito}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botón para limpiar filtros de ubicación */}
              {(provinciaFilter !== 'all' || cantonFilter !== 'all' || distritoFilter !== 'all') && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLimpiarFiltrosUbicacion}
                  >
                    Limpiar filtros de ubicación
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-600" />
            Pedidos Sin Asignar ({unassignedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unassignedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-sm">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone || 'Sin teléfono'}</p>
                  </div>

                  <div>
                    <p className="font-bold text-sm">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.paymentMethod === 'sinpe' ? 'SINPE' : 'Efectivo'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {order.customerProvince && order.customerCanton && order.customerDistrict
                            ? `${order.customerProvince}, ${order.customerCanton}, ${order.customerDistrict}`
                            : 'Sin ubicación'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {order.deliveryAddress || 'Sin dirección exacta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={messengerSelections[order.id] || ''}
                    onValueChange={(value) => setMessengerSelections(prev => ({ ...prev, [order.id]: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Asignar a..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allMessengers.map(messenger => (
                        <SelectItem key={messenger.name} value={messenger.name}>
                          {messenger.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleAssignAllPendingOrders}
                    disabled={!messengerSelections[order.id] || loading}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Asignar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Pedidos Asignados ({assignedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-sm">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone || 'Sin teléfono'}</p>
                  </div>

                  <div>
                    <p className="font-bold text-sm">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.paymentMethod === 'sinpe' ? 'SINPE' : 'Efectivo'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {order.customerProvince && order.customerCanton && order.customerDistrict
                            ? `${order.customerProvince}, ${order.customerCanton}, ${order.customerDistrict}`
                            : 'Sin ubicación'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {order.deliveryAddress || 'Sin dirección exacta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{order.assignedMessenger?.name || 'Sin asignar'}</span>
                  </div>

                  <div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={messengerSelections[order.id] || order.assignedMessenger?.name || ''}
                    onValueChange={(value) => setMessengerSelections(prev => ({ ...prev, [order.id]: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Cambiar a...">
                        {messengerSelections[order.id] || order.assignedMessenger?.name || 'Cambiar a...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allMessengers.map(messenger => (
                        <SelectItem key={messenger.name} value={messenger.name}>
                          {messenger.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleAssignAllPendingOrders}
                    disabled={!messengerSelections[order.id] || messengerSelections[order.id] === order.assignedMessenger?.name || loading}
                  >
                    Reasignar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pedidos Sin Asignar - Todas las Fechas */}
      {unassignedAllDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Pedidos Sin Asignar - Historial ({unassignedAllDates.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUnassignedAllDates}
                disabled={loadingUnassigned}
              >
                {loadingUnassigned ? (
                  <>
                    <div className="relative w-4 h-4 mr-2">
                      <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                    </div>
                    Cargando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </>
                )}
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pedidos pendientes de asignación de fechas anteriores
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unassignedAllDates.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-sm">{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.createdAt}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone || 'Sin teléfono'}</p>
                    </div>

                    <div>
                      <p className="font-bold text-sm">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.paymentMethod === 'sinpe' ? 'SINPE' :
                         order.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {order.customerProvince && order.customerCanton && order.customerDistrict
                              ? `${order.customerProvince}, ${order.customerCanton}, ${order.customerDistrict}`
                              : 'Sin ubicación'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {order.deliveryAddress || 'Sin dirección exacta'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={messengerSelections[order.id] || ''}
                        onValueChange={(value) => setMessengerSelections(prev => ({ ...prev, [order.id]: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Asignar a..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allMessengers.map(messenger => (
                            <SelectItem key={messenger.name} value={messenger.name}>
                              {messenger.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button
                      size="sm"
                      onClick={handleAssignAllPendingOrders}
                      disabled={!messengerSelections[order.id] || loading}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Asignar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para generar rutas */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Rutas Automáticamente</DialogTitle>
            <DialogDescription>
              Configura los parámetros para generar las rutas de los mensajeros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route-date">Fecha de Ruta</Label>
              <Input
                id="route-date"
                type="date"
                value={generateRouteDate}
                onChange={(e) => setGenerateRouteDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidad-nomina">Capacidad Nómina</Label>
              <Input
                id="capacidad-nomina"
                type="number"
                min="1"
                max="100"
                value={capacidadNomina}
                onChange={(e) => setCapacidadNomina(e.target.value)}
                className="w-full"
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Número de pedidos por mensajero de nómina
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidad-extra">Capacidad Extra</Label>
              <Input
                id="capacidad-extra"
                type="number"
                min="0"
                max="100"
                value={capacidadExtra}
                onChange={(e) => setCapacidadExtra(e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Número de pedidos por mensajero extra
              </p>
            </div>

            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Se generarán automáticamente las rutas para la fecha seleccionada con las capacidades especificadas.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmGenerateRoutes}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="relative w-4 h-4 mr-2">
                    <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                  </div>
                  Generando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generar Rutas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para reasignar pedidos masivamente de un mensajero a otro */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Pedidos de Mensajero</DialogTitle>
            <DialogDescription>
              Reasigna todos los pedidos de un mensajero a otro para una fecha específica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-messenger">Mensajero Origen</Label>
              <Select value={oldMessengerId} onValueChange={setOldMessengerId}>
                <SelectTrigger id="old-messenger">
                  <SelectValue placeholder="Selecciona mensajero origen..." />
                </SelectTrigger>
                <SelectContent>
                  {messengers.map((messenger: User) => (
                    <SelectItem key={messenger.name} value={messenger.name}>
                      {messenger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-messenger">Mensajero Destino</Label>
              <Select value={newMessengerId} onValueChange={setNewMessengerId}>
                <SelectTrigger id="new-messenger">
                  <SelectValue placeholder="Selecciona mensajero destino..." />
                </SelectTrigger>
                <SelectContent>
                  {allMessengers.map((messenger: User) => (
                    <SelectItem key={messenger.name} value={messenger.name}>
                      {messenger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reassign-date">Fecha de Ruta</Label>
              <Input
                id="reassign-date"
                type="date"
                value={reassignRouteDate}
                onChange={(e) => setReassignRouteDate(e.target.value)}
                className="w-full"
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta acción reasignará TODOS los pedidos del mensajero origen al mensajero destino para la fecha seleccionada.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReassignDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmReassignMessenger}
              disabled={!oldMessengerId || !newMessengerId || oldMessengerId === newMessengerId || loading}
            >
              {loading ? (
                <>
                  <div className="relative w-4 h-4 mr-2">
                    <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                  </div>
                  Reasignando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reasignar Pedidos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resultado de Generación de Rutas */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultMessage.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">{resultMessage.description}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resumen por Ubicación */}
      <Dialog open={showLocationSummaryDialog} onOpenChange={setShowLocationSummaryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de Pedidos por Ubicación</DialogTitle>
            <DialogDescription>
              Pedidos del {(() => {
                const [year, month, day] = selectedDate.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString('es-CR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {getLocationSummary().map((provincia) => (
              <div key={provincia.provincia} className="space-y-4">
                {/* Título de Provincia */}
                <h3 className="text-xl font-bold text-blue-700 border-b-2 border-blue-200 pb-2">
                  {provincia.provincia}
                </h3>

                {/* Cantones */}
                {provincia.cantones.map((canton) => (
                  <div key={canton.canton} className="ml-4 space-y-3">
                    {/* Título de Cantón */}
                    <h4 className="text-lg font-semibold text-blue-600">
                      {canton.canton}
                    </h4>

                    {/* Tarjetas de Distritos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 ml-4">
                      {canton.distritos.map((distrito) => (
                        <Card key={distrito.distrito} className="border hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2 pt-3 px-3">
                            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{distrito.distrito}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1.5 px-3 pb-3">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                              <span className="text-xs font-semibold">
                                {distrito.totalPedidos} {distrito.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                              </span>
                            </div>

                            {distrito.mensajeros.size > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                  <Truck className="w-3 h-3 flex-shrink-0" />
                                  <span>Mensajeros:</span>
                                </div>
                                <div className="flex flex-wrap gap-0.5">
                                  {Array.from(distrito.mensajeros).map((mensajero) => (
                                    <Badge
                                      key={mensajero}
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {mensajero}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {getLocationSummary().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay pedidos asignados para esta fecha
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowLocationSummaryDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
