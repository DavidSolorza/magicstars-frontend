'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { InventoryItem, InventoryStats, InventoryAlert, InventoryTransaction, Company } from '@/lib/types';
import { obtenerInventarioPorTienda, ProductoInventario } from '@/lib/supabase-inventario';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  XCircle,
  Building2,
  RefreshCw,
  Settings,
  ArrowDown,
  ArrowUp,
  Info,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Filter,
  Warehouse,
  BookOpen,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { InventoryMovements } from '@/components/dashboard/inventory-movements';
import { ProductFormModal } from '@/components/dashboard/product-form-modal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_MINIMUM_STOCK = 5;
const DEFAULT_MAXIMUM_STOCK = 100; // Límite provisional de 100

// Tipo para configuraciones de alertas por producto
type StockAlertConfig = {
  stockMinimo?: number;
  stockMaximo?: number;
};

type ProductKey = string; // Formato: "tienda|producto"

// Función para generar clave única de producto
const normalizeStoreName = (store?: string | null) =>
  store?.trim() && store.trim().length > 0 ? store.trim() : 'Sin tienda';

const getProductKey = (tienda: string, producto: string): ProductKey => {
  return `${normalizeStoreName(tienda)}|${producto}`;
};

// Funciones para guardar/cargar configuraciones desde localStorage
const STORAGE_KEY = 'inventory_stock_alerts';

