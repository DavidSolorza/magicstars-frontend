'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PedidoTest } from '@/lib/types';
import { useTiendaPedidos } from '@/hooks/use-tienda-pedidos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Loader2,
  Edit3,
  Save,
  CheckCircle,
  Eye,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  User,
  MapPin,
  CreditCard,
  Phone,
  ShoppingCart,
  Building2,
  ArrowLeft,
  Search,
  Filter,
  Plus,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

// Componentes personalizados
import { DateFilters } from '@/components/dashboard/date-filters';
import { PedidosStats } from '@/components/dashboard/pedidos-stats';
import { PedidosFilters } from '@/components/dashboard/pedidos-filters';
import { PedidosTable } from '@/components/dashboard/pedidos-table';
import { PedidosPagination } from '@/components/dashboard/pedidos-pagination';
import { StatusUpdateModal } from '@/components/dashboard/status-update-modal';

export default function TiendaOrdersPage() {
  const { user } = useAuth();
  const {
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
    // Nuevas funciones de gestión
    crearPedido,
    confirmarPedido,
    desconfirmarPedido,
    eliminarPedido,
    obtenerLiquidacion,
  } = useTiendaPedidos(user?.tiendaName || '');

  // Estados para modales
  const [selectedPedido, setSelectedPedido] = useState<PedidoTest | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [updatingPedido, setUpdatingPedido] = useState<string | null>(null);

  // Estados para edición
  const [editForm, setEditForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    direccion: '',
    distrito: '',
    canton: '',
    provincia: '',
    valor_total: 0,
    estado: '',
    mensajero: '',
    fecha: '',
    notas: '',
    metodo_pago: '',
    nota_asesor: '',
    productos: ''
  });

  // Estados para creación de pedido
  const [createForm, setCreateForm] = useState({
    idx: 0,
    cliente_nombre: '',
    cliente_telefono: '',
    direccion: '',
    distrito: '',
    canton: '',
    provincia: '',
    valor_total: 0,
    metodo_pago: '',
    productos: '',
    notas: '',
    tienda: user?.tiendaName || '',
    link_ubicacion: null,
    nota_asesor: null,
    jornada_ruta: '',
    estado_pedido: null,
    fecha_entrega: null,
    comprobante_sinpe: null,
    numero_sinpe: null,
    efectivo_2_pagos: null,
    sinpe_2_pagos: null,
    mensajero_asignado: null,
    mensajero_concretado: null,
    confirmado: false
  });

  // Estados para confirmación/eliminación
  const [confirmReason, setConfirmReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Estados para actualización de estado
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleEditPedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setEditForm({
      cliente_nombre: pedido.cliente_nombre || '',
      cliente_telefono: pedido.cliente_telefono || '',
      direccion: pedido.direccion || '',
      distrito: pedido.distrito || '',
      canton: pedido.canton || '',
      provincia: pedido.provincia || '',
      valor_total: pedido.valor_total || 0,
      estado: pedido.estado_pedido || '',
      mensajero: pedido.mensajero_asignado || '',
      fecha: pedido.fecha_entrega || '',
      notas: pedido.notas || '',
      metodo_pago: pedido.metodo_pago || '',
      nota_asesor: pedido.nota_asesor || '',
      productos: pedido.productos || ''
    });
    setIsEditModalOpen(true);
  };

  const handleViewPedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setIsDetailModalOpen(true);
  };

  const handleQuickStatusUpdate = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setIsStatusUpdateModalOpen(true);
  };

  // Funciones de gestión de pedidos
  const handleCreatePedido = () => {
    setCreateForm({
      idx: 0,
      cliente_nombre: '',
      cliente_telefono: '',
      direccion: '',
      distrito: '',
      canton: '',
      provincia: '',
      valor_total: 0,
      metodo_pago: '',
      productos: '',
      notas: '',
      tienda: user?.tiendaName || '',
      link_ubicacion: null,
      nota_asesor: null,
      jornada_ruta: '',
      estado_pedido: null,
      fecha_entrega: null,
      comprobante_sinpe: null,
      numero_sinpe: null,
      efectivo_2_pagos: null,
      sinpe_2_pagos: null,
      mensajero_asignado: null,
      mensajero_concretado: null,
      confirmado: false
    });
    setIsCreateModalOpen(true);
  };

  const handleConfirmPedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setConfirmReason('');
    setIsConfirmModalOpen(true);
  };

  const handleDeletePedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  const handleSaveCreate = async () => {
    if (!user?.name) return;

    const result = await crearPedido(createForm);
    if (result.success) {
      setIsCreateModalOpen(false);
      setCreateForm({
        idx: 0,
        cliente_nombre: '',
        cliente_telefono: '',
        direccion: '',
        distrito: '',
        canton: '',
        provincia: '',
        valor_total: 0,
        metodo_pago: '',
        productos: '',
        notas: '',
        tienda: user?.tiendaName || '',
        link_ubicacion: null,
        nota_asesor: null,
        jornada_ruta: '',
        estado_pedido: null,
        fecha_entrega: null,
        comprobante_sinpe: null,
        numero_sinpe: null,
        efectivo_2_pagos: null,
        sinpe_2_pagos: null,
        mensajero_asignado: null,
        mensajero_concretado: null,
        confirmado: false
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedPedido || !user?.name) return;

    const result = await confirmarPedido(selectedPedido.id_pedido, user.name);
    if (result.success) {
      setIsConfirmModalOpen(false);
      setSelectedPedido(null);
    }
  };

  const handleDeleteAction = async () => {
    if (!selectedPedido || !user?.name) return;

    const result = await eliminarPedido(selectedPedido.id_pedido, user.name, deleteReason);
    if (result.success) {
      setIsDeleteModalOpen(false);
      setSelectedPedido(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPedido) return;

    const updates: Partial<PedidoTest> = {};
    
    // Información del cliente
    if (editForm.cliente_nombre) updates.cliente_nombre = editForm.cliente_nombre;
    if (editForm.cliente_telefono) updates.cliente_telefono = editForm.cliente_telefono;
    
    // Dirección
    if (editForm.direccion) updates.direccion = editForm.direccion;
    if (editForm.distrito) updates.distrito = editForm.distrito;
    if (editForm.canton) updates.canton = editForm.canton;
    if (editForm.provincia) updates.provincia = editForm.provincia;
    
    // Valor y pago
    if (editForm.valor_total) updates.valor_total = editForm.valor_total;
    if (editForm.metodo_pago) updates.metodo_pago = editForm.metodo_pago;
    
    // Estado y mensajero
    if (editForm.estado) updates.estado_pedido = editForm.estado;
    if (editForm.mensajero) updates.mensajero_asignado = editForm.mensajero;
    if (editForm.fecha) updates.fecha_entrega = editForm.fecha;
    
    // Notas y productos
    if (editForm.notas) updates.notas = editForm.notas;
    if (editForm.nota_asesor) updates.nota_asesor = editForm.nota_asesor;
    if (editForm.productos) updates.productos = editForm.productos;

    setUpdatingPedido(selectedPedido.id_pedido);
    const success = await updatePedidoStatus(selectedPedido.id_pedido, updates, user?.name || 'Tienda');
    setUpdatingPedido(null);
    
    if (success) {
      setIsEditModalOpen(false);
    }
  };

  // Función para manejar actualización desde el modal
  const handleModalUpdate = async (updates: Partial<PedidoTest>) => {
    if (!selectedPedido) return false;
    
    try {
      setUpdatingStatus(true);
      const success = await updatePedidoStatus(selectedPedido.id_pedido, updates, user?.name || 'Tienda');
      
      if (success) {
        setIsStatusUpdateModalOpen(false);
        setSelectedPedido(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== 'all' && value !== ''
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'entregado':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pendiente':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'asignado':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'en_ruta':
        return <Package className="w-4 h-4 text-purple-600" />;
      case 'devolucion':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'reagendado':
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'asignado':
        return 'bg-blue-100 text-blue-800';
      case 'en_ruta':
        return 'bg-purple-100 text-purple-800';
      case 'devolucion':
        return 'bg-red-100 text-red-800';
      case 'reagendado':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'efectivo':
        return '💵';
      case 'sinpe':
        return '📱';
      case 'tarjeta':
        return '💳';
      case '2pagos':
      case '2 pagos':
        return '💰';
      default:
        return '❓';
    }
  };

  if (loading && pedidos.length === 0) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/tienda">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              Pedidos de {user?.tiendaName || 'Mi Tienda'}
            </h1>
            <p className="text-muted-foreground">
              Gestiona los pedidos de tu tienda con información completa y actualizada
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasServerSideFilters ? (
                <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos filtrados</>
              ) : (
                <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos totales</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleCreatePedido} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
          
          <Button onClick={loadPedidos} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                <p className="text-2xl font-bold">{stats.entregados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{stats.sinAsignar + stats.asignados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Fecha */}
      <DateFilters
        dateFilter={filters.dateFilter}
        specificDate={filters.specificDate}
        dateRange={filters.dateRange}
        showFutureOrders={filters.showFutureOrders}
        onDateFilterChange={(filter) => updateFilters({ dateFilter: filter })}
        onSpecificDateChange={(date) => updateFilters({ specificDate: date })}
        onDateRangeChange={(range) => updateFilters({ dateRange: range })}
        onShowFutureOrdersChange={(show) => updateFilters({ showFutureOrders: show })}
        onClearFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Filtros de Pedidos */}
      <PedidosFilters
        filters={{ ...filters, searchQuery: filters.searchTerm }}
        filterOptions={filterOptions}
        stats={stats}
        onFilterChange={updateFilters}
        onClearFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        onExecuteSearch={loadPedidos}
      />

      {/* Tabla de Pedidos - Estilo Mensajeros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pedidos Recientes ({pagination.totalPedidos})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ID Pedido</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Teléfono</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha Creación</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Confirmado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Método Pago</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Dirección</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Distrito</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cantón</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Provincia</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mensajero</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha Entrega</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Productos</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Notas</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id_pedido} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {pedido.id_pedido}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{pedido.cliente_nombre || 'Sin nombre'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-gray-600">
                        {pedido.cliente_telefono || 'Sin teléfono'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(pedido.fecha_creacion)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={pedido.estado_pedido === 'entregado' ? 'default' : 
                               pedido.estado_pedido === 'pendiente' ? 'secondary' : 'outline'}
                        className={pedido.estado_pedido === 'entregado' ? 'bg-green-100 text-green-800' : 
                                 pedido.estado_pedido === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                                 pedido.estado_pedido === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                                 pedido.estado_pedido === 'devolucion' ? 'bg-red-100 text-red-800' :
                                 pedido.estado_pedido === 'reagendado' ? 'bg-orange-100 text-orange-800' :
                                 'bg-gray-100 text-gray-800'}
                      >
                        {pedido.estado_pedido?.toUpperCase() || 'PENDIENTE'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {pedido.estado_pedido === 'confirmado' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Sí</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">No</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(pedido.valor_total)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {pedido.metodo_pago?.toUpperCase() || 'SIN ESPECIFICAR'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={pedido.direccion}>
                          {pedido.direccion || 'Sin especificar'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {pedido.distrito || 'Sin especificar'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {pedido.canton || 'Sin especificar'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {pedido.provincia || 'Sin especificar'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={pedido.mensajero_concretado || pedido.mensajero_asignado || 'Sin asignar'}>
                          {pedido.mensajero_concretado || pedido.mensajero_asignado || 'Sin asignar'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {pedido.fecha_entrega ? formatDate(pedido.fecha_entrega) : 'No entregado'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={pedido.productos}>
                          {pedido.productos || 'Sin productos'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={pedido.notas || pedido.nota_asesor || undefined}>
                          {pedido.notas || pedido.nota_asesor || 'Sin notas'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPedido(pedido)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditPedido(pedido)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Editar pedido completo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      <PedidosPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalPedidos={pagination.totalPedidos}
        pageSize={pagination.pageSize}
        hasServerSideFilters={hasServerSideFilters}
        onPageChange={(page) => updatePagination({ currentPage: page })}
        onPageSizeChange={(pageSize) => updatePagination({ pageSize, currentPage: 1 })}
      />

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Editor Completo de Pedido - {selectedPedido?.id_pedido}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Edita todos los campos del pedido. Los cambios se guardarán automáticamente.
            </p>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-6">
              {/* Información Actual del Pedido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Información Actual del Pedido
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Cliente:</span>
                    <p className="font-semibold">{selectedPedido.cliente_nombre || 'Sin nombre'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Valor:</span>
                    <p className="font-semibold text-green-600">{formatCurrency(selectedPedido.valor_total)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Estado:</span>
                    <p className="font-semibold">{selectedPedido.estado_pedido || 'Pendiente'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Mensajero:</span>
                    <p className="font-semibold">{selectedPedido.mensajero_concretado || selectedPedido.mensajero_asignado || 'Sin asignar'}</p>
                  </div>
                </div>
              </div>
              {/* Información del Cliente */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Nombre del Cliente *</Label>
                    <Input 
                      value={editForm.cliente_nombre} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                      placeholder="Nombre completo del cliente"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Teléfono *</Label>
                    <Input 
                      value={editForm.cliente_telefono} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                      placeholder="Número de teléfono"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dirección de Entrega
                </h3>
                <div>
                  <Label className="text-sm font-medium">Dirección Completa *</Label>
                  <Input 
                    value={editForm.direccion} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Dirección completa de entrega"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Distrito *</Label>
                    <Input 
                      value={editForm.distrito} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, distrito: e.target.value }))}
                      placeholder="Distrito"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cantón *</Label>
                    <Input 
                      value={editForm.canton} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, canton: e.target.value }))}
                      placeholder="Cantón"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Provincia *</Label>
                    <Input 
                      value={editForm.provincia} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, provincia: e.target.value }))}
                      placeholder="Provincia"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Valor y Pago */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Valor y Método de Pago
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Valor Total (₡) *</Label>
                    <Input 
                      type="number"
                      value={editForm.valor_total} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, valor_total: Number(e.target.value) }))}
                      placeholder="0"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor actual: {formatCurrency(selectedPedido.valor_total)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Método de Pago *</Label>
                    <Select value={editForm.metodo_pago} onValueChange={(value) => setEditForm(prev => ({ ...prev, metodo_pago: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                        <SelectItem value="sinpe">📱 SINPE</SelectItem>
                        <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                        <SelectItem value="2pagos">💰 2 Pagos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Estado y Mensajero */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Estado y Logística
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Estado del Pedido *</Label>
                    <Select value={editForm.estado} onValueChange={(value) => setEditForm(prev => ({ ...prev, estado: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">⏰ Pendiente</SelectItem>
                        <SelectItem value="confirmado">✅ Confirmado</SelectItem>
                        <SelectItem value="asignado">👤 Asignado</SelectItem>
                        <SelectItem value="en_ruta">🚚 En Ruta</SelectItem>
                        <SelectItem value="entregado">📦 Entregado</SelectItem>
                        <SelectItem value="devolucion">↩️ Devolución</SelectItem>
                        <SelectItem value="reagendado">🔄 Reagendado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estado actual: {selectedPedido.estado_pedido || 'Pendiente'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mensajero Asignado</Label>
                    <Input 
                      value={editForm.mensajero} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, mensajero: e.target.value }))}
                      placeholder="Nombre del mensajero"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Actual: {selectedPedido.mensajero_concretado || selectedPedido.mensajero_asignado || 'Sin asignar'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha de Entrega</Label>
                    <Input 
                      type="datetime-local"
                      value={editForm.fecha} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, fecha: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Productos del Pedido
                </h3>
                <div>
                  <Label className="text-sm font-medium">Descripción de Productos *</Label>
                  <Textarea 
                    value={editForm.productos} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, productos: e.target.value }))}
                    placeholder="Lista detallada de productos (ej: 1 X 15 DAY, 2 X GOTAS CLOROFILA)"
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Productos actuales: {selectedPedido.productos || 'Sin productos especificados'}
                  </p>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Notas y Comentarios
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Notas del Cliente</Label>
                    <Textarea 
                      value={editForm.notas} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Notas adicionales del cliente..."
                      rows={3}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Notas actuales: {selectedPedido.notas || 'Sin notas del cliente'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nota del Asesor</Label>
                    <Textarea 
                      value={editForm.nota_asesor} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, nota_asesor: e.target.value }))}
                      placeholder="Notas internas del asesor..."
                      rows={3}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Notas actuales: {selectedPedido.nota_asesor || 'Sin notas del asesor'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                <div className="text-sm text-muted-foreground">
                  <p>💡 <strong>Tip:</strong> Los campos marcados con * son obligatorios</p>
                  <p>🔄 Los cambios se aplicarán inmediatamente al guardar</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={updatingPedido === selectedPedido.id_pedido}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updatingPedido === selectedPedido.id_pedido ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Actualización de Estado Reutilizable */}
      <StatusUpdateModal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => {
          setIsStatusUpdateModalOpen(false);
          setSelectedPedido(null);
        }}
        pedido={selectedPedido}
        onUpdate={handleModalUpdate}
        updating={updatingStatus}
        userRole="tienda"
      />

      {/* Modal de Detalle del Pedido */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle del Pedido</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">ID del Pedido</Label>
                  <p className="text-lg font-bold">{selectedPedido.id_pedido}</p>
                </div>
                <div>
                  <Label className="font-semibold">Valor Total</Label>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedPedido.valor_total)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Cliente</Label>
                  <p>{selectedPedido.cliente_nombre || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{selectedPedido.cliente_telefono || 'Sin teléfono'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Dirección</Label>
                  <p>{selectedPedido.direccion || 'Sin dirección'}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPedido.distrito}, {selectedPedido.canton}, {selectedPedido.provincia}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Estado</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedPedido.estado_pedido || 'pendiente')}
                    <Badge className={getStatusColor(selectedPedido.estado_pedido || 'pendiente')}>
                      {selectedPedido.estado_pedido || 'Pendiente'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Método de Pago</Label>
                  <p className="flex items-center gap-2">
                    {getPaymentMethodIcon(selectedPedido.metodo_pago || '')}
                    {selectedPedido.metodo_pago || 'Sin método'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Mensajero Asignado</Label>
                  <p>{selectedPedido.mensajero_asignado || 'Sin asignar'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Mensajero Concretado</Label>
                  <p>{selectedPedido.mensajero_concretado || 'Sin concretar'}</p>
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Productos</Label>
                <p>{selectedPedido.productos || 'Sin productos'}</p>
              </div>
              
              {selectedPedido.notas && (
                <div>
                  <Label className="font-semibold">Notas</Label>
                  <p className="bg-gray-50 p-3 rounded">{selectedPedido.notas}</p>
                </div>
              )}
              
              {selectedPedido.nota_asesor && (
                <div>
                  <Label className="font-semibold">Nota del Asesor</Label>
                  <p className="bg-green-50 p-3 rounded">{selectedPedido.nota_asesor}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Crear Pedido */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Cliente</Label>
                <Input 
                  value={createForm.cliente_nombre} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input 
                  value={createForm.cliente_telefono} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                  placeholder="Número de teléfono"
                />
              </div>
            </div>
            
            <div>
              <Label>Dirección</Label>
              <Input 
                value={createForm.direccion} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección completa"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Distrito</Label>
                <Input 
                  value={createForm.distrito} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, distrito: e.target.value }))}
                  placeholder="Distrito"
                />
              </div>
              <div>
                <Label>Cantón</Label>
                <Input 
                  value={createForm.canton} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, canton: e.target.value }))}
                  placeholder="Cantón"
                />
              </div>
              <div>
                <Label>Provincia</Label>
                <Input 
                  value={createForm.provincia} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, provincia: e.target.value }))}
                  placeholder="Provincia"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Total</Label>
                <Input 
                  type="number"
                  value={createForm.valor_total} 
                  onChange={(e) => setCreateForm(prev => ({ ...prev, valor_total: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={createForm.metodo_pago} onValueChange={(value) => setCreateForm(prev => ({ ...prev, metodo_pago: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="sinpe">SINPE</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="2pagos">2 Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Productos</Label>
              <Textarea 
                value={createForm.productos} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, productos: e.target.value }))}
                placeholder="Descripción de productos..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Notas</Label>
              <Textarea 
                value={createForm.notas} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCreate}>
                <Save className="w-4 h-4 mr-2" />
                Crear Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmar Pedido */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <p>¿Estás seguro de que quieres confirmar el pedido <strong>{selectedPedido.id_pedido}</strong>?</p>
              
              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea 
                  value={confirmReason} 
                  onChange={(e) => setConfirmReason(e.target.value)}
                  placeholder="Motivo de la confirmación..."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmAction} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminar Pedido */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Pedido</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <p>¿Estás seguro de que quieres eliminar el pedido <strong>{selectedPedido.id_pedido}</strong>?</p>
              <p className="text-sm text-red-600">Esta acción no se puede deshacer.</p>
              
              <div>
                <Label>Motivo de eliminación</Label>
                <Textarea 
                  value={deleteReason} 
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Motivo de la eliminación..."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDeleteAction} className="bg-red-600 hover:bg-red-700">
                  <XCircle className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}