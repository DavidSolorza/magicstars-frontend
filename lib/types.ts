export type UserRole = 'admin' | 'master' | 'asesor' | 'mensajero' | 'mensajero-lider' | 'mensajero-extra' | 'tienda';

export type OrderStatus = 
  | 'pendiente'
  | 'confirmado' 
  | 'en_ruta'
  | 'entregado'
  | 'devolucion'
  | 'reagendado';

export type PaymentMethod = 'efectivo' | 'sinpe' | 'tarjeta' | '2pagos';

export type OrderOrigin = 'shopify' | 'manual' | 'csv';

export type DeliveryMethod = 'mensajeria_propia' | 'red_logistic' | 'correos_costa_rica';

export type RedLogisticStatus = 
  | 'pendiente_envio'
  | 'enviado'
  | 'en_transito'
  | 'entregado'
  | 'devuelto'
  | 'cancelado';

export interface Company {
  id: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  createdAt: string;
  isActive: boolean;
  companyId?: string;        // Nueva relación con empresa
  company?: Company;         // Referencia a empresa
  tiendaName?: string;       // Nombre de la tienda para usuarios tipo 'tienda'
  isMessengerLeader?: boolean; // Líder de mensajeros con permisos especiales
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address: string;
  province: string;
  canton: string;
  district: string;
  companyId?: string;        // Nueva relación con empresa
  company?: Company;         // Referencia a empresa
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  companyId?: string;        // Nueva relación con empresa
  company?: Company;         // Referencia a empresa
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  // Información del cliente (directa del CSV)
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerProvince: string;
  customerCanton: string;
  customerDistrict: string;
  customerLocationLink?: string;
  
  // Información del pedido
  items: OrderItem[];
  productos?: string; // Campo de productos del CSV
  totalAmount: number;
  metodoPagoOriginal?: string; // Método de pago original del CSV
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  origin: OrderOrigin;
  numero_sinpe?: string; // Número SINPE de la tienda
  comprobante_sinpe?: string; // URL del comprobante SINPE
  efectivo_2_pagos?: string; // Monto en efectivo para pedidos de 2 pagos
  sinpe_2_pagos?: string; // Monto en SINPE para pedidos de 2 pagos
  deliveryMethod?: DeliveryMethod;
  createdAt: string;
  updatedAt: string;
  fecha_creacion?: string;
  scheduledDate?: string;
  deliveryDate?: string;
  
  // Asignaciones
  assignedMessengerId?: string;
  assignedMessenger?: User | { id: string; name: string; phone?: string };
  advisorId?: string;
  advisor?: User;
  asesor?: { id: string; name: string; store: string; email?: string };
  
  // Notas y tracking
  notes?: string;
  asesorNotes?: string; // Notas del asesor (nota_asesor)
  deliveryNotes?: string;
  trackingUrl?: string;
  deliveryAddress?: string;
  tienda?: string;
  
  // Empresa y jornada
  companyId?: string;
  company?: Company;
  routeSchedule?: string; // JORNADA DE RUTA del CSV
  routeOrder?: number; // Número de orden en la ruta del día (1-30)
  
  // Estado de confirmación
  confirmado?: boolean | null;
}

export interface Stats {
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  rescheduledOrders: number;
  pendingOrders: number;
  totalCash: number;
  totalSinpe: number;
  deliveryRate: number;
  returnRate?: number;
  rescheduleRate?: number;
  companyId?: string;        // Nueva relación con empresa
}

export interface CompanyStats extends Stats {
  companyId: string;
  company: Company;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  year: number;
  month: number;
  monthName: string;
  sales: number;
  delivered: number;
  deliveryRate: number;
}

export interface MessengerStats extends Stats {
  assignedToday: number;
  completedToday: number;
  pendingToday: number;
  inRouteToday: number;
  companyId?: string;        // Nueva relación con empresa
}

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus;
  origin?: OrderOrigin;
  paymentMethod?: PaymentMethod;
  deliveryMethod?: DeliveryMethod;
  province?: string;
  canton?: string;
  district?: string;
  customerId?: string;
  productSku?: string;
  messengerId?: string;
  companyId?: string;        // Nueva relación con empresa
}

export interface CSVUploadResult {
  success: number;
  errors: string[];
}

export interface CSVOrderData {
  fecha: string;
  idCliente: string;
  nombre: string;
  provincia: string;
  canton: string;
  distrito: string;
  direccion: string;
  telefono: string;
  valor: string;
  productos: string;
  linkUbicacion: string;
  notaAsesor: string;
  jornadaRuta: string;
}

// ===== INVENTARIO TYPES =====

export type InventoryActionType = 
  | 'entrada'           // Añadir inventario
  | 'salida'            // Descontar inventario
  | 'ajuste'            // Ajuste manual
  | 'pedido_montado'    // Descuento automático por pedido montado a ruta
  | 'pedido_devuelto'   // Devolución automática por pedido no entregado
  | 'pedido_entregado'  // Confirmación de entrega
  | 'red_logistic_enviado'    // Descuento automático por envío Red Logística
  | 'red_logistic_entregado'  // Confirmación de entrega Red Logística
  | 'red_logistic_devuelto'   // Devolución automática Red Logística
  | 'inicial'           // Inventario inicial
  | 'perdida'           // Pérdida o daño
  | 'transferencia';    // Transferencia entre ubicaciones

export interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  companyId: string;
  company: Company;
  currentStock: number;           // Stock actual
  minimumStock: number;           // Stock mínimo
  maximumStock: number;           // Stock máximo
  reservedStock: number;          // Stock reservado para pedidos
  availableStock: number;         // Stock disponible (current - reserved)
  location?: string;              // Ubicación física
  lastUpdated: string;
  createdAt: string;
  isActive: boolean;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
  actionType: InventoryActionType;
  quantity: number;               // Cantidad positiva o negativa
  previousStock: number;          // Stock antes del movimiento
  newStock: number;               // Stock después del movimiento
  reason?: string;                // Motivo del movimiento
  referenceId?: string;           // ID de referencia (pedido, ajuste, etc.)
  referenceType?: 'order' | 'adjustment' | 'transfer' | 'initial' | 'red_logistic';
  userId: string;                 // Usuario que realizó la acción
  user: User;
  createdAt: string;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
  adjustmentType: 'manual' | 'cycle_count' | 'damage' | 'loss' | 'found';
  quantityDifference: number;     // Diferencia (puede ser positiva o negativa)
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  user: User;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_soon' | 'expired';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  isRead: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  totalTransactions: number;
  transactionsToday: number;
  companyId?: string;
}

// Actualizar Product para incluir información de inventario
export interface ProductWithInventory extends Product {
  inventory?: InventoryItem;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
}

// Filtros para inventario
export interface InventoryFilters {
  companyId?: string;
  productId?: string;
  category?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  actionType?: InventoryActionType;
}

// Red Logística Interfaces
export interface RedLogisticOrder {
  id: string;
  orderId: string;
  order: Order;
  trackingNumber: string;
  status: RedLogisticStatus;
  deliveryMethod: DeliveryMethod;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue: number;
  shippingCost: number;
  insuranceCost?: number;
  totalCost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUser: User;
  companyId: string;
  company: Company;
}

export interface RedLogisticTracking {
  id: string;
  redLogisticOrderId: string;
  redLogisticOrder: RedLogisticOrder;
  status: RedLogisticStatus;
  location: string;
  description: string;
  timestamp: string;
  notes?: string;
}

export interface RedLogisticStats {
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  averageDeliveryTime: number;
  successRate: number;
}

export interface RedLogisticFilters {
  status?: RedLogisticStatus;
  deliveryMethod?: DeliveryMethod;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  trackingNumber?: string;
}

// Tipos para liquidación de rutas
export type RouteLiquidationStatus = 'pendiente' | 'finalizada' | 'liquidada';

export interface RouteLiquidation {
  id: string;
  messengerId: string;
  messenger: User;
  routeDate: string; // Fecha de la ruta
  status: RouteLiquidationStatus;
  
  // Resúmenes financieros
  totalCollected: number; // Total recaudado en efectivo
  totalSpent: number; // Total gastado
  totalToDeliver: number; // Total a entregar en efectivo en bodega
  sinpePayments: number; // Total recaudado en SINPE
  cashPayments: number; // Total recaudado en efectivo
  tarjetaPayments: number; // Total recaudado en tarjeta
  
  // Gestión de pedidos
  totalOrders: number; // Total de pedidos asignados
  deliveredOrders: number; // Pedidos entregados
  returnedOrders: number; // Pedidos a devolver
  pendingOrders: number; // Pedidos pendientes
  
  // Detalles de la liquidación
  orders: Order[]; // Pedidos de la ruta
  cashOrders: Order[]; // Pedidos pagados en efectivo
  sinpeOrders: Order[]; // Pedidos pagados con SINPE
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string; // Cuando el mensajero finaliza la ruta
  liquidatedAt?: string; // Cuando el admin liquida la ruta
  liquidatedBy?: string; // ID del admin que liquidó
  liquidatedByUser?: User; // Usuario que liquidó
  
  // Notas y observaciones
  notes?: string;
  adminNotes?: string;
  
  // Relación con empresa
  companyId: string;
  company: Company;
}

export interface RouteLiquidationStats {
  totalRoutes: number;
  pendingLiquidation: number; // Rutas pendientes por liquidar
  finalizedToday: number; // Rutas finalizadas hoy
  liquidatedToday: number; // Rutas liquidadas hoy
  
  // Resúmenes financieros
  totalCollectedToday: number;
  totalSpentToday: number;
  totalToDeliverToday: number;
  
  // Por mensajero
  byMessenger: {
    messengerId: string;
    messenger: User;
    routesCount: number;
    totalCollected: number;
    totalSpent: number;
  }[];
}

export interface RouteLiquidationFilters {
  messengerId?: string;
  status?: RouteLiquidationStatus;
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
}

