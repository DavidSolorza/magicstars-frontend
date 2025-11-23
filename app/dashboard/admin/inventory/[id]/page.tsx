'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockApi } from '@/lib/mock-api';
import { InventoryItem, InventoryTransaction, InventoryAlert } from '@/lib/types';
import { obtenerMovimientosInventario, MovimientoInventario } from '@/lib/supabase-inventario';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Package,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  ArrowUpDown,
  Bell,
  XCircle,
  CheckCircle,
  Edit,
  Database,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function InventoryItemDetail() {
  const params = useParams();
  const router = useRouter();
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [movimientosDB, setMovimientosDB] = useState<MovimientoInventario[]>([]);
  const [loadingMovimientosDB, setLoadingMovimientosDB] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string);
    }
  }, [params.id]);

  const loadData = async (itemId: string) => {
    try {
      setLoading(true);
      
      // Primero obtener el item de inventario
      const itemRes = await mockApi.getInventoryItem(itemId);
      setInventoryItem(itemRes);
      
      // Luego obtener las transacciones y alertas usando el productId
      const [transactionsRes, alertsRes] = await Promise.all([
        mockApi.getInventoryTransactions({ productId: itemRes.productId }),
        mockApi.getInventoryAlerts(),
      ]);
      
      setTransactions(transactionsRes);
      setAlerts(alertsRes.filter(alert => alert.inventoryItemId === itemId));

      // Cargar movimientos desde la base de datos
      await loadMovimientosFromDB(itemRes.product.name);
    } catch (error) {
      console.error('Error loading inventory item:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimientosFromDB = async (productoNombre?: string) => {
    try {
      setLoadingMovimientosDB(true);
      const movimientos = await obtenerMovimientosInventario({
        producto: productoNombre,
        limit: 1000, // Obtener hasta 1000 movimientos
      });
      setMovimientosDB(movimientos);
    } catch (error) {
      console.error('Error al cargar movimientos desde la base de datos:', error);
      setMovimientosDB([]);
    } finally {
      setLoadingMovimientosDB(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Función para formatear fechas en formato de Costa Rica (DD/MM/YYYY HH:MM)
  const formatDateCR = (dateString: string | Date, includeTime: boolean = true) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return '-';
      
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const anio = date.getFullYear();
      
      if (includeTime) {
        const horas = date.getHours().toString().padStart(2, '0');
        const minutos = date.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
      }
      
      return `${dia}/${mes}/${anio}`;
    } catch (e) {
      return '-';
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) return { status: 'out_of_stock', label: 'Agotado', color: 'destructive' };
    if (item.currentStock <= item.minimumStock) return { status: 'low_stock', label: 'Stock Bajo', color: 'destructive' };
    if (item.currentStock > item.maximumStock) return { status: 'overstock', label: 'Sobre Stock', color: 'secondary' };
    return { status: 'in_stock', label: 'En Stock', color: 'default' };
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'entrada': return <Plus className="w-4 h-4 text-green-600" />;
      case 'salida': return <Minus className="w-4 h-4 text-red-600" />;
      case 'ajuste': return <ArrowUpDown className="w-4 h-4 text-blue-600" />;
      case 'pedido_montado': return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case 'pedido_devuelto': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'pedido_entregado': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inicial': return <Package className="w-4 h-4 text-blue-600" />;
      case 'perdida': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <ArrowUpDown className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'entrada': 'Entrada',
      'salida': 'Salida',
      'ajuste': 'Ajuste',
      'pedido_montado': 'Pedido Montado',
      'pedido_devuelto': 'Pedido Devuelto',
      'pedido_entregado': 'Pedido Entregado',
      'inicial': 'Stock Inicial',
      'perdida': 'Pérdida',
      'transferencia': 'Transferencia',
    };
    return labels[actionType] || actionType;
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock': return <XCircle className="w-4 h-4" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4" />;
      case 'overstock': return <TrendingUp className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getAlertSeverity = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!inventoryItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/inventory">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inventario
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p>Producto no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stockStatus = getStockStatus(inventoryItem);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/inventory">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inventario
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{inventoryItem.product.name}</h1>
            <p className="text-muted-foreground">
              SKU: {inventoryItem.product.sku} • {inventoryItem.company.name}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/admin/inventory/${inventoryItem.id}/adjust`}>
            <Edit className="w-4 h-4 mr-2" />
            Ajustar Stock
          </Link>
        </Button>
      </div>

      {/* Product Info */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Información del Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Categoría</p>
              <p className="font-medium">{inventoryItem.product.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Precio</p>
              <p className="font-medium">{formatCurrency(inventoryItem.product.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ubicación</p>
              <p className="font-medium">{inventoryItem.location || 'No especificada'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última Actualización</p>
              <p className="font-medium">
                {formatDateCR(inventoryItem.lastUpdated)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stock Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold">{inventoryItem.currentStock}</p>
              <p className="text-sm text-muted-foreground">unidades</p>
            </div>
            <div className="flex justify-center">
              <Badge variant={stockStatus.color as any} className="text-sm">
                {stockStatus.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Disponible</p>
                <p className="font-medium">{inventoryItem.availableStock}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reservado</p>
                <p className="font-medium">{inventoryItem.reservedStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Límites de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Stock Mínimo</p>
              <p className="font-medium">{inventoryItem.minimumStock}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock Máximo</p>
              <p className="font-medium">{inventoryItem.maximumStock}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="font-medium">
                {formatCurrency(inventoryItem.currentStock * inventoryItem.product.price)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>{alerts.filter(a => !a.isRead).length} alertas</strong> activas para este producto
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Movimientos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Movimientos desde Base de Datos - Tabla Compacta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Movimientos desde Base de Datos - inventario_control ({movimientosDB.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMovimientosDB ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : movimientosDB.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No se encontraron movimientos en la tabla inventario_control.
                  </AlertDescription>
                </Alert>
              ) : (() => {
                // Obtener TODOS los campos únicos de TODOS los registros
                const todosLosCampos = new Set<string>();
                movimientosDB.forEach((movimiento) => {
                  Object.keys(movimiento).forEach((key) => {
                    todosLosCampos.add(key);
                  });
                });
                // Convertir a array y ordenar alfabéticamente para consistencia
                const camposOrdenados = Array.from(todosLosCampos).sort();
                
                // Función helper para formatear valores
                const formatearValor = (value: any) => {
                  if (value === null || value === undefined) {
                    return <span className="text-gray-400">-</span>;
                  }
                  
                  // Si es una fecha, formatearla en formato de Costa Rica
                  if (typeof value === 'string' && (
                    value.includes('T') || 
                    value.includes('-') && value.match(/^\d{4}-\d{2}-\d{2}/)
                  )) {
                    try {
                      const fechaFormateada = formatDateCR(value);
                      if (fechaFormateada !== '-') {
                        const [fecha, hora] = fechaFormateada.split(' ');
                        return (
                          <span className="text-gray-700">
                            <span className="font-medium">{fecha}</span>
                            {hora && (
                              <>
                                <br />
                                <span className="text-gray-500 text-[9px]">
                                  {hora}
                                </span>
                              </>
                            )}
                          </span>
                        );
                      }
                    } catch (e) {
                      // Si falla, continuar con otros formatos
                    }
                  }
                  
                  // También intentar si es un objeto Date directamente
                  if (value instanceof Date && !isNaN(value.getTime())) {
                    const fechaFormateada = formatDateCR(value);
                    if (fechaFormateada !== '-') {
                      const [fecha, hora] = fechaFormateada.split(' ');
                      return (
                        <span className="text-gray-700">
                          <span className="font-medium">{fecha}</span>
                          {hora && (
                            <>
                              <br />
                              <span className="text-gray-500 text-[9px]">
                                {hora}
                              </span>
                            </>
                          )}
                        </span>
                      );
                    }
                  }
                  
                  // Si es un número, formatearlo
                  if (typeof value === 'number') {
                    const isNegative = value < 0;
                    return (
                      <span className={isNegative ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        {isNegative ? '-' : ''}{Math.abs(value).toLocaleString('es-CR')}
                      </span>
                    );
                  }
                  
                  // Si es un booleano, mostrar sí/no con badge
                  if (typeof value === 'boolean') {
                    return (
                      <Badge variant={value ? 'default' : 'secondary'} className="text-[9px] px-1 py-0">
                        {value ? 'Sí' : 'No'}
                      </Badge>
                    );
                  }
                  
                  // Si es un objeto, mostrar JSON compacto
                  if (typeof value === 'object') {
                    return (
                      <span className="text-gray-600 font-mono text-[9px]">
                        {JSON.stringify(value).substring(0, 30)}...
                      </span>
                    );
                  }
                  
                  // Para strings, mostrar tal cual (truncado)
                  const str = String(value);
                  const truncated = str.length > 40 ? str.substring(0, 40) + '...' : str;
                  return <span className="text-gray-800">{truncated}</span>;
                };

                return (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {camposOrdenados.map((key) => (
                            <TableHead 
                              key={key} 
                              className="text-[10px] font-bold px-2 py-1.5 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                            >
                              <div className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientosDB.map((movimiento, index) => (
                          <TableRow 
                            key={index} 
                            className="hover:bg-blue-50 transition-colors border-b border-gray-100"
                          >
                            {camposOrdenados.map((key) => {
                              // Obtener el valor del campo, incluso si no existe en este registro
                              const value = movimiento[key];
                              
                              return (
                                <TableCell 
                                  key={key} 
                                  className="text-[10px] px-2 py-1.5 whitespace-nowrap border-r border-gray-100 last:border-r-0"
                                >
                                  <div 
                                    className="max-w-[150px] truncate" 
                                    title={value !== undefined && value !== null ? String(value) : '-'}
                                  >
                                    {formatearValor(value)}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Movimientos Mock (legacy) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial Detallado de Movimientos (Mock) ({transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No hay movimientos disponibles.
                    </AlertDescription>
                  </Alert>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            {getActionIcon(transaction.actionType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{getActionLabel(transaction.actionType)}</p>
                              <Badge variant="outline" className="text-xs">
                                {transaction.actionType}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {transaction.reason}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">Usuario:</span> {transaction.user.name}
                              </div>
                            <div>
                              <span className="font-medium">Fecha:</span> {formatDateCR(transaction.createdAt)}
                            </div>
                              {transaction.referenceId && (
                                <div>
                                  <span className="font-medium">Referencia:</span> 
                                  <Link href={`/dashboard/admin/orders`} className="text-blue-600 hover:underline ml-1">
                                    {transaction.referenceId}
                                  </Link>
                                </div>
                              )}
                              {transaction.referenceType && (
                                <div>
                                  <span className="font-medium">Tipo:</span> {transaction.referenceType}
                                </div>
                              )}
                            </div>
                            {transaction.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <span className="font-medium">Notas:</span> {transaction.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${transaction.quantity > 0 ? 'text-green-600' : transaction.quantity < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{transaction.previousStock}</span>
                              <span>→</span>
                              <span className="font-medium">{transaction.newStock}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Stock final
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alertas ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 border rounded-lg ${!alert.isRead ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getAlertIcon(alert.alertType)}
                        </div>
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateCR(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getAlertSeverity(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                        {!alert.isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              mockApi.markAlertAsRead(alert.id);
                              setAlerts(prev => prev.map(a => 
                                a.id === alert.id ? { ...a, isRead: true } : a
                              ));
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
