'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { InventoryItem, InventoryStats, InventoryAlert, InventoryTransaction, Company } from '@/lib/types';
import { obtenerInventarioPorTienda, ProductoInventario } from '@/lib/supabase-inventario';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { InventoryMovements } from '@/components/dashboard/inventory-movements';
import { ProductFormModal } from '@/components/dashboard/product-form-modal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Settings,
  ArrowDown,
  ArrowUp,
  Info,
  CheckCircle2,
  Plus,
  Edit,
  Building2,
  RefreshCw,
} from 'lucide-react';

const DEFAULT_MINIMUM_STOCK = 5;
const DEFAULT_MAXIMUM_STOCK = 1000;

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

const getStatusInfo = (
  quantity: number,
  config?: StockAlertConfig
): { status: string; label: string; variant: 'default' | 'secondary' | 'destructive' } => {
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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  
  // Estados para el modal de configuración de alertas
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [alertConfig, setAlertConfig] = useState<StockAlertConfig>({});
  const [alertConfigs, setAlertConfigs] = useState<Record<ProductKey, StockAlertConfig>>({});
  
  // Estados para el modal de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoInventario | null>(null);

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

  const handleSaveProduct = (productData: Omit<ProductoInventario, 'idx'>) => {
    console.log('Guardar producto:', productData);
    loadData();
  };

  const getStockStatus = (item: InventoryItem, producto?: ProductoInventario) => {
    if (producto) {
      const key = getProductKey(producto.tienda, producto.producto);
      const config = alertConfigs[key];
      const statusInfo = getStatusInfo(item.currentStock, config);
      return {
        status: statusInfo.status,
        label: statusInfo.label,
        color: statusInfo.variant === 'destructive' ? 'destructive' : statusInfo.variant === 'secondary' ? 'secondary' : 'default',
      };
    }
    if (item.currentStock === 0) return { status: 'out_of_stock', label: 'Agotado', color: 'destructive' };
    if (item.currentStock <= item.minimumStock) return { status: 'low_stock', label: 'Stock Bajo', color: 'destructive' };
    if (item.currentStock > item.maximumStock) return { status: 'overstock', label: 'Sobre Stock', color: 'secondary' };
    return { status: 'in_stock', label: 'En Stock', color: 'default' };
  };


  const filteredItems = inventoryItems.filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const producto = inventoryItems.find(
      (inv) => inv.product.name === item.product.name
    ) ? {
      producto: item.product.name,
      cantidad: item.currentStock,
      tienda: item.location || user?.company?.name || 'ALL STARS',
    } as ProductoInventario : null;
    
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.product.name.toLowerCase().includes(normalizedSearch) ||
      item.product.sku.toLowerCase().includes(normalizedSearch) ||
      (item.location?.toLowerCase().includes(normalizedSearch) ?? false);
    const stockStatus = getStockStatus(item, producto || undefined);
    const matchesStock = stockFilter === 'all' || stockStatus.status === stockFilter;
    return matchesSearch && matchesStock;
  });

  const totalUnits = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + item.currentStock, 0),
    [inventoryItems]
  );

  const inventoryStatusCounts = useMemo(() => {
    const counts: Record<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock', number> = {
      all: inventoryItems.length,
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0,
      overstock: 0,
    };

    inventoryItems.forEach((item) => {
      const status = getStockStatus(item).status;
      if (status !== 'in_stock' && status !== 'low_stock' && status !== 'out_of_stock' && status !== 'overstock') {
        return;
      }
      counts[status] += 1;
    });

    return counts;
  }, [inventoryItems]);

  const stockFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos', count: inventoryStatusCounts.all },
      { value: 'in_stock', label: 'En stock', count: inventoryStatusCounts.in_stock },
      { value: 'low_stock', label: 'Stock bajo', count: inventoryStatusCounts.low_stock },
      { value: 'out_of_stock', label: 'Agotado', count: inventoryStatusCounts.out_of_stock },
      { value: 'overstock', label: 'Sobre stock', count: inventoryStatusCounts.overstock },
    ],
    [inventoryStatusCounts]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario - {user.company?.name}</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de tu empresa
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/asesor/orders">
            <Package className="w-4 h-4 mr-2" />
            Ver Pedidos
          </Link>
        </Button>
      </div>

      {/* Company Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">{user.company?.name}</h3>
              <p className="text-sm text-blue-700">
                Inventario exclusivo de tu empresa • {inventoryItems.length} productos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Productos"
            value={stats.totalProducts}
            icon={Package}
            className="bg-blue-50 border-blue-200"
          />
          <StatsCard
            title="Unidades Totales"
            value={totalUnits.toLocaleString('es-CR')}
            icon={TrendingUp}
            className="bg-green-50 border-green-200"
          />
          <StatsCard
            title="Stock Bajo"
            value={stats.lowStockItems}
            icon={AlertTriangle}
            className="bg-yellow-50 border-yellow-200"
          />
          <StatsCard
            title="Agotados"
            value={stats.outOfStockItems}
            icon={XCircle}
            className="bg-red-50 border-red-200"
          />
        </div>
      )}

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="transactions">Movimientos</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {stockFilterOptions.map((option) => {
                    const isActive = stockFilter === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStockFilter(option.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <span>{option.label}</span>
                        <span
                          className={cn(
                            'min-w-[1.75rem] rounded-full px-2 py-0.5 text-xs font-semibold',
                            isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {option.count}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full lg:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por producto o tienda..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 rounded-full border-slate-200 pl-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCreateProduct}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Producto
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
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
                        <TableHead className="w-[120px] text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        // Encontrar el producto correspondiente
                        const producto = inventoryItems.find(
                          (inv) => inv.product.name === item.product.name
                        ) ? {
                          producto: item.product.name,
                          cantidad: item.currentStock,
                          tienda: item.location || user?.company?.name || 'ALL STARS',
                        } as ProductoInventario : null;
                        
                        const stockStatus = getStockStatus(item, producto || undefined);
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
                              <Badge variant={stockStatus.color as any}>
                                {stockStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {producto && (
                                <div className="flex items-center justify-center gap-1">
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

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
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
                    value={alertConfig.stockMaximo ?? DEFAULT_MAXIMUM_STOCK}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        stockMaximo: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
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
    </div>
  );
}
