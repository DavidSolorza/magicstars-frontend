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
import { Package, Plus, Edit } from 'lucide-react';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductoInventario | null;
  onSave: (product: Omit<ProductoInventario, 'idx'>) => void;
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
  });

  useEffect(() => {
    const defaultTienda = hideStoreField && defaultStore 
      ? defaultStore 
      : (product?.tienda || stores[0] || '');
    
    if (product) {
      setFormData({
        producto: product.producto || '',
        cantidad: product.cantidad || 0,
        tienda: defaultTienda,
      });
    } else {
      setFormData({
        producto: '',
        cantidad: 0,
        tienda: defaultTienda,
      });
    }
  }, [product, stores, hideStoreField, defaultStore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto.trim()) {
      return;
    }
    onSave(formData);
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
                {isEditing ? 'Crear Nuevo Producto' : 'Crear Nuevo Producto'}
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
          <div className="space-y-2">J
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
            />
          </div>

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

