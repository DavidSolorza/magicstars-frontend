'use client';

import { useState, useEffect } from 'react';
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
  CheckCircle,
  Package
} from 'lucide-react';
import { API_URLS, apiRequest } from '@/lib/config';

// Componentes personalizados
import { DateFilters } from '@/components/dashboard/date-filters';
import { PedidosStats } from '@/components/dashboard/pedidos-stats';
import { PedidosFilters } from '@/components/dashboard/pedidos-filters';
import { PedidosTable } from '@/components/dashboard/pedidos-table';
import { PedidosPagination } from '@/components/dashboard/pedidos-pagination';
import { StatusUpdateModal } from '@/components/dashboard/status-update-modal';

export default function AdminPedidosPage() {
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
    executeSearch,
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

  // Estados para actualización de estado
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Estados para modal de discrepancias
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  // Estados para cooldown del botón Actualizar
  const [updating, setUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // Actualizar el contador de tiempo cada segundo
  useEffect(() => {
    if (!canUpdate() && lastUpdateTime) {
      const interval = setInterval(() => {
        // Forzar re-render para actualizar el contador
        setLastUpdateTime(prev => prev ? prev : null);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [lastUpdateTime]);

  const canUpdate = () => {
    if (!lastUpdateTime) return true;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos en milisegundos
    return Date.now() - lastUpdateTime > fiveMinutes;
  };

  const getTimeUntilNextUpdate = () => {
    if (!lastUpdateTime) return null;
    const fiveMinutes = 5 * 60 * 1000;
    const timeLeft = fiveMinutes - (Date.now() - lastUpdateTime);
    if (timeLeft <= 0) return null;
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      
      console.log('Iniciando sincronización de pedidos y rutas...');
      
      // Sincronizar pedidos y rutas
      const syncPedidosResponse = await apiRequest(API_URLS.SYNC_PEDIDOS, {
        method: 'POST',
      });

      if (!syncPedidosResponse.ok) {
        throw new Error(`Error en la sincronización de pedidos: ${syncPedidosResponse.status}`);
      }

      const syncPedidosResult = await syncPedidosResponse.json();
      console.log('Sincronización de pedidos exitosa:', syncPedidosResult);
      
      setLastUpdateTime(Date.now());
      
      // Recargar los pedidos después de la sincronización
      await loadPedidos();
      
    } catch (error) {
      console.error('Error en la sincronización:', error);
      // Aquí podrías añadir un toast para mostrar el error
    } finally {
      setUpdating(false);
    }
  };

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
    const success = await updatePedidoStatus(selectedPedido.id_pedido, updates, user?.name || 'Admin');
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
      const success = await updatePedidoStatus(selectedPedido.id_pedido, updates, user?.name || 'Admin');
      
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
                <Package className="h-4 w-4" />
                Panel de gestión de pedidos
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Gestión de Pedidos
              </h1>
              <p className="text-white/90 text-base">
                Administra todos los pedidos del sistema con capacidades de edición avanzadas.
              </p>
              <p className="text-sm text-white/80 mt-2">
                {hasServerSideFilters ? (
                  <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos filtrados</>
                ) : (
                  <>Mostrando {pedidos.length} de {pagination.totalPedidos} pedidos totales</>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={handleUpdate} 
              disabled={updating || !canUpdate()}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              {updating ? (
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                </div>
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>
                {updating ? 'Sincronizando...' : 'Actualizar'}
              </span>
              {!canUpdate() && lastUpdateTime && (
                <span className="text-xs opacity-90 ml-1">
                  ({getTimeUntilNextUpdate()})
                </span>
              )}
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              onClick={() => setIsDiscrepancyModalOpen(true)}
            >
              <AlertCircle className="w-4 h-4" />
              Revisar discrepancias
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-2 bg-white text-sky-600 hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
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
        onExecuteSearch={executeSearch}
        hasActiveFilters={hasActiveFilters}
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
                    <div className="relative w-4 h-4 mr-2">
                      <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                    </div>
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
        userRole="admin"
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
