'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PedidoTest } from '@/lib/types';
import { usePedidos } from '@/hooks/use-pedidos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Loader2,
  Edit3,
  Save,
  X,
  CheckCircle
} from 'lucide-react';

// Componentes personalizados
import { DateFilters } from '@/components/dashboard/date-filters';
import { PedidosStats } from '@/components/dashboard/pedidos-stats';
import { PedidosFilters } from '@/components/dashboard/pedidos-filters';
import { PedidosTable } from '@/components/dashboard/pedidos-table';
import { PedidosPagination } from '@/components/dashboard/pedidos-pagination';

export default function AdminPedidosPageRefactored() {
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
  } = usePedidos();

  // Estados para modales
  const [selectedPedido, setSelectedPedido] = useState<PedidoTest | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [updatingPedido, setUpdatingPedido] = useState<string | null>(null);

  // Estados para edición
  const [editForm, setEditForm] = useState({
    estado: '',
    mensajero: '',
    fecha: '',
    notas: '',
    metodo_pago: '',
    nota_asesor: ''
  });

  // Estados para actualización rápida de estado
  const [newStatus, setNewStatus] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isDualPayment, setIsDualPayment] = useState(false);
  const [dualPaymentAmounts, setDualPaymentAmounts] = useState({ efectivo: '', sinpe: '' });
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Estados para modal de discrepancias
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  const handleEditPedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setEditForm({
      estado: pedido.estado_pedido || '',
      mensajero: pedido.mensajero_asignado || '',
      fecha: pedido.fecha_entrega || '',
      notas: pedido.notas || '',
      metodo_pago: pedido.metodo_pago || '',
      nota_asesor: pedido.nota_asesor || ''
    });
    setIsEditModalOpen(true);
  };

  const handleViewPedido = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setIsDetailModalOpen(true);
  };

  const handleQuickStatusUpdate = (pedido: PedidoTest) => {
    setSelectedPedido(pedido);
    setNewStatus(pedido.estado_pedido || 'pendiente');
    setPaymentMethod(pedido.metodo_pago || 'efectivo');
    setIsDualPayment(pedido.metodo_pago === '2pagos');
    setDualPaymentAmounts({
      efectivo: pedido.efectivo_2_pagos || '',
      sinpe: pedido.sinpe_2_pagos || ''
    });
    setStatusNotes('');
    setIsStatusUpdateModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPedido) return;

    const updates: Partial<PedidoTest> = {};
    
    if (editForm.estado) updates.estado_pedido = editForm.estado;
    if (editForm.mensajero) updates.mensajero_asignado = editForm.mensajero;
    if (editForm.fecha) updates.fecha_entrega = editForm.fecha;
    if (editForm.notas) updates.notas = editForm.notas;
    if (editForm.metodo_pago) updates.metodo_pago = editForm.metodo_pago;
    if (editForm.nota_asesor) updates.nota_asesor = editForm.nota_asesor;

    setUpdatingPedido(selectedPedido.id_pedido);
    const success = await updatePedidoStatus(selectedPedido.id_pedido, updates);
    setUpdatingPedido(null);
    
    if (success) {
      setIsEditModalOpen(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedPedido || !newStatus) return;

    setUpdatingStatus(true);
    try {
      const updates: Partial<PedidoTest> = {
        estado_pedido: newStatus
      };

      // Si es entregado, actualizar método de pago
      if (newStatus === 'entregado') {
        updates.metodo_pago = paymentMethod;
        
        if (isDualPayment && paymentMethod === '2pagos') {
          updates.efectivo_2_pagos = dualPaymentAmounts.efectivo;
          updates.sinpe_2_pagos = dualPaymentAmounts.sinpe;
        }
      }

      // Si hay notas, añadirlas
      if (statusNotes) {
        updates.notas = statusNotes;
      }

      // Si es entregado, marcar como concretado
      if (newStatus === 'entregado') {
        updates.mensajero_concretado = selectedPedido.mensajero_asignado || 'Admin';
      }

      // Añadir usuario que realiza la acción
      (updates as any).usuario = user?.name || 'Admin';

      const success = await updatePedidoStatus(selectedPedido.id_pedido, updates);
      if (success) {
        setIsStatusUpdateModalOpen(false);
        setSelectedPedido(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Función para detectar discrepancias en mensajeros asignados
  const getDiscrepancies = () => {
    const discrepancies = [];
    
    // 1. Pedidos asignados pero no concretados por el mismo mensajero
    const assignedNotConcreted = allPedidos.filter(p => 
      p.mensajero_asignado && 
      !p.mensajero_concretado && 
      p.estado_pedido === 'entregado'
    );
    
    if (assignedNotConcreted.length > 0) {
      discrepancies.push({
        type: 'asignado_no_concretado',
        title: 'Pedidos asignados pero no concretados',
        count: assignedNotConcreted.length,
        description: 'Pedidos marcados como entregados pero no concretados por el mensajero asignado',
        items: assignedNotConcreted
      });
    }
    
    // 2. Pedidos concretados por mensajero diferente al asignado
    const differentMessenger = allPedidos.filter(p => 
      p.mensajero_asignado && 
      p.mensajero_concretado && 
      p.mensajero_asignado !== p.mensajero_concretado
    );
    
    if (differentMessenger.length > 0) {
      discrepancies.push({
        type: 'mensajero_diferente',
        title: 'Pedidos concretados por mensajero diferente',
        count: differentMessenger.length,
        description: 'Pedidos entregados por un mensajero diferente al asignado',
        items: differentMessenger
      });
    }
    
    // 3. Pedidos sin asignar por más de 24 horas
    const unassignedOld = allPedidos.filter(p => {
      if (p.mensajero_asignado) return false;
      const createdAt = new Date(p.fecha_creacion);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });
    
    if (unassignedOld.length > 0) {
      discrepancies.push({
        type: 'sin_asignar_antiguo',
        title: 'Pedidos sin asignar por más de 24 horas',
        count: unassignedOld.length,
        description: 'Pedidos que llevan más de 24 horas sin ser asignados a un mensajero',
        items: unassignedOld
      });
    }
    
    return discrepancies;
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== 'all' && value !== ''
  );

  if (loading && pedidos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2 text-gray-600">Cargando pedidos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground">
            Administra todos los pedidos del sistema con capacidades de edición avanzadas
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasServerSideFilters ? (
              <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos filtrados</>
            ) : (
              <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos totales</>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={loadPedidos} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          
          <Button 
            variant="outline" 
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            onClick={() => setIsDiscrepancyModalOpen(true)}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Revisar discrepancias
          </Button>
          
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <PedidosStats 
        stats={stats} 
        hasActiveFilters={hasActiveFilters} 
        totalPedidos={pagination.totalPedidos} 
      />

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
        filters={filters}
        filterOptions={filterOptions}
        stats={stats}
        onFilterChange={updateFilters}
        onClearFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        onExecuteSearch={loadPedidos}
      />

      {/* Tabla de Pedidos */}
      <PedidosTable
        pedidos={pedidos}
        loading={loading}
        onEditPedido={handleEditPedido}
        onViewPedido={handleViewPedido}
        onUpdateStatus={handleQuickStatusUpdate}
        updatingPedido={updatingPedido}
      />

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID del Pedido</Label>
                  <Input value={selectedPedido.id_pedido} disabled />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Input value={selectedPedido.cliente_nombre || ''} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select value={editForm.estado} onValueChange={(value) => setEditForm(prev => ({ ...prev, estado: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="asignado">Asignado</SelectItem>
                      <SelectItem value="en_ruta">En Ruta</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="devolucion">Devolución</SelectItem>
                      <SelectItem value="reagendado">Reagendado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mensajero</Label>
                  <Input 
                    value={editForm.mensajero} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, mensajero: e.target.value }))}
                    placeholder="Nombre del mensajero"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Entrega</Label>
                  <Input 
                    type="datetime-local"
                    value={editForm.fecha} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, fecha: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={editForm.metodo_pago} onValueChange={(value) => setEditForm(prev => ({ ...prev, metodo_pago: value }))}>
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
                <Label>Notas</Label>
                <Textarea 
                  value={editForm.notas} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Nota del Asesor</Label>
                <Textarea 
                  value={editForm.nota_asesor} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, nota_asesor: e.target.value }))}
                  placeholder="Nota del asesor..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={updatingPedido === selectedPedido.id_pedido}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Actualización Rápida de Estado */}
      <Dialog open={isStatusUpdateModalOpen} onOpenChange={setIsStatusUpdateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div>
                <Label>Pedido: {selectedPedido.id_pedido}</Label>
              </div>
              
              <div>
                <Label>Nuevo Estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="asignado">Asignado</SelectItem>
                    <SelectItem value="en_ruta">En Ruta</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                    <SelectItem value="reagendado">Reagendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newStatus === 'entregado' && (
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                  
                  {paymentMethod === '2pagos' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Efectivo</Label>
                        <Input 
                          type="number"
                          value={dualPaymentAmounts.efectivo} 
                          onChange={(e) => setDualPaymentAmounts(prev => ({ ...prev, efectivo: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SINPE</Label>
                        <Input 
                          type="number"
                          value={dualPaymentAmounts.sinpe} 
                          onChange={(e) => setDualPaymentAmounts(prev => ({ ...prev, sinpe: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea 
                  value={statusNotes} 
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStatusUpdateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Actualizar Estado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                    {new Intl.NumberFormat('es-CR', {
                      style: 'currency',
                      currency: 'CRC',
                      minimumFractionDigits: 0,
                    }).format(selectedPedido.valor_total)}
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
                  <p>{selectedPedido.estado_pedido || 'Sin estado'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Método de Pago</Label>
                  <p>{selectedPedido.metodo_pago || 'Sin método'}</p>
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

      {/* Modal de Discrepancias */}
      <Dialog open={isDiscrepancyModalOpen} onOpenChange={setIsDiscrepancyModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Revisar Discrepancias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {getDiscrepancies().length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-600">¡Excelente!</p>
                <p className="text-muted-foreground">No se encontraron discrepancias en los pedidos.</p>
              </div>
            ) : (
              getDiscrepancies().map((discrepancy, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-red-600">{discrepancy.title}</h3>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                      {discrepancy.count} pedidos
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{discrepancy.description}</p>
                  <div className="space-y-2">
                    {discrepancy.items.slice(0, 10).map((item, itemIndex) => (
                      <div key={itemIndex} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{item.id_pedido}</span> - {item.cliente_nombre}
                      </div>
                    ))}
                    {discrepancy.items.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ... y {discrepancy.items.length - 10} pedidos más
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
