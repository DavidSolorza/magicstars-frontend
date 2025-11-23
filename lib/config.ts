/**
 * Configuración centralizada para APIs y endpoints
 * 
 * Este archivo centraliza todas las URLs de APIs externas para facilitar
 * el mantenimiento y las migraciones futuras.
 */

// URLs base de los servidores Railway
export const RAILWAY_CONFIG = {
  // Servidor principal (85ff) - Servidor objetivo para migración
  PRIMARY: 'https://primary-production-85ff.up.railway.app',
  
  // Servidor secundario (2b25b) - En proceso de migración
  LEGACY: 'https://primary-production-2b25b.up.railway.app',
} as const;

// Endpoints específicos organizados por funcionalidad
export const API_ENDPOINTS = {
  // Gestión de Gastos
  EXPENSES: {
    ADD_GASTO_MENSAJERO: '/webhook/add-gasto-mensajero',
  },
  
  // Gestión de Pedidos
  ORDERS: {
    UPDATE_PEDIDO: '/webhook/actualizar-pedido',
    ADD_EDIT_CONFIRM_PEDIDO_ASESOR: '/webhook/add-edit-confirm-pedido-asesor',
  },
  
  // Liquidaciones
  LIQUIDATIONS: {
    ADD_LIQUIDACION: '/webhook/add-liquidacion',
    ALERTA_LIQUIDACIONES_VENCIDAS: '/webhook/alerta-liquidaciones-vencidas',
  },
  
  // Sincronización
  SYNC: {
    SYNC_TODAY_REGISTRIES: '/webhook/Sync-Today-Registries',
    SYNC_PEDIDOS: '/webhook/sincronizar-pedidos',
  },

  // Gestión de Rutas
  ROUTES: {
    GENERAR_RUTAS: '/webhook/generar_rutas',
    ASIGNAR_PEDIDO_INDIVIDUAL: '/webhook/Asignar-Pedido-Individual',
    REASIGNAR_PEDIDOS_MENSAJERO: '/webhook/reasignar-pedidos-de-un-mensajero-a-otro',
  },

  // Gestión de Inventario
  INVENTORY: {
    ADD_EDIT_DELETE_INVENTARIO: '/webhook/add-edit-delete-inventario',
    ADD_DICCIONARIO: '/webhook/add-diccionario',
    ADD_DICCIONARIO_COMBOS: '/webhook/add-diccionario-combos',
  },
} as const;

// Configuración de servidor activo
// Se determina dinámicamente según el estado de migración
export const ACTIVE_SERVER = RAILWAY_CONFIG.PRIMARY;

// Función helper para construir URLs completas
export const buildApiUrl = (endpoint: string, server: keyof typeof RAILWAY_CONFIG = 'PRIMARY'): string => {
  return `${RAILWAY_CONFIG[server]}${endpoint}`;
};

// URLs pre-construidas para uso común
export const API_URLS = {
  // Gastos
  ADD_GASTO_MENSAJERO: buildApiUrl(API_ENDPOINTS.EXPENSES.ADD_GASTO_MENSAJERO),
  
  // Pedidos
  UPDATE_PEDIDO: buildApiUrl(API_ENDPOINTS.ORDERS.UPDATE_PEDIDO),
  ADD_EDIT_CONFIRM_PEDIDO_ASESOR: buildApiUrl(API_ENDPOINTS.ORDERS.ADD_EDIT_CONFIRM_PEDIDO_ASESOR),
  
  // Liquidaciones
  ADD_LIQUIDACION: buildApiUrl(API_ENDPOINTS.LIQUIDATIONS.ADD_LIQUIDACION),
  ALERTA_LIQUIDACIONES_VENCIDAS: buildApiUrl(API_ENDPOINTS.LIQUIDATIONS.ALERTA_LIQUIDACIONES_VENCIDAS),
  
  // Sincronización - Usar rutas de API locales como proxy para evitar CORS
  SYNC_TODAY_REGISTRIES: '/api/sync/registries',
  SYNC_PEDIDOS: '/api/sync/pedidos',

  // Rutas
  GENERAR_RUTAS: buildApiUrl(API_ENDPOINTS.ROUTES.GENERAR_RUTAS),
  ASIGNAR_PEDIDO_INDIVIDUAL: buildApiUrl(API_ENDPOINTS.ROUTES.ASIGNAR_PEDIDO_INDIVIDUAL),
  REASIGNAR_PEDIDOS_MENSAJERO: buildApiUrl(API_ENDPOINTS.ROUTES.REASIGNAR_PEDIDOS_MENSAJERO),

  // Inventario
  ADD_EDIT_DELETE_INVENTARIO: buildApiUrl(API_ENDPOINTS.INVENTORY.ADD_EDIT_DELETE_INVENTARIO),
  ADD_DICCIONARIO: buildApiUrl(API_ENDPOINTS.INVENTORY.ADD_DICCIONARIO),
  ADD_DICCIONARIO_COMBOS: buildApiUrl(API_ENDPOINTS.INVENTORY.ADD_DICCIONARIO_COMBOS),
} as const;

// URLs del servidor legacy (para migración gradual)
export const LEGACY_API_URLS = {
  ADD_GASTO_MENSAJERO: buildApiUrl(API_ENDPOINTS.EXPENSES.ADD_GASTO_MENSAJERO, 'LEGACY'),
  UPDATE_PEDIDO: buildApiUrl(API_ENDPOINTS.ORDERS.UPDATE_PEDIDO, 'LEGACY'),
  SYNC_TODAY_REGISTRIES: buildApiUrl(API_ENDPOINTS.SYNC.SYNC_TODAY_REGISTRIES, 'LEGACY'),
} as const;

// Configuración de headers por defecto
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

// Función helper para hacer requests con configuración consistente
export const apiRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};
