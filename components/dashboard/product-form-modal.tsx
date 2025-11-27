'use client';

import { useState, useEffect } from 'react';
import { ProductoInventario } from '@/lib/supabase-inventario';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Edit, ArrowUp, ArrowDown } from 'lucide-react';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductoInventario | null;
  onSave: (product: Omit<ProductoInventario, 'idx'> & { stock_minimo?: number; stock_maximo?: number }) => void;
  stores?: string[];
  hideStoreField?: boolean; // Nueva prop para ocultar el campo de tienda
  defaultStore?: string; // Tienda por defecto cuando se oculta el campo
}

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSave,
  stores = ['ALL STARS', 'Para Machos CR', 'BeautyFan'],
  hideStoreField = false,
  defaultStore,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    producto: '',
    cantidad: 0,
    tienda: stores[0] || '',
    stock_minimo: 5,
    stock_maximo: 20,
  });
  const [stockEntrada, setStockEntrada] = useState<number>(0);
  const [stockSalida, setStockSalida] = useState<number>(0);

  useEffect(() => {
    const defaultTienda = hideStoreField && defaultStore 
      ? defaultStore 
      : (product?.tienda || stores[0] || '');
    
    if (product) {
      setFormData({
        producto: product.producto || '',
        cantidad: product.cantidad || 0,
        tienda: defaultTienda,
        stock_minimo: 5,
        stock_maximo: 20,
      });
      setStockEntrada(0);
      setStockSalida(0);
    } else {
      setFormData({
        producto: '',
        cantidad: 0,
        tienda: defaultTienda,
        stock_minimo: 5,
        stock_maximo: 20,
      });
      setStockEntrada(0);
      setStockSalida(0);
    }
  }, [product, stores, hideStoreField, defaultStore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto.trim()) {
      return;
    }
    
    // Calcular cantidad final si hay ajustes
    const cantidadFinal = isEditing 
      ? formData.cantidad + stockEntrada - stockSalida
      : formData.cantidad;
    
    onSave({
      ...formData,
      cantidad: cantidadFinal,
      stock_minimo: formData.stock_minimo,
      stock_maximo: formData.stock_maximo,
    });
    onOpenChange(false);
  };

  const isEditing = !!product;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-[480px] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {isEditing ? (
                <Edit className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight">
                {isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {isEditing
                  ? 'Modifica la información del producto'
                  : 'Agrega un nuevo producto al inventario'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="producto" className="text-sm font-semibold">
              Nombre del Producto *
            </Label>
            <Input
              id="producto"
              value={formData.producto}
              onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
              placeholder="Ej: ACEITE DE OREGANO"
              className="h-9"
              required
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                El nombre del producto no se puede modificar
              </p>
            )}
          </div>

          {isEditing ? (
            <>
              {/* Stock Actual (solo lectura cuando edita) */}
              <div className="space-y-2">
                <Label htmlFor="cantidad-actual" className="text-sm font-semibold">
                  Stock Actual
                </Label>
                <Input
                  id="cantidad-actual"
                  type="number"
                  value={formData.cantidad}
                  className="h-9 bg-slate-50 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>

              {/* Sección de Ajuste de Stock */}
              <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  <Label className="text-sm font-semibold text-emerald-900">
                    Ajuste de Stock
                  </Label>
                </div>

                {/* Entrada de Stock */}
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                    {formData.cantidad + stockEntrada - stockSalida} unidades
                  </p>
                  {(stockEntrada > 0 || stockSalida > 0) && (
                    <p className="text-[10px] text-emerald-700 mt-1">
                      {formData.cantidad} {stockEntrada > 0 && `+ ${stockEntrada}`} {stockSalida > 0 && `- ${stockSalida}`} = {formData.cantidad + stockEntrada - stockSalida}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-sm font-semibold">
                Cantidad Inicial en Stock
              </Label>
              <Input
                id="cantidad"
                type="number"
                min="0"
                value={formData.cantidad}
                onChange={(e) =>
                  setFormData({ ...formData, cantidad: parseInt(e.target.value, 10) || 0 })
                }
                placeholder="0"
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stock_minimo" className="text-sm font-semibold">
              Stock Mínimo
            </Label>
            <Input
              id="stock_minimo"
              type="number"
              min="0"
              value={formData.stock_minimo}
              onChange={(e) =>
                setFormData({ ...formData, stock_minimo: parseInt(e.target.value, 10) || 0 })
              }
              placeholder="5"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_maximo" className="text-sm font-semibold">
              Stock Máximo
            </Label>
            <Input
              id="stock_maximo"
              type="number"
              min="1"
              value={formData.stock_maximo}
              onChange={(e) =>
                setFormData({ ...formData, stock_maximo: parseInt(e.target.value, 10) || 20 })
              }
              placeholder="20"
              className="h-9"
            />
          </div>

          {!hideStoreField && (
            <div className="space-y-2">
              <Label htmlFor="tienda" className="text-sm font-semibold">
                Tienda *
              </Label>
              <Select
                value={formData.tienda}
                onValueChange={(value) => setFormData({ ...formData, tienda: value })}
              >
                <SelectTrigger id="tienda" className="h-9">
                  <SelectValue placeholder="Selecciona una tienda" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store} value={store}>
                      {store}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-9 w-full text-xs sm:w-auto" size="sm">
              {isEditing ? (
                <>
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Guardar Cambios
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Crear Producto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

