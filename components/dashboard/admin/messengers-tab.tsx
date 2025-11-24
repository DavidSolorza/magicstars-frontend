'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/dashboard/order-status-badge';
import { Input } from '@/components/ui/input';
import { UserCheck, Truck, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface MessengerDailySummary {
  messenger: User;
  totalAsignados: number;
  totalEntregados: number;
  totalDevueltos: number;
  totalReagendados: number;
  totalFaltantes: number;
  totalEfectivo: number;
  totalSinpe: number;
  tasaEntrega: number;
  entregas: Array<{
    id: string;
    cliente: string;
    hora: string;
    estado: string;
    valor: number;
    metodoPago?: string;
  }>;
}

interface MessengersTabProps {
  messengerDailySummary: MessengerDailySummary[];
  formatCurrency: (amount: number) => string;
}

const ITEMS_PER_PAGE = 10;

export function MessengersTab({ messengerDailySummary, formatCurrency }: MessengersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // Inicializar todos los mensajeros como colapsados
  const [collapsedMessengers, setCollapsedMessengers] = useState<Set<string>>(new Set());
  // Estado para la página actual de cada mensajero
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  // Inicializar todos los mensajeros como colapsados al cargar
  useEffect(() => {
    const allIds = new Set(messengerDailySummary.map(s => s.messenger.id));
    setCollapsedMessengers(allIds);
    // Inicializar todas las páginas en 1
    const initialPages: Record<string, number> = {};
    messengerDailySummary.forEach(s => {
      initialPages[s.messenger.id] = 1;
    });
    setCurrentPages(initialPages);
  }, [messengerDailySummary]);

  const toggleCollapse = (messengerId: string) => {
    setCollapsedMessengers(prev => {
      const next = new Set(prev);
      if (next.has(messengerId)) {
        next.delete(messengerId);
      } else {
        next.add(messengerId);
      }
      return next;
    });
  };

  const setPage = (messengerId: string, page: number) => {
    setCurrentPages(prev => ({
      ...prev,
      [messengerId]: page,
    }));
  };

  const filteredMessengers = useMemo(() => {
    if (!searchTerm.trim()) return messengerDailySummary;
    
    const searchLower = searchTerm.toLowerCase();
    return messengerDailySummary.filter(summary =>
      summary.messenger.name.toLowerCase().includes(searchLower)
    );
  }, [messengerDailySummary, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Resumen Diario por Mensajero - Hoy ({messengerDailySummary.length})
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Solo se muestran mensajeros que tienen pedidos asignados hoy
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar mensajero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMessengers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>
              {searchTerm ? 'No se encontraron mensajeros con ese nombre' : 'No hay mensajeros con pedidos asignados hoy'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessengers.map((summary) => {
              const isCollapsed = collapsedMessengers.has(summary.messenger.id);
              const currentPage = currentPages[summary.messenger.id] || 1;
              const totalPages = Math.ceil(summary.entregas.length / ITEMS_PER_PAGE);
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
              const endIndex = startIndex + ITEMS_PER_PAGE;
              const paginatedEntregas = summary.entregas.slice(startIndex, endIndex);

              return (
                <Card key={summary.messenger.id} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCollapse(summary.messenger.id)}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-base font-semibold text-white shrink-0">
                          {summary.messenger.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg">{summary.messenger.name}</CardTitle>
                          <p className="text-xs text-slate-500">Mensajero</p>
                        </div>
                      </div>
                      {/* Métricas al lado del nombre */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pedidos</p>
                          <p className="text-sm font-bold text-blue-600">{summary.totalAsignados}</p>
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
                      {summary.entregas.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Pedidos del día ({summary.entregas.length}):
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-slate-50">
                                  <th className="text-left p-2 font-medium text-slate-600">Hora</th>
                                  <th className="text-left p-2 font-medium text-slate-600">ID Pedido</th>
                                  <th className="text-left p-2 font-medium text-slate-600">Cliente</th>
                                  <th className="text-left p-2 font-medium text-slate-600">Estado</th>
                                  <th className="text-left p-2 font-medium text-slate-600">Método Pago</th>
                                  <th className="text-right p-2 font-medium text-slate-600">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedEntregas.map((entrega) => (
                                  <tr key={entrega.id} className="border-b hover:bg-slate-50">
                                    <td className="p-2 font-mono text-xs">{entrega.hora}</td>
                                    <td className="p-2">
                                      <span className="font-medium">{entrega.id}</span>
                                    </td>
                                    <td className="p-2">{entrega.cliente}</td>
                                    <td className="p-2">
                                      <OrderStatusBadge status={entrega.estado as any} />
                                    </td>
                                    <td className="p-2">
                                      <span className="text-xs capitalize">{entrega.metodoPago || 'N/A'}</span>
                                    </td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(entrega.valor)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {/* Paginación con puntos */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(summary.messenger.id, Math.max(1, currentPage - 1))}
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
                                      onClick={() => setPage(summary.messenger.id, pageNum)}
                                      className={`h-1.5 rounded-full transition-all ${
                                        currentPage === pageNum
                                          ? 'bg-blue-600 w-6'
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
                                onClick={() => setPage(summary.messenger.id, Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No hay entregas registradas para hoy</p>
                      )}
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