const loadAlertConfigs = (): Record<ProductKey, StockAlertConfig> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveAlertConfig = (key: ProductKey, config: StockAlertConfig) => {
  if (typeof window === 'undefined') return;
  try {
    const configs = loadAlertConfigs();
    if (config.stockMinimo === undefined && config.stockMaximo === undefined) {
      delete configs[key];
    } else {
      configs[key] = config;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error('Error guardando configuración de alertas:', error);
  }
};

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
type StockFilterValue = 'all' | StockStatus;

type StatusInfo = {
  status: StockStatus;
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
};

const getStatusInfo = (
  quantity: number,
  config?: StockAlertConfig
): StatusInfo => {
  const stockMinimo = config?.stockMinimo ?? DEFAULT_MINIMUM_STOCK;
  const stockMaximo = config?.stockMaximo ?? DEFAULT_MAXIMUM_STOCK;

  if (quantity <= 0) {
    return { status: 'out_of_stock', label: 'Agotado', variant: 'destructive' };
  }
  if (quantity <= stockMinimo) {
    return { status: 'low_stock', label: 'Stock bajo', variant: 'destructive' };
  }
  if (quantity > stockMaximo) {
    return { status: 'overstock', label: 'Sobre stock', variant: 'secondary' };
  }
  return { status: 'in_stock', label: 'En stock', variant: 'default' };
};

export default function AdvisorInventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productosOriginales, setProductosOriginales] = useState<ProductoInventario[]>([]); // Guardar productos originales de la BD
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterValue>('all');
  
  // Estados para el modal de configuración de alertas
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [alertConfig, setAlertConfig] = useState<StockAlertConfig>({});
  const [alertConfigs, setAlertConfigs] = useState<Record<ProductKey, StockAlertConfig>>({});
  
  // Estados para el modal de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoInventario | null>(null);
  
  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductoInventario | null>(null);
  
  // Estado para productos agregando al diccionario
  const [addingToDictionary, setAddingToDictionary] = useState<Set<string>>(new Set());

  const resolveCompanyInfo = (): Company => {
    const now = new Date().toISOString();

    if (user?.company) {
      return {
        ...user.company,
        createdAt: user.company.createdAt ?? now,
        updatedAt: user.company.updatedAt ?? now,
      };
    }

    const fallbackId = user?.companyId ?? 'SIN-EMPRESA';
    return {
      id: fallbackId,
      name: fallbackId,
      taxId: '',
      address: '',
      phone: '',
      email: user?.email ?? '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  };

  const mapProductosToInventoryItems = (productos: ProductoInventario[]): InventoryItem[] => {
    const timestamp = new Date().toISOString();
    const company = resolveCompanyInfo();

    return productos.map((producto, index) => {
      const baseId = producto.idx ?? index;
      const rawName = producto.producto?.toString().trim();
      const name = rawName && rawName.length > 0 ? rawName : `Producto ${index + 1}`;
      const sku =
        name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `SKU-${index + 1}`;

      const stock = Number.isFinite(producto.cantidad) ? Number(producto.cantidad) : 0;

      return {
        id: `inv-${baseId}`,
        productId: `prod-${baseId}`,
        product: {
          id: `prod-${baseId}`,
          sku,
          name,
          category: 'Inventario',
          price: 0,
          companyId: user?.companyId ?? company.id,
          company,
        },
        companyId: user?.companyId ?? company.id,
        company,
        currentStock: stock,
        minimumStock: DEFAULT_MINIMUM_STOCK,
        maximumStock: DEFAULT_MAXIMUM_STOCK,
        reservedStock: 0,
        availableStock: stock,
        location: producto.tienda || company.name,
        lastUpdated: timestamp,
        createdAt: timestamp,
        isActive: true,
      };
    });
  };

  const buildInventoryStats = (items: InventoryItem[]): InventoryStats => {
    const totalProducts = items.length;
    const totalStockValue = items.reduce(
      (sum, item) => sum + item.currentStock * (item.product.price ?? 0),
      0
    );
    const lowStockItems = items.filter(
      (item) => item.currentStock > 0 && item.currentStock <= DEFAULT_MINIMUM_STOCK
    ).length;
    const outOfStockItems = items.filter((item) => item.currentStock <= 0).length;
    const overstockItems = items.filter((item) => item.currentStock > DEFAULT_MAXIMUM_STOCK).length;

    return {
      totalProducts,
      totalStockValue,
      lowStockItems,
      outOfStockItems,
      overstockItems,
      totalTransactions: 0,
      transactionsToday: 0,
      companyId: user?.companyId ?? undefined,
    };
  };

  const buildInventoryAlerts = (items: InventoryItem[]): InventoryAlert[] => {
    const timestamp = new Date().toISOString();

    return items
      .filter((item) => item.currentStock <= DEFAULT_MINIMUM_STOCK)
      .map((item) => {
        const isOutOfStock = item.currentStock <= 0;
        return {
          id: `alert-${item.id}`,
          inventoryItemId: item.id,
          inventoryItem: item,
          alertType: isOutOfStock ? 'out_of_stock' : 'low_stock',
          severity: isOutOfStock ? 'critical' : 'high',
          message: isOutOfStock
            ? 'Producto sin stock disponible.'
            : 'Stock cercano al mínimo recomendado.',
          isRead: false,
          createdAt: timestamp,
        };
      });
  };


  const loadData = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const storeName = user.company?.name ?? user.companyId ?? 'ALL STARS';
      const productos = await obtenerInventarioPorTienda(storeName);
      
      // Guardar productos originales de la base de datos para usar el nombre exacto
      setProductosOriginales(productos);
      
      const mappedItems = mapProductosToInventoryItems(productos);
      const computedStats = buildInventoryStats(mappedItems);
      const computedAlerts = buildInventoryAlerts(mappedItems);

      setInventoryItems(mappedItems);
      setStats(computedStats);
      setAlerts(computedAlerts);
      setTransactions([]);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      loadData();
      // Cargar configuraciones guardadas
      setAlertConfigs(loadAlertConfigs());
    }
  }, [user]);

  // Función para abrir el modal de configuración
  const handleOpenAlertConfig = (item: ProductoInventario) => {
    const key = getProductKey(item.tienda, item.producto);
    const existingConfig = alertConfigs[key] || {};
    setSelectedProduct(item);
    setAlertConfig({
      stockMinimo: existingConfig.stockMinimo ?? DEFAULT_MINIMUM_STOCK,
      stockMaximo: existingConfig.stockMaximo ?? DEFAULT_MAXIMUM_STOCK,
    });
    setShowAlertConfigModal(true);
  };

  // Función para guardar la configuración
  const handleSaveAlertConfig = () => {
    if (!selectedProduct) return;
    
    const key = getProductKey(selectedProduct.tienda, selectedProduct.producto);
    saveAlertConfig(key, alertConfig);
    
    // Actualizar estado local
    const updatedConfigs = { ...alertConfigs };
    if (alertConfig.stockMinimo === undefined && alertConfig.stockMaximo === undefined) {
      delete updatedConfigs[key];
    } else {
      updatedConfigs[key] = alertConfig;
    }
    setAlertConfigs(updatedConfigs);
    setShowAlertConfigModal(false);
  };

  // Función para resetear a valores por defecto
  const handleResetAlertConfig = () => {
    setAlertConfig({
      stockMinimo: DEFAULT_MINIMUM_STOCK,
      stockMaximo: DEFAULT_MAXIMUM_STOCK,
    });
  };

  // Funciones para productos
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (item: ProductoInventario) => {
    setEditingProduct(item);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (productData: Omit<ProductoInventario, 'idx'>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determinar si es nuevo o editar basado en editingProduct
      // Si editingProduct existe y tiene el mismo producto y tienda, es editar
      const isEditing = editingProduct !== null && 
        editingProduct.producto === productData.producto &&
        normalizeStoreName(editingProduct.tienda) === normalizeStoreName(productData.tienda);
      
      const tipoOperacion = isEditing ? 'editar' : 'nuevo';
      
      // Obtener configuración de alertas para este producto si existe
      const productKey = getProductKey(productData.tienda, productData.producto);
      const alertConfig = alertConfigs[productKey];
      
      // Preparar payload para el endpoint
      const payload = {
        producto: productData.producto,
        cantidad: productData.cantidad || 0,
        tienda: productData.tienda,
        stock_minimo: alertConfig?.stockMinimo ?? DEFAULT_MINIMUM_STOCK,
        stock_maximo: alertConfig?.stockMaximo ?? DEFAULT_MAXIMUM_STOCK,
        tipo_operacion: tipoOperacion,
        usuario: user?.name || user?.email || 'asesor',
      };
      
      console.log('📤 [Asesor] Enviando producto al endpoint:', {
        tipo_operacion: tipoOperacion,
        producto: payload.producto,
        es_edicion: isEditing,
        editingProduct: editingProduct,
      });
      
      // Llamar al endpoint
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Error al guardar el producto');
      }
      
      console.log('✅ [Asesor] Producto guardado exitosamente:', result);
      
      // Limpiar editingProduct después de guardar
      setEditingProduct(null);
      
      // Recargar datos después de guardar
      await loadData();
      
    } catch (err) {
      console.error('❌ [Asesor] Error al guardar producto:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (item: ProductoInventario) => {
    setProductToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Buscar el producto original en la base de datos para obtener el nombre exacto
      // Esto asegura que usemos el nombre tal cual está almacenado en la BD
      const productoOriginal = productosOriginales.find(
        (p) => p.producto === productToDelete.producto && 
               normalizeStoreName(p.tienda) === normalizeStoreName(productToDelete.tienda)
      ) || productToDelete;
      
      // Usar el nombre exacto del producto original de la base de datos (sin trim para preservar espacios exactos)
      const productoNombre = productoOriginal.producto || productToDelete.producto || '';
      const tiendaNombre = productoOriginal.tienda || productToDelete.tienda || null;
      
      if (!productoNombre || productoNombre.trim().length === 0) {
        throw new Error('El nombre del producto no puede estar vacío');
      }
      
      // Log completo de información del producto antes de eliminar
      console.log('🗑️ [Asesor] Información completa del producto a eliminar:', {
        producto_nombre_enviado: productoNombre,
        producto_nombre_original_bd: productoOriginal.producto,
        producto_nombre_desde_ui: productToDelete.producto,
        tienda: tiendaNombre,
        cantidad: productToDelete.cantidad,
        producto_completo: productToDelete,
        producto_original_bd: productoOriginal,
      });
      
      // Preparar payload según el formato del webhook
      // El formato base requiere: producto, tipo_operacion, usuario
      // Pero incluimos tienda por si el webhook la necesita para encontrar el producto exacto
      const payload: any = {
        producto: productoNombre,
        tipo_operacion: 'eliminar',
        usuario: user?.name || user?.email || 'admin',
      };
      
      // Si hay tienda, incluirla puede ayudar al webhook a encontrar el producto
      // aunque según la documentación solo se requieren los 3 campos básicos
      if (tiendaNombre) {
        payload.tienda = tiendaNombre;
      }
      
      console.log('🗑️ [Asesor] Payload que se enviará al webhook:', JSON.stringify(payload, null, 2));
      console.log('🗑️ [Asesor] Comparación de nombres:', {
        nombre_en_ui: productToDelete.producto,
        nombre_original_bd: productoOriginal.producto,
        nombre_que_se_envia: productoNombre,
        son_iguales: productToDelete.producto === productoOriginal.producto,
      });
      
      // Llamar al endpoint
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      // Log completo de la respuesta
      console.log('📥 [Asesor] Respuesta completa del servidor:', {
        status: response.status,
        ok: response.ok,
        result: result,
      });
      
      if (!response.ok || !result.success) {
        // Construir mensaje de error más detallado y amigable
        let errorMessage = result.message || result.error || 'Error al eliminar el producto';
        
        // Log detallado del error
        console.error('❌ [Asesor] Error completo del servidor:', {
          status: response.status,
          result: result,
          details: result.details,
          error_respuesta: result.error_respuesta,
          payload_enviado: result.payload_enviado,
        });
        
        // Si el error es "No item to return was found", mostrar mensaje más claro
        if (result.details && typeof result.details === 'string' && result.details.includes('No item to return was found')) {
          errorMessage = `El producto "${productoNombre}"${tiendaNombre ? ` en la tienda "${tiendaNombre}"` : ''} no se encontró en el inventario. Verifica que el nombre coincida exactamente (incluyendo mayúsculas, minúsculas y espacios). Revisa la consola para más detalles.`;
        } else if (result.status && result.status !== 200) {
          // Si hay un código de estado de error del webhook
          errorMessage = `Error del servidor (${result.status}): ${errorMessage}. Revisa la consola para ver los detalles completos.`;
        } else if (result.details) {
          // Intentar parsear el JSON del details
          try {
            const detailsObj = typeof result.details === 'string' ? JSON.parse(result.details) : result.details;
            if (detailsObj.message) {
              errorMessage = detailsObj.message;
            } else if (detailsObj.error) {
              errorMessage = detailsObj.error;
            }
          } catch {
            // Si no es JSON, usar el texto tal cual
            if (typeof result.details === 'string' && result.details.length < 500) {
              errorMessage = result.details;
            }
          }
        }
        
        // Si hay información adicional del error en la respuesta
        if (result.error_respuesta) {
          console.error('❌ [Asesor] Error respuesta del webhook:', result.error_respuesta);
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ [Asesor] Producto eliminado exitosamente:', result);
      
      // Mostrar mensaje de éxito
      toast({
        title: '✅ Producto eliminado',
        description: `El producto "${productoNombre}" ha sido eliminado exitosamente del inventario.`,
        variant: 'default',
      });
      
      // Eliminar configuración de alertas si existe
      const productKey = getProductKey(productToDelete.tienda, productToDelete.producto);
      if (alertConfigs[productKey]) {
        const updatedConfigs = { ...alertConfigs };
        delete updatedConfigs[productKey];
        setAlertConfigs(updatedConfigs);
        saveAlertConfig(productKey, {});
      }
      
      // Cerrar modal y recargar datos
      setShowDeleteModal(false);
      setProductToDelete(null);
      await loadData();
      
    } catch (err) {
      console.error('❌ [Asesor] Error al eliminar producto:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el producto';
      setError(errorMessage);
      toast({
        title: '❌ Error al eliminar producto',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar producto al diccionario
  const handleAddToDictionary = async (producto: ProductoInventario) => {
    const productName = producto.producto;
    
    // Verificar si ya se está agregando
    if (addingToDictionary.has(productName)) {
      return;
    }
    
    try {
      // Agregar al set de productos en proceso
      setAddingToDictionary(prev => new Set(prev).add(productName));
      
      console.log('📚 [Asesor] Agregando producto al diccionario:', productName);
      
      // Llamar al endpoint de diccionario
      const response = await fetch('/api/inventory/dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_existente: productName,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        const errorMessage = result.message || result.error || 'Error al agregar el producto al diccionario';
        console.error('❌ [Asesor] Error al agregar al diccionario:', result);
        throw new Error(errorMessage);
      }
      
      console.log('✅ [Asesor] Producto agregado al diccionario exitosamente:', result);
      
      toast({
        title: '✅ Producto agregado al diccionario',
        description: `"${productName}" ha sido agregado exitosamente al diccionario.`,
        variant: 'default',
      });
      
    } catch (err) {
      console.error('❌ [Asesor] Error al agregar producto al diccionario:', err);
      toast({
        title: '❌ Error al agregar al diccionario',
        description: err instanceof Error ? err.message : 'Ocurrió un error al agregar el producto al diccionario',
        variant: 'destructive',
      });
    } finally {
      // Remover del set de productos en proceso
      setAddingToDictionary(prev => {
        const newSet = new Set(prev);
        newSet.delete(productName);
        return newSet;
      });
    }
  };


  const totalUnits = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + item.currentStock, 0),
    [inventoryItems]
  );

  const inventoryStatusCounts = useMemo<Record<'all' | StockStatus, number>>(() => {
    const counts: Record<'all' | StockStatus, number> = {
      all: inventoryItems.length,
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0,
      overstock: 0,
    };

    inventoryItems.forEach((item) => {
      const producto = inventoryItems.find(
        (inv) => inv.product.name === item.product.name
      ) ? {
        producto: item.product.name,
        cantidad: item.currentStock,
        tienda: item.location || user?.company?.name || 'ALL STARS',
      } as ProductoInventario : null;
      
      const key = producto ? getProductKey(producto.tienda, producto.producto) : null;
      const config = key ? alertConfigs[key] : undefined;
      const statusInfo = getStatusInfo(item.currentStock, config);
      counts[statusInfo.status] += 1;
    });

    return counts;
  }, [inventoryItems, alertConfigs, user]);

  const stockFilterOptions = useMemo<
    Array<{ value: StockFilterValue; label: string; count: number }>
  >(
    () => [
      { value: 'all', label: 'Todos', count: inventoryStatusCounts.all },
      { value: 'in_stock', label: 'En stock', count: inventoryStatusCounts.in_stock },
      { value: 'low_stock', label: 'Stock bajo', count: inventoryStatusCounts.low_stock },
      { value: 'out_of_stock', label: 'Agotado', count: inventoryStatusCounts.out_of_stock },
      { value: 'overstock', label: 'Sobre stock', count: inventoryStatusCounts.overstock },
    ],
    [inventoryStatusCounts]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const searchFiltered = inventoryItems.filter((item) => {
      return (
        normalizedSearch.length === 0 ||
        item.product.name.toLowerCase().includes(normalizedSearch) ||
        item.product.sku.toLowerCase().includes(normalizedSearch) ||
        (item.location?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });

    if (stockFilter === 'all') return searchFiltered;
    
    return searchFiltered.filter((item) => {
      const producto = inventoryItems.find(
        (inv) => inv.product.name === item.product.name
      ) ? {
        producto: item.product.name,
        cantidad: item.currentStock,
        tienda: item.location || user?.company?.name || 'ALL STARS',
      } as ProductoInventario : null;
      
      const key = producto ? getProductKey(producto.tienda, producto.producto) : null;
      const config = key ? alertConfigs[key] : undefined;
      const statusInfo = getStatusInfo(item.currentStock, config);
      return statusInfo.status === stockFilter;
    });
  }, [inventoryItems, searchTerm, stockFilter, alertConfigs, user]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      return (a.product.name || '').localeCompare(b.product.name || '', 'es', { sensitivity: 'base' });
    });
  }, [filteredItems]);

  const isInitialLoading = loading && inventoryItems.length === 0;
  const isRefreshing = loading && inventoryItems.length > 0;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <span className="text-sm text-muted-foreground">Cargando inventario...</span>
      </div>
    );
  }

  if (!user?.companyId) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            No tienes una empresa asignada. Contacta al administrador.
          </AlertDescription>
        </Alert>
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
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Package className="h-4 w-4" />
                Panel de gestión de inventario
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Inventario - {user.company?.name}
              </h1>
              <p className="text-white/90 text-base">
                Gestiona el inventario de tu empresa
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={loadData} 
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              <RefreshCw className={cn('w-4 h-4', loading ? 'animate-spin' : '')} />
              <span>Recargar</span>
            </Button>
            <Button asChild className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
              <Link href="/dashboard/asesor/orders">
                <Package className="w-4 h-4 mr-2" />
                Ver Pedidos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Estadísticas - Mejoradas */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Productos listados</p>
                  <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{stats.totalProducts.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total de productos</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                  <Package className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Unidades totales</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{totalUnits.toLocaleString('es-CR')}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stock disponible</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-amber-200 dark:border-amber-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/30 to-yellow-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stock bajo</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{stats.lowStockItems}</p>
                  <p className="text-xs text-muted-foreground mt-1">Productos con bajo stock</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-red-200 dark:border-red-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-red-400/30 to-rose-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agotados</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.outOfStockItems}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sin stock disponible</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sección de Filtros - Mejorada */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
        <Card className="relative border-0 shadow-lg bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/50 dark:to-indigo-950/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Filtros y Búsqueda</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filtra inventario por estado de stock o búsqueda de texto
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {sortedItems.length} resultado{sortedItems.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros de estado */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-sky-500" />
                Estado de Stock
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {stockFilterOptions.map((option) => {
                  const isActive = stockFilter === option.value;
                  return (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => setStockFilter(option.value)}
                      className={cn(
                        'transition-all duration-200 hover:scale-105',
                        isActive
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                          : 'hover:bg-emerald-50'
                      )}
                    >
                      <span>{option.label}</span>
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                        {option.count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o tienda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 rounded-full border-slate-200 pl-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                Inventario detallado ({sortedItems.length}
                {stockFilter === 'all' ? '' : ` • ${stockFilterOptions.find((o) => o.value === stockFilter)?.label ?? ''}`}
                )
              </CardTitle>
              <div className="flex items-center gap-2">
                {isRefreshing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando inventario...
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleCreateProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedItems.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No se encontraron productos que coincidan con los filtros seleccionados.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[120px] text-right">Unidades</TableHead>
                        <TableHead className="w-[140px] text-center">Estado</TableHead>
                        <TableHead className="w-[80px] text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedItems.map((item) => {
                        const producto = inventoryItems.find(
                          (inv) => inv.product.name === item.product.name
                        ) ? {
                          producto: item.product.name,
                          cantidad: item.currentStock,
                          tienda: item.location || user?.company?.name || 'ALL STARS',
                        } as ProductoInventario : null;
                        
                        const key = producto ? getProductKey(producto.tienda, producto.producto) : null;
                        const config = key ? alertConfigs[key] : undefined;
                        const statusInfo = getStatusInfo(item.currentStock, config);
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">
                                  {item.product.name || 'Producto sin nombre'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.location}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">
                              {item.currentStock}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {producto && (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddToDictionary(producto)}
                                    className="h-8 w-8 p-0"
                                    title="Agregar al diccionario"
                                    disabled={addingToDictionary.has(producto.producto)}
                                  >
                                    {addingToDictionary.has(producto.producto) ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : (
                                      <BookOpen className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenAlertConfig(producto)}
                                    className="h-8 w-8 p-0"
                                    title="Configurar alertas de stock"
                                  >
                                    <Settings className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(producto)}
                                    className="h-8 w-8 p-0"
                                    title="Editar producto"
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(producto)}
                                    className="h-8 w-8 p-0"
                                    title="Eliminar producto"
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <InventoryMovements 
            productos={inventoryItems.map((item) => ({
              producto: item.product.name,
              cantidad: item.currentStock,
              tienda: item.location || user?.company?.name || 'ALL STARS',
            }))} 
            limit={30} 
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Configuración de Alertas */}
      <Dialog open={showAlertConfigModal} onOpenChange={setShowAlertConfigModal}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[480px] overflow-y-auto">
          <DialogHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg leading-tight">Configurar Alertas de Stock</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Define los umbrales personalizados
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm text-foreground">
                      {selectedProduct.producto || 'Producto sin nombre'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {normalizeStoreName(selectedProduct.tienda)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {selectedProduct.cantidad} unidades
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-orange-200/60 bg-orange-50/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-orange-100">
                    <ArrowDown className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <Label htmlFor="stock-minimo" className="text-sm font-semibold">
                    Stock Mínimo
                  </Label>
                </div>
                <div className="pl-9">
                  <Input
                    id="stock-minimo"
                    type="number"
                    min="0"
                    value={alertConfig.stockMinimo ?? DEFAULT_MINIMUM_STOCK}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        stockMinimo: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder={DEFAULT_MINIMUM_STOCK.toString()}
                    className="h-9 text-sm font-medium"
                  />
                  <div className="mt-1.5 flex items-start gap-1.5 rounded bg-orange-100/60 p-1.5">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-orange-600" />
                    <p className="text-[10px] leading-tight text-orange-900/80">
                      Alerta de <strong>Stock Bajo</strong> cuando sea ≤ este valor
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-100">
                    <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <Label htmlFor="stock-maximo" className="text-sm font-semibold">
                    Stock Máximo
                  </Label>
                </div>
                <div className="pl-9">
                  <Input
                    id="stock-maximo"
                    type="number"
                    min="1"
                    max="100"
                    value={alertConfig.stockMaximo ?? DEFAULT_MAXIMUM_STOCK}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      // Limitar a 100 como máximo
                      const limitedValue = value && value > 100 ? 100 : value;
                      setAlertConfig({
                        ...alertConfig,
                        stockMaximo: limitedValue,
                      });
                    }}
                    placeholder={DEFAULT_MAXIMUM_STOCK.toString()}
                    className="h-9 text-sm font-medium"
                  />
                  <div className="mt-1.5 flex items-start gap-1.5 rounded bg-blue-100/60 p-1.5">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" />
                    <p className="text-[10px] leading-tight text-blue-900/80">
                      Alerta de <strong>Sobre Stock</strong> cuando sea &gt; este valor
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-900">Vista Previa</p>
                </div>
                <div className="flex items-center justify-between rounded bg-white px-2.5 py-2 shadow-sm">
                  <span className="text-xs text-muted-foreground">
                    {selectedProduct.cantidad} unidades →
                  </span>
                  <Badge
                    variant={getStatusInfo(selectedProduct.cantidad, alertConfig).variant}
                    className="text-xs font-medium px-2 py-0.5"
                  >
                    {getStatusInfo(selectedProduct.cantidad, alertConfig).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={handleResetAlertConfig}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Restablecer
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowAlertConfigModal(false)}
                className="h-9 flex-1 text-xs sm:flex-initial"
                size="sm"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveAlertConfig} className="h-9 flex-1 text-xs sm:flex-initial" size="sm">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Crear/Editar Producto */}
      <ProductFormModal
        open={showProductModal}
        onOpenChange={setShowProductModal}
        product={editingProduct}
        onSave={handleSaveProduct}
        stores={[user?.company?.name || 'ALL STARS']}
        hideStoreField={true}
        defaultStore={user?.company?.name || 'ALL STARS'}
      />

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este producto del inventario?
            </DialogDescription>
          </DialogHeader>
          {productToDelete && (
            <div className="py-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-slate-600">Producto:</span>
                    <p className="text-base font-semibold text-slate-900">{productToDelete.producto}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Tienda:</span>
                    <p className="text-base text-slate-700">{normalizeStoreName(productToDelete.tienda)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Cantidad actual:</span>
                    <p className="text-base text-slate-700">{productToDelete.cantidad} unidades</p>
                  </div>
                </div>
              </div>
              <Alert className="mt-4 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-sm">
                  Esta acción no se puede deshacer. El producto será eliminado permanentemente del inventario.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProduct}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
