import { PedidoTest, User } from '@/lib/types';

export const CONTROL_TASK_NAME = 'Sincronizar_sheets_y_supabase';
export const COSTA_RICA_UTC_OFFSET_MINUTES = 6 * 60;

export const getCostaRicaNowInfo = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const getPartValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? '0');

  const year = getPartValue('year');
  const month = getPartValue('month');
  const day = getPartValue('day');
  const hour = getPartValue('hour');
  const minute = getPartValue('minute');
  const second = getPartValue('second');

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) +
    COSTA_RICA_UTC_OFFSET_MINUTES * 60 * 1000;

  return { year, month, day, hour, minute, second, utcTimestamp };
};

export const parseActivationTimeToUTC = (timeValue: string | null) => {
  if (!timeValue) return null;

  const match = timeValue.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, hourStr, minuteStr, secondStr] = match;
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  if ([hour, minute, second].some(value => Number.isNaN(value))) {
    return null;
  }

  const { year, month, day, utcTimestamp: nowUTC } = getCostaRicaNowInfo();
  let activationUTC =
    Date.UTC(year, month - 1, day, hour, minute, second) +
    COSTA_RICA_UTC_OFFSET_MINUTES * 60 * 1000;

  if (activationUTC > nowUTC) {
    activationUTC -= 24 * 60 * 60 * 1000;
  }

  return activationUTC;
};

