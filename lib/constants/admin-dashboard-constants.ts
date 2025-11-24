export const statsPaletteStyles = {
  blue: {
    card: 'border-blue-100 bg-blue-50/70',
    title: 'text-blue-900/70',
    value: 'text-lg font-semibold text-blue-900',
    icon: 'border-blue-100 bg-white/70 text-blue-500',
    accent: 'bg-blue-400/60',
  },
  amber: {
    card: 'border-amber-100 bg-amber-50/70',
    title: 'text-amber-900/70',
    value: 'text-lg font-semibold text-amber-900',
    icon: 'border-amber-100 bg-white/70 text-amber-500',
    accent: 'bg-amber-400/60',
  },
  emerald: {
    card: 'border-emerald-100 bg-emerald-50/70',
    title: 'text-emerald-900/70',
    value: 'text-lg font-semibold text-emerald-900',
    icon: 'border-emerald-100 bg-white/70 text-emerald-500',
    accent: 'bg-emerald-300/60',
  },
  teal: {
    card: 'border-teal-100 bg-teal-50/70',
    title: 'text-teal-900/70',
    value: 'text-lg font-semibold text-teal-900',
    icon: 'border-teal-100 bg-white/70 text-teal-500',
    accent: 'bg-teal-300/60',
  },
  rose: {
    card: 'border-rose-100 bg-rose-50/70',
    title: 'text-rose-900/70',
    value: 'text-lg font-semibold text-rose-900',
    icon: 'border-rose-100 bg-white/70 text-rose-500',
    accent: 'bg-rose-300/60',
  },
  indigo: {
    card: 'border-indigo-100 bg-indigo-50/70',
    title: 'text-indigo-900/70',
    value: 'text-lg font-semibold text-indigo-900',
    icon: 'border-indigo-100 bg-white/70 text-indigo-500',
    accent: 'bg-indigo-300/60',
  },
  violet: {
    card: 'border-violet-100 bg-violet-50/70',
    title: 'text-violet-900/70',
    value: 'text-lg font-semibold text-violet-900',
    icon: 'border-violet-100 bg-white/70 text-violet-500',
    accent: 'bg-violet-300/60',
  },
  slate: {
    card: 'border-slate-200 bg-slate-50/70',
    title: 'text-slate-900/70',
    value: 'text-lg font-semibold text-slate-900',
    icon: 'border-slate-200 bg-white/70 text-slate-500',
    accent: 'bg-slate-300/60',
  },
} as const;

export type StatsPaletteKey = keyof typeof statsPaletteStyles;

