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
import { Package, Plus, Edit, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
  const [formData, setFormData] = useState<{
    producto: string;
    cantidad: number | '';
    tienda: string;
    stock_minimo: number;
    stock_maximo: number;
  }>({
    producto: '',
    cantidad: '',
    tienda: stores[0] || '',
    stock_minimo: 5,
    stock_maximo: 20,
  });

  useEffect(() => {
    const defaultTienda = hideStoreField && defaultStore 
      ? defaultStore 
      : (product?.tienda || stores[0] || '');
    
    if (product) {
      setFormData({
        producto: product.producto || '',
        cantidad: product.cantidad ?? '',
        tienda: defaultTienda,
        stock_minimo: 5,
        stock_maximo: 20,
      });
    } else {
      setFormData({
        producto: '',
        cantidad: '',
        tienda: defaultTienda,
        stock_minimo: 5,
        stock_maximo: 20,
      });
    }
  }, [product, stores, hideStoreField, defaultStore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto.trim()) {
      return;
    }
    
    // Convertir cantidad vacía a 0 para el guardado
    const cantidadValue = formData.cantidad === '' ? 0 : Number(formData.cantidad);
    
    onSave({
      ...formData,
      cantidad: cantidadValue,
      stock_minimo: formData.stock_minimo,
      stock_maximo: formData.stock_maximo,
    });
    onOpenChange(false);
  };

  const isEditing = !!product;
  
  // Validación de cantidad (solo aplica al editar)
  const getCantidadValidation = () => {
    if (!isEditing) return { isValid: true, error: null };
    
    const cantidadValue = formData.cantidad === '' ? null : Number(formData.cantidad);
    const isEmpty = cantidadValue === null || formData.cantidad === '';
    const isInvalid = cantidadValue !== null && (isNaN(cantidadValue) || cantidadValue < 0);
    const isBelowMinimum = cantidadValue !== null && !isNaN(cantidadValue) && cantidadValue < formData.stock_minimo;
    
    if (isEmpty) {
      return {
        isValid: false,
        error: 'La cantidad no puede estar vacía al editar un producto',
      };
    }
    
    if (isInvalid) {
      return {
        isValid: false,
        error: 'La cantidad debe ser un número válido mayor o igual a 0',
      };
    }
    
    if (isBelowMinimum) {
      return {
        isValid: false,
        error: `La cantidad no puede ser menor al stock mínimo (${formData.stock_minimo} unidades)`,
      };
    }
    
    return { isValid: true, error: null };
  };
  
  const cantidadValidation = getCantidadValidation();
  const isSaveDisabled = isEditing && !cantidadValidation.isValid;

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
              title={isEditing ? "El nombre del producto no se puede editar" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad" className="text-sm font-semibold">
              Cantidad Inicial en Stock
              {isEditing && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (mínimo: {formData.stock_minimo})
                </span>
              )}
            </Label>
            <Input
              id="cantidad"
              type="number"
              min="0"
              value={formData.cantidad}
              onChange={(e) => {
                const value = e.target.value;
                // Permitir campo vacío o números válidos
                if (value === '') {
                  setFormData({ ...formData, cantidad: '' });
                } else {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setFormData({ ...formData, cantidad: numValue });
                  }
                }
              }}
              placeholder={isEditing ? `Mínimo: ${formData.stock_minimo}` : "Ingresa la cantidad"}
              className={cn(
                "h-9",
                cantidadValidation.error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {cantidadValidation.error && (
              <Alert variant="destructive" className="py-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <AlertDescription className="text-xs leading-relaxed">
                    {cantidadValidation.error}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>

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
            <Button 
              type="submit" 
              className="h-9 w-full text-xs sm:w-auto" 
              size="sm"
              disabled={isSaveDisabled}
              title={cantidadValidation.error || undefined}
            >
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