export const formatLastSyncForDisplay = (timestamp: number | null) => {
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

export const IGNORED_NAMES = new Set([
  '',
  'SIN ASIGNAR',
  'SIN MENSAJERO',
  'SIN MENSAJEROS',
  'SIN NOMBRE',
  'SIN TIENDA',
  'SIN DEFINIR',
  'SIN DATOS',
  'NO ASIGNADO',
  'NO ASIGNAR',
  'NO APLICA',
  'NO DISPONIBLE',
  'NINGUNO',
  'NINGUNA',
  'PENDIENTE',
  'PENDIENTES',
  'POR ASIGNAR',
  'S/N',
  'S/N.',
  'N/A',
  'NA',
  '--',
  '-',
  'POR DEFINIR',
]);

export const toIsoString = (value: string | null): string => {
  if (!value) return new Date().toISOString();
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  const fallback = new Date(`${value}T00:00:00`);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  return new Date().toISOString();
};

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const formatNameForDisplay = (value: string): string =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(segment => {
      if (segment.length <= 2) {
        return segment.toUpperCase();
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' ');

export const parseEntityName = (rawValue: string | null): null | { key: string; display: string; slug: string } => {
  if (!rawValue) return null;
  const trimmed = rawValue.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (IGNORED_NAMES.has(upper)) return null;
  const slugValue = slugify(trimmed);
  return {
    key: upper,
    display: formatNameForDisplay(trimmed),
    slug: slugValue,
  };
};

export const normalizeStatus = (status: string | null): string => {
  if (!status) return 'pendiente';
  const normalized = status.toLowerCase().trim();
  if (normalized.includes('entreg')) return 'entregado';
  if (normalized.includes('devol')) return 'devolucion';
  if (normalized.includes('reagen')) return 'reagendado';
  if (normalized.includes('cancel')) return 'cancelado';
  return normalized;
};

export type DashboardEntityMetrics = {
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  returnedOrders: number;
  rescheduledOrders: number;
  totalAmount: number;
};

export type DerivedEntity<T extends User> = {
  user: T;
  metrics: DashboardEntityMetrics;
};

export type DerivedUsersAndMetrics = {
  messengers: Array<DerivedEntity<User>>;
  advisors: Array<DerivedEntity<User>>;
};

export const createEmptyMetrics = (): DashboardEntityMetrics => ({
  totalOrders: 0,
  deliveredOrders: 0,
  pendingOrders: 0,
  returnedOrders: 0,
  rescheduledOrders: 0,
  totalAmount: 0,
});

export const updateMetricsByStatus = (metrics: DashboardEntityMetrics, status: string) => {
  switch (status) {
    case 'entregado':
      metrics.deliveredOrders += 1;
      break;
    case 'devolucion':
      metrics.returnedOrders += 1;
      break;
    case 'reagendado':
      metrics.rescheduledOrders += 1;
      break;
    default:
      metrics.pendingOrders += 1;
      break;
  }
};

export const deriveUsersAndMetricsFromPedidos = (pedidos: PedidoTest[]): DerivedUsersAndMetrics => {
  const messengerMap = new Map<string, DerivedEntity<User>>();
  const advisorMap = new Map<string, DerivedEntity<User>>();

  const ensureMessenger = (rawName: string | null, createdAt: string): DerivedEntity<User> | null => {
    const parsed = parseEntityName(rawName);
    if (!parsed) return null;
    let entry = messengerMap.get(parsed.key);
    if (!entry) {
      const slugSegment = parsed.slug && parsed.slug.length > 0 ? parsed.slug : `mensajero-${messengerMap.size + 1}`;
      const userId = slugSegment.startsWith('mensajero-') ? slugSegment : `mensajero-${slugSegment}`;
      entry = {
        user: {
          id: userId,
          name: parsed.display,
          email: `${userId}@mensajeros.magicstars.com`,
          role: 'mensajero',
          phone: '+506 0000-0000',
          createdAt,
          isActive: true,
        },
        metrics: createEmptyMetrics(),
      };
      messengerMap.set(parsed.key, entry);
    } else if (createdAt < entry.user.createdAt) {
      entry.user.createdAt = createdAt;
    }
    return entry;
  };

  const ensureAdvisor = (rawName: string | null, createdAt: string): DerivedEntity<User> | null => {
    const parsed = parseEntityName(rawName);
    if (!parsed) return null;
    let entry = advisorMap.get(parsed.key);
    if (!entry) {
      const slugSegment = parsed.slug && parsed.slug.length > 0 ? parsed.slug : `asesor-${advisorMap.size + 1}`;
      const userId = slugSegment.startsWith('asesor-') ? slugSegment : `asesor-${slugSegment}`;
      entry = {
        user: {
          id: userId,
          name: parsed.display,
          email: `${userId}@asesores.magicstars.com`,
          role: 'asesor',
          phone: '+506 0000-0000',
          createdAt,
          isActive: true,
        },
        metrics: createEmptyMetrics(),
      };
      advisorMap.set(parsed.key, entry);
    } else if (createdAt < entry.user.createdAt) {
      entry.user.createdAt = createdAt;
    }
    return entry;
  };

  pedidos.forEach(pedido => {
    const createdAt = toIsoString(pedido.fecha_creacion);
    const orderValue =
      typeof pedido.valor_total === 'number'
        ? pedido.valor_total
        : Number.parseFloat(String(pedido.valor_total || 0)) || 0;
    const status = normalizeStatus(pedido.estado_pedido);

    let messengerEntry = ensureMessenger(pedido.mensajero_asignado, createdAt);
    if (!messengerEntry) {
      messengerEntry = ensureMessenger(pedido.mensajero_concretado, createdAt);
    }
    if (messengerEntry) {
      messengerEntry.metrics.totalOrders += 1;
      messengerEntry.metrics.totalAmount += orderValue;
      updateMetricsByStatus(messengerEntry.metrics, status);
    }

    const advisorEntry = ensureAdvisor(pedido.tienda, createdAt);
    if (advisorEntry) {
      advisorEntry.metrics.totalOrders += 1;
      advisorEntry.metrics.totalAmount += orderValue;
      updateMetricsByStatus(advisorEntry.metrics, status);
    }
  });

  const sortByName = (entries: Array<DerivedEntity<User>>) =>
    entries.sort((a, b) => a.user.name.localeCompare(b.user.name, 'es', { sensitivity: 'base' }));

  return {
    messengers: sortByName(Array.from(messengerMap.values())),
    advisors: sortByName(Array.from(advisorMap.values())),
  };
};

