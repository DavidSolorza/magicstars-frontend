'use client';

import { useMemo, useState, useEffect } from 'react';
import { InventoryTransaction } from '@/lib/types';
import { ProductoInventario, obtenerMovimientosInventario, MovimientoInventario } from '@/lib/supabase-inventario';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Package,
  ShoppingCart,
  RefreshCw,
  XCircle,
  CheckCircle,
  Truck,
  Calendar,
  Loader2,
  Database,
} from 'lucide-react';
import { mockOrders } from '@/lib/mock-api';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InventoryMovementsProps {
  productos: ProductoInventario[];
  limit?: number;
}

export function InventoryMovements({ productos, limit = 20 }: InventoryMovementsProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [movimientosDB, setMovimientosDB] = useState<MovimientoInventario[]>([]);
  const [loadingMovimientosDB, setLoadingMovimientosDB] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Cargar movimientos desde la base de datos (tabla inventario_control)
  useEffect(() => {
    const loadMovimientos = async () => {
      setLoadingMovimientosDB(true);
      setError(null);
      try {
        let fechaDesde = undefined;
        let fechaHasta = undefined;

        if (selectedDate) {
          // Si hay fecha seleccionada, filtrar por ese día completo
          // Para created_at necesitamos el formato completo con hora
          const startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          fechaDesde = startDate.toISOString();
          
          const endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          fechaHasta = endDate.toISOString();
        }

        console.log('📋 [Movimientos] Cargando datos de inventario_control:', {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          tiene_filtro_fecha: !!selectedDate,
        });

        // Obtener TODOS los movimientos de la tabla inventario_control
        const movimientos = await obtenerMovimientosInventario({
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          // No pasar limit para obtener TODOS los registros
        });

        console.log('📋 [Movimientos] Datos obtenidos de inventario_control:', {
          total: movimientos.length,
          primeros_registros: movimientos.slice(0, 3).map(m => ({
            id: m.id,
            producto: m.producto,
            cantidad: m.cantidad,
            fecha: m.fecha || m.created_at || m.timestamp,
            tipo: m.tipo_movimiento || m.tipo,
          })),
        });

        if (movimientos.length > 0) {
          console.log('✅ [Movimientos] Primer registro completo:', movimientos[0]);
          console.log('✅ [Movimientos] Columnas disponibles:', Object.keys(movimientos[0]));
        } else {
          console.warn('⚠️ [Movimientos] No se obtuvieron registros de inventario_control');
        }

        setMovimientosDB(movimientos);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('❌ [Movimientos] Error al cargar movimientos desde inventario_control:', error);
        setError(`Error al cargar datos: ${errorMessage}`);
        setMovimientosDB([]);
      } finally {
        setLoadingMovimientosDB(false);
      }
    };

    loadMovimientos();
  }, [selectedDate, reloadTrigger]);

  // Función para formatear fechas en formato de Costa Rica de forma amigable
  const formatDateCR = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return { fecha: '-', hora: '', relativo: '' };
      
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      const dia = date.getDate();
      const mes = meses[date.getMonth()];
      const anio = date.getFullYear();
      const diaSemana = diasSemana[date.getDay()];
      const horas = date.getHours().toString().padStart(2, '0');
      const minutos = date.getMinutes().toString().padStart(2, '0');
      const segundos = date.getSeconds().toString().padStart(2, '0');
      
      const ahora = new Date();
      const diferenciaMs = ahora.getTime() - date.getTime();
      const diferenciaSegundos = Math.floor(diferenciaMs / 1000);
      const diferenciaMinutos = Math.floor(diferenciaSegundos / 60);
      const diferenciaHoras = Math.floor(diferenciaMinutos / 60);
      const diferenciaDias = Math.floor(diferenciaHoras / 24);
      
      let tiempoRelativo = '';
      if (diferenciaSegundos < 60) {
        tiempoRelativo = 'hace un momento';
      } else if (diferenciaMinutos < 60) {
        tiempoRelativo = diferenciaMinutos === 1 ? 'hace 1 min' : `hace ${diferenciaMinutos} min`;
      } else if (diferenciaHoras < 24) {
        tiempoRelativo = diferenciaHoras === 1 ? 'hace 1 hora' : `hace ${diferenciaHoras} hrs`;
      } else if (diferenciaDias < 7) {
        tiempoRelativo = diferenciaDias === 1 ? 'hace 1 día' : `hace ${diferenciaDias} días`;
      }
      
      // Formato: "Lun, 23 de noviembre de 2025"
      const fechaCompleta = `${diaSemana}, ${dia} de ${mes} de ${anio}`;
      const horaCompleta = `${horas}:${minutos}:${segundos}`;
      
      return {
        fecha: fechaCompleta,
        hora: horaCompleta,
        relativo: tiempoRelativo
      };
    } catch (e) {
      return { fecha: '-', hora: '', relativo: '' };
    }
  };

  // Convertir movimientos de la BD (inventario_control) a formato del componente
  const movementsFromDB = useMemo(() => {
    if (movimientosDB.length === 0) {
      console.log('📋 [Movimientos] No hay datos en movimientosDB');
      return [];
    }

    console.log('📋 [Movimientos] Procesando', movimientosDB.length, 'registros de inventario_control');

    return movimientosDB.map((mov, index) => {
      // Log del primer registro para debugging
      if (index === 0) {
        console.log('📋 [Movimientos] Ejemplo de registro de inventario_control:', {
          keys: Object.keys(mov),
          valores: mov,
        });
      }

      // Intentar encontrar el campo de fecha (probamos varios nombres posibles)
      const camposFecha = ['fecha', 'created_at', 'timestamp', 'fecha_movimiento', 'fecha_creacion', 'fecha_actualizacion', 'fecha_registro'];
      let fechaMovimiento = '';
      for (const campo of camposFecha) {
        if (mov[campo]) {
          fechaMovimiento = mov[campo];
          break;
        }
      }

      // Si no encontramos fecha, usar la fecha actual
      if (!fechaMovimiento) {
        console.warn('⚠️ [Movimientos] No se encontró campo de fecha en registro:', mov);
        fechaMovimiento = new Date().toISOString();
      }

      // Intentar encontrar campos comunes de inventario_control
      const producto = mov.producto || mov.nombre_producto || mov.nombre || mov.producto_nombre || 'Producto desconocido';
      const cantidad = mov.cantidad || mov.cantidad_movimiento || mov.cant || mov.cantidad_cambio || 0;
      const tipoMovimiento = mov.tipo_movimiento || mov.tipo || mov.accion || mov.action_type || mov.tipo_operacion || 'ajuste';
      const motivo = mov.motivo || mov.razon || mov.reason || mov.descripcion || mov.comentario || mov.nota || mov.observaciones || 'Movimiento de inventario';
      const stock = mov.stock || mov.stock_actual || mov.stock_final || mov.cantidad_final || mov.stock_anterior || mov.cantidad_anterior || 0;
      const tienda = mov.tienda || mov.ubicacion || mov.location || mov.tienda_nombre || 'ALL STARS';

      // Mapear tipo de movimiento
      let actionType: InventoryTransaction['actionType'] = 'ajuste';
      if (typeof tipoMovimiento === 'string') {
        const tipoLower = tipoMovimiento.toLowerCase();
        if (tipoLower.includes('entrada') || tipoLower.includes('inicial')) actionType = 'inicial';
        else if (tipoLower.includes('salida')) actionType = 'pedido_montado';
        else if (tipoLower.includes('ajuste')) actionType = 'ajuste';
        else if (tipoLower.includes('devolucion')) actionType = 'pedido_devuelto';
        else if (tipoLower.includes('entrega')) actionType = 'pedido_entregado';
        else if (tipoLower.includes('transferencia')) actionType = 'transferencia';
      }

      return {
        id: mov.id || `mov-${index}-${Date.now()}`,
        inventoryItemId: mov.id || `inv-${index}`,
        inventoryItem: {
          id: `inv-${index}`,
          productId: mov.producto_id || `prod-${index}`,
          product: {
            id: mov.producto_id || `prod-${index}`,
            sku: mov.sku || mov.codigo || `SKU-${index}`,
            name: String(producto),
            category: mov.categoria || 'Inventario',
            price: mov.precio || 0,
          },
          companyId: '1',
          company: {
            id: '1',
            name: String(tienda),
            taxId: '',
            address: '',
            phone: '',
            email: '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          currentStock: Number(stock) || 0,
          minimumStock: mov.stock_minimo || 5,
          maximumStock: mov.stock_maximo || 1000,
          reservedStock: 0,
          availableStock: Number(stock) || 0,
          location: String(tienda),
          lastUpdated: fechaMovimiento,
          createdAt: fechaMovimiento,
          isActive: true,
        },
        actionType,
        quantity: Number(cantidad) || 0,
        previousStock: Math.max(0, (Number(stock) || 0) - (Number(cantidad) || 0)),
        newStock: Number(stock) || 0,
        reason: String(motivo),
        referenceId: mov.pedido_id || mov.id_pedido || mov.referencia_id,
        referenceType: mov.pedido_id || mov.id_pedido ? 'order' : undefined,
        userId: mov.usuario_id || mov.user_id || 'system',
        user: {
          id: mov.usuario_id || mov.user_id || 'system',
          name: mov.usuario || mov.user_name || mov.user || 'Sistema',
          email: mov.email_usuario || 'sistema@magicstars.com',
          role: 'admin' as const,
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        createdAt: fechaMovimiento,
      } as InventoryTransaction;
    })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // No limitar la cantidad - mostrar TODOS los movimientos
  }, [movimientosDB]);

  // Generar movimientos basados en los últimos pedidos (fallback)
  const movementsMock = useMemo(() => {
    const transactions: InventoryTransaction[] = [];
    const now = new Date();

    // Obtener los últimos pedidos
    let recentOrders = mockOrders
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30; // Últimos 30 días para tener más opciones
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filtrar por fecha si está seleccionada
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      recentOrders = recentOrders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= filterDate && orderDate < nextDay;
      });
    }

    recentOrders = recentOrders.slice(0, 50);

    // Crear un mapa de productos por nombre
    const productMap = new Map<string, ProductoInventario>();
    productos.forEach((prod) => {
      const key = prod.producto?.toLowerCase().trim() || '';
      if (key && !productMap.has(key)) {
        productMap.set(key, prod);
      }
    });

    // Generar transacciones basadas en pedidos
    recentOrders.forEach((order, orderIndex) => {
      order.items?.forEach((item, itemIndex) => {
        const productName = item.product.name;
        const productKey = productName.toLowerCase().trim();
        const producto = productMap.get(productKey);

        if (producto) {
          // Determinar el tipo de acción basado en el estado del pedido
          let actionType: InventoryTransaction['actionType'] = 'pedido_montado';
          let quantity = -item.quantity; // Por defecto, resta stock

          if (order.status === 'entregado') {
            actionType = 'pedido_entregado';
            // Ya se descontó, no hay movimiento adicional
            return;
          } else if (order.status === 'devolucion') {
            actionType = 'pedido_devuelto';
            quantity = Math.abs(quantity); // Devuelve stock
          } else if (order.status === 'confirmado' || order.status === 'en_ruta') {
            actionType = 'pedido_montado';
            quantity = -item.quantity; // Descuenta stock
          } else if (order.status === 'reagendado') {
            // Para pedidos reagendados, mantener el descuento
            actionType = 'pedido_montado';
            quantity = -item.quantity;
          }

          const transactionId = `mov-${order.id}-${itemIndex}-${orderIndex}`;
          const baseStock = producto.cantidad || 0;
          const previousStock = baseStock - quantity;
          const newStock = baseStock;

          transactions.push({
            id: transactionId,
            inventoryItemId: `inv-${producto.idx || itemIndex}`,
            inventoryItem: {
              id: `inv-${producto.idx || itemIndex}`,
              productId: item.product.id,
              product: item.product,
              companyId: order.companyId || '1',
              company: order.company || {
                id: '1',
                name: 'Para Machos CR',
                taxId: '',
                address: '',
                phone: '',
                email: '',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              currentStock: newStock,
              minimumStock: 5,
              maximumStock: 1000,
              reservedStock: 0,
              availableStock: newStock,
              location: producto.tienda || 'ALL STARS',
              lastUpdated: order.createdAt,
              createdAt: order.createdAt,
              isActive: true,
            },
            actionType,
            quantity,
            previousStock: Math.max(0, previousStock),
            newStock,
            reason: `Pedido ${order.id} - ${order.customerName}`,
            referenceId: order.id,
            referenceType: 'order',
            userId: order.assignedMessenger?.id || 'system',
            user: (order.assignedMessenger && 'email' in order.assignedMessenger ? order.assignedMessenger : undefined) || {
              id: 'system',
              name: 'Sistema',
              email: 'sistema@magicstars.com',
              role: 'admin' as const,
              phone: '',
              isActive: true,
              createdAt: new Date().toISOString(),
              company: order.company,
              companyId: order.companyId,
            },
            createdAt: order.createdAt,
          });
        }
      });
    });

    // Agregar algunos movimientos adicionales de ajuste manual
    productos.slice(0, 5).forEach((producto, index) => {
      const daysAgo = index + 1;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(10 + index, 30, 0, 0);

      transactions.push({
        id: `adj-${producto.idx || index}`,
        inventoryItemId: `inv-${producto.idx || index}`,
        inventoryItem: {
          id: `inv-${producto.idx || index}`,
          productId: `prod-${producto.idx || index}`,
          product: {
            id: `prod-${producto.idx || index}`,
            sku: `SKU-${producto.idx || index}`,
            name: producto.producto || 'Producto',
            category: 'Inventario',
            price: 0,
          },
          companyId: '1',
          company: {
            id: '1',
            name: producto.tienda || 'ALL STARS',
            taxId: '',
            address: '',
            phone: '',
            email: '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          currentStock: producto.cantidad || 0,
          minimumStock: 5,
          maximumStock: 1000,
          reservedStock: 0,
          availableStock: producto.cantidad || 0,
          location: producto.tienda || 'ALL STARS',
          lastUpdated: date.toISOString(),
          createdAt: date.toISOString(),
          isActive: true,
        },
        actionType: index % 2 === 0 ? 'inicial' : 'ajuste',
        quantity: index % 2 === 0 ? 10 : -2,
        previousStock: (producto.cantidad || 0) - (index % 2 === 0 ? 10 : -2),
        newStock: producto.cantidad || 0,
        reason: index % 2 === 0 ? 'Inventario inicial' : 'Ajuste de stock',
        userId: 'admin-1',
        user: {
          id: 'admin-1',
          name: 'Administrador',
          email: 'admin@magicstars.com',
          role: 'admin',
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        createdAt: date.toISOString(),
      });
    });

    return transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [productos, limit, selectedDate]);

  // Usar directamente los movimientos de la BD (inventario_control)
  // Solo usar mock si no hay datos de la BD
  const movements = movimientosDB.length > 0 ? movimientosDB : movementsMock;

  // Log para debugging
  useEffect(() => {
    if (movimientosDB.length > 0) {
      console.log('✅ [Movimientos] Usando datos de inventario_control:', movimientosDB.length, 'movimientos');
      // Log de las columnas disponibles
      if (movimientosDB[0]) {
        console.log('📊 [Movimientos] Columnas disponibles:', Object.keys(movimientosDB[0]));
      }
    } else if (movementsMock.length > 0) {
      console.log('⚠️ [Movimientos] No hay datos de inventario_control, usando datos mock:', movementsMock.length, 'movimientos');
    } else {
      console.log('ℹ️ [Movimientos] No hay movimientos disponibles');
    }
  }, [movimientosDB.length, movementsMock.length]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'pedido_confirmado':
      case 'pedido_entregado':
      case 'pedido_montado':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'pedido_devuelto':
      case 'pedido_cancelado':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'inicial':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'ajuste':
      case 'ajuste_manual':
        return <ArrowUpDown className="h-4 w-4 text-pink-600" />;
      case 'transferencia':
        return <Truck className="h-4 w-4 text-orange-600" />;
      case 'entrada':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'salida':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pedido_confirmado: 'Pedido Confirmado',
      pedido_entregado: 'Pedido Entregado',
      pedido_montado: 'Pedido Montado',
      pedido_devuelto: 'Devolución',
      pedido_cancelado: 'Pedido Cancelado',
      inicial: 'Inventario Inicial',
      ajuste: 'Ajuste',
      ajuste_manual: 'Ajuste Manual',
      transferencia: 'Transferencia',
      perdida: 'Pérdida',
      entrada: 'Entrada',
      salida: 'Salida',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string, quantity: number) => {
    if (quantity > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (quantity < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loadingMovimientosDB) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Movimientos de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando movimientos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Solo mostrar mensaje de "sin datos" si realmente no hay datos de la BD
  if (movimientosDB.length === 0 && !loadingMovimientosDB) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Movimientos de Inventario
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Datos desde la tabla <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">inventario_control</code>
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No hay datos disponibles</p>
            <p className="text-sm mb-4">
              {selectedDate 
                ? `No se encontraron registros para la fecha seleccionada en la tabla inventario_control`
                : 'No hay registros en la tabla inventario_control'}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Debug: movimientosDB.length = {movimientosDB.length}</p>
              <p>Debug: loadingMovimientosDB = {String(loadingMovimientosDB)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Movimientos de Inventario
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                Datos desde la tabla <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">inventario_control</code>
                {selectedDate && (
                  <> • Movimientos del {format(new Date(selectedDate), "d 'de' MMMM, yyyy", { locale: es })}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {movimientosDB.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {movimientosDB.length} registro{movimientosDB.length !== 1 ? 's' : ''} cargado{movimientosDB.length !== 1 ? 's' : ''} desde la base de datos
                  {movimientosDB[0] && (
                    <> • {Object.keys(movimientosDB[0]).length} columna{Object.keys(movimientosDB[0]).length !== 1 ? 's' : ''}</>
                  )}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setReloadTrigger(prev => prev + 1);
                }}
                disabled={loadingMovimientosDB}
                className="h-7 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingMovimientosDB ? 'animate-spin' : ''}`} />
                {loadingMovimientosDB ? 'Cargando...' : 'Recargar'}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="date-filter" className="text-sm font-medium whitespace-nowrap">
              Filtrar por fecha:
            </Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-auto"
              max={today}
            />
          </div>
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate('')}
              className="h-9"
            >
              Limpiar filtro
            </Button>
          )}
        </div>
      </CardHeader>
      {error && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-semibold">Error:</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}
      <CardContent>
        {movimientosDB.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(movimientosDB[0]).map((key) => {
                    let displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    // Cambiar "Cantidad" por "Stock"
                    if (key.toLowerCase() === 'cantidad') {
                      displayName = 'Stock';
                    }
                    return (
                      <TableHead key={key}>
                        {displayName}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosDB.map((movimiento, index) => (
                  <TableRow key={movimiento.id || `row-${index}`}>
                    {Object.keys(movimientosDB[0]).map((key) => {
                      const value = movimiento[key];
                      let displayValue: any = value;
                      
                      // Formatear valores según el tipo
                      if (value === null || value === undefined) {
                        displayValue = <span className="text-muted-foreground italic">-</span>;
                      } else if (typeof value === 'boolean') {
                        displayValue = (
                          <Badge variant={value ? 'default' : 'secondary'}>
                            {value ? 'Sí' : 'No'}
                          </Badge>
                        );
                      } else if (typeof value === 'object' && value !== null) {
                        displayValue = (
                          <pre className="text-xs bg-slate-100 p-1 rounded overflow-auto max-w-md">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        );
                      } else if (typeof value === 'string' && (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date') || key.toLowerCase().includes('created') || key.toLowerCase().includes('timestamp'))) {
                        // Formatear fechas de forma amigable
                        try {
                          const date = new Date(value);
                          if (!isNaN(date.getTime())) {
                            const fechaInfo = formatDateCR(date);
                            displayValue = (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">
                                  {fechaInfo.fecha}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {fechaInfo.hora} {fechaInfo.relativo && `• ${fechaInfo.relativo}`}
                                </span>
                              </div>
                            );
                          } else {
                            displayValue = <span>{value}</span>;
                          }
                        } catch (e) {
                          displayValue = <span>{value}</span>;
                        }
                      } else if (typeof value === 'number' && key.toLowerCase().includes('cantidad')) {
                        // Resaltar cantidades
                        displayValue = (
                          <span className={`font-semibold ${
                            value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-slate-900'
                          }`}>
                            {value > 0 ? '+' : ''}{value}
                          </span>
                        );
                      } else if (typeof value === 'number') {
                        // Formatear otros números
                        displayValue = (
                          <span className="font-semibold text-slate-900">
                            {value.toLocaleString('es-CR')}
                          </span>
                        );
                      } else {
                        displayValue = <span>{String(value)}</span>;
                      }
                      
                      return (
                        <TableCell key={key}>
                          {displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No hay datos disponibles</p>
            <p className="text-sm mb-4">
              {selectedDate 
                ? `No se encontraron registros para la fecha seleccionada`
                : 'No hay registros en la tabla inventario_control'}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 bg-slate-50 p-3 rounded">
              <p><strong>Estado de carga:</strong></p>
              <p>• movimientosDB.length = {movimientosDB.length}</p>
              <p>• loadingMovimientosDB = {String(loadingMovimientosDB)}</p>
              <p>• Filtro de fecha = {selectedDate || 'ninguno'}</p>
              <p className="mt-2 text-orange-600">
                💡 Revisa la consola del navegador para ver más detalles de la carga de datos
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

