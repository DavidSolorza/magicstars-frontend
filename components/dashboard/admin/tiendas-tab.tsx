'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Input } from '@/components/ui/input';
import { Users, Package, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TiendaDailySummary {
  tienda: string;
  totalPedidos: number;
  totalEntregados: number;
  totalDevueltos: number;
  totalReagendados: number;
  totalFaltantes: number;
  totalEfectivo: number;
  totalSinpe: number;
  tasaEntrega: number;
  pedidos: Array<{
    id: string;
    cliente: string;
    valor: number;
    estado: string;
    fechaCreacion: string;
    metodoPago?: string;
  }>;
}

interface TiendasTabProps {
  tiendaDailySummary: TiendaDailySummary[];
  formatCurrency: (amount: number) => string;
}

const ITEMS_PER_PAGE = 10;

export function TiendasTab({ tiendaDailySummary, formatCurrency }: TiendasTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // Inicializar todas las tiendas como colapsadas
  const [collapsedTiendas, setCollapsedTiendas] = useState<Set<string>>(new Set());
  // Estado para la página actual de cada tienda
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  // Inicializar todas las tiendas como colapsadas al cargar
  useEffect(() => {
    const allTiendas = new Set(tiendaDailySummary.map(s => s.tienda));
    setCollapsedTiendas(allTiendas);
    // Inicializar todas las páginas en 1
    const initialPages: Record<string, number> = {};
    tiendaDailySummary.forEach(s => {
      initialPages[s.tienda] = 1;
    });
    setCurrentPages(initialPages);
  }, [tiendaDailySummary]);

  const toggleCollapse = (tienda: string) => {
    setCollapsedTiendas(prev => {
      const next = new Set(prev);
      if (next.has(tienda)) {
        next.delete(tienda);
      } else {
        next.add(tienda);
      }
      return next;
    });
  };

  const setPage = (tienda: string, page: number) => {
    setCurrentPages(prev => ({
      ...prev,
      [tienda]: page,
    }));
  };

  const filteredTiendas = useMemo(() => {
    if (!searchTerm.trim()) return tiendaDailySummary;
    
    const searchLower = searchTerm.toLowerCase();
    return tiendaDailySummary.filter(summary =>
      summary.tienda.toLowerCase().includes(searchLower)
    );
  }, [tiendaDailySummary, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Resumen Diario por Tienda - Hoy ({tiendaDailySummary.length})
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Solo se muestran tiendas que tienen pedidos creados hoy
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar tienda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTiendas.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>
              {searchTerm ? 'No se encontraron tiendas con ese nombre' : 'No hay tiendas con pedidos creados hoy'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTiendas.map((summary, index) => {
              const isCollapsed = collapsedTiendas.has(summary.tienda);
              const currentPage = currentPages[summary.tienda] || 1;
              const totalPages = Math.ceil(summary.pedidos.length / ITEMS_PER_PAGE);
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
              const endIndex = startIndex + ITEMS_PER_PAGE;
              const paginatedPedidos = summary.pedidos.slice(startIndex, endIndex);

              return (
                <Card key={index} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCollapse(summary.tienda)}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-base font-semibold text-white shrink-0">
                          {summary.tienda.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg">{summary.tienda}</CardTitle>
                          <p className="text-xs text-slate-500">Tienda</p>
                        </div>
                      </div>
                      {/* Métricas al lado del nombre */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pedidos</p>
                          <p className="text-sm font-bold text-blue-600">{summary.totalPedidos}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Entregados</p>
                          <p className="text-sm font-bold text-emerald-600">{summary.totalEntregados}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Devueltos</p>
                          <p className="text-sm font-bold text-rose-600">{summary.totalDevueltos}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Reagendados</p>
                          <p className="text-sm font-bold text-amber-600">{summary.totalReagendados}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Faltantes</p>
                          <p className="text-sm font-bold text-slate-600">{summary.totalFaltantes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Tasa Entrega</p>
                          <p className="text-sm font-bold text-indigo-600">{summary.tasaEntrega.toFixed(1)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Efectivo</p>
                          <p className="text-xs font-semibold text-green-700">{formatCurrency(summary.totalEfectivo)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">SINPE</p>
                          <p className="text-xs font-semibold text-blue-700">{formatCurrency(summary.totalSinpe)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-xs font-bold text-emerald-700">{formatCurrency(summary.totalEfectivo + summary.totalSinpe)}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {!isCollapsed && (
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          Pedidos generados hoy ({summary.pedidos.length}):
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50">
                                <th className="text-left p-2 font-medium text-slate-600">ID Pedido</th>
                                <th className="text-left p-2 font-medium text-slate-600">Cliente</th>
                                <th className="text-left p-2 font-medium text-slate-600">Estado</th>
                                <th className="text-left p-2 font-medium text-slate-600">Fecha Creación</th>
                                <th className="text-left p-2 font-medium text-slate-600">Método Pago</th>
                                <th className="text-right p-2 font-medium text-slate-600">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedPedidos.map((pedido) => {
                                const fechaCreacion = new Date(pedido.fechaCreacion);
                                const fechaFormateada = fechaCreacion.toLocaleDateString('es-CR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                });
                                const horaFormateada = fechaCreacion.toLocaleTimeString('es-CR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                                return (
                                  <tr key={pedido.id} className="border-b hover:bg-slate-50">
                                    <td className="p-2">
                                      <span className="font-medium">{pedido.id}</span>
                                    </td>
                                    <td className="p-2">{pedido.cliente}</td>
                                    <td className="p-2">
                                      <OrderStatusBadge status={pedido.estado as any} />
                                    </td>
                                    <td className="p-2 text-xs text-slate-500">
                                      {fechaFormateada} {horaFormateada}
                                    </td>
                                    <td className="p-2">
                                      <span className="text-xs capitalize">{pedido.metodoPago || 'N/A'}</span>
                                    </td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(pedido.valor)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Paginación con puntos */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPage(summary.tienda, Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: totalPages }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setPage(summary.tienda, pageNum)}
                                    className={`h-1.5 rounded-full transition-all ${
                                      currentPage === pageNum
                                        ? 'bg-emerald-600 w-6'
                                        : 'bg-gray-300 w-1.5 hover:bg-gray-400'
                                    }`}
                                    aria-label={`Ir a página ${pageNum}`}
                                  />
                                );
                              })}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPage(summary.tienda, Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
