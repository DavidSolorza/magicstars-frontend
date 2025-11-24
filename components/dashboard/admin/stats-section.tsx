import { StatsCard } from '@/components/dashboard/stats-card';
import { statsPaletteStyles, StatsPaletteKey } from '@/lib/constants/admin-dashboard-constants';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Metric {
  key: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  palette: StatsPaletteKey;
}

interface OperationalChip {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}

interface StatsSectionProps {
  highlightMetrics: Array<{ metric: Metric; span: string }>;
  secondaryMetrics: Array<{ metric: Metric; span: string }>;
  deliveryRateMetric?: Metric;
  operationalChips: OperationalChip[];
}

export function StatsSection({
  highlightMetrics,
  secondaryMetrics,
  deliveryRateMetric,
  operationalChips,
}: StatsSectionProps) {
  // Combinar todas las métricas en un solo array con diferentes tamaños
  type MetricItem = 
    | { type: 'metric'; metric: Metric; size: 'large' | 'medium' | 'small' }
    | { type: 'chip'; chip: OperationalChip; size: 'small' };

  const allMetrics: MetricItem[] = [
    // Métricas principales - tamaño grande
    ...highlightMetrics.map(({ metric }) => ({
      type: 'metric' as const,
      metric,
      size: 'large' as const,
    })),
    // Métricas secundarias - tamaño mediano
    ...secondaryMetrics.map(({ metric }) => ({
      type: 'metric' as const,
      metric,
      size: 'medium' as const,
    })),
    // Delivery rate - tamaño mediano
    ...(deliveryRateMetric ? [{
      type: 'metric' as const,
      metric: deliveryRateMetric,
      size: 'medium' as const,
    }] : []),
    // Chips operativos - tamaño pequeño
    ...operationalChips.map(chip => ({
      type: 'chip' as const,
      chip,
      size: 'small' as const,
    })),
  ];

  return (
    <div className="min-w-0">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
        <div className="relative rounded-xl border-0 shadow-lg bg-gradient-to-br from-sky-50/50 via-indigo-50/50 to-purple-50/50 dark:from-sky-950/50 dark:via-indigo-950/50 dark:to-purple-950/50 p-4">
          <h3 className="text-lg font-semibold text-muted-foreground mb-4 px-1">Métricas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {allMetrics.map((item, index) => {
              if (item.type === 'metric') {
                const paletteClasses = statsPaletteStyles[item.metric.palette];
                const isLarge = item.size === 'large';
                const isMedium = item.size === 'medium';
                
                return (
                  <div
                    key={`metric-${item.metric.key}-${index}`}
                    className={cn(
                      'relative overflow-hidden rounded-xl border-2 bg-white/95 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
                      paletteClasses.card,
                      isLarge ? 'col-span-2 p-4' : isMedium ? 'col-span-1 p-3' : 'col-span-1 p-2',
                    )}
                  >
                    <div className={cn('pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-xl', paletteClasses.accent)} />
                    <div className={cn('relative flex', isLarge ? 'items-start justify-between' : 'items-center justify-between')}>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-semibold uppercase mb-1',
                          paletteClasses.title,
                          isLarge ? 'text-xs tracking-[0.25em] mb-2' : isMedium ? 'text-[10px] tracking-[0.3em] mb-1' : 'text-[9px] tracking-wide mb-0.5'
                        )}>
                          {item.metric.title}
                        </p>
                        <p className={cn(
                          'font-bold',
                          paletteClasses.value,
                          isLarge ? 'text-2xl tracking-tight' : isMedium ? 'text-lg' : 'text-base'
                        )}>
                          {item.metric.value}
                        </p>
                      </div>
                      <div className={cn(
                        'flex items-center justify-center rounded-xl shadow-lg flex-shrink-0',
                        paletteClasses.icon,
                        isLarge ? 'h-10 w-10' : isMedium ? 'h-8 w-8' : 'h-6 w-6'
                      )}>
                        <item.metric.icon className={isLarge ? 'h-5 w-5' : isMedium ? 'h-4 w-4' : 'h-3 w-3'} />
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Es un chip operativo
                return (
                  <div
                    key={`chip-${item.chip.key}-${index}`}
                    className={cn(
                      'relative overflow-hidden rounded-xl border-2 px-2 py-1.5 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
                      item.chip.accent,
                      'col-span-1',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-600 block mb-0.5">
                          {item.chip.label}
                        </span>
                        <p className="text-sm font-bold text-slate-900 truncate">{item.chip.value}</p>
                      </div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/50 shadow-sm flex-shrink-0 ml-1">
                        <item.chip.icon className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