// Tipos para historial de rutas y gastos
export interface RouteExpense {
  id: string;
  routeId: string;
  messengerId: string;
  messenger: User;
  amount: number;
  description: string;
  category: 'combustible' | 'alimentacion' | 'peaje' | 'mantenimiento' | 'otro';
  date: string;
  images: string[]; // URLs de las imágenes
  createdAt: string;
  updatedAt: string;
}

export interface DailyRoute {
  id: string;
  messengerId: string;
  messenger: User;
  routeDate: string;
  
  // Resumen de pedidos
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  
  // Resumen financiero
  totalCollected: number; // Total recaudado en efectivo
  totalExpenses: number; // Total de gastos
  netAmount: number; // Cantidad neta (recaudado - gastos)
  
  // Detalles
  orders: Order[];
  expenses: RouteExpense[];
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  notes?: string;
  
  // Relación con empresa
  companyId: string;
  company: Company;
}

export interface RouteHistoryStats {
  totalRoutes: number;
  totalDelivered: number;
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  
  // Por período
  thisWeek: {
    routes: number;
    delivered: number;
    collected: number;
    expenses: number;
  };
  
  thisMonth: {
    routes: number;
    delivered: number;
    collected: number;
    expenses: number;
  };
  
  // Por categoría de gastos
  expensesByCategory: {
    category: string;
    amount: number;
    count: number;
  }[];
}

export interface RouteHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  messengerId?: string;
  companyId?: string;
}

// Tipos para gestión de rutas y asignación de pedidos
export interface RouteAssignment {
  id: string;
  routeDate: string;
  messengerId: string;
  messenger: User;
  orders: Order[];
  totalOrders: number;
  assignedOrders: number;
  unassignedOrders: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  companyId: string;
  company: Company;
}

export interface ZoneGroup {
  zone: string;
  orders: Order[];
  assignedMessengerId?: string;
  assignedMessenger?: User;
  totalAmount: number;
  totalOrders: number;
}

export interface UnassignedOrder {
  order: Order;
  reason: 'no_messenger_available' | 'zone_not_covered' | 'messenger_overloaded' | 'manual_exclusion';
  suggestedMessengerId?: string;
  suggestedMessenger?: User;
}

export interface RouteMessengerStats {
  messengerId: string;
  messenger: User;
  assignedOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  rescheduledOrders: number;
  rescheduledTonightOrders: number;
  changesCount: number;
  
  // Métodos de pago
  cashCollected: number;
  sinpeCollected: number;
  cardCollected: number;
  totalCollected: number;
  
  // Cálculos
  ordersToReturn: number; // Asignados - Entregados + Devueltos
  effectiveness: number; // (Entregados / Asignados) * 100
  
  // Fechas
  dateFrom: string;
  dateTo: string;
}

export interface RouteManagementFilters {
  dateFrom?: string;
  dateTo?: string;
  messengerId?: string;
  companyId?: string;
  zone?: string;
  status?: string;
}

export interface RouteCreationData {
  routeDate: string;
  messengerId: string;
  orderIds: string[];
  notes?: string;
}

export interface RouteInfo {
  route: string;
  zones: string[];
  payment: number;
  messengers: User[];
}

export interface RouteStats {
  route: string;
  totalOrders: number;
  totalAmount: number;
  assignedMessengers: number;
  averageOrderValue: number;
  paymentPerMessenger: number;
}

// Tipos para pedidos de Supabase (tabla pedidos)
export interface PedidoTest {
  idx: number;
  id_pedido: string;
  fecha_creacion: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  provincia: string;
  canton: string;
  distrito: string;
  valor_total: number;
  productos: string;
  link_ubicacion: string | null;
  nota_asesor: string | null;
  notas: string | null;
  jornada_ruta: string;
  tienda: string;
  estado_pedido: string | null;
  metodo_pago: string | null;
  fecha_entrega: string | null;
  comprobante_sinpe: string | null;
  numero_sinpe: string | null;
  efectivo_2_pagos: string | null;
  sinpe_2_pagos: string | null;
  mensajero_asignado: string | null;
  mensajero_concretado: string | null;
  confirmado: boolean | null;
  tipo_envio?: string | null; // CONTRAENTREGA o RED LOGISTIC
  lon?: number | null; // Longitud para mapa
  lat?: number | null; // Latitud para mapa
}

// Interfaz para liquidación por tienda
export interface TiendaLiquidationCalculation {
  tienda: string;
  routeDate: string;
  totalOrders: number;
  totalValue: number; // Valor total de todos los pedidos
  totalCollected: number; // Total recaudado (solo pedidos entregados)
  totalSpent: number; // Gastos totales de la tienda
  sinpePayments: number; // Pagos en SINPE
  cashPayments: number; // Pagos en efectivo
  tarjetaPayments: number; // Pagos en tarjeta
  finalAmount: number; // Monto final a entregar
  orders: PedidoTest[];
  isLiquidated: boolean;
  canEdit: boolean;
  // Métricas adicionales por tienda
  deliveredOrders: number;
  pendingOrders: number;
  returnedOrders: number;
  rescheduledOrders: number;
  averageOrderValue: number;
  topMessenger: string; // Mensajero con más pedidos
  topDistrict: string; // Distrito con más pedidos
}