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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Info,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Filter,
  Warehouse,
  ChevronLeft,
  ChevronRight,
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
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para el modal de configuración de alertas
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [alertConfig, setAlertConfig] = useState<StockAlertConfig>({});
  const [alertConfigs, setAlertConfigs] = useState<Record<ProductKey, StockAlertConfig>>({});
  
  // Estados para ajuste de stock en modal de configuración
  const [stockEntrada, setStockEntrada] = useState<number>(0);
  const [stockSalida, setStockSalida] = useState<number>(0);
  
  // Estados para el modal de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoInventario | null>(null);
  
  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductoInventario | null>(null);
  
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

  // Función para abrir el modal combinado de ajuste de stock y configuración
  const handleOpenStockAdjust = (item: ProductoInventario) => {
    const key = getProductKey(item.tienda, item.producto);
    const existingConfig = alertConfigs[key] || {};
    setSelectedProduct(item);
    setEditingProduct(item);
    setAlertConfig({
      stockMinimo: existingConfig.stockMinimo ?? DEFAULT_MINIMUM_STOCK,
      stockMaximo: existingConfig.stockMaximo ?? DEFAULT_MAXIMUM_STOCK,
    });
    setStockEntrada(0);
    setStockSalida(0);
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

  const handleSaveProduct = async (productData: Omit<ProductoInventario, 'idx'> & { stock_minimo?: number; stock_maximo?: number }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determinar si es nuevo o editar basado en editingProduct
      const isEditing = editingProduct !== null;
      const tipoOperacion = isEditing ? 'editar' : 'nuevo';
      
      // Verificar qué campos cambiaron (el nombre NO se puede editar, siempre usar el original)
      const cantidadCambio = isEditing && editingProduct?.cantidad !== productData.cantidad;
      
      // Obtener valores de stock de la configuración de alertas o usar defaults
      const productKey = getProductKey(productData.tienda, editingProduct?.producto || productData.producto);
      const alertConfig = alertConfigs[productKey];
      const stockMinimoOriginal = alertConfig?.stockMinimo ?? DEFAULT_MINIMUM_STOCK;
      const stockMaximoOriginal = alertConfig?.stockMaximo ?? DEFAULT_MAXIMUM_STOCK;
      
      const stockMinimoCambio = isEditing && stockMinimoOriginal !== (productData.stock_minimo ?? DEFAULT_MINIMUM_STOCK);
      const stockMaximoCambio = isEditing && stockMaximoOriginal !== (productData.stock_maximo ?? DEFAULT_MAXIMUM_STOCK);
      const otrosCamposCambiaron = cantidadCambio || stockMinimoCambio || stockMaximoCambio;
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📤 [Asesor] PREPARANDO GUARDADO DE PRODUCTO');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 Tipo de operación:', tipoOperacion);
      console.log('✏️  Es edición:', isEditing);
      if (isEditing) {
        console.log('📝 Nombre del producto (no editable):', editingProduct?.producto);
        console.log('📊 ¿Cantidad cambió?:', cantidadCambio);
        console.log('📉 ¿Stock mínimo cambió?:', stockMinimoCambio);
        console.log('📈 ¿Stock máximo cambió?:', stockMaximoCambio);
        console.log('🔄 ¿Otros campos cambiaron?:', otrosCamposCambiaron);
      }
      console.log('═══════════════════════════════════════════════════════════');
      
      // Para edición, siempre usar el nombre original del producto
      const nombreParaWebhook = isEditing 
        ? editingProduct!.producto.trim() // Usar el nombre original, no se puede editar
        : productData.producto.trim(); // Para nuevo producto
      
      // Obtener la hora actual del navegador (hora exacta del momento de la acción)
      const now = new Date();
      
      const payload = {
        producto: nombreParaWebhook,
        cantidad: productData.cantidad || 0,
        tienda: productData.tienda.trim(),
        stock_minimo: productData.stock_minimo ?? DEFAULT_MINIMUM_STOCK,
        stock_maximo: productData.stock_maximo ?? DEFAULT_MAXIMUM_STOCK,
        tipo_operacion: tipoOperacion,
        usuario: user?.name || user?.email || 'asesor',
        fecha_movimiento: now.toISOString(), // Hora exacta del momento de la acción
      };
      
      console.log('🕐 [Asesor] Hora del movimiento enviada:', {
        hora_local: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
        iso: now.toISOString(),
      });
      
      console.log('📤 [Asesor] Enviando otros campos al webhook:', {
        producto: payload.producto,
        cantidad: payload.cantidad,
        stock_minimo: payload.stock_minimo,
        stock_maximo: payload.stock_maximo,
      });
      
      // Llamar al endpoint solo si hay otros campos que cambiar o es nuevo
      if (!isEditing || otrosCamposCambiaron) {
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          const errorMessage = result.message || result.error || result.details || 'Error al guardar el producto';
          console.error('❌ [Asesor] Error del webhook:', errorMessage);
          throw new Error(errorMessage);
        }
        
        console.log('✅ [Asesor] Campos actualizados exitosamente en webhook:', result);
      }
      
      console.log('✅ [Asesor] Producto guardado exitosamente');
      
      // Mostrar mensaje de éxito con tarjeta
      toast({
        title: '✅ Producto guardado exitosamente',
        description: (
          <div className="space-y-1.5 mt-1">
            <p className="font-semibold text-sm">{isEditing ? 'Producto actualizado' : 'Producto creado'}</p>
            <p className="text-xs opacity-90">
              {isEditing 
                ? `"${editingProduct?.producto}" ha sido actualizado correctamente.`
                : `"${payload.producto}" ha sido agregado al inventario.`}
            </p>
            {isEditing && otrosCamposCambiaron && (
              <p className="text-xs opacity-80">
                Cantidad: {payload.cantidad} | Stock mínimo: {payload.stock_minimo} | Stock máximo: {payload.stock_maximo}
              </p>
            )}
          </div>
        ),
        variant: 'success',
        duration: 4000,
      });
      
      // Cerrar el modal y limpiar estados
      if (editingProduct) {
        setShowProductModal(false);
        setEditingProduct(null);
      } else {
        setShowProductModal(false);
      }
      
      // Recargar datos después de guardar
      await loadData();
      
    } catch (err) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ [Asesor] EXCEPCIÓN AL GUARDAR PRODUCTO');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('🔴 Error:', err);
      if (err instanceof Error) {
        console.error('📝 Mensaje:', err.message);
        console.error('📚 Stack:', err.stack);
      }
      console.error('═══════════════════════════════════════════════════════════');
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
      // Esto es importante porque el nombre en la UI puede tener trim() aplicado
      const productoOriginal = productosOriginales.find(
        (p) => {
          // Comparar por nombre (sin case sensitive) y tienda
          const nombreMatch = p.producto?.toLowerCase().trim() === productToDelete.producto?.toLowerCase().trim();
          const tiendaMatch = normalizeStoreName(p.tienda) === normalizeStoreName(productToDelete.tienda);
          return nombreMatch && tiendaMatch;
        }
      );
      
      // Usar el nombre exacto del producto original de la BD (sin trim para preservar espacios exactos)
      const productoNombre = productoOriginal?.producto || productToDelete.producto || '';
      
      if (!productoNombre || productoNombre.trim().length === 0) {
        throw new Error('El nombre del producto no puede estar vacío');
      }
      
      console.log('🗑️ [Asesor] Información del producto a eliminar:', {
        nombre_en_ui: productToDelete.producto,
        nombre_original_bd: productoOriginal?.producto,
        nombre_que_se_envia: productoNombre,
        producto_original_encontrado: !!productoOriginal,
      });
      
      // Obtener la hora actual del navegador (hora exacta del momento de la acción)
      const now = new Date();
      
      // Preparar payload para eliminar
      const payload = {
        producto: productoNombre, // Usar el nombre exacto de la BD
        tipo_operacion: 'eliminar',
        usuario: user?.name || user?.email || 'asesor',
        fecha_movimiento: now.toISOString(), // Hora exacta del momento de la acción
      };
      
      console.log('🕐 [Asesor] Hora del movimiento (eliminar):', {
        hora_local: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
        iso: now.toISOString(),
      });
      
      console.log('🗑️ [Asesor] Eliminando producto:', payload);
      
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
          errorMessage = `El producto "${productoNombre}" no se encontró en el inventario. Verifica que el nombre coincida exactamente (incluyendo mayúsculas, minúsculas y espacios).`;
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

  // Paginación: 10 productos por página
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter]);

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
                      {paginatedItems.map((item) => {
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
                                    onClick={() => handleOpenStockAdjust(producto)}
                                    className="h-8 w-8 p-0"
                                    title="Ajustar stock y configurar alertas"
                                  >
                                    <ArrowUpDown className="h-4 w-4 text-muted-foreground hover:text-primary" />
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
              
              {/* Paginación con puntos */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-1.5 rounded-md transition-all duration-200',
                      currentPage === 1
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-muted hover:scale-110 cursor-pointer'
                    )}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'rounded-full transition-all duration-200',
                          currentPage === page
                            ? 'w-2.5 h-2.5 bg-primary scale-125'
                            : 'w-2 h-2 border border-muted-foreground/30 hover:border-muted-foreground/50 bg-transparent'
                        )}
                        aria-label={`Ir a página ${page}`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-1.5 rounded-md transition-all duration-200',
                      currentPage === totalPages
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-muted hover:scale-110 cursor-pointer'
                    )}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
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
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[800px] overflow-y-auto">
          <DialogHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ArrowUpDown className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg leading-tight">Ajustar Stock y Configurar Alertas</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Ajusta el stock y define los umbrales personalizados
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

              {/* Sección de Ajuste de Stock */}
              <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-100">
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <Label className="text-sm font-semibold">
                    Ajuste de Stock
                  </Label>
                </div>
                
                {/* Stock Actual */}
                <div className="mb-3 rounded bg-white p-2.5 border border-emerald-200">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Stock Actual</p>
                  <p className="text-lg font-bold text-emerald-700">{selectedProduct.cantidad} unidades</p>
                </div>

                {/* Entrada de Stock */}
                <div className="mb-3 space-y-1.5">
                  <Label htmlFor="stock-entrada" className="text-xs font-medium text-emerald-700">
                    Entrada (Cantidad que entra)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockEntrada(Math.max(0, stockEntrada - 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      id="stock-entrada"
                      type="number"
                      min="0"
                      value={stockEntrada}
                      onChange={(e) => setStockEntrada(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="h-8 text-center font-semibold text-emerald-700"
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockEntrada(stockEntrada + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Salida de Stock */}
                <div className="mb-3 space-y-1.5">
                  <Label htmlFor="stock-salida" className="text-xs font-medium text-red-700">
                    Salida (Cantidad que sale)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockSalida(Math.max(0, stockSalida - 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      id="stock-salida"
                      type="number"
                      min="0"
                      value={stockSalida}
                      onChange={(e) => setStockSalida(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="h-8 text-center font-semibold text-red-700"
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockSalida(stockSalida + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Cantidad Final */}
                <div className="rounded bg-emerald-100 p-2.5 border border-emerald-300">
                  <p className="text-xs font-medium text-emerald-900 mb-1">Cantidad Final</p>
                  <p className="text-xl font-bold text-emerald-900">
                    {selectedProduct.cantidad + stockEntrada - stockSalida} unidades
                  </p>
                  {(stockEntrada > 0 || stockSalida > 0) && (
                    <p className="text-[10px] text-emerald-700 mt-1">
                      {selectedProduct.cantidad} {stockEntrada > 0 && `+ ${stockEntrada}`} {stockSalida > 0 && `- ${stockSalida}`} = {selectedProduct.cantidad + stockEntrada - stockSalida}
                    </p>
                  )}
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
              <Button 
                onClick={() => {
                  handleSaveAlertConfig();
                  // Si hay ajuste de stock, guardarlo también
                  if (selectedProduct && (stockEntrada > 0 || stockSalida > 0)) {
                    const nuevaCantidad = selectedProduct.cantidad + stockEntrada - stockSalida;
                    handleSaveProduct({
                      ...selectedProduct,
                      cantidad: nuevaCantidad,
                      stock_minimo: alertConfig.stockMinimo,
                      stock_maximo: alertConfig.stockMaximo,
                    });
                  }
                }} 
                className="h-9 flex-1 text-xs sm:flex-initial" 
                size="sm"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Guardar {stockEntrada > 0 || stockSalida > 0 ? 'y Aplicar Ajuste' : ''}
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
