'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Order } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Package, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Loader2,
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  Download,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAllPedidosByTiendaPreconfirmacion, updatePedidoPreconfirmacion } from '@/lib/supabase-pedidos';
import { toast } from 'sonner';

// Función para obtener la tienda del asesor
const getAsesorTienda = (email: string): string => {
  const emailLower = email.toLowerCase();
  if (emailLower.includes('allstars') || emailLower.includes('all_stars')) {
    return 'ALL STARS';
  }
  return 'ALL STARS'; // Por defecto
};

export default function AsesorOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('all');
  
  // Estados para edición
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Estados para los campos editables
  const [editForm, setEditForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    direccion: '',
    provincia: '',
    canton: '',
    distrito: '',
    valor_total: 0,
    productos: '',
    estado_pedido: '',
    metodo_pago: '',
    confirmado: false,
    nota_asesor: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Determinar la tienda del asesor
      const tienda = getAsesorTienda(user.email);
      console.log('🏪 Tienda del asesor:', tienda);
      
      // Obtener todos los pedidos de la tienda desde pedidos_preconfirmacion
      const ordersRes = await getAllPedidosByTiendaPreconfirmacion(tienda);
      
      // Mapear los datos al formato Order
      const ordersMapped = ordersRes.map((pedido) => ({
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
        status: (pedido.estado_pedido as any) || 'pendiente',
        paymentMethod: (pedido.metodo_pago as any) || 'efectivo',
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
        store: tienda,
      }));
      
      setOrders(ordersMapped);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los pedidos');
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
    return new Date(date).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCount = (status: string) => {
    return orders.filter(order => order.status === status).length;
  };

  const getDeliveryMethodName = (method?: string) => {
    switch (method) {
      case 'mensajeria_propia': return 'Mensajería Propia';
      case 'red_logistic': return 'Red Logística';
      case 'correos_costa_rica': return 'Correos de Costa Rica';
      default: return 'No especificado';
    }
  };

  const getDeliveryMethodIcon = (method?: string) => {
    switch (method) {
      case 'mensajeria_propia': return '🚚';
      case 'red_logistic': return '🌐';
      case 'correos_costa_rica': return '📮';
      default: return '❓';
    }
  };

  // Función para abrir modal de edición
  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      cliente_nombre: order.customerName || '',
      cliente_telefono: order.customerPhone || '',
      direccion: order.customerAddress || '',
      provincia: order.customerProvince || '',
      canton: order.customerCanton || '',
      distrito: order.customerDistrict || '',
      valor_total: order.totalAmount || 0,
      productos: (order as any).productos || '',
      estado_pedido: order.status || '',
      metodo_pago: order.paymentMethod || '',
      confirmado: order.confirmado || false,
      nota_asesor: order.asesorNotes || '',
    });
    setIsEditModalOpen(true);
  };

  // Función para cerrar modal
  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  // Función para guardar cambios
  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    try {
      setIsUpdating(true);
      
      const updates: any = {
        cliente_nombre: editForm.cliente_nombre,
        cliente_telefono: editForm.cliente_telefono,
        direccion: editForm.direccion,
        provincia: editForm.provincia,
        canton: editForm.canton,
        distrito: editForm.distrito,
        valor_total: editForm.valor_total,
        productos: editForm.productos,
        estado_pedido: editForm.estado_pedido,
        metodo_pago: editForm.metodo_pago,
        confirmado: editForm.confirmado,
        nota_asesor: editForm.nota_asesor,
      };

      const success = await updatePedidoPreconfirmacion(editingOrder.id, updates);
      
      if (success) {
        toast.success('Pedido actualizado correctamente');
        await loadData(); // Recargar datos
        handleCloseEdit();
      } else {
        toast.error('Error al actualizar el pedido');
      }
    } catch (error) {
      console.error('❌ Error al actualizar pedido:', error);
      toast.error('Error al actualizar el pedido');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerPhone && order.customerPhone.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = orderDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalOrders = orders.length;
  const pendingOrders = getStatusCount('confirmado') + getStatusCount('en_ruta');
  const deliveredOrders = getStatusCount('entregado');
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/asesor">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Mis Pedidos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los pedidos que has creado
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                <p className="text-2xl font-bold">{deliveredOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, cliente o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="en_ruta">En Ruta</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
                <SelectItem value="reagendado">Reagendado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deliveryMethodFilter} onValueChange={setDeliveryMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por mensajería" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las mensajerías</SelectItem>
                <SelectItem value="mensajeria_propia">Mensajería Propia</SelectItem>
                <SelectItem value="red_logistic">Red Logística</SelectItem>
                <SelectItem value="correos_costa_rica">Correos de Costa Rica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/asesor/orders/new">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Pedido
              </Link>
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
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

                  <div className="flex items-center gap-2">
                    <span className="text-sm">{order.deliveryAddress || 'Sin dirección'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {order.assignedMessenger?.name || 'Sin asignar'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getDeliveryMethodIcon(order.deliveryMethod)}</span>
                    <span className="text-sm">{getDeliveryMethodName(order.deliveryMethod)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/asesor/orders/${order.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(order)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido - {editingOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Información del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Cliente</Label>
                <Input
                  value={editForm.cliente_nombre}
                  onChange={(e) => setEditForm({ ...editForm, cliente_nombre: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={editForm.cliente_telefono}
                  onChange={(e) => setEditForm({ ...editForm, cliente_telefono: e.target.value })}
                  placeholder="Número de teléfono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Textarea
                value={editForm.direccion}
                onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                placeholder="Dirección completa"
                rows={2}
              />
            </div>

            {/* Provincia, Cantón, Distrito */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input
                  value={editForm.provincia}
                  onChange={(e) => setEditForm({ ...editForm, provincia: e.target.value })}
                  placeholder="Provincia"
                />
              </div>

              <div className="space-y-2">
                <Label>Cantón</Label>
                <Input
                  value={editForm.canton}
                  onChange={(e) => setEditForm({ ...editForm, canton: e.target.value })}
                  placeholder="Cantón"
                />
              </div>

              <div className="space-y-2">
                <Label>Distrito</Label>
                <Input
                  value={editForm.distrito}
                  onChange={(e) => setEditForm({ ...editForm, distrito: e.target.value })}
                  placeholder="Distrito"
                />
              </div>
            </div>

            {/* Productos y Precio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Productos</Label>
                <Textarea
                  value={editForm.productos}
                  onChange={(e) => setEditForm({ ...editForm, productos: e.target.value })}
                  placeholder="Productos del pedido"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Precio Total</Label>
                <Input
                  type="number"
                  value={editForm.valor_total}
                  onChange={(e) => setEditForm({ ...editForm, valor_total: Number(e.target.value) })}
                  placeholder="Precio total"
                />
              </div>
            </div>

            {/* Estado, Método de Pago y Confirmación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Estado del Pedido</Label>
                <Select 
                  value={editForm.estado_pedido} 
                  onValueChange={(value) => setEditForm({ ...editForm, estado_pedido: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="en_ruta">En Ruta</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                    <SelectItem value="reagendado">Reagendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select 
                  value={editForm.metodo_pago} 
                  onValueChange={(value) => setEditForm({ ...editForm, metodo_pago: value })}
                >
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
                <Label>Estado de Confirmación</Label>
                <Select 
                  value={editForm.confirmado ? 'true' : 'false'} 
                  onValueChange={(value) => setEditForm({ ...editForm, confirmado: value === 'true' })}
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

            {/* Notas del Asesor */}
            <div className="space-y-2">
              <Label>Notas del Asesor</Label>
              <Textarea
                value={editForm.nota_asesor}
                onChange={(e) => setEditForm({ ...editForm, nota_asesor: e.target.value })}
                placeholder="Notas adicionales del asesor"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCloseEdit}
                disabled={isUpdating}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
