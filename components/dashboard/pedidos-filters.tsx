'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  FilterX, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  RotateCcw, 
  RefreshCw,
  CreditCard,
  DollarSign,
  FileText,
  Building2,
  User,
  MapPin
} from 'lucide-react';

interface PedidosFiltersProps {
  filters: {
    searchTerm: string;
    searchQuery: string;
    statusFilter: string;
    distritoFilter: string;
    mensajeroFilter: string;
    tiendaFilter: string;
    metodoPagoFilter: string;
  };
  filterOptions: {
    distritos: string[];
    mensajeros: string[];
    tiendas: string[];
    metodosPago: string[];
  };
  stats: {
    total: number;
    asignados: number;
    entregados: number;
    sinAsignar: number;
    devoluciones: number;
    reagendados: number;
    efectivo: number;
    sinpe: number;
    tarjeta: number;
    dosPagos: number;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  onExecuteSearch: () => void;
  hasActiveFilters: boolean;
}

export function PedidosFilters({
  filters,
  filterOptions,
  stats,
  onFilterChange,
  onClearFilters,
  onExecuteSearch,
  hasActiveFilters,
}: PedidosFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filters.searchTerm.trim()) {
      onExecuteSearch();
    }
  };

  const handleClearSearch = () => {
    onFilterChange({ searchTerm: '', searchQuery: '' });
  };

  const statusOptions = [
    { value: 'all', label: 'Todos', icon: Package, count: stats.total, color: 'blue' },
    { value: 'sin_asignar', label: 'Sin Asignar', icon: Clock, count: stats.sinAsignar, color: 'yellow' },
    { value: 'asignado', label: 'Asignados', icon: Truck, count: stats.asignados, color: 'blue' },
    { value: 'entregado', label: 'Entregados', icon: CheckCircle, count: stats.entregados, color: 'green' },
    { value: 'devolucion', label: 'Devoluciones', icon: RotateCcw, count: stats.devoluciones, color: 'red' },
    { value: 'reagendado', label: 'Reagendados', icon: RefreshCw, count: stats.reagendados, color: 'orange' },
  ];

  const paymentOptions = [
    { value: 'all', label: 'Todos los métodos', icon: CreditCard, count: stats.total, color: 'gray' },
    { value: 'efectivo', label: 'Efectivo', icon: DollarSign, count: stats.efectivo, color: 'green' },
    { value: 'sinpe', label: 'SINPE', icon: CreditCard, count: stats.sinpe, color: 'blue' },
    { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard, count: stats.tarjeta, color: 'purple' },
    { value: '2pagos', label: '2 Pagos', icon: FileText, count: stats.dosPagos, color: 'orange' },
  ];


  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== 'all' && value !== ''
  ).length;

  return (
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
                  Filtra pedidos por estado, método de pago o búsqueda de texto
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {activeFiltersCount} filtro{activeFiltersCount === 1 ? '' : 's'} activo{activeFiltersCount === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Búsqueda */}
          <div className="pt-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-sky-500" />
                Buscar por ID de Pedido
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    placeholder="Buscar por ID (ej: SL5807) o nombre del cliente..."
                    value={filters.searchTerm}
                    onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
                    onKeyPress={handleKeyPress}
                    className="pl-9 pr-9 h-11 transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 border-2"
                  />
                  {filters.searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <FilterX className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={onExecuteSearch}
                  disabled={!filters.searchTerm.trim()}
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white transition-all duration-200 hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 h-11 px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
              {filters.searchQuery && (
                <div className="flex items-center gap-2 p-2 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800">
                  <Search className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                  <p className="text-xs text-sky-700 dark:text-sky-300">
                    Buscando: <span className="font-semibold">{filters.searchQuery}</span>
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="ml-auto text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <FilterX className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filters.searchTerm && !filters.searchQuery && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>💡</span>
                  <span>Presiona Enter o haz clic en "Buscar" para buscar</span>
                </p>
              )}
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <span className="text-xs text-muted-foreground">Estado</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Filtros por Estado */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-sky-500" />
              Filtros rápidos por estado
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {statusOptions.map((option) => {
                const IconComponent = option.icon;
                const isActive = filters.statusFilter === option.value;
                
                return (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => onFilterChange({ statusFilter: option.value })}
                    className={`transition-all duration-200 hover:scale-105 ${
                      isActive 
                        ? option.color === 'blue' 
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md' 
                          : option.color === 'green'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                          : option.color === 'yellow'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                          : option.color === 'red'
                          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
                        : 'hover:bg-sky-50'
                    }`}
                  >
                    <IconComponent className="w-3 h-3 mr-1" />
                    <span className="truncate">{option.label}</span>
                    <span className="ml-1 text-xs opacity-75">({option.count})</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <span className="text-xs text-muted-foreground">Método de Pago</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Filtros por Método de Pago */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-sky-500" />
              Métodos de pago
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {paymentOptions.map((option) => {
                const IconComponent = option.icon;
                const isActive = filters.metodoPagoFilter === option.value;
                
                return (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => onFilterChange({ metodoPagoFilter: option.value })}
                    className={`transition-all duration-200 hover:scale-105 ${
                      isActive 
                        ? option.color === 'green'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                          : option.color === 'blue'
                          ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md'
                          : option.color === 'purple'
                          ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-md'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                        : 'hover:bg-sky-50'
                    }`}
                  >
                    <IconComponent className="w-3 h-3 mr-1" />
                    <span className="truncate">{option.label}</span>
                    <span className="ml-1 text-xs opacity-75">({option.count})</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <span className="text-xs text-muted-foreground">Filtros Avanzados</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Filtros Avanzados */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium text-foreground">
                Filtros adicionales
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sky-600 hover:text-sky-700 transition-all duration-200"
              >
                {showAdvanced ? 'Ocultar' : 'Mostrar'} filtros avanzados
              </Button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/30 rounded-lg border border-sky-200/50 dark:border-sky-800/50">
              {/* Distrito */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Distrito
                </Label>
                <Select 
                  value={filters.distritoFilter} 
                  onValueChange={(value) => onFilterChange({ distritoFilter: value })}
                >
                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <SelectValue placeholder="Seleccionar distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los distritos</SelectItem>
                    {filterOptions.distritos.map(distrito => (
                      <SelectItem key={distrito} value={distrito}>{distrito}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mensajero */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Mensajero
                </Label>
                <Select 
                  value={filters.mensajeroFilter} 
                  onValueChange={(value) => onFilterChange({ mensajeroFilter: value })}
                >
                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <SelectValue placeholder="Seleccionar mensajero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los mensajeros</SelectItem>
                    {filterOptions.mensajeros.map(mensajero => (
                      <SelectItem key={mensajero} value={mensajero}>{mensajero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tienda */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Tienda
                </Label>
                <Select 
                  value={filters.tiendaFilter} 
                  onValueChange={(value) => onFilterChange({ tiendaFilter: value })}
                >
                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <SelectValue placeholder="Seleccionar tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las tiendas</SelectItem>
                    {filterOptions.tiendas.map(tienda => (
                      <SelectItem key={tienda} value={tienda}>{tienda}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

          {/* Indicador de Filtros Activos */}
          {hasActiveFilters && (
            <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-200/50 dark:border-sky-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">Filtros activos: {activeFiltersCount}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onClearFilters}
                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-all duration-200 hover:scale-105"
                >
                  <FilterX className="w-4 h-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
