import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Truck, Package, Users, BookCopy, Database, UserCheck, ArrowRight, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const formatLastSyncForDisplay = (timestamp: number | null) => {
  if (!timestamp) return 'Sin datos';

  const formatter = new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(new Date(timestamp));
};

interface ActionCardsSectionProps {
  messengerCount: number;
  tiendaCount: number;
  lastSyncTime: number | null;
  canSync: () => boolean;
  syncing: boolean;
  getTimeUntilNextSync: () => string | null;
  onSyncClick: () => void;
  onMessengersClick: () => void;
  onTiendasClick: () => void;
}

export function ActionCardsSection({
  messengerCount,
  tiendaCount,
  lastSyncTime,
  canSync,
  syncing,
  getTimeUntilNextSync,
  onSyncClick,
  onMessengersClick,
  onTiendasClick,
}: ActionCardsSectionProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Botón de Mensajeros */}
      <Card className="relative overflow-hidden rounded-xl border border-sky-200 dark:border-sky-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-sky-400/20 to-blue-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mensajeros</p>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-400 truncate">Resumen Diario</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-sm flex-shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Ver mensajeros activos y sus entregas de hoy</p>
          <Button
            onClick={onMessengersClick}
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-xs py-2 px-2 h-auto"
          >
            <div className="flex items-center justify-center gap-1">
              <UserCheck className="h-3 w-3" />
              <span className="truncate text-xs">Ver Mensajeros ({messengerCount})</span>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Botón de Tiendas */}
      <Card className="relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-emerald-400/20 to-green-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tiendas</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">Resumen Diario</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-sm flex-shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Ver tiendas con pedidos creados hoy</p>
          <Button
            onClick={onTiendasClick}
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-xs py-2 px-2 h-auto"
          >
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              <span className="truncate text-xs">Ver Tiendas ({tiendaCount})</span>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Botón de Sincronización */}
      <Card className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sincronización</p>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 truncate">Sheets ↔ Supabase</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm flex-shrink-0">
              <BookCopy className="w-3 h-3" />
              <Database className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Ejecuta la sincronización antes de revisar pedidos</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={syncing || !canSync()}
                size="sm"
                className={cn(
                  'group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 h-auto',
                  'disabled:cursor-not-allowed disabled:bg-slate-50/80 disabled:text-slate-400 disabled:shadow-none disabled:hover:scale-100',
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_60%)]" />
                <div className="relative flex w-full flex-col items-center gap-0.5">
                  <span className="text-xs font-semibold tracking-wide">
                    {syncing ? 'Sincronizando…' : 'Sincronizar'}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] font-medium text-white/85">
                    <span className="truncate">Última {formatLastSyncForDisplay(lastSyncTime)}</span>
                    {!canSync() && lastSyncTime && (
                      <span className="rounded-full bg-white/30 px-0.5 py-[1px] text-[6px] font-semibold text-white">
                        Espera {getTimeUntilNextSync()}
                      </span>
                    )}
                  </div>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar sincronización</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-600">
                      ¿Deseas ejecutar la sincronización de registros y pedidos? Actualizará los datos visibles.
                    </p>
                    <p className="font-medium text-amber-600">
                      ⚠️ Evita múltiples sincronizaciones en menos de 5 minutos.
                    </p>
                    {!canSync() && (
                      <p className="font-medium text-red-600">
                        Debes esperar {getTimeUntilNextSync()} antes de sincronizar nuevamente.
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onSyncClick}
                  disabled={!canSync()}
                  className="bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900"
                >
                  Confirmar sincronización
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Botón de Gestión de Pedidos */}
      <Card className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Operación</p>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 truncate">Gestión de pedidos</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm flex-shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Administra asignaciones y estados en tiempo real</p>
          <Button
            asChild
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-xs py-2 px-2 h-auto"
          >
            <Link href="/dashboard/admin/pedidos" className="flex items-center justify-center gap-1">
              <span className="truncate text-xs">Ir al panel</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Botón de Usuarios */}
      <Card className="relative overflow-hidden rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Usuarios</p>
              <p className="text-sm font-bold text-purple-700 dark:text-purple-400 truncate">Gestión de usuarios</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Administra roles, accesos y estados de las cuentas</p>
          <Button
            asChild
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-xs py-2 px-2 h-auto"
          >
            <Link href="/dashboard/admin/usuarios" className="flex items-center justify-center gap-1">
              <span className="truncate text-xs">Ir a usuarios</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Botón de Liquidaciones */}
      <Card className="relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <div className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-sm" />
        <CardContent className="relative p-3 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Finanzas</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">Liquidaciones diarias</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 flex-1 leading-tight line-clamp-2">Revisa montos, pagos y devoluciones consolidadas</p>
          <Button
            asChild
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md text-xs py-2 px-2 h-auto"
          >
            <Link href="/dashboard/admin/liquidation" className="flex items-center justify-center gap-1">
              <span className="truncate text-xs">Ir a liquidaciones</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

