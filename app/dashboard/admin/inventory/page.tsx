'use client';

import { useEffect, useMemo, useState } from 'react';
import { obtenerInventario, ProductoInventario } from '@/lib/supabase-inventario';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  XCircle,
  Building2,
  Search,
  RefreshCw,
  Settings,
  ArrowDown,
  ArrowUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryMovements } from '@/components/dashboard/inventory-movements';
import { ProductFormModal } from '@/components/dashboard/product-form-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit } from 'lucide-react';

const DEFAULT_MINIMUM_STOCK = 5;
const DEFAULT_MAXIMUM_STOCK = 1000;

// Tipo para configuraciones de alertas por producto
type StockAlertConfig = {
  stockMinimo?: number;
  stockMaximo?: number;
};

type ProductKey = string; // Formato: "tienda|producto"

// Función para generar clave única de producto
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
      // Si ambos son undefined, eliminar la configuración
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

const normalizeStoreName = (store?: string | null) =>
  store?.trim() && store.trim().length > 0 ? store.trim() : 'Sin tienda';

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

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilterValue>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el modal de configuración de alertas
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [alertConfig, setAlertConfig] = useState<StockAlertConfig>({});
  const [alertConfigs, setAlertConfigs] = useState<Record<ProductKey, StockAlertConfig>>({});
  
  // Estados para el modal de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoInventario | null>(null);
  
  // Obtener tiendas únicas
  const stores = useMemo(() => {
    const storeSet = new Set<string>();
    inventory.forEach((item) => {
      const storeName = normalizeStoreName(item.tienda);
      if (storeName && storeName !== 'Sin tienda') {
        storeSet.add(storeName);
      }
    });
    return Array.from(storeSet).sort();
  }, [inventory]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await obtenerInventario();
      setInventory(data);
      setError(null);
    } catch (err) {
      console.error('❌ Error cargando inventario:', err);
      setError('No se pudo cargar el inventario. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // Cargar configuraciones guardadas
    setAlertConfigs(loadAlertConfigs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Aquí deberías guardar en Supabase
    // Por ahora solo recargamos el inventario
    console.log('Guardar producto:', productData);
    loadInventory();
  };

  useEffect(() => {
    if (selectedStore === 'all') return;
    const exists = inventory.some((item) => normalizeStoreName(item.tienda) === selectedStore);
    if (!exists) {
      setSelectedStore('all');
    }
  }, [inventory, selectedStore]);

  const storeOptions = useMemo(() => {
    const counts = inventory.reduce<Record<string, number>>((acc, item) => {
      const storeName = normalizeStoreName(item.tienda);
      acc[storeName] = (acc[storeName] ?? 0) + 1;
      return acc;
    }, {});

    const sortedStores = Object.entries(counts).sort(([a], [b]) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    return [
      { value: 'all', label: 'Todas', count: inventory.length },
      ...sortedStores.map(([store, count]) => ({
        value: store,
        label: store,
        count,
      })),
    ];
  }, [inventory]);

  const inventoryForStore = useMemo(() => {
    if (selectedStore === 'all') return inventory;
    return inventory.filter((item) => normalizeStoreName(item.tienda) === selectedStore);
  }, [inventory, selectedStore]);

  const statusCounts = useMemo<Record<'all' | StockStatus, number>>(() => {
    const counts: Record<'all' | StockStatus, number> = {
      all: inventoryForStore.length,
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0,
      overstock: 0,
    };

    inventoryForStore.forEach((item) => {
      const key = getProductKey(item.tienda, item.producto);
      const config = alertConfigs[key];
      const status = getStatusInfo(item.cantidad, config).status;
      counts[status] += 1;
    });

    return counts;
  }, [inventoryForStore, alertConfigs]);

  const stockFilterOptions = useMemo<
    Array<{ value: StockFilterValue; label: string; count: number }>
  >(
    () => [
      { value: 'all', label: 'Todos', count: statusCounts.all },
      { value: 'in_stock', label: 'En stock', count: statusCounts.in_stock },
      { value: 'low_stock', label: 'Stock bajo', count: statusCounts.low_stock },
      { value: 'out_of_stock', label: 'Agotado', count: statusCounts.out_of_stock },
      { value: 'overstock', label: 'Sobre stock', count: statusCounts.overstock },
    ],
    [statusCounts]
  );

  const searchFilteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return inventoryForStore;

    return inventoryForStore.filter((item) => {
      const productName = item.producto?.toLowerCase() ?? '';
      const storeName = normalizeStoreName(item.tienda).toLowerCase();
      return productName.includes(normalizedSearch) || storeName.includes(normalizedSearch);
    });
  }, [inventoryForStore, searchTerm]);

  const filteredItems = useMemo(() => {
    if (stockFilter === 'all') return searchFilteredItems;
    return searchFilteredItems.filter((item) => {
      const key = getProductKey(item.tienda, item.producto);
      const config = alertConfigs[key];
      return getStatusInfo(item.cantidad, config).status === stockFilter;
    });
  }, [searchFilteredItems, stockFilter, alertConfigs]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const storeA = normalizeStoreName(a.tienda);
      const storeB = normalizeStoreName(b.tienda);

      if (storeA !== storeB) {
        return storeA.localeCompare(storeB, 'es', { sensitivity: 'base' });
      }

      return (a.producto || '').localeCompare(b.producto || '', 'es', { sensitivity: 'base' });
    });
  }, [filteredItems]);

  const totalUnits = useMemo(
    () => inventoryForStore.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
    [inventoryForStore]
  );

  const totalStores = storeOptions.length > 0 ? storeOptions.length - 1 : 0;
  const lowStockTotal = statusCounts.low_stock;
  const outOfStockTotal = statusCounts.out_of_stock;
  const isInitialLoading = loading && inventory.length === 0;
  const isRefreshing = loading && inventory.length > 0;

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
                Inventario General
              </h1>
              <p className="text-white/90 text-base">
                Consulta el inventario consolidado de todas las tiendas.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={loadInventory} 
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              <RefreshCw className={cn('w-4 h-4', loading ? 'animate-spin' : '')} />
              <span>Recargar</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadInventory} disabled={loading}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Estadísticas - Mejoradas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Productos listados</p>
                <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{statusCounts.all.toLocaleString()}</p>
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

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-purple-200 dark:border-purple-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/30 to-indigo-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tiendas activas</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{totalStores}</p>
                <p className="text-xs text-muted-foreground mt-1">Puntos de venta</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-amber-200 dark:border-amber-800">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/30 to-yellow-400/30 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Alertas</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{lowStockTotal + outOfStockTotal}</p>
                <p className="text-xs text-muted-foreground mt-1">Bajo/Agotado</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    Filtra inventario por tienda, estado de stock o búsqueda de texto
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros rápidos por tienda */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-500" />
                Filtros rápidos por tienda
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {storeOptions.map((option) => {
                  const isActive = selectedStore === option.value;
                  return (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => setSelectedStore(option.value)}
                      className={cn(
                        'transition-all duration-200 hover:scale-105',
                        isActive
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md'
                          : 'hover:bg-sky-50'
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

            {/* Separador */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <span className="text-xs text-muted-foreground">Estado de Stock</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            </div>

            {/* Filtros de estado */}
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

          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o tienda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 rounded-full border-slate-200 pl-9"
            />
          </div>
        </CardHeader>
      </Card>

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
                {stockFilter === 'all' ? '' : ` • ${stockFilterOptions.find((o) => o.value === stockFilter)?.label ?? ''}`})
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
                    <TableHead className="w-[200px]">Tienda</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[120px] text-right">Unidades</TableHead>
                    <TableHead className="w-[140px] text-center">Estado</TableHead>
                    <TableHead className="w-[80px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item, index) => {
                    const storeName = normalizeStoreName(item.tienda);
                    const key = getProductKey(item.tienda, item.producto);
                    const config = alertConfigs[key];
                    const statusInfo = getStatusInfo(item.cantidad, config);

                    return (
                      <TableRow key={`${storeName}-${item.producto}-${index}`}>
                        <TableCell className="font-medium">{storeName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">
                              {item.producto || 'Producto sin nombre'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {item.cantidad}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAlertConfig(item)}
                              className="h-8 w-8 p-0"
                              title="Configurar alertas de stock"
                            >
                              <Settings className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(item)}
                              className="h-8 w-8 p-0"
                              title="Editar producto"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                          </div>
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
          <InventoryMovements productos={inventory} limit={30} />
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
              {/* Información del producto - Compacto */}
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

              {/* Configuración de Stock Mínimo - Compacto */}
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

              {/* Configuración de Stock Máximo - Compacto */}
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

              {/* Vista previa compacta */}
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
        stores={stores.length > 0 ? stores : ['ALL STARS']}
      />
    </div>
  );
}
