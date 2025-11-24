'use client';

import { useState } from 'react';
import { PedidoTest, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  Calendar, 
  MapPin, 
  User, 
  Building2, 
  CreditCard, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  Users, 
  Navigation, 
  Eye, 
  Edit3,
  BarChart3,
  AlertCircle
} from 'lucide-react';

interface PedidosTableProps {
  pedidos: PedidoTest[];
  loading: boolean;
  onEditPedido: (pedido: PedidoTest) => void;
  onViewPedido: (pedido: PedidoTest) => void;
  onUpdateStatus: (pedido: PedidoTest) => void;
  updatingPedido: string | null;
}

export function PedidosTable({
  pedidos,
  loading,
  onEditPedido,
  onViewPedido,
  onUpdateStatus,
  updatingPedido,
}: PedidosTableProps) {
  const [sortField, setSortField] = useState<keyof PedidoTest | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateSimple = (date: string | null | undefined) => {
    try {
      // Verificar si la fecha es nula o undefined
      if (!date || date === null || date === undefined) {
        return 'Sin fecha';
      }
      
      // Si es una fecha ISO (2025-09-30T00:00:00.000Z), extraer solo la parte de la fecha
      if (typeof date === 'string' && date.includes('T')) {
        const datePart = date.split('T')[0]; // Obtener solo YYYY-MM-DD
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          return `${day}/${month}/${year}`;
        }
      }
      
      // Si es formato YYYY-M-D o YYYY-MM-DD, extraer directamente
      if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
        const parts = date.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${day}/${month}/${year}`;
        }
      }
      
      // Fallback: intentar con Date pero sin zona horaria
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
        return 'Sin fecha';
      }
      
      return dateObj.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha original:', date);
      return 'Sin fecha';
    }
  };

  const formatDateWithTime = (date: string | null | undefined) => {
    try {
      // Verificar si la fecha es nula o undefined
      if (!date || date === null || date === undefined) {
        return 'Sin fecha';
      }
      
      // Si es una fecha ISO (2025-09-30T00:00:00.000Z), extraer solo la parte de la fecha
      if (typeof date === 'string' && date.includes('T')) {
        const datePart = date.split('T')[0]; // Obtener solo YYYY-MM-DD
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          return `${day}/${month}/${year}`;
        }
      }
      
      // Si es formato YYYY-M-D o YYYY-MM-DD, extraer directamente
      if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
        const parts = date.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${day}/${month}/${year}`;
        }
      }
      
      // Fallback: intentar con Date pero sin zona horaria
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
        return 'Sin fecha';
      }
      
      return dateObj.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha con hora:', error, 'Fecha original:', date);
      return 'Sin fecha';
    }
  };

  const getStatusForBadge = (pedido: PedidoTest): OrderStatus => {
    if (pedido.mensajero_concretado) {
      return 'entregado';
    } else if (pedido.mensajero_asignado) {
      return 'en_ruta';
    } else {
      return 'pendiente';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'entregado': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'en_ruta': return <Truck className="w-4 h-4 text-blue-600" />;
      case 'pendiente': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'devolucion': return <Clock className="w-4 h-4 text-red-600" />;
      case 'reagendado': return <Calendar className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'efectivo': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'sinpe': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'tarjeta': return <CreditCard className="w-4 h-4 text-purple-600" />;
      case '2pagos': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleSort = (field: keyof PedidoTest) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPedidos = [...pedidos].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
            </div>
            <span className="text-sm text-muted-foreground">Cargando pedidos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
      <Card className="relative border-0 shadow-lg bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Lista de Pedidos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Información completa de todos los pedidos del sistema
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {pedidos.length} pedido{pedidos.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden">
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <colgroup>
                    <col className="w-[8%]" />
                    <col className="w-[15%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[9%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[6%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-emerald-200 dark:border-emerald-800 h-10">
                      <TableHead 
                        className="font-semibold text-xs px-2 py-2 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors"
                        onClick={() => handleSort('id_pedido')}
                      >
                        <div className="flex items-center gap-1">
                          ID
                          {sortField === 'id_pedido' && (
                            <span className="text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2">Cliente</TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2 hidden md:table-cell">Dirección</TableHead>
                      <TableHead 
                        className="font-semibold text-xs px-2 py-2 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors"
                        onClick={() => handleSort('valor_total')}
                      >
                        <div className="flex items-center gap-1">
                          Valor
                          {sortField === 'valor_total' && (
                            <span className="text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2 hidden lg:table-cell">Pago</TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2">Mensajero</TableHead>
                      <TableHead 
                        className="font-semibold text-xs px-2 py-2 hidden xl:table-cell cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors"
                        onClick={() => handleSort('fecha_creacion')}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          {sortField === 'fecha_creacion' && (
                            <span className="text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2">Estado</TableHead>
                      <TableHead className="font-semibold text-xs px-2 py-2 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {sortedPedidos.map((pedido, index) => (
                  <TableRow 
                    key={pedido.id_pedido} 
                    className="hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200 border-b border-emerald-100/50 dark:border-emerald-900/30 h-auto"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="px-2 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-bold truncate">{pedido.id_pedido}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{pedido.id_pedido}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="space-y-0.5 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-medium text-xs leading-tight truncate">{pedido.cliente_nombre || 'Sin nombre'}</p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{pedido.cliente_nombre || 'Sin nombre'}</p>
                            {pedido.cliente_telefono && <p className="text-xs mt-1">📞 {pedido.cliente_telefono}</p>}
                            {pedido.tienda && <p className="text-xs mt-1">🏪 {pedido.tienda}</p>}
                          </TooltipContent>
                        </Tooltip>
                        {pedido.cliente_telefono && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">📞</span>
                            <span className="text-[10px] text-muted-foreground truncate">{pedido.cliente_telefono}</span>
                          </div>
                        )}
                        {pedido.tienda && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground truncate">{pedido.tienda}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{pedido.tienda}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2 hidden md:table-cell">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-0.5 min-w-0">
                            {pedido.direccion && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                                {pedido.direccion}
                              </p>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              {pedido.distrito && (
                                <span className="text-[10px] text-muted-foreground">{pedido.distrito}</span>
                              )}
                              {pedido.canton && (
                                <span className="text-[10px] text-muted-foreground">• {pedido.canton}</span>
                              )}
                              {pedido.provincia && (
                                <span className="text-[10px] text-muted-foreground">• {pedido.provincia}</span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Dirección completa:</p>
                          {pedido.direccion && <p className="text-sm">{pedido.direccion}</p>}
                          <p className="text-xs mt-1">
                            {[pedido.distrito, pedido.canton, pedido.provincia].filter(Boolean).join(', ')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs">{formatCurrency(pedido.valor_total)}</p>
                        {pedido.productos && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[10px] text-muted-foreground truncate" title={pedido.productos}>
                                {pedido.productos}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Productos:</p>
                              <p className="text-sm">{pedido.productos}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          {getPaymentMethodIcon(pedido.metodo_pago || 'efectivo')}
                          <span className="text-[10px] truncate">
                            {(pedido.metodo_pago || 'Efectivo').charAt(0).toUpperCase() + (pedido.metodo_pago || 'Efectivo').slice(1)}
                          </span>
                        </div>
                        {pedido.numero_sinpe && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">SINPE: {pedido.numero_sinpe}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>SINPE: {pedido.numero_sinpe}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="space-y-0.5 min-w-0">
                        {pedido.mensajero_asignado ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[9px] font-bold text-blue-700">
                                    {pedido.mensajero_asignado.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-xs truncate">{pedido.mensajero_asignado}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Asignado: {pedido.mensajero_asignado}</p>
                              {pedido.mensajero_concretado && (
                                <p className="text-xs mt-1">Concretado: {pedido.mensajero_concretado}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Sin asignar</span>
                        )}
                        {pedido.mensajero_concretado && pedido.mensajero_concretado !== pedido.mensajero_asignado && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-green-600 flex-shrink-0" />
                            <span className="text-[10px] text-green-600 truncate">{pedido.mensajero_concretado}</span>
                          </div>
                        )}
                        {pedido.jornada_ruta && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Navigation className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" />
                                <span className="text-[10px] text-orange-600 truncate">{pedido.jornada_ruta}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Jornada: {pedido.jornada_ruta}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2 hidden xl:table-cell">
                      <div className="space-y-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="text-[10px] text-gray-700 truncate">
                                {formatDateSimple(pedido.fecha_creacion)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Creación: {formatDate(pedido.fecha_creacion || '')}</p>
                            {pedido.fecha_entrega && (
                              <p className="text-xs mt-1">Entrega: {formatDateSimple(pedido.fecha_entrega)}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                        {pedido.fecha_entrega && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span className="text-[10px] text-blue-700 truncate">
                              {formatDateSimple(pedido.fecha_entrega)}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(getStatusForBadge(pedido))}
                        <OrderStatusBadge status={getStatusForBadge(pedido)} />
                      </div>
                      {(pedido.notas || pedido.nota_asesor) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mt-1 flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                              <span className="text-[10px] text-blue-600">Notas</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Notas:</p>
                            {pedido.notas && <p className="text-sm mb-1">{pedido.notas}</p>}
                            {pedido.nota_asesor && <p className="text-sm">Asesor: {pedido.nota_asesor}</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="flex gap-1 justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewPedido(pedido)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver detalles</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditPedido(pedido)}
                              disabled={updatingPedido === pedido.id_pedido}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar pedido</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </TooltipProvider>
          </div>

          {pedidos.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">No se encontraron pedidos</p>
                  <p className="text-sm text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
