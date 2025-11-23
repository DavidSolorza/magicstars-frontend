'use client';

import { useMemo, useState } from 'react';
import { InventoryTransaction } from '@/lib/types';
import { ProductoInventario } from '@/lib/supabase-inventario';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowUp,
  Package,
  ShoppingCart,
  RefreshCw,
  XCircle,
  CheckCircle,
  Truck,
  Calendar,
} from 'lucide-react';
import { mockOrders } from '@/lib/mock-api';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InventoryMovementsProps {
  productos: ProductoInventario[];
  limit?: number;
}

export function InventoryMovements({ productos, limit = 20 }: InventoryMovementsProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Generar movimientos basados en los últimos pedidos
  const movements = useMemo(() => {
    const transactions: InventoryTransaction[] = [];
    const now = new Date();

    // Obtener los últimos pedidos
    let recentOrders = mockOrders
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30; // Últimos 30 días para tener más opciones
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filtrar por fecha si está seleccionada
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      recentOrders = recentOrders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= filterDate && orderDate < nextDay;
      });
    }

    recentOrders = recentOrders.slice(0, 50);

    // Crear un mapa de productos por nombre
    const productMap = new Map<string, ProductoInventario>();
    productos.forEach((prod) => {
      const key = prod.producto?.toLowerCase().trim() || '';
      if (key && !productMap.has(key)) {
        productMap.set(key, prod);
      }
    });

    // Generar transacciones basadas en pedidos
    recentOrders.forEach((order, orderIndex) => {
      order.items?.forEach((item, itemIndex) => {
        const productName = item.product.name;
        const productKey = productName.toLowerCase().trim();
        const producto = productMap.get(productKey);

        if (producto) {
          // Determinar el tipo de acción basado en el estado del pedido
          let actionType: InventoryTransaction['actionType'] = 'pedido_montado';
          let quantity = -item.quantity; // Por defecto, resta stock

          if (order.status === 'entregado') {
            actionType = 'pedido_entregado';
            // Ya se descontó, no hay movimiento adicional
            return;
          } else if (order.status === 'devolucion') {
            actionType = 'pedido_devuelto';
            quantity = Math.abs(quantity); // Devuelve stock
          } else if (order.status === 'confirmado' || order.status === 'en_ruta') {
            actionType = 'pedido_montado';
            quantity = -item.quantity; // Descuenta stock
          } else if (order.status === 'reagendado') {
            // Para pedidos reagendados, mantener el descuento
            actionType = 'pedido_montado';
            quantity = -item.quantity;
          }

          const transactionId = `mov-${order.id}-${itemIndex}-${orderIndex}`;
          const baseStock = producto.cantidad || 0;
          const previousStock = baseStock - quantity;
          const newStock = baseStock;

          transactions.push({
            id: transactionId,
            inventoryItemId: `inv-${producto.idx || itemIndex}`,
            inventoryItem: {
              id: `inv-${producto.idx || itemIndex}`,
              productId: item.product.id,
              product: item.product,
              companyId: order.companyId || '1',
              company: order.company || {
                id: '1',
                name: 'Para Machos CR',
                taxId: '',
                address: '',
                phone: '',
                email: '',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              currentStock: newStock,
              minimumStock: 5,
              maximumStock: 1000,
              reservedStock: 0,
              availableStock: newStock,
              location: producto.tienda || 'ALL STARS',
              lastUpdated: order.createdAt,
              createdAt: order.createdAt,
              isActive: true,
            },
            actionType,
            quantity,
            previousStock: Math.max(0, previousStock),
            newStock,
            reason: `Pedido ${order.id} - ${order.customerName}`,
            referenceId: order.id,
            referenceType: 'order',
            userId: order.assignedMessenger?.id || 'system',
            user: (order.assignedMessenger && 'email' in order.assignedMessenger ? order.assignedMessenger : undefined) || {
              id: 'system',
              name: 'Sistema',
              email: 'sistema@magicstars.com',
              role: 'admin' as const,
              phone: '',
              isActive: true,
              createdAt: new Date().toISOString(),
              company: order.company,
              companyId: order.companyId,
            },
            createdAt: order.createdAt,
          });
        }
      });
    });

    // Agregar algunos movimientos adicionales de ajuste manual
    productos.slice(0, 5).forEach((producto, index) => {
      const daysAgo = index + 1;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(10 + index, 30, 0, 0);

      transactions.push({
        id: `adj-${producto.idx || index}`,
        inventoryItemId: `inv-${producto.idx || index}`,
        inventoryItem: {
          id: `inv-${producto.idx || index}`,
          productId: `prod-${producto.idx || index}`,
          product: {
            id: `prod-${producto.idx || index}`,
            sku: `SKU-${producto.idx || index}`,
            name: producto.producto || 'Producto',
            category: 'Inventario',
            price: 0,
          },
          companyId: '1',
          company: {
            id: '1',
            name: producto.tienda || 'ALL STARS',
            taxId: '',
            address: '',
            phone: '',
            email: '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          currentStock: producto.cantidad || 0,
          minimumStock: 5,
          maximumStock: 1000,
          reservedStock: 0,
          availableStock: producto.cantidad || 0,
          location: producto.tienda || 'ALL STARS',
          lastUpdated: date.toISOString(),
          createdAt: date.toISOString(),
          isActive: true,
        },
        actionType: index % 2 === 0 ? 'inicial' : 'ajuste',
        quantity: index % 2 === 0 ? 10 : -2,
        previousStock: (producto.cantidad || 0) - (index % 2 === 0 ? 10 : -2),
        newStock: producto.cantidad || 0,
        reason: index % 2 === 0 ? 'Inventario inicial' : 'Ajuste de stock',
        userId: 'admin-1',
        user: {
          id: 'admin-1',
          name: 'Administrador',
          email: 'admin@magicstars.com',
          role: 'admin',
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        createdAt: date.toISOString(),
      });
    });

    return transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [productos, limit, selectedDate]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'pedido_confirmado':
      case 'pedido_entregado':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'pedido_devuelto':
      case 'pedido_cancelado':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'inicial':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'ajuste_manual':
        return <Truck className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pedido_confirmado: 'Pedido Confirmado',
      pedido_entregado: 'Pedido Entregado',
      pedido_devuelto: 'Devolución',
      pedido_cancelado: 'Pedido Cancelado',
      inicial: 'Inventario Inicial',
      ajuste_manual: 'Ajuste Manual',
      transferencia: 'Transferencia',
      perdida: 'Pérdida',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string, quantity: number) => {
    if (quantity > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (quantity < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay movimientos recientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Movimientos de Inventario
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedDate
                ? `Movimientos del ${format(new Date(selectedDate), "d 'de' MMMM, yyyy", { locale: es })}`
                : `Últimos ${movements.length} movimientos basados en pedidos recientes`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="date-filter" className="text-sm font-medium whitespace-nowrap">
              Filtrar por fecha:
            </Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-auto"
              max={today}
            />
          </div>
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate('')}
              className="h-9"
            >
              Limpiar filtro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${getActionColor(
                    movement.actionType,
                    movement.quantity
                  )}`}
                >
                  {getActionIcon(movement.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {movement.inventoryItem.product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getActionLabel(movement.actionType)}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {movement.reason}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(movement.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right">
                  <p
                    className={`font-bold text-sm ${
                      movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {movement.quantity > 0 ? '+' : ''}
                    {movement.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stock: {movement.newStock}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

