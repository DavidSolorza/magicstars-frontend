import { RefreshCw, Clock, BarChart3 } from 'lucide-react';

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

interface DashboardHeaderProps {
  lastSyncTime: number | null;
  canSync: () => boolean;
  getTimeUntilNextSync: () => string | null;
}

export function DashboardHeader({ lastSyncTime, canSync, getTimeUntilNextSync }: DashboardHeaderProps) {
  return (
    <div className="relative rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-4 text-white overflow-hidden shadow-lg">
      <div className="absolute inset-0 opacity-20"></div>
      <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white mb-2">
              <BarChart3 className="h-4 w-4" />
              Panel Administrativo
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Dashboard Administrador
            </h1>
            <p className="text-white/90 text-sm">
              Resumen exclusivo del día actual: pedidos, mensajeros y tiendas de hoy.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
            <RefreshCw className="h-4 w-4 text-white" />
            <span className="whitespace-nowrap">Última sync: {formatLastSyncForDisplay(lastSyncTime)}</span>
          </div>
          {!canSync() && lastSyncTime && (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 backdrop-blur-sm border-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
              <Clock className="h-4 w-4" />
              <span className="whitespace-nowrap">Disponible en {getTimeUntilNextSync()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

