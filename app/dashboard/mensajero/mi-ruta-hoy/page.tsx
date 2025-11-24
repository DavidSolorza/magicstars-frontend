'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { mockApi } from '@/lib/mock-api';
import { Order, PedidoTest, OrderStatus } from '@/lib/types';
import { getPedidosByMensajero, getPedidosDelDiaByMensajero, updatePedido, getGastosMensajeros } from '@/lib/supabase-pedidos';
import { API_URLS, apiRequest } from '@/lib/config';
import { supabasePedidos } from '@/lib/supabase-pedidos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Lazy load Calendar
const CalendarComponent = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  { 
    ssr: false, 
    loading: () => <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> 
  }
);
import { 
  Package, 
  CheckCircle, 
  RotateCcw,
  Truck, 
  Clock,
  DollarSign, 
  Smartphone,
  Navigation, 
  Phone,
  MapPin as LocationIcon,
  User,
  Edit3,
  MessageSquare,
  AlertTriangle,
  Building2,
  Plus,
  Receipt,
  Upload,
  Camera,
  FileText,
  Calendar,
  Route,
  Fuel,
  Coffee,
  Car,
  Wrench,
  CreditCard,
  Image as ImageIcon,
  X,
  Save,
  CheckCircle2,
  Banknote,
  Search,
  Filter,
  MessageCircle,
  Map,
  BarChart3,
  PieChart,
  Activity,
  Clipboard,
  ExternalLink,
  Calculator
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Expense {
  id: string;
  type: 'fuel' | 'food' | 'maintenance' | 'other';
  amount: number;
  description: string;
  receipt?: string;
  customType?: string;
  createdAt: string;
}

interface StatusChange {
  id: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  comment?: string;
  paymentMethod?: string;
  receipt?: string;
  evidence?: string;
}

interface RouteData {
  orders: Order[];
  expenses: Expense[];
  totalExpenses: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export default function MiRutaHoy() {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState<RouteData>({
    orders: [],
    expenses: [],
    totalExpenses: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });
  const [gastosReales, setGastosReales] = useState<{
    mensajero: string;
    gastos: {
      id: string;
      monto: number;
      tipo_gasto: string;
      comprobante_link: string;
      fecha: string;
    }[];
    totalGastos: number;
  }[]>([]);
  const [accountingMetrics, setAccountingMetrics] = useState({
    totalCash: 0,
    totalSinpe: 0,
    totalTarjeta: 0,
    totalDosPagos: 0,
    totalReturns: 0
  });
  const [activeFilter, setActiveFilter] = useState<'todos' | 'en_ruta' | 'completados' | 'reagendados' | 'devoluciones'>('todos');
  const [activeTab, setActiveTab] = useState<'pedidos' | 'contabilidad'>('pedidos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('custom');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newExpense, setNewExpense] = useState({
    type: 'fuel' as 'fuel' | 'maintenance' | 'peaje' | 'other',
    amount: '',
    receipt: null as File | null,
    customType: ''
  });
  const [uploadedReceiptImage, setUploadedReceiptImage] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [selectedOrderForUpdate, setSelectedOrderForUpdate] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('en_ruta');
  const [statusComment, setStatusComment] = useState('');
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<Order | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [newDetailNote, setNewDetailNote] = useState('');
  const [isAddingDetailNote, setIsAddingDetailNote] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [uploadedReceipts, setUploadedReceipts] = useState<string[]>([]);
  const [uploadedEvidence, setUploadedEvidence] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estados para pagos múltiples
  const [isDualPayment, setIsDualPayment] = useState(false);
  const [firstPaymentMethod, setFirstPaymentMethod] = useState<string>('efectivo'); // Por defecto efectivo
  const [firstPaymentAmount, setFirstPaymentAmount] = useState<string>('');
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<string>(''); // Vacío para que el usuario seleccione
  const [secondPaymentAmount, setSecondPaymentAmount] = useState<string>('');
  const [firstPaymentReceipt, setFirstPaymentReceipt] = useState<string | null>(null);
  const [secondPaymentReceipt, setSecondPaymentReceipt] = useState<string | null>(null);
  const [isReagendadoAsChange, setIsReagendadoAsChange] = useState(false);
  const [reagendadoDate, setReagendadoDate] = useState<Date | undefined>(undefined);
  const [isReagendadoDatePickerOpen, setIsReagendadoDatePickerOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState<Order | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  
  // Estados para modales de métricas
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isRescheduledModalOpen, setIsRescheduledModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSinpeModalOpen, setIsSinpeModalOpen] = useState(false);
  const [isTarjetaModalOpen, setIsTarjetaModalOpen] = useState(false);
  const [isDosPagosModalOpen, setIsDosPagosModalOpen] = useState(false);
  const [isTotalEntregarModalOpen, setIsTotalEntregarModalOpen] = useState(false);
  const [isDevolverModalOpen, setIsDevolverModalOpen] = useState(false);
  const [isLiquidationCompleted, setIsLiquidationCompleted] = useState(false);

  // Función helper para normalizar el nombre del usuario
  const getNormalizedUserName = () => {
    return (user?.name ?? '').trim().toUpperCase();
  };

  // Helper consistente para obtener gastos del mensajero actual en la fecha seleccionada
  const getCurrentMessengerExpenses = () => {
    const mensajero = getNormalizedUserName();
    const gastosDelMensajero = gastosReales.find(g => g.mensajero === mensajero);
    const lista = gastosDelMensajero?.gastos || [];
    const total = lista.reduce((sum, gasto) => sum + (gasto?.monto || 0), 0);
    return { lista, total };
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        await loadGastosReales();
        loadRouteData();
        checkLiquidationStatus();
      };
      loadData();
    }
  }, [user, selectedDate, dateFilter, activeFilter, searchTerm]);

  // Efecto para actualizar la UI cuando cambien los gastos reales
  useEffect(() => {
    console.log('🔄 Gastos reales cambiaron, actualizando UI...');
    console.log('💰 Gastos actuales:', gastosReales);
    
    if (gastosReales.length > 0) {
      const gastosDelMensajero = gastosReales.find(g => g.mensajero === getNormalizedUserName());
      if (gastosDelMensajero) {
        const totalGastos = gastosDelMensajero.gastos?.reduce((sum, gasto) => sum + gasto.monto, 0) || 0;
        console.log('✅ Actualizando total de gastos en UI:', totalGastos);
        setRouteData(prev => ({
          ...prev,
          totalExpenses: totalGastos
        }));
      }
    } else {
      // Si no hay gastos, establecer en 0
      setRouteData(prev => ({
        ...prev,
        totalExpenses: 0
      }));
    }
  }, [gastosReales, user?.name]);


  // Countdown para el modal de éxito
  useEffect(() => {
    if (isSuccessModalOpen && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSuccessModalOpen && countdown === 0) {
      setIsSuccessModalOpen(false);
      setCountdown(3);
      setSuccessMessage('');
    }
  }, [isSuccessModalOpen, countdown]);

  // Función helper para obtener la fecha actual en zona horaria de Costa Rica
  const getCostaRicaDate = () => {
    const now = new Date();
    
    // Costa Rica está en CST (Central Standard Time) = UTC-6
    // Costa Rica NO observa horario de verano, siempre UTC-6
    const costaRicaOffset = -6 * 60; // -6 horas en minutos
    
    // Obtener el tiempo UTC actual
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // Aplicar el offset de Costa Rica (UTC-6)
    const costaRicaTime = new Date(utc + (costaRicaOffset * 60000));
    
    console.log('🕐 Fecha original:', now.toISOString());
    console.log('🕐 Zona horaria del sistema:', now.getTimezoneOffset());
    console.log('🕐 UTC calculado:', new Date(utc).toISOString());
    console.log('🕐 Costa Rica (UTC-6):', costaRicaTime.toISOString());
    
    return costaRicaTime;
  };

  // Función helper para obtener la fecha ISO en zona horaria de Costa Rica
  const getCostaRicaDateISO = () => {
    const costaRicaDate = getCostaRicaDate();
    const year = costaRicaDate.getFullYear();
    const month = String(costaRicaDate.getMonth() + 1).padStart(2, '0');
    const day = String(costaRicaDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    console.log('📅 Fecha Costa Rica:', costaRicaDate.toISOString());
    console.log('📅 Año:', year, 'Mes:', month, 'Día:', day);
    console.log('📅 ISO Date final:', isoDate);
    
    return isoDate;
  };

  // Función para obtener fecha/hora en formato timestamptz para Costa Rica
  const getCostaRicaTimestamp = (targetDate?: Date): string => {
    const costaRicaNow = getCostaRicaDate();
    
    let fechaObjetivo: Date;
    
    if (targetDate) {
      // Si hay fecha seleccionada: usar esa fecha con la HORA ACTUAL de Costa Rica
      // Tomamos la fecha seleccionada (año, mes, día) y le aplicamos la hora actual de CR
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();

      // Obtener componentes de la hora actual de Costa Rica
      const hours = costaRicaNow.getHours();
      const minutes = costaRicaNow.getMinutes();
      const seconds = costaRicaNow.getSeconds();
      const milliseconds = costaRicaNow.getMilliseconds();

      // Crear timestamp ISO string directamente en formato UTC-6
      // Formato: YYYY-MM-DDTHH:mm:ss.sss-06:00
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const horaStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
      const isoString = `${fechaStr}T${horaStr}-06:00`;
      
      // Crear Date desde el string ISO (esto garantiza que se interprete correctamente)
      fechaObjetivo = new Date(isoString);
      
      // Validación: asegurarnos de que la fecha se creó correctamente
      if (isNaN(fechaObjetivo.getTime())) {
        console.warn('⚠️ Error creando fecha desde ISO string, usando método alternativo');
        // Método alternativo: crear en local y ajustar manualmente
        fechaObjetivo = new Date(year, month, day, hours, minutes, seconds, milliseconds);
        // Ajustar a UTC-6
        const utcTime = fechaObjetivo.getTime() + (fechaObjetivo.getTimezoneOffset() * 60000);
        const costaRicaTime = utcTime - (6 * 60 * 60 * 1000);
        fechaObjetivo = new Date(costaRicaTime);
      }
      
      console.log('📅 Fecha seleccionada DIFERENTE - usando hora ACTUAL de CR:', {
        fechaSeleccionada: fechaStr,
        horaCR: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        isoStringConstruido: isoString,
        resultadoISO: fechaObjetivo.toISOString(),
        tieneHora: !(fechaObjetivo.getUTCHours() === 0 && fechaObjetivo.getUTCMinutes() === 0 && fechaObjetivo.getUTCSeconds() === 0)
      });
    } else {
      // No hay fecha seleccionada: usar hora actual de Costa Rica
      fechaObjetivo = costaRicaNow;
      console.log('📅 Sin fecha seleccionada - usando hora actual:', fechaObjetivo.toISOString());
    }
    
    // Verificación final: asegurarnos de que tiene hora
    const horaUTC = fechaObjetivo.getUTCHours();
    const minutoUTC = fechaObjetivo.getUTCMinutes();
    const segundoUTC = fechaObjetivo.getUTCSeconds();
    
    if (horaUTC === 0 && minutoUTC === 0 && segundoUTC === 0) {
      console.warn('⚠️ ADVERTENCIA: La fecha creada tiene hora 00:00:00. Esto no debería pasar.');
    }
    
    console.log('🕐 Verificación final del timestamp:', {
      iso: fechaObjetivo.toISOString(),
      horaUTC: `${String(horaUTC).padStart(2, '0')}:${String(minutoUTC).padStart(2, '0')}:${String(segundoUTC).padStart(2, '0')}`,
      tieneHora: !(horaUTC === 0 && minutoUTC === 0 && segundoUTC === 0)
    });
    
    // Retornar en formato ISO con zona horaria (timestamptz)
    return fechaObjetivo.toISOString();
  };

  const loadRouteData = async () => {
    // Declarar variables fuera del try para que estén disponibles en catch
    let targetDateISO: string = '';
    let targetDateString: string = '';
    
    try {
      console.log('🚀 INICIANDO loadRouteData');
      console.log('👤 Usuario actual:', user?.name);
      console.log('📅 Filtro de fecha:', dateFilter);
      console.log('📅 Fecha seleccionada:', selectedDate);
    
    setLoading(true);
      
      // Determinar la fecha objetivo basada en el filtro activo
      
      const now = new Date();
      const costaRicaNow = getCostaRicaDate();
      
      console.log('🕐 Fecha actual del sistema:', now.toISOString());
      console.log('🕐 Fecha Costa Rica:', costaRicaNow.toISOString());
      
      // PRIORIDAD 1: Si hay una fecha específica seleccionada, usar esa
      if (selectedDate) {
        console.log('📅 Usando fecha seleccionada:', selectedDate);
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        targetDateISO = `${year}-${month}-${day}`;
        targetDateString = selectedDate.toDateString();
        console.log('📅 Fecha específica calculada:', targetDateISO);
      } else {
        // Usar la fecha actual de Costa Rica
        targetDateISO = getCostaRicaDateISO();
        targetDateString = costaRicaNow.toDateString();
        console.log('📅 Usando fecha actual de Costa Rica:', targetDateISO);
      }
      
      console.log('🎯 Fecha objetivo ISO:', targetDateISO);
      console.log('🎯 Fecha objetivo string:', targetDateString);
      
      // Obtener pedidos de Supabase filtrados por mensajero Y fecha objetivo
      console.log('🔍 Consultando pedidos para:', user?.name, 'en fecha:', targetDateISO);
      const pedidosSupabase = await getPedidosDelDiaByMensajero(user?.name || '', targetDateISO);
      console.log('📦 Pedidos obtenidos de Supabase:', pedidosSupabase?.length || 0);
      console.log('📦 Muestra de pedidos:', pedidosSupabase?.slice(0, 3));
      
      // Usar directamente los pedidos obtenidos de Supabase (ya filtrados por fecha)
      const pedidosDelDia = pedidosSupabase;
      console.log('📦 Pedidos del día (después de filtrado):', pedidosDelDia?.length || 0);
      
      // Convertir pedidos de Supabase al formato de la aplicación
      console.log('🔄 Convirtiendo pedidos al formato de la aplicación...');
      const orders: Order[] = pedidosDelDia.map((pedido, index) => {
        try {
          // Determinar el estado del pedido basado en los campos disponibles
             let status: OrderStatus = 'pendiente';
             
             // Mapear estados específicos del CSV
             if (pedido.estado_pedido) {
               const estado = pedido.estado_pedido.toLowerCase();
               if (estado === 'entregado') {
                 status = 'entregado';
               } else if (estado === 'devolucion') {
                 status = 'devolucion';
               } else if (estado === 'reagendado' || estado === 'reagendo') {
                 status = 'reagendado';
               } else if (estado === 'en_ruta' || estado === 'en ruta') {
                 status = 'en_ruta';
               } else if (estado === 'pendiente') {
                 status = 'pendiente';
               } else {
                 // Para otros estados, usar lógica de mensajero
                 if (pedido.mensajero_concretado) {
                   status = 'entregado';
                 } else if (pedido.mensajero_asignado) {
                   status = 'en_ruta';
                 }
               }
             } else {
               // Si estado_pedido es null, vacío o empty, usar lógica de mensajero
               if (pedido.mensajero_concretado) {
                 status = 'entregado';
               } else if (pedido.mensajero_asignado) {
                 status = 'en_ruta';
               }
             }

          // Usar la fecha de creación del pedido si está disponible, sino usar la fecha actual
          const createdAt = pedido.fecha_creacion ? 
            new Date(pedido.fecha_creacion).toISOString() : 
            new Date().toISOString();

          // Validar campos críticos
          if (!pedido.id_pedido) {
            console.warn(`⚠️ Pedido sin ID en índice ${index}:`, pedido);
          }
          if (pedido.valor_total === null || pedido.valor_total === undefined) {
            console.warn(`⚠️ Pedido sin valor_total en índice ${index}:`, pedido);
          }

        return {
          id: pedido.id_pedido || `pedido-${index}`,
          customerName: pedido.cliente_nombre || `Cliente ${pedido.id_pedido || index}`,
          customerPhone: pedido.cliente_telefono || '0000-0000',
          customerAddress: pedido.direccion || pedido.distrito || 'Dirección no disponible',
          customerProvince: pedido.provincia || 'San José',
          customerCanton: pedido.canton || 'Central',
          customerDistrict: pedido.distrito || 'Distrito no disponible',
          customerLocationLink: pedido.link_ubicacion || undefined,
          items: [],
          productos: pedido.productos || 'Productos no especificados', // Items vacíos por ahora
          totalAmount: pedido.valor_total ? parseFloat(pedido.valor_total.toString()) : 0,
          status,
          paymentMethod: (() => {
            const metodo = pedido.metodo_pago?.toLowerCase();
            if (metodo === 'sinpe') return 'sinpe' as const;
            if (metodo === 'tarjeta') return 'tarjeta' as const;
            if (metodo === '2pagos' || metodo === '2 pagos') return '2pagos' as const;
            if (metodo === null || metodo === undefined) return 'efectivo' as const; // Para pedidos sin método de pago definido
            return 'efectivo' as const;
          })(),
          metodoPagoOriginal: pedido.metodo_pago || 'No especificado',
          origin: 'csv' as const,
          createdAt,
          updatedAt: createdAt,
          scheduledDate: pedido.fecha_entrega || undefined,
          deliveryDate: pedido.fecha_entrega || undefined,
          notes: pedido.notas || '',
          asesorNotes: pedido.nota_asesor || '',
          deliveryNotes: pedido.nota_asesor || '',
          numero_sinpe: pedido.numero_sinpe || undefined,
          comprobante_sinpe: pedido.comprobante_sinpe || undefined,
          efectivo_2_pagos: pedido.efectivo_2_pagos || undefined,
          sinpe_2_pagos: pedido.sinpe_2_pagos || undefined,
          tienda: pedido.tienda || 'ALL STARS',
               assignedMessenger: pedido.mensajero_concretado ? {
                 id: '1',
                 name: pedido.mensajero_concretado,
                 email: '',
                 role: 'mensajero' as const,
                 createdAt: new Date().toISOString(),
                 isActive: true
               } : undefined,
        };
        } catch (error) {
          console.error(`❌ Error procesando pedido en índice ${index}:`, error);
          console.error('Pedido problemático:', pedido);
          // Devolver un pedido por defecto en caso de error
          return {
            id: `error-${index}`,
            customerName: 'Error en pedido',
            customerPhone: '0000-0000',
            customerAddress: 'Error',
            customerProvince: 'San José',
            customerCanton: 'Central',
            customerDistrict: 'Error',
            items: [],
            totalAmount: 0,
            status: 'pendiente' as const,
            paymentMethod: 'efectivo' as const,
            origin: 'csv' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: 'Error al procesar pedido',
            deliveryNotes: '',
          };
        }
      });
      

      // Gastos vacíos - se conectará al backend esta semana
      const mockExpenses: Expense[] = [];

      // Calcular total de gastos del mensajero actual
      const gastosDelMensajero = gastosReales.find(g => g.mensajero === getNormalizedUserName());
      const totalExpenses = gastosDelMensajero?.gastos?.reduce((sum, gasto) => sum + gasto.monto, 0) || 0;
      const completedOrders = orders.filter(order => order.status === 'entregado').length;
      // Solo contar pedidos entregados para el total del día
      const totalRevenue = orders
        .filter(order => order.status === 'entregado')
        .reduce((sum, order) => sum + order.totalAmount, 0);

      // Calcular métricas de contabilidad
      const totalCash = orders
        .filter(order => order.status === 'entregado')
        .reduce((sum, order) => {
          if (order.paymentMethod === 'efectivo') {
            return sum + order.totalAmount;
          } else if (order.paymentMethod === '2pagos') {
            // Para pedidos de 2 pagos, sumar solo la parte de efectivo
            const efectivoAmount = parseFloat(order.efectivo_2_pagos || '0');
            return sum + efectivoAmount;
          }
          return sum;
        }, 0);
      
      const totalSinpe = orders
        .filter(order => order.status === 'entregado')
        .reduce((sum, order) => {
          if (order.paymentMethod === 'sinpe') {
            return sum + order.totalAmount;
          } else if (order.paymentMethod === '2pagos') {
            // Para pedidos de 2 pagos, sumar solo la parte de SINPE
            const sinpeAmount = parseFloat(order.sinpe_2_pagos || '0');
            return sum + sinpeAmount;
          }
          return sum;
        }, 0);
      
      const totalTarjeta = orders
        .filter(order => order.paymentMethod === 'tarjeta' && order.status === 'entregado')
        .reduce((sum, order) => sum + order.totalAmount, 0);
      
      const totalDosPagos = orders
        .filter(order => order.paymentMethod === '2pagos' && order.status === 'entregado')
        .reduce((sum, order) => {
          // Para pedidos de 2 pagos, sumar efectivo_2_pagos + sinpe_2_pagos
          const efectivoAmount = parseFloat(order.efectivo_2_pagos || '0');
          const sinpeAmount = parseFloat(order.sinpe_2_pagos || '0');
          return sum + efectivoAmount + sinpeAmount;
        }, 0);
      
      const totalReturns = orders.filter(order => order.status === 'devolucion').length;

      console.log('📊 Estadísticas calculadas:');
      console.log('📊 Total pedidos:', orders.length);
      console.log('📊 Pedidos completados:', completedOrders);
      console.log('📊 Ingresos totales:', totalRevenue);
      console.log('📊 Devoluciones:', totalReturns);
      
      setRouteData({
        orders,
        expenses: mockExpenses,
        totalExpenses,
        totalOrders: orders.length,
        completedOrders,
        totalRevenue
      });

      console.log('✅ RouteData actualizado exitosamente');

      // Ordenar pedidos por ubicación (provincia, cantón, distrito) y estado
      const sortedOrders = orders.sort((a, b) => {
        // Función helper para normalizar texto para comparación
        const normalizeText = (text: string) => {
          return text
            .toLowerCase()
            .trim()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n');
        };
        
        // Primero por provincia (normalizada)
        const provinciaA = normalizeText(a.customerProvince || 'zzz sin provincia');
        const provinciaB = normalizeText(b.customerProvince || 'zzz sin provincia');
        const provinciaCompare = provinciaA.localeCompare(provinciaB, 'es-CR');
        
        console.log(`🔍 Comparando provincias: "${a.customerProvince}" vs "${b.customerProvince}" = ${provinciaCompare}`);
        
        if (provinciaCompare !== 0) {
          return provinciaCompare;
        }
        
        // Luego por cantón (normalizado)
        const cantonA = normalizeText(a.customerCanton || 'zzz sin canton');
        const cantonB = normalizeText(b.customerCanton || 'zzz sin canton');
        const cantonCompare = cantonA.localeCompare(cantonB, 'es-CR');
        
        console.log(`🔍 Comparando cantones: "${a.customerCanton}" vs "${b.customerCanton}" = ${cantonCompare}`);
        
        if (cantonCompare !== 0) {
          return cantonCompare;
        }
        
        // Después por distrito (normalizado)
        const distritoA = normalizeText(a.customerDistrict || 'zzz sin distrito');
        const distritoB = normalizeText(b.customerDistrict || 'zzz sin distrito');
        const distritoCompare = distritoA.localeCompare(distritoB, 'es-CR');
        
        console.log(`🔍 Comparando distritos: "${a.customerDistrict}" vs "${b.customerDistrict}" = ${distritoCompare}`);
        
        if (distritoCompare !== 0) {
          return distritoCompare;
        }
        
        // Finalmente por estado (pendientes primero)
        const statusOrder = { 'pendiente': 0, 'en_ruta': 1, 'entregado': 2, 'reagendado': 3, 'devolucion': 4 };
        const statusA = statusOrder[a.status as keyof typeof statusOrder] || 5;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] || 5;
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        // Por último por ID
        return a.id.localeCompare(b.id, 'es-CR');
      });
      
      // Actualizar el estado con los pedidos ordenados
      setRouteData(prev => ({
        ...prev,
        orders: sortedOrders
      }));
      console.log('🔍 Pedidos ordenados por ubicación:', sortedOrders);


      setAccountingMetrics({
        totalCash,
        totalSinpe,
        totalTarjeta,
        totalDosPagos,
        totalReturns
      });
    } catch (error) {
      console.error('❌ ERROR en loadRouteData:', error);
      console.error('❌ Usuario:', user?.name);
      console.error('❌ Fecha objetivo:', targetDateISO);
      console.error('❌ Filtro de fecha:', dateFilter);
      console.error('❌ Fecha seleccionada:', selectedDate);
    } finally {
      console.log('🏁 Finalizando loadRouteData, loading = false');
      setLoading(false);
    }
  };

  // Función para verificar si la liquidación ya está completada
  const checkLiquidationStatus = async () => {
    try {
      if (!user?.name) return;
      
      // Usar la fecha seleccionada en lugar de la fecha actual
      let targetDate;
      if (selectedDate) {
        targetDate = selectedDate;
      } else {
        targetDate = getCostaRicaDate();
      }
      
      const targetDateString = targetDate.toISOString().split('T')[0];
      
      const { checkLiquidationStatus: checkStatus } = await import('@/lib/supabase-pedidos');
      const isCompleted = await checkStatus(user.name, targetDateString);
      setIsLiquidationCompleted(isCompleted);
      
      console.log(`🔍 Estado de liquidación para ${user.name} en ${targetDateString}: ${isCompleted ? 'COMPLETADA' : 'PENDIENTE'}`);
    } catch (error) {
      console.error('❌ Error verificando estado de liquidación:', error);
      setIsLiquidationCompleted(false);
    }
  };

  // Función para cargar gastos reales desde Supabase
  const loadGastosReales = async () => {
    try {
      // Usar la fecha seleccionada en lugar de la fecha actual
      let targetDate;
      if (selectedDate) {
        targetDate = selectedDate;
      } else {
        targetDate = getCostaRicaDate();
      }
      
      const targetDateString = targetDate.toISOString().split('T')[0];
      
      console.log('🔄 Cargando gastos reales para:', targetDateString);
      console.log('👤 Usuario actual:', user?.name);
      console.log('📅 Fecha seleccionada:', selectedDate);
      console.log('📅 Fecha objetivo:', targetDate);
      console.log('🔍 ¿Es fecha diferente a hoy?', targetDateString !== getCostaRicaDate().toISOString().split('T')[0]);
      
      const gastos = await getGastosMensajeros(targetDateString);
      console.log('💰 Gastos reales obtenidos:', gastos);
      console.log('📊 Total de mensajeros con gastos:', gastos.length);
      
      setGastosReales(gastos);
      
      // Actualizar total de gastos con los datos reales
      const gastosDelMensajero = gastos.find(g => g.mensajero === getNormalizedUserName());
      console.log('🔍 Gastos del mensajero actual:', gastosDelMensajero);
      console.log('🔍 Nombre usuario normalizado:', getNormalizedUserName());
      
      if (gastosDelMensajero) {
        console.log('💰 Total de gastos del mensajero:', gastosDelMensajero.totalGastos);
        setRouteData(prev => ({
          ...prev,
          totalExpenses: gastosDelMensajero.totalGastos
        }));
        console.log('✅ RouteData actualizado con gastos reales');
      } else {
        console.log('ℹ️ No se encontraron gastos para el mensajero actual');
        setRouteData(prev => ({
          ...prev,
          totalExpenses: 0
        }));
      }
      
    } catch (error) {
      console.error('❌ Error cargando gastos reales:', error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB');
        return;
      }
      
      console.log('📁 Archivo seleccionado:', {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type
      });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedReceiptImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setNewExpense(prev => ({ ...prev, receipt: file }));
    }
  };

  // Función para convertir archivo a base64 (MEJORADA)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validar archivo
      if (!file) {
        reject(new Error('No se proporcionó archivo'));
        return;
      }
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo debe ser una imagen'));
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('El archivo es demasiado grande (máximo 10MB)'));
        return;
      }
      
      console.log('🔄 Iniciando conversión de archivo a Base64:', {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type
      });
      
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const base64 = reader.result as string;
          console.log('🔍 Base64 completo generado:', {
            longitud: base64.length,
            prefijo: base64.substring(0, 50),
            tieneComa: base64.includes(','),
            esValido: base64.length > 100
          });
          
          // Verificar que el resultado es válido
          if (!base64 || typeof base64 !== 'string') {
            throw new Error('FileReader no devolvió un resultado válido');
          }
          
          if (!base64.includes(',')) {
            throw new Error('Base64 no contiene el separador esperado');
          }
          
          if (base64.length < 100) {
            throw new Error('Base64 demasiado corto, posible archivo corrupto');
          }
          
          // Verificar que el Base64 contiene la secuencia típica de inicio
          if (!base64.includes(',/9j/') && !base64.includes(',iVBORw0KGgo') && !base64.includes(',UklGR')) {
            console.warn('⚠️ Base64 no contiene secuencias típicas de imagen:', {
              tieneComa: base64.includes(','),
              tiene9j: base64.includes('/9j/'),
              tieneiVBOR: base64.includes('iVBORw0KGgo'),
              tieneUklGR: base64.includes('UklGR'),
              prefijo: base64.substring(0, 100)
            });
          }
          
          // ENVIAR CON PREFIJO (data:image/...;base64,)
          console.log('🔍 Base64 con prefijo:', {
            longitud: base64.length,
            muestra: base64.substring(0, 50) + '...',
            esValido: base64.length > 100,
            tieneComa: base64.includes(','),
            tiene9j: base64.includes('/9j/'),
            tieneiVBOR: base64.includes('iVBORw0KGgo'),
            tieneUklGR: base64.includes('UklGR')
          });
          
          // Log detallado del inicio y final del Base64
          console.log('🔍 Inicio del Base64:', base64.substring(0, 100));
          console.log('🔍 Final del Base64:', base64.substring(base64.length - 50));
          
          // Verificar que el Base64 no esté vacío
          if (!base64 || base64.length === 0) {
            throw new Error('Base64 vacío');
          }
          
          if (base64.length < 100) {
            throw new Error('Base64 demasiado corto');
          }
          
          console.log('✅ Base64 con prefijo generado exitosamente para gasto');
          resolve(base64);
          
        } catch (error) {
          console.error('❌ Error procesando Base64:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ Error en FileReader:', error);
        reject(new Error(`Error al leer archivo: ${error}`));
      };
      
      reader.onabort = () => {
        console.error('❌ FileReader abortado');
        reject(new Error('Lectura de archivo abortada'));
      };
      
      // Leer archivo como Data URL
      reader.readAsDataURL(file);
    });
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.receipt) return;
    if (newExpense.type === 'other' && !newExpense.customType.trim()) return;

    console.log('🚀 Iniciando proceso de gasto...');
    console.log('📋 Datos del gasto:', {
      mensajero: user?.name,
      monto: newExpense.amount,
      tipo: newExpense.type,
      customType: newExpense.customType,
      archivo: newExpense.receipt?.name,
      tamaño: newExpense.receipt?.size
    });
    
    setIsAddingExpense(true);
    try {
      // Convertir imagen a base64
      console.log('🔄 Convirtiendo imagen a Base64...');
      const base64Image = await convertFileToBase64(newExpense.receipt);
      console.log('✅ Base64 generado exitosamente, longitud:', base64Image.length);
      
      // Mapear tipos a español
      const tipoGastoMap: { [key: string]: string } = {
        'fuel': 'Combustible',
        'maintenance': 'Mantenimiento',
        'peaje': 'Peaje',
        'other': newExpense.customType || 'Otro'
      };

      // Determinar la fecha y hora objetivo para el gasto en formato timestamptz
      // Esto maneja:
      // - Fecha actual: usa la hora actual de Costa Rica
      // - Fecha pasada: usa mediodía (12:00:00) de esa fecha
      // - Fecha futura: usa inicio del día (00:00:00) de esa fecha
      const fechaHoraCostaRica = getCostaRicaTimestamp(selectedDate);

      // Preparar datos para envío
      const requestData = {
        mensajero: user?.name || '',
        comprobante_base64: base64Image,
        monto: parseFloat(newExpense.amount),
        tipo_gasto: tipoGastoMap[newExpense.type] || newExpense.type,
        fecha: fechaHoraCostaRica, // Formato timestamptz completo (YYYY-MM-DDTHH:mm:ss.sssZ)
        descripcion: newExpense.customType || tipoGastoMap[newExpense.type] || newExpense.type
      };
      
      console.log('📤 Enviando datos al endpoint:', {
        mensajero: requestData.mensajero,
        comprobante_base64: base64Image, // BASE64 COMPLETO
        monto: requestData.monto,
        tipo_gasto: requestData.tipo_gasto,
        fecha: requestData.fecha, // timestamptz completo (YYYY-MM-DDTHH:mm:ss.sssZ)
        descripcion: requestData.descripcion
      });
      console.log('🕐 Fecha/hora enviada (timestamptz):', fechaHoraCostaRica);
      
      // Log adicional con información de longitud
      console.log('📏 Información del Base64 enviado:', {
        longitud: base64Image.length,
        tipo: newExpense.receipt?.type || 'image/jpeg',
        tamañoArchivo: newExpense.receipt?.size || 0
      });
      
      // Aviso inmediato
      toast({
        title: 'Gasto enviado',
        description: 'Procesando comprobante… se reflejará en unos segundos.',
      });

      // Enviar al endpoint usando configuración centralizada
      const response = await apiRequest(API_URLS.ADD_GASTO_MENSAJERO, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error al enviar gasto al servidor: ${response.status} - ${errorText}`);
      }

      // Actualización optimista inmediata
      try {
        const mensajeroNormalizado = getNormalizedUserName();
        const gastoOptimista: any = {
          id: `temp-${Date.now()}`,
          monto: parseFloat(newExpense.amount),
          tipo_gasto: tipoGastoMap[newExpense.type] || newExpense.type,
          comprobante_link: '',
          fecha: fechaHoraCostaRica // Usar la fecha/hora completa
        };

        setGastosReales(prev => {
          const copia = [...prev];
          const idx = copia.findIndex(g => g.mensajero === mensajeroNormalizado);
          if (idx >= 0) {
            const lista = [...(copia[idx].gastos || []), gastoOptimista];
            const totalGastos = lista.reduce((sum, g:any) => sum + (g?.monto || 0), 0);
            copia[idx] = { ...copia[idx], gastos: lista, totalGastos };
          } else {
            copia.push({ mensajero: mensajeroNormalizado, gastos: [gastoOptimista], totalGastos: gastoOptimista.monto });
          }
          return copia;
        });

        // Reflejar en métricas locales de inmediato
        setRouteData(prev => ({
          ...prev,
          totalExpenses: (getCurrentMessengerExpenses().total || 0)
        }));
      } catch (e) {
        console.warn('⚠️ Error en actualización optimista, continuamos:', e);
      }

        const responseData = await response.json();
        console.log('✅ Gasto enviado exitosamente:', responseData);

        // LOG COMPLETO DEL BASE64 PARA TESTING
        console.log('🔍 ===== BASE64 COMPLETO PARA TESTING =====');
        console.log('📋 INFORMACIÓN DEL ARCHIVO:');
        console.log('   Nombre:', newExpense.receipt?.name);
        console.log('   Tamaño:', newExpense.receipt?.size, 'bytes');
        console.log('   Tipo:', newExpense.receipt?.type);
        console.log('📋 BASE64 CON PREFIJO (enviado al endpoint):');
        console.log(base64Image);
        console.log('📋 LONGITUD DEL BASE64:', base64Image.length);
        console.log('🔍 ===========================================');

        // Mostrar indicador de actualización
        setIsAddingExpense(true);

        // Polling: intentos para esperar a que n8n/Supabase persistan el gasto
        const maxAttempts = 6; // ~9s en total
        const intervalMs = 1500;
        let attempt = 0;
        let synced = false;
        console.log('⏳ Iniciando polling para confirmar sincronización del gasto...');
        while (attempt < maxAttempts && !synced) {
          attempt++;
          console.log(`🔁 Intento ${attempt}/${maxAttempts} de recargar gastos...`);
          await loadGastosReales();
          const { lista } = getCurrentMessengerExpenses();
          synced = !!(lista && lista.some(g => {
            const montoGasto = typeof g.monto === 'string' ? parseFloat(g.monto) : Number(g.monto);
            const montoNuevo = parseFloat(newExpense.amount);
            return Math.abs(montoGasto - montoNuevo) < 0.0001;
          }));
          if (!synced) {
            await new Promise(r => setTimeout(r, intervalMs));
          }
        }
        console.log('✅ Sincronización confirmada:', synced);

        // Forzar re-renderizado de la UI
        console.log('🔄 Forzando actualización de la UI...');
        setRouteData(prev => ({ ...prev }));
        
        // Ocultar indicador de actualización
        setIsAddingExpense(false);
        
        // Mostrar mensaje de éxito
        console.log('✅ Gasto agregado exitosamente');
        toast({
          title: 'Gasto registrado',
          description: 'El gasto fue agregado y sincronizado correctamente.',
        });

      setNewExpense({
        type: 'fuel',
        amount: '',
        receipt: null,
        customType: ''
      });
      setUploadedReceiptImage(null);
      setIsExpenseModalOpen(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert(`Error al añadir gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsAddingExpense(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: 'en_ruta' | 'entregado' | 'devolucion' | 'reagendado') => {
    try {
      setUpdatingOrder(orderId);
      await mockApi.updateOrderStatus(orderId, status);
      await loadRouteData();
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrderForUpdate || !newStatus) return;
    
    try {
      setUpdatingOrder(selectedOrderForUpdate.id);
      
      // Registrar el cambio en el timeline
      addStatusChange(
        selectedOrderForUpdate.id,
        selectedOrderForUpdate.status,
        newStatus,
        statusComment,
        paymentMethod,
        uploadedReceipts.length > 0 ? uploadedReceipts[0] : undefined,
        uploadedEvidence || undefined
      );
      
      // Actualizar el estado manteniendo el routeOrder
      const updatedOrder = {
        ...selectedOrderForUpdate,
        status: newStatus as any,
        notes: statusComment ? `${selectedOrderForUpdate.notes || ''}\n[${new Date().toLocaleString()}] ${statusComment}`.trim() : selectedOrderForUpdate.notes
      };
      
      // Llamar al webhook de actualización de pedidos
      try {
        // Preparar datos de pago
        let metodoPagoData: string | null = paymentMethod || selectedOrderForUpdate.paymentMethod || 'efectivo';
        let pagosDetalle = null;
        
        // Reglas especiales para método de pago
        if (newStatus === 'devolucion' || newStatus === 'reagendado') {
          // Al marcar como devolución o reagendado, el método de pago debe ser null
          metodoPagoData = null;
          pagosDetalle = null;
        } else if (paymentMethod === '2pagos') {
          metodoPagoData = '2pagos';
          pagosDetalle = {
            primerPago: {
              metodo: firstPaymentMethod,
              monto: parseFloat(firstPaymentAmount) || 0,
              comprobante: firstPaymentReceipt
            },
            segundoPago: {
              metodo: secondPaymentMethod,
              monto: parseFloat(secondPaymentAmount) || 0,
              comprobante: secondPaymentReceipt
            }
          };
        }

        const webhookData = {
          // Datos ya conocidos desde antes
          idPedido: selectedOrderForUpdate.id,
          mensajero: user?.name || 'Mensajero',
          usuario: user?.name || 'Mensajero', // Usuario que realiza la acción
          
          // Datos tomados del formulario
          estadoPedido: newStatus === 'reagendado' ? 'REAGENDO' : newStatus,
          metodoPago: metodoPagoData,
          pagosDetalle: pagosDetalle,
          nota: statusComment || '',
          
          // Datos específicos para reagendado
          reagendadoComoCambio: newStatus === 'reagendado' ? isReagendadoAsChange : false,
          fechaReagendado: newStatus === 'reagendado' && reagendadoDate ? reagendadoDate.toISOString().split('T')[0] : null,
          
          // Datos adicionales del pedido
          clienteNombre: selectedOrderForUpdate.customerName,
          clienteTelefono: selectedOrderForUpdate.customerPhone,
          direccion: selectedOrderForUpdate.customerAddress,
          provincia: selectedOrderForUpdate.customerProvince,
          canton: selectedOrderForUpdate.customerCanton,
          distrito: selectedOrderForUpdate.customerDistrict,
          valorTotal: selectedOrderForUpdate.totalAmount,
          productos: selectedOrderForUpdate.productos || 'No especificados',
          
          // Base64 para imagen (CON prefijo data:image/...;base64,)
          imagenBase64: uploadedReceipts.length > 0 ? uploadedReceipts[0] : uploadedEvidence || null,
          mimeType: uploadedReceipts.length > 0 || uploadedEvidence ? "image/jpeg" : null
        };

        // Log detallado del cambio de estado
        console.log('🔄 ===== CAMBIO DE ESTADO DE PEDIDO =====');
        console.log('📦 PEDIDO COMPLETO:', {
          id: selectedOrderForUpdate.id,
          cliente: selectedOrderForUpdate.customerName,
          telefono: selectedOrderForUpdate.customerPhone,
          direccion: `${selectedOrderForUpdate.customerAddress}, ${selectedOrderForUpdate.customerDistrict}, ${selectedOrderForUpdate.customerCanton}, ${selectedOrderForUpdate.customerProvince}`,
          valor: selectedOrderForUpdate.totalAmount,
          productos: selectedOrderForUpdate.productos || 'No especificados',
          estadoAnterior: selectedOrderForUpdate.status,
          estadoNuevo: newStatus,
          estadoEnviadoAlBackend: newStatus === 'reagendado' ? 'REAGENDO' : newStatus,
          mensajero: user?.name || 'Mensajero',
          nota: statusComment || '',
          fechaReagendado: newStatus === 'reagendado' && reagendadoDate ? reagendadoDate.toISOString().split('T')[0] : null,
          reagendadoComoCambio: newStatus === 'reagendado' ? isReagendadoAsChange : false,
          metodoPago: metodoPagoData,
          tieneEvidencia: uploadedEvidence ? 'Sí' : 'No',
          tieneComprobante: uploadedReceipts.length > 0 ? 'Sí' : 'No'
        });
        
        // Log específico para comprobantes de pagos duales
        if (pagosDetalle) {
          console.log('💰 PAGOS DUALES DETALLE:');
          console.log('🔍 Primer pago comprobante:', {
            tieneComprobante: !!pagosDetalle.primerPago.comprobante,
            longitud: pagosDetalle.primerPago.comprobante?.length || 0,
            prefijo: pagosDetalle.primerPago.comprobante?.substring(0, 30) || 'N/A'
          });
          console.log('🔍 Segundo pago comprobante:', {
            tieneComprobante: !!pagosDetalle.segundoPago.comprobante,
            longitud: pagosDetalle.segundoPago.comprobante?.length || 0,
            prefijo: pagosDetalle.segundoPago.comprobante?.substring(0, 30) || 'N/A'
          });
        }
        
        console.log('🔄 ======================================');

        // Log del Base64 para debugging
        if (webhookData.imagenBase64) {
          console.log('🔍 Base64 con prefijo para webhook:');
          console.log('📏 Longitud del Base64 completo:', webhookData.imagenBase64.length);
          console.log('🔍 Muestra del Base64:', webhookData.imagenBase64.substring(0, 100) + '...');
          console.log('✅ Enviando CON prefijo data:image/...;base64,');
        } else {
          console.log('ℹ️ No hay imagen Base64 para enviar');
        }
        
        console.log('🚀 Enviando datos al webhook:', {
          ...webhookData,
          imagenBase64: webhookData.imagenBase64 ? `[${webhookData.imagenBase64.length} caracteres]` : null
        });

        const response = await apiRequest(API_URLS.UPDATE_PEDIDO, {
          method: "POST",
          body: JSON.stringify(webhookData)
        });

        const resultado = await response.json();
        console.log("📡 Respuesta del webhook:", resultado);
        
        if (!response.ok) {
          console.error('❌ Error en la respuesta del webhook:', resultado);
          throw new Error(`Error del servidor: ${resultado.message || 'Error desconocido'}`);
        } else {
          console.log('✅ Webhook ejecutado exitosamente');
          console.log('🎉 ===== CAMBIO DE ESTADO EXITOSO =====');
          console.log(`📦 Pedido ${selectedOrderForUpdate.id} actualizado correctamente`);
          console.log(`🔄 Estado: ${selectedOrderForUpdate.status} → ${newStatus}`);
          if (newStatus === 'reagendado') {
            console.log(`📤 Enviado al backend como: REAGENDO`);
            console.log(`📅 Fecha de reagendación: ${reagendadoDate ? reagendadoDate.toISOString().split('T')[0] : 'No especificada'}`);
            console.log(`🔄 Reagendado como cambio: ${isReagendadoAsChange ? 'Sí' : 'No'}`);
          }
          console.log('🎉 ======================================');
        }
      } catch (webhookError) {
        console.error('❌ Error al llamar al webhook:', webhookError);
        throw webhookError; // Re-lanzar el error para que se maneje en el catch principal
      }
      
      // Solo continuar si el webhook fue exitoso
      await loadRouteData();
      
      // Mostrar modal de éxito
      const statusLabels = {
        'entregado': 'Entregado',
        'en_ruta': 'En Ruta',
        'devolucion': 'Devolución',
        'reagendado': 'Reagendado'
      };
      
      setSuccessMessage(`El pedido ${selectedOrderForUpdate.id} fue actualizado a ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus} con éxito`);
      setIsSuccessModalOpen(true);
      setCountdown(3);
      
      setIsUpdateStatusModalOpen(false);
      setSelectedOrderForUpdate(null);
      resetModalState();
    } catch (error) {
      console.error('Error updating order status:', error);
      setErrorMessage(`Error al actualizar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleOpenNotes = (order: Order) => {
    setSelectedOrderForNotes(order);
    setIsNotesModalOpen(true);
  };

  const handleCloseNotes = () => {
    setIsNotesModalOpen(false);
    setSelectedOrderForNotes(null);
    setNewNote('');
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrderForDetails(null);
    setNewDetailNote('');
  };

  const handleAddDetailNote = async () => {
    if (!selectedOrderForDetails || !newDetailNote.trim()) return;
    
    try {
      setIsAddingDetailNote(true);
      
      // Simular la adición de nota (en una implementación real, esto sería una llamada a la API)
      console.log('Añadiendo nota al pedido:', selectedOrderForDetails.id, 'Nota:', newDetailNote);
      
      // Aquí iría la lógica para enviar la nota al backend
      // await addNoteToOrder(selectedOrderForDetails.id, newDetailNote);
      
      // Actualizar el estado local (añadir a notas generales)
      setSelectedOrderForDetails(prev => prev ? {
        ...prev,
        notes: prev.notes ? `${prev.notes}\n\n${new Date().toLocaleString('es-CR')}: ${newDetailNote}` : `${new Date().toLocaleString('es-CR')}: ${newDetailNote}`
      } : null);
      
      setNewDetailNote('');
      
      // Mostrar mensaje de éxito
      setSuccessMessage('Nota añadida exitosamente');
      setIsSuccessModalOpen(true);
      
    } catch (error) {
      console.error('Error adding note:', error);
      setErrorMessage('Error al añadir la nota. Por favor, inténtalo de nuevo.');
    } finally {
      setIsAddingDetailNote(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedOrderForNotes || !newNote.trim()) return;
    
    try {
      const timestamp = new Date().toLocaleString('es-CR');
      const noteWithTimestamp = `[${timestamp}] ${newNote.trim()}`;
      
      // Aquí podrías hacer una llamada a la API para actualizar las notas
      // Por ahora solo actualizamos el estado local
      console.log('Agregando nota:', noteWithTimestamp);
      
      setNewNote('');
      handleCloseNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'evidence') => {
    const files = event.target.files;
    if (!files) return;

    if (type === 'receipt') {
      // Manejar múltiples comprobantes
      const newReceipts: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newReceipts.push(result);
          if (newReceipts.length === files.length) {
            setUploadedReceipts(prev => [...prev, ...newReceipts]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      // Manejar evidencia (solo una)
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedEvidence(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDualPaymentFileUpload = (event: React.ChangeEvent<HTMLInputElement>, paymentNumber: 'first' | 'second') => {
    const file = event.target.files?.[0];
    if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
      const result = e.target?.result as string;
      if (paymentNumber === 'first') {
        setFirstPaymentReceipt(result);
      } else {
        setSecondPaymentReceipt(result);
      }
      };
      reader.readAsDataURL(file);
  };

  const resetModalState = () => {
    setNewStatus('en_ruta');
    setStatusComment('');
    setPaymentMethod('');
      setUploadedReceipts([]);
      setUploadedEvidence(null);
    setIsUploading(false);
    setIsDualPayment(false);
    setFirstPaymentMethod('efectivo'); // Resetear a efectivo
    setFirstPaymentAmount('');
    setSecondPaymentMethod(''); // Resetear a vacío
    setSecondPaymentAmount('');
    setFirstPaymentReceipt(null);
    setSecondPaymentReceipt(null);
    setIsReagendadoAsChange(false);
    setReagendadoDate(undefined);
    setIsReagendadoDatePickerOpen(false);
    setErrorMessage('');
  };

  const handleOpenTimeline = (order: Order) => {
    setSelectedOrderForTimeline(order);
    setIsTimelineModalOpen(true);
  };

  const handleCloseTimeline = () => {
    setIsTimelineModalOpen(false);
    setSelectedOrderForTimeline(null);
  };

  const addStatusChange = (orderId: string, fromStatus: string, toStatus: string, comment?: string, paymentMethod?: string, receipt?: string, evidence?: string) => {
    const newChange: StatusChange = {
      id: `change-${Date.now()}`,
      orderId,
      fromStatus,
      toStatus,
      changedBy: user?.id || 'unknown',
      changedByName: user?.name || 'Usuario',
      timestamp: new Date().toISOString(),
      comment,
      paymentMethod,
      receipt,
      evidence
    };
    
    setStatusChanges(prev => [newChange, ...prev]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'en_ruta': return '🚚';
      case 'entregado': return '✅';
      case 'devolucion': return '❌';
      case 'reagendado': return '📅';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'text-blue-600 bg-blue-50';
      case 'entregado': return 'text-green-600 bg-green-50';
      case 'devolucion': return 'text-red-600 bg-red-50';
      case 'reagendado': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };


  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'bg-blue-500';
      case 'entregado': return 'bg-green-500';
      case 'devolucion': return 'bg-red-500';
      case 'reagendado': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusRowColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'bg-blue-50/30 border-l-4 border-l-blue-400';
      case 'entregado': return 'bg-green-50/30 border-l-4 border-l-green-400';
      case 'devolucion': return 'bg-red-50/30 border-l-4 border-l-red-400';
      case 'reagendado': return 'bg-orange-50/30 border-l-4 border-l-orange-400';
      default: return 'bg-gray-50/30 border-l-4 border-l-gray-400';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'border-blue-400';
      case 'entregado': return 'border-green-400';
      case 'devolucion': return 'border-red-400';
      case 'reagendado': return 'border-orange-400';
      default: return 'border-gray-400';
    }
  };

  const getStatusStickyStyle = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'border-l-8 border-l-blue-500 bg-blue-100/90 shadow-xl';
      case 'entregado': return 'border-l-8 border-l-green-500 bg-green-100/90 shadow-xl';
      case 'devolucion': return 'border-l-8 border-l-red-500 bg-red-100/90 shadow-xl';
      case 'reagendado': return 'border-l-8 border-l-orange-500 bg-orange-100/90 shadow-xl';
      default: return 'border-l-8 border-l-gray-500 bg-gray-100/90 shadow-xl';
    }
  };

  // Funciones helper para obtener pedidos filtrados
  const getCompletedOrders = () => routeData.orders.filter(order => order.status === 'entregado');
  const getRescheduledOrders = () => routeData.orders.filter(order => order.status === 'reagendado');
  const getReturnOrders = () => routeData.orders.filter(order => order.status === 'devolucion');
  const getCashOrders = () => routeData.orders.filter(order => order.status === 'entregado' && order.paymentMethod === 'efectivo');
  const getSinpeOrders = () => routeData.orders.filter(order => 
    order.status.toLowerCase() === 'entregado' && 
    order.paymentMethod === 'sinpe'
  );
  const getTarjetaOrders = () => routeData.orders.filter(order => 
    order.status.toLowerCase() === 'entregado' && 
    order.paymentMethod === 'tarjeta'
  );
  const getDosPagosOrders = () => routeData.orders.filter(order => 
    order.status.toLowerCase() === 'entregado' && 
    order.paymentMethod === '2pagos'
  );

  const getDevolverOrders = () => routeData.orders.filter(order => 
    order.status.toLowerCase() === 'pendiente' || 
    order.status.toLowerCase() === 'reagendado' || 
    order.status.toLowerCase() === 'devolucion'
  );

  // Funciones para datos de gráficos
  const getPaymentMethodData = () => {
    const completedOrders = getCompletedOrders();
    const paymentMethods = completedOrders.reduce((acc, order) => {
      const method = order.paymentMethod || 'otro';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(paymentMethods).map(([method, count]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: count,
      amount: completedOrders
        .filter(order => (order.paymentMethod || 'otro') === method)
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    }));
  };

  const getStatusComparisonData = () => {
    const statusCounts = {
      'entregado': getCompletedOrders().length,
      'reagendado': getRescheduledOrders().length,
      'devolucion': getReturnOrders().length,
      'en_ruta': routeData.orders.filter(order => order.status === 'en_ruta').length,
      'pendiente': routeData.orders.filter(order => order.status === 'pendiente').length
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count,
      color: getStatusColor(status)
    }));
  };



  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Función para copiar al portapapeles
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${type} copiado:`, text);
    } catch (err) {
      console.error('Error al copiar:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log(`${type} copiado (fallback):`, text);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTodayInfo = () => {
    const today = new Date();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return {
      dayName: dayNames[today.getDay()],
      day: today.getDate(),
      month: monthNames[today.getMonth()],
      year: today.getFullYear(),
      fullDate: today.toLocaleDateString('es-CR')
    };
  };

  // Función para obtener información de la fecha seleccionada
  const getSelectedDateInfo = () => {
    const targetDate = selectedDate || new Date();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const isToday = targetDate.toDateString() === new Date().toDateString();
    const isDifferentDate = selectedDate && !isToday;
    
    return {
      dayName: dayNames[targetDate.getDay()],
      day: targetDate.getDate(),
      month: monthNames[targetDate.getMonth()],
      year: targetDate.getFullYear(),
      fullDate: targetDate.toLocaleDateString('es-CR'),
      isToday,
      isDifferentDate,
      dateString: targetDate.toISOString().split('T')[0]
    };
  };


  // Filtrar y buscar pedidos
  const filteredOrders = routeData.orders
    .filter(order => {
      // Filtro por estado
      const statusMatch = activeFilter === 'todos' || 
        (activeFilter === 'en_ruta' && order.status === 'en_ruta') ||
        (activeFilter === 'completados' && order.status === 'entregado') ||
        (activeFilter === 'reagendados' && order.status === 'reagendado') ||
        (activeFilter === 'devoluciones' && order.status === 'devolucion');
      
      // Búsqueda por texto
      const searchMatch = searchTerm === '' || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      // Ordenar por número de ruta (routeOrder) - menor número primero
      const routeOrderA = a.routeOrder || 999;
      const routeOrderB = b.routeOrder || 999;
      
      return routeOrderA - routeOrderB;
    });

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'en_ruta': return routeData.orders.filter(o => o.status === 'en_ruta').length;
      case 'completados': return routeData.orders.filter(o => o.status === 'entregado').length;
      case 'reagendados': return routeData.orders.filter(o => o.status === 'reagendado').length;
      case 'devoluciones': return routeData.orders.filter(o => o.status === 'devolucion').length;
      default: return routeData.orders.length;
    }
  };

  const getExpenseIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'combustible': return <Fuel className="w-4 h-4" />;
      case 'mantenimiento': return <Wrench className="w-4 h-4" />;
      case 'peaje': return <Car className="w-4 h-4" />;
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'peaje': return <Car className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getExpenseColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'combustible': return 'bg-blue-100 text-blue-600';
      case 'mantenimiento': return 'bg-orange-100 text-orange-600';
      case 'peaje': return 'bg-purple-100 text-purple-600';
      case 'fuel': return 'bg-blue-100 text-blue-600';
      case 'maintenance': return 'bg-orange-100 text-orange-600';
      case 'peaje': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
        {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 rounded-xl shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full shadow-inner">
              <Route className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Mi Ruta de Hoy</h1>
              <div className="flex items-center gap-2 text-lg opacity-90">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">
                  {selectedDate ? 
                    selectedDate.toLocaleDateString('es-CR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    }) : 
                    getSelectedDateInfo().dayName + ' ' + getSelectedDateInfo().day + ' de ' + getSelectedDateInfo().month
                  }
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {selectedDate ? selectedDate.toLocaleDateString('es-CR') : getSelectedDateInfo().fullDate}
              </Badge>
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span className="text-sm font-medium">Estado actual</span>
              </div>
              <Badge className="bg-green-500 hover:bg-green-600">
                En Ruta
              </Badge>
            </div>
            <p className="text-xs opacity-75 mt-1">
              {routeData.totalOrders} pedidos del día • {routeData.completedOrders} completados
            </p>
          </div>
        </div>
        </div>

      {/* Sistema de Pestañas */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pedidos' | 'contabilidad')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="pedidos" 
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeTab === 'pedidos' 
                ? 'bg-white text-blue-600 shadow-sm font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Pedidos de Hoy
            <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">
              {routeData.orders.length}
            </Badge>
            </TabsTrigger>
          <TabsTrigger 
            value="contabilidad" 
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeTab === 'contabilidad' 
                ? 'bg-white text-green-600 shadow-sm font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Contabilidad
            <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 px-2 py-0.5 text-xs">
              {formatCurrency(accountingMetrics.totalCash + accountingMetrics.totalSinpe + accountingMetrics.totalTarjeta)}
            </Badge>
            </TabsTrigger>
          </TabsList>

        {/* Pestaña de Pedidos de Hoy */}
        <TabsContent value="pedidos" className="space-y-6 mt-6">
          {/* Filtros y Búsqueda */}
          <Card>
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                <Filter className="w-5 h-5" />
                Filtros y Búsqueda
              </CardTitle>
              <div className="text-sm text-blue-600 mt-1">
                <span className="font-medium">{user?.name}</span> • {getSelectedDateInfo().dayName} {getSelectedDateInfo().day} de {getSelectedDateInfo().month}
                  </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Barra de búsqueda mejorada */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4" />
                <Input
                  placeholder="Buscar por ID, cliente o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                />
                </div>
              
              {/* Filtros con mejor diseño */}
              <div className="space-y-3">
                {/* Todos - Ocupa las dos columnas */}
                <Button
                  variant={activeFilter === 'todos' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('todos')}
                  className={`justify-start gap-2 h-12 w-full ${
                    activeFilter === 'todos' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                      : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Todos</span>
                    <span className="text-xs opacity-75">({getFilterCount('todos')})</span>
                  </div>
                </Button>
                
                {/* En Ruta y Completados - Primera fila de dos columnas */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activeFilter === 'en_ruta' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('en_ruta')}
                    className={`justify-start gap-2 h-12 ${
                      activeFilter === 'en_ruta' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">En Ruta</span>
                      <span className="text-xs opacity-75">({getFilterCount('en_ruta')})</span>
                </div>
                  </Button>
                  <Button
                    variant={activeFilter === 'completados' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('completados')}
                    className={`justify-start gap-2 h-12 ${
                      activeFilter === 'completados' 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                        : 'border-green-200 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Completados</span>
                      <span className="text-xs opacity-75">({getFilterCount('completados')})</span>
                  </div>
                  </Button>
                </div>
                
                {/* Reagendados y Devoluciones - Segunda fila de dos columnas */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activeFilter === 'reagendados' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('reagendados')}
                    className={`justify-start gap-2 h-12 ${
                      activeFilter === 'reagendados' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md' 
                        : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Reagendados</span>
                      <span className="text-xs opacity-75">({getFilterCount('reagendados')})</span>
                  </div>
                  </Button>
                  <Button
                    variant={activeFilter === 'devoluciones' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('devoluciones')}
                    className={`justify-start gap-2 h-12 ${
                      activeFilter === 'devoluciones' 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' 
                        : 'border-red-200 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Devoluciones</span>
                      <span className="text-xs opacity-75">({getFilterCount('devoluciones')})</span>
                </div>
                  </Button>
                </div>
            </div>

              {/* Filtros de fecha rápida */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {/* Selector de fecha específica */}
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          selectedDate.toLocaleDateString('es-CR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setDateFilter('all');
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Resumen de resultados */}
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Mostrando <span className="font-semibold text-gray-800">{filteredOrders.length}</span> de <span className="font-semibold text-gray-800">{routeData.orders.length}</span> pedidos
                  </span>
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-700 h-6 px-2"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                
                        </div>
            </CardContent>
          </Card>


          {/* Pedidos del Día */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
                        <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Pedidos del Día
              </CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{user?.name}</span> • {getSelectedDateInfo().dayName} {getSelectedDateInfo().day} de {getSelectedDateInfo().month}
                        </div>
                      </div>
            {isLiquidationCompleted && (
              <div className="flex items-center gap-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 animate-pulse" />
                <div className="text-right">
                  <div className="text-sm font-bold text-green-800">LIQUIDACIÓN COMPLETADA</div>
                  <div className="text-xs text-green-600">Solo lectura</div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                {searchTerm ? 'No se encontraron pedidos con ese criterio' : 'No hay pedidos asignados para hoy'}
              </p>
              {searchTerm && (
                          <Button
                            variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                          >
                  Limpiar búsqueda
                          </Button>
                        )}
                      </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <div className="mb-1 text-xs text-gray-500 text-center">
                💡 Haz clic en cualquier fila para fijar la columna ID y verla siempre visible
                    </div>
              <Table className="min-w-[1000px] text-[10px]">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 h-4">
                    <TableHead className="min-w-[100px] px-1 py-0.5">
                      <div className="flex items-center gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                        <span className="font-bold text-gray-800 text-[10px]">ID y Cliente</span>
                  </div>
                    </TableHead>
                    <TableHead className="min-w-[80px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Contacto</TableHead>
                    <TableHead className="min-w-[150px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Dirección</TableHead>
                    <TableHead className="min-w-[120px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Productos</TableHead>
                    <TableHead className="min-w-[60px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Fecha Creación</TableHead>
                    <TableHead className="min-w-[60px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Fecha Entrega</TableHead>
                    <TableHead className="min-w-[70px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Acciones</TableHead>
                    <TableHead className="min-w-[60px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Pago</TableHead>
                    <TableHead className="min-w-[60px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Estado</TableHead>
                    <TableHead className="min-w-[80px] px-1 py-0.5 font-bold text-gray-800 text-[10px]">Notas Asesor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order, index) => (
                    <TableRow 
                      key={order.id} 
                      className={`hover:bg-gray-50 ${getStatusRowColor(order.status)} cursor-pointer transition-all duration-200 h-5 ${
                        selectedRowId === order.id 
                          ? 'ring-1 ring-blue-500 ring-opacity-50 bg-blue-50/20 shadow-sm' 
                          : ''
                      }`}
                      onClick={() => setSelectedRowId(selectedRowId === order.id ? null : order.id)}
                    >
                      <TableCell className={`font-medium px-1 py-0.5 ${
                        selectedRowId === order.id 
                          ? `sticky left-0 z-30 border-r border-gray-300 ${getStatusStickyStyle(order.status)}` 
                          : ''
                      }`}>
                        <div className="flex items-center gap-0.5">
                          <div className={`w-1 h-1 rounded-full ${getStatusIndicatorColor(order.status)} shadow-sm border border-white ${
                            selectedRowId === order.id ? 'ring-1 ring-white ring-opacity-50' : ''
                          }`} />
                          <div className="flex flex-col space-y-0">
                            <span className="font-mono text-[10px] font-bold text-gray-900">{order.id}</span>
                            <span className="text-[9px] text-gray-500 font-medium">Pedido</span>
                            <div className="font-medium text-gray-800 text-[9px]">{order.customerName}</div>
                </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className="text-[9px] font-medium text-gray-700">{order.customerPhone}</span>
                            {order.customerPhone && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(order.customerPhone!, 'Número de teléfono')}
                                className="h-3 w-3 p-0 bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                                title="Copiar número de teléfono"
                              >
                                <Clipboard className="w-1.5 h-1.5" />
                              </Button>
                            )}
                </div>

                          {/* Botones de contacto */}
                          <div className="flex gap-0.5">
                      <Button
                        size="sm"
                              variant="outline"
                              onClick={() => order.customerPhone && window.open(`tel:${order.customerPhone}`)}
                              className="h-3 px-1 text-[8px] bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                              disabled={!order.customerPhone}
                              title="Llamar"
                            >
                              <Phone className="w-1.5 h-1.5 mr-0.5" />
                              Llamar
                      </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (order.customerPhone) {
                                  const messengerName = user?.name || 'Mensajero';
                                  const tiendaName = order.tienda || 'ALL STARS';
                                  const products = order.productos || 'Productos no especificados';
                                  const orderNumber = order.routeOrder ? `#${order.routeOrder}` : order.id;
                                  
                                  const message = `Buen día *${order.customerName}* 📍 Soy el mensajero que va entregar tu pedido de *${products}* de la tienda *${tiendaName}* Y me dirijo a la dirección *${order.customerAddress}* en *${order.customerCanton}* en el distrito *${order.customerDistrict}* en la provincia *${order.customerProvince}* 📍. Por favor confirmame que te encuentras ahí.`;

                                  // Limpiar el número de teléfono para WhatsApp
                                  let cleanPhone = order.customerPhone;
                                  // Remover +506 o 506 del inicio si está presente
                                  cleanPhone = cleanPhone.replace(/^(\+506|506)/, '');
                                  // Asegurar que el número tenga el formato correcto para WhatsApp
                                  const whatsappPhone = `506${cleanPhone}`;
                                  const encodedMessage = encodeURIComponent(message);
                                  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
                                  window.open(whatsappUrl);
                                }
                              }}
                              className="h-3 px-1 text-[8px] bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700"
                              disabled={!order.customerPhone}
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-1.5 h-1.5 mr-0.5" />
                              WhatsApp
                            </Button>
                </div>
              </div>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="space-y-0.5">
                          {/* Dirección principal */}
                          <div className="space-y-0">
                            <div className="text-[9px] font-medium text-gray-900">
                              {order.customerAddress || 'Dirección no especificada'}
                            </div>
                            <div className="text-[8px] text-gray-600">
                              <span className="font-medium">Prov:</span> {order.customerProvince || 'No especificada'}
                            </div>
                            <div className="text-[8px] text-gray-600">
                              <span className="font-medium">Cantón:</span> {order.customerCanton || 'No especificado'}
                            </div>
                            <div className="text-[8px] text-gray-600">
                              <span className="font-medium">Dist:</span> {order.customerDistrict || 'No especificado'}
                            </div>
              </div>
              
                          {/* Botón de Maps */}
                          {order.customerLocationLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(order.customerLocationLink, '_blank');
                              }}
                              className="h-3 px-1 text-[8px] bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                              title="Abrir en Maps"
                            >
                              <Navigation className="w-1.5 h-1.5 mr-0.5" />
                              Maps
                            </Button>
                          )}
                        </div>
                        </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="max-w-[120px] space-y-0.5">
                          {/* Tienda */}
                          <div className="flex items-center gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                            <span className="text-[8px] font-bold text-purple-700 bg-purple-100 px-0.5 py-0 rounded border border-purple-200">
                              {order.tienda || 'ALL STARS'}
                            </span>
                          </div>
                          {/* Productos */}
                          <div className="text-[8px] text-gray-700 leading-tight" title={order.productos || 'No especificados'}>
                            {order.productos || 'No especificados'}
                          </div>
                          {/* Monto */}
                          <div className="flex items-center gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-green-500"></div>
                            <span className="text-[8px] font-bold text-green-700">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                          {/* Número SINPE */}
                          {order.numero_sinpe && (
                            <div className="flex items-center gap-0.5">
                              <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                              <span className="text-[8px] text-blue-700 font-mono bg-blue-50 px-0.5 py-0 rounded border border-blue-200">
                                SINPE: {order.numero_sinpe}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(order.numero_sinpe!, 'Número SINPE')}
                                className="h-3 w-3 p-0 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                                title="Copiar número SINPE"
                              >
                                <Clipboard className="w-1.5 h-1.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="space-y-0">
                          <div className="text-[8px] text-gray-500 font-medium">Creación</div>
                          <div className="text-[8px] font-semibold text-gray-800">
                            {order.createdAt ? (() => {
                              // Si es una fecha ISO (2025-09-30T00:00:00.000Z), extraer solo la parte de la fecha
                              if (order.createdAt.includes('T')) {
                                const datePart = order.createdAt.split('T')[0]; // Obtener solo YYYY-MM-DD
                                const parts = datePart.split('-');
                                if (parts.length === 3) {
                                  const year = parts[0];
                                  const month = parts[1];
                                  const day = parts[2];
                                  return `${day}/${month}/${year}`;
                                }
                              }
                              // Fallback
                              return new Date(order.createdAt).toLocaleDateString('es-CR', {
                            day: '2-digit', 
                            month: '2-digit', 
                                year: 'numeric'
                              });
                            })() : 'N/A'}
                          </div>
                          </div>
                        </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="space-y-0">
                          <div className="text-[8px] text-gray-500 font-medium">Entrega</div>
                          <div className="text-[8px] font-semibold text-gray-800">
                            {order.updatedAt ? (() => {
                              // Si es una fecha ISO (2025-09-30T00:00:00.000Z), extraer solo la parte de la fecha
                              if (order.updatedAt.includes('T')) {
                                const datePart = order.updatedAt.split('T')[0]; // Obtener solo YYYY-MM-DD
                                const parts = datePart.split('-');
                                if (parts.length === 3) {
                                  const year = parts[0];
                                  const month = parts[1];
                                  const day = parts[2];
                                  return `${day}/${month}/${year}`;
                                }
                              }
                              // Fallback
                              return new Date(order.updatedAt).toLocaleDateString('es-CR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                            })() : 'N/A'}
                            </div>
                        </div>
                        </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(order);
                            }}
                            className="h-7 w-7 p-0 bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700 hover:scale-105 transition-transform"
                            title="Ver Detalles"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderForUpdate(order);
                              setNewStatus('en_ruta');
                              setPaymentMethod(order.paymentMethod || 'efectivo');
                              setIsUpdateStatusModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 hover:scale-105 transition-transform"
                            disabled={updatingOrder === order.id || isLiquidationCompleted}
                            title={isLiquidationCompleted ? "Liquidación completada - No se puede editar" : "Actualizar Estado"}
                          >
                            {updatingOrder === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Edit3 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <Badge 
                          variant="outline" 
                          className={`text-[8px] ${
                            order.paymentMethod === 'efectivo' ? 'bg-green-50 text-green-700 border-green-200' :
                            order.paymentMethod === 'sinpe' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            order.paymentMethod === 'tarjeta' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            order.paymentMethod === '2pagos' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {order.paymentMethod === '2pagos' ? (
                            <div className="flex items-center gap-0.5">
                              <span>💰</span>
                              <span>💰</span>
                              <span className="ml-0.5">2 Pagos</span>
                            </div>
                          ) : (
                            order.metodoPagoOriginal || 'No especificado'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="flex items-center justify-center">
                          <Badge 
                            variant="outline"
                            className={`text-[8px] font-semibold px-1 py-0.5 rounded shadow-sm ${
                              order.status === 'entregado' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                              order.status === 'en_ruta' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                              order.status === 'devolucion' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                              order.status === 'reagendado' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' :
                              'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-0.5">
                              <span className="text-[8px]">
                                {order.status === 'entregado' ? '✅' :
                                 order.status === 'en_ruta' ? '🚚' :
                                 order.status === 'devolucion' ? '❌' :
                                 order.status === 'reagendado' ? '📅' :
                                 '📝'}
                              </span>
                              <span>
                                {order.status === 'entregado' ? 'Entregado' :
                                 order.status === 'en_ruta' ? 'En Ruta' :
                                 order.status === 'devolucion' ? 'Devolución' :
                                 order.status === 'reagendado' ? 'Reagendado' :
                                 'Pendiente'}
                              </span>
                            </div>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <div className="max-w-[80px]">
                          {order.asesorNotes ? (
                            <div className="space-y-0.5">
                              <div className="text-[8px] text-orange-600 font-medium bg-orange-50 px-0.5 py-0 rounded border border-orange-200">
                                Notas Asesor
                              </div>
                              <div className="text-[8px] text-gray-700 bg-orange-50 p-0.5 rounded border border-orange-200">
                                {order.asesorNotes}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[8px] text-gray-500 italic">
                              Sin notas
                            </div>
                          )}
                        </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
          </CardContent>
            </Card>
          </TabsContent>

        {/* Pestaña de Contabilidad */}
        <TabsContent value="contabilidad" className="space-y-6 mt-6">
          {/* Bento Grid de Contabilidad - Optimizado para Móvil */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Completados */}
            <Card 
              className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsCompletedModalOpen(true)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                    <span className="text-xs font-medium text-green-700">Completados</span>
                  </div>
                  <p className="text-lg font-bold text-green-800">{routeData.completedOrders}</p>
                  <p className="text-xs text-green-600">Entregados</p>
                </div>
              </CardContent>
              </Card>

            {/* Ingresos */}
            <Card 
              className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsRevenueModalOpen(true)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <DollarSign className="w-4 h-4 text-white" />
                  </div>
                    <span className="text-xs font-medium text-blue-700">Ingresos</span>
                  </div>
                  <p className="text-sm font-bold text-blue-800">{formatCurrency(routeData.totalRevenue)}</p>
                  <p className="text-xs text-blue-600">Total del día</p>
                </div>
              </CardContent>
              </Card>

            {/* Total Efectivo */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsCashModalOpen(true)}>
              <CardContent className="p-3">
                <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <Banknote className="w-4 h-4 text-white" />
                  </div>
                    <span className="text-xs font-medium text-green-700">Efectivo</span>
                  </div>
                  <p className="text-sm font-bold text-green-800">{formatCurrency(accountingMetrics.totalCash)}</p>
                  <p className="text-xs text-green-600">{getCashOrders().length} pedidos</p>
                </div>
              </CardContent>
            </Card>

            {/* Total SINPE */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsSinpeModalOpen(true)}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-blue-700">SINPE</span>
                  </div>
                  <p className="text-sm font-bold text-blue-800">{formatCurrency(accountingMetrics.totalSinpe)}</p>
                  <p className="text-xs text-blue-600">{getSinpeOrders().length} pedidos</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Tarjeta */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsTarjetaModalOpen(true)}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500 rounded-lg">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-purple-700">Tarjeta</span>
                  </div>
                  <p className="text-sm font-bold text-purple-800">{formatCurrency(accountingMetrics.totalTarjeta)}</p>
                  <p className="text-xs text-purple-600">{getTarjetaOrders().length} pedidos</p>
                </div>
              </CardContent>
            </Card>

            {/* Total 2 Pagos */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsDosPagosModalOpen(true)}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <Receipt className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-orange-700">2 Pagos</span>
                  </div>
                  <p className="text-sm font-bold text-orange-800">{formatCurrency(accountingMetrics.totalDosPagos)}</p>
                  <p className="text-xs text-orange-600">{getDosPagosOrders().length} pedidos</p>
                  <div className="text-xs text-orange-500">
                    {(() => {
                      const dosPagosEfectivo = getDosPagosOrders().reduce((sum, order) => 
                        sum + parseFloat(order.efectivo_2_pagos || '0'), 0);
                      const dosPagosSinpe = getDosPagosOrders().reduce((sum, order) => 
                        sum + parseFloat(order.sinpe_2_pagos || '0'), 0);
                      return `Ef: ${formatCurrency(dosPagosEfectivo)} | S: ${formatCurrency(dosPagosSinpe)}`;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total a Entregar */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200 cursor-pointer group col-span-2"
              onClick={() => setIsTotalEntregarModalOpen(true)}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Calculator className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-purple-700">Total a Entregar</span>
                      <p className="text-xs text-purple-600">Efectivo - Gastos</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-800">
                    {formatCurrency(accountingMetrics.totalCash - (getCurrentMessengerExpenses().total || 0))}
                  </p>
                  <div className="text-xs text-purple-500">
                    Efectivo: {formatCurrency(accountingMetrics.totalCash)} - Gastos: {formatCurrency(getCurrentMessengerExpenses().total || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Recaudado */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500 rounded-lg">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-purple-700">Total Recaudado</span>
                  </div>
                  <p className="text-sm font-bold text-purple-800">
                    {formatCurrency(accountingMetrics.totalCash + accountingMetrics.totalSinpe + accountingMetrics.totalTarjeta)}
                  </p>
                  <p className="text-xs text-purple-600">Efectivo + SINPE + Tarjeta</p>
                  </div>
              </CardContent>
            </Card>

            {/* Devoluciones */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsReturnsModalOpen(true)}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-500 rounded-lg">
                      <RotateCcw className="w-4 h-4 text-white" />
                </div>
                    <span className="text-xs font-medium text-red-700">Devoluciones</span>
                  </div>
                  <p className="text-lg font-bold text-red-800">{getReturnOrders().length}</p>
                  <p className="text-xs text-red-600">Para devolver</p>
                </div>
              </CardContent>
              </Card>

            {/* Reagendados */}
            <Card 
              className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setIsRescheduledModalOpen(true)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <Calendar className="w-4 h-4 text-white" />
                  </div>
                    <span className="text-xs font-medium text-orange-700">Reagendados</span>
                  </div>
                  <p className="text-lg font-bold text-orange-800">{getRescheduledOrders().length}</p>
                  <p className="text-xs text-orange-600">Pendientes</p>
                </div>
              </CardContent>
            </Card>

            </div>

          {/* Botón de Productos para Devolver - En Contabilidad */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setIsDevolverModalOpen(true)}
              variant="outline"
              size="lg"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 px-8 py-3"
            >
              <Package className="w-5 h-5 mr-3" />
              Productos para Devolver ({getDevolverOrders().length})
            </Button>
          </div>

          {/* Gastos del Día - Ocupa 2 columnas */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-orange-600" />
                      Gastos del Día
                    </CardTitle>
                    <div className="text-sm text-orange-600 mt-1">
                      <span className="font-medium">{user?.name}</span> • {getSelectedDateInfo().dayName} {getSelectedDateInfo().day} de {getSelectedDateInfo().month}
                      {getSelectedDateInfo().isDifferentDate && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-normal break-words">
                          Fecha seleccionada
                        </span>
                      )}
                      {isAddingExpense && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          Cargando gastos...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Agregar Gasto</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="type">Tipo de Gasto</Label>
                            <select
                              id="type"
                              value={newExpense.type}
                              onChange={(e) => setNewExpense(prev => ({ ...prev, type: e.target.value as 'fuel' | 'maintenance' | 'peaje' | 'other', customType: '' }))}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="fuel">Combustible</option>
                              <option value="maintenance">Mantenimiento</option>
                              <option value="peaje">Peaje</option>
                              <option value="other">Otro</option>
                            </select>
                          </div>

                          {newExpense.type === 'other' && (
                            <div>
                              <Label htmlFor="customType">Especificar Tipo de Gasto *</Label>
                              <Input
                                id="customType"
                                placeholder="Ej: Peaje, Estacionamiento, Herramientas..."
                                value={newExpense.customType}
                                onChange={(e) => setNewExpense(prev => ({ ...prev, customType: e.target.value }))}
                                className="w-full"
                              />
                            </div>
                          )}
                          <div>
                            <Label htmlFor="amount">Monto</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0"
                              value={newExpense.amount}
                              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                            />
                          </div>
                          {/* Badge informativo */}
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-amber-800">
                                <p className="font-medium">⚠️ Cuidado con los gastos añadidos</p>
                                <p className="text-xs mt-1">Los gastos no pueden ser eliminados del reporte de liquidación del día una vez añadidos.</p>
                              </div>
                            </div>
                          </div>
                        
                          <div>
                            <Label>Comprobante del Gasto *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                              {uploadedReceiptImage ? (
                                <div className="space-y-3">
                                  <img
                                    src={uploadedReceiptImage}
                                    alt="Comprobante"
                                    className="max-w-full h-32 object-contain mx-auto rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setUploadedReceiptImage(null);
                                      setNewExpense(prev => ({ ...prev, receipt: null }));
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Eliminar
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <Camera className="w-8 h-8 mx-auto text-gray-400" />
                                  <p className="text-sm text-gray-600">Toca para seleccionar comprobante</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="receipt-upload"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('receipt-upload')?.click()}
                                  >
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Seleccionar Imagen
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsExpenseModalOpen(false);
                                setUploadedReceiptImage(null);
                                setNewExpense({
                                  type: 'fuel',
                                  amount: '',
                                  receipt: null,
                                  customType: ''
                                });
                              }}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleAddExpense}
                              disabled={
                                !newExpense.amount || 
                                !newExpense.receipt || 
                                isAddingExpense ||
                                (newExpense.type === 'other' && !newExpense.customType.trim())
                              }
                              className="flex-1 bg-orange-600 hover:bg-orange-700"
                            >
                              {isAddingExpense ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Agregar'
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const gastos = getCurrentMessengerExpenses().lista;
                  
                  if (gastos.length === 0) {
                    return (
                      <div className="text-center py-4 text-gray-500">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay gastos registrados</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {gastos.map((gasto) => (
                        <div key={gasto.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${getExpenseColor(gasto.tipo_gasto)}`}>
                                {getExpenseIcon(gasto.tipo_gasto)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{gasto.tipo_gasto}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(gasto.fecha).toLocaleTimeString('es-CR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-orange-600">{formatCurrency(gasto.monto)}</p>
                          </div>
                          {gasto.comprobante_link && (
                            <div className="mt-2">
                              <a 
                                href={gasto.comprobante_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Ver comprobante
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Resumen Financiero del Día - Incluye gastos */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-800">
                <DollarSign className="w-5 h-5" />
                Resumen Financiero del Día
              </CardTitle>
              <div className="text-sm text-indigo-600">
                <span className="font-medium">{user?.name}</span> • {getSelectedDateInfo().dayName} {getSelectedDateInfo().day} de {getSelectedDateInfo().month}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Ingresos por Efectivo */}
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Efectivo</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(accountingMetrics.totalCash)}
                  </p>
                  <p className="text-xs text-green-600">
                    {getCashOrders().length} pedidos
                  </p>
                </div>

                {/* Ingresos por SINPE */}
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">SINPE</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(accountingMetrics.totalSinpe)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {getSinpeOrders().length} pedidos
                  </p>
                </div>

                {/* Gastos del Día */}
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Gastos</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(getCurrentMessengerExpenses().total || 0)}
                  </p>
                  <p className="text-xs text-orange-600">
                    {getCurrentMessengerExpenses().lista.length} gastos
                  </p>
                </div>

                {/* Total General con Gastos */}
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Total Neto</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency((accountingMetrics.totalCash + accountingMetrics.totalSinpe + accountingMetrics.totalTarjeta) - routeData.totalExpenses)}
                  </p>
                  <p className="text-xs text-purple-600">
                    Ingresos - Gastos
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Ingresos: {formatCurrency(accountingMetrics.totalCash + accountingMetrics.totalSinpe + accountingMetrics.totalTarjeta)}</p>
                    <p>Gastos: {formatCurrency(routeData.totalExpenses)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          </TabsContent>
        </Tabs>

      {/* Modal para subir comprobante */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
            <DialogTitle>Subir Comprobante</DialogTitle>
            </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Pedido: {selectedOrder.id}</p>
                <p className="text-sm text-gray-600">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-600">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              
              <div className="space-y-3">
                <Label>Tipo de Comprobante</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="payment">Comprobante de Pago</option>
                  <option value="sinpe">Comprobante SINPE</option>
                  <option value="reschedule">Comprobante de Reagendado</option>
                </select>
              </div>

              <div className="space-y-3">
                <Label>Subir Imagen</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Toca para seleccionar imagen</p>
                  <input type="file" accept="image/*" className="hidden" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-1" />
                  Subir
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

      {/* Modal para actualizar estado */}
      <Dialog open={isUpdateStatusModalOpen} onOpenChange={setIsUpdateStatusModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="flex-shrink-0 p-6 pb-4">
              <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
            </DialogHeader>
            {selectedOrderForUpdate && (
              <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Pedido: {selectedOrderForUpdate.id}</p>
                <p className="text-sm text-gray-600">{selectedOrderForUpdate.customerName}</p>
                <p className="text-sm text-gray-600">{formatCurrency(selectedOrderForUpdate.totalAmount)}</p>
              </div>
              
              <div className="space-y-3">
                <Label>Nuevo Estado *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant={newStatus === 'entregado' ? 'default' : 'outline'}
                    onClick={() => setNewStatus('entregado')}
                    className={`h-12 text-sm font-medium ${
                      newStatus === 'entregado' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700'
                    }`}
                  >
                    ✅ Entregado
                  </Button>
                  <Button
                    variant={newStatus === 'devolucion' ? 'default' : 'outline'}
                    onClick={() => setNewStatus('devolucion')}
                    className={`h-12 text-sm font-medium ${
                      newStatus === 'devolucion' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700'
                    }`}
                  >
                    ❌ Devolución
                  </Button>
                  <Button
                    variant={newStatus === 'reagendado' ? 'default' : 'outline'}
                    onClick={() => setNewStatus('reagendado')}
                    className={`h-12 text-sm font-medium ${
                      newStatus === 'reagendado' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700'
                    }`}
                  >
                    📅 Reagendado
                  </Button>
                      </div>
                      </div>

              {/* Sección de método de pago para entregado */}
              {newStatus === 'entregado' && (
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Confirmar Método de Pago *</Label>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {selectedOrderForUpdate.paymentMethod === 'efectivo' ? '💵 Efectivo' :
                       selectedOrderForUpdate.paymentMethod === 'sinpe' ? '📱 SINPE' :
                       selectedOrderForUpdate.paymentMethod === 'tarjeta' ? '💳 Tarjeta' :
                       '🔄 Cambio'}
                    </Badge>
                      </div>
                  <p className="text-xs text-gray-600">
                    Confirma el método de pago que el cliente está utilizando para esta entrega
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      variant={paymentMethod === 'efectivo' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`h-10 text-xs font-medium ${
                        paymentMethod === 'efectivo' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700'
                      }`}
                    >
                      💵 Efectivo
                    </Button>
                    <Button
                      variant={paymentMethod === 'sinpe' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('sinpe')}
                      className={`h-10 text-xs font-medium ${
                        paymentMethod === 'sinpe' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700'
                      }`}
                    >
                      📱 SINPE
                    </Button>
                    <Button
                      variant={paymentMethod === 'tarjeta' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('tarjeta')}
                      className={`h-10 text-xs font-medium ${
                        paymentMethod === 'tarjeta' 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700'
                      }`}
                    >
                      💳 Tarjeta
                    </Button>
                    <Button
                      variant={paymentMethod === '2pagos' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('2pagos');
                        setIsDualPayment(true);
                        setFirstPaymentMethod('efectivo'); // Por defecto el primer pago es efectivo
                        setSecondPaymentMethod(''); // El segundo método debe ser seleccionado por el usuario
                      }}
                      className={`h-10 text-xs font-medium ${
                        paymentMethod === '2pagos' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700'
                      }`}
                    >
                      💰 2 Pagos
                    </Button>
                      </div>
                  
                  {/* Comprobante para SINPE o Tarjeta */}
                  {(paymentMethod === 'sinpe' || paymentMethod === 'tarjeta') && (
                    <div className="space-y-2">
                      <Label>Comprobante de Transacción *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        {uploadedReceipts.length > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              {uploadedReceipts.map((receipt, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={receipt}
                                    alt={`Comprobante ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setUploadedReceipts(prev => prev.filter((_, i) => i !== index))}
                                    className="absolute -top-2 -right-2 h-6 w-6 p-0 text-red-600 hover:text-red-700 bg-white border border-red-200"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                              {uploadedReceipts.length} comprobante{uploadedReceipts.length !== 1 ? 's' : ''} seleccionado{uploadedReceipts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Camera className="w-8 h-8 mx-auto text-gray-400" />
                            <p className="text-sm text-gray-600">Toca para seleccionar comprobantes (múltiples)</p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleFileUpload(e, 'receipt')}
                              className="hidden"
                              id="receipt-upload"
                            />
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById('receipt-upload')?.click()}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Seleccionar Comprobantes
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Sección para 2 pagos */}
                  {paymentMethod === '2pagos' && (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold">Configurar 2 Pagos *</Label>
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                          💰 Pagos Múltiples
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Especifica los dos tipos de pago y sus montos correspondientes
                      </p>
                      
                      {/* Primer Pago */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Primer Pago</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-600">Método</Label>
                            <Select value={firstPaymentMethod} onValueChange={() => {}} disabled>
                              <SelectTrigger className="h-8 bg-gray-100">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">El primer pago siempre es efectivo</p>
                          </div>
                <div>
                            <Label className="text-xs text-gray-600">Monto (₡)</Label>
                  <Input
                              type="number"
                              placeholder="0"
                              value={firstPaymentAmount}
                              onChange={(e) => setFirstPaymentAmount(e.target.value)}
                              className="h-8"
                            />
                </div>
            </div>
                        
                        {/* Comprobante para primer pago si es SINPE o Tarjeta */}
                        {(firstPaymentMethod === 'sinpe' || firstPaymentMethod === 'tarjeta') && (
                          <div className="space-y-2">
                            <Label className="text-xs">Comprobante del Primer Pago *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                              {firstPaymentReceipt ? (
                                <div className="space-y-2">
                                  <img
                                    src={firstPaymentReceipt}
                                    alt="Comprobante primer pago"
                                    className="max-w-full h-24 object-contain mx-auto rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFirstPaymentReceipt(null)}
                                    className="text-red-600 hover:text-red-700 h-6 text-xs"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Eliminar
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Camera className="w-6 h-6 mx-auto text-gray-400" />
                                  <p className="text-xs text-gray-600">Comprobante del primer pago</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleDualPaymentFileUpload(e, 'first')}
                                    className="hidden"
                                    id="first-payment-upload"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('first-payment-upload')?.click()}
                                    className="h-6 text-xs"
                                  >
                                    <ImageIcon className="w-3 h-3 mr-1" />
                                    Subir
                                  </Button>
                </div>
              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Segundo Pago */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Segundo Pago</Label>
                        <div className="grid grid-cols-2 gap-2">
              <div>
                            <Label className="text-xs text-gray-600">Método</Label>
                            <Select value={secondPaymentMethod} onValueChange={setSecondPaymentMethod}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                                <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                                <SelectItem value="sinpe">📱 SINPE</SelectItem>
                                <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                            <Label className="text-xs text-gray-600">Monto (₡)</Label>
                <Input
                  type="number"
                  placeholder="0"
                              value={secondPaymentAmount}
                              onChange={(e) => setSecondPaymentAmount(e.target.value)}
                              className="h-8"
                />
                          </div>
              </div>

                        {/* Comprobante para segundo pago si es SINPE o Tarjeta */}
                        {(secondPaymentMethod === 'sinpe' || secondPaymentMethod === 'tarjeta') && (
                          <div className="space-y-2">
                            <Label className="text-xs">Comprobante del Segundo Pago *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                              {secondPaymentReceipt ? (
                                <div className="space-y-2">
                                  <img
                                    src={secondPaymentReceipt}
                                    alt="Comprobante segundo pago"
                                    className="max-w-full h-24 object-contain mx-auto rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSecondPaymentReceipt(null)}
                                    className="text-red-600 hover:text-red-700 h-6 text-xs"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Eliminar
                                  </Button>
              </div>
                              ) : (
                <div className="space-y-2">
                                  <Camera className="w-6 h-6 mx-auto text-gray-400" />
                                  <p className="text-xs text-gray-600">Comprobante del segundo pago</p>
                                  <input
                    type="file"
                    accept="image/*"
                                    onChange={(e) => handleDualPaymentFileUpload(e, 'second')}
                                    className="hidden"
                                    id="second-payment-upload"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('second-payment-upload')?.click()}
                                    className="h-6 text-xs"
                                  >
                                    <ImageIcon className="w-3 h-3 mr-1" />
                                    Subir
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resumen de totales */}
                      <div className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">Total del Pedido:</span>
                          <span className="font-bold">{formatCurrency(selectedOrderForUpdate?.totalAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Primer Pago:</span>
                          <span>{formatCurrency(parseFloat(firstPaymentAmount) || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Segundo Pago:</span>
                          <span>{formatCurrency(parseFloat(secondPaymentAmount) || 0)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <span>Diferencia:</span>
                            <span className={`${
                              (parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0) === (selectedOrderForUpdate?.totalAmount || 0)
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency((parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0) - (selectedOrderForUpdate?.totalAmount || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selector de fecha obligatorio para reagendado */}
              {newStatus === 'reagendado' && (
                <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Label>Seleccionar fecha a reagendar *</Label>
                  <Popover open={isReagendadoDatePickerOpen} onOpenChange={setIsReagendadoDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reagendadoDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {reagendadoDate ? reagendadoDate.toLocaleDateString('es-ES') : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={reagendadoDate}
                        onSelect={(date) => {
                          setReagendadoDate(date);
                          setIsReagendadoDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Checkbox opcional para marcar como cambio */}
              {newStatus === 'reagendado' && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reagendado-as-change"
                      checked={isReagendadoAsChange}
                      onCheckedChange={(checked) => setIsReagendadoAsChange(checked as boolean)}
                    />
                    <Label htmlFor="reagendado-as-change" className="text-sm font-medium">
                      Marcar reagendado como cambio
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600">
                    Opcional: Marca este pedido como un cambio en el backend para seguimiento especial
                  </p>
                </div>
              )}

              {/* Comprobante de evidencia para devolución o reagendado */}
              {(newStatus === 'devolucion' || newStatus === 'reagendado') && (
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <Label>Comprobante de Comunicación *</Label>
                  <p className="text-xs text-gray-600">
                    Adjunta captura de pantalla del chat o llamada con el cliente para evidenciar la comunicación
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {uploadedEvidence ? (
                      <div className="space-y-3">
                        <img
                          src={uploadedEvidence}
                          alt="Comprobante de comunicación"
                          className="max-w-full h-32 object-contain mx-auto rounded-lg"
                      />
                      <Button
                          variant="outline"
                        size="sm"
                          onClick={() => setUploadedEvidence(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Camera className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">Toca para seleccionar comprobante</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'evidence')}
                          className="hidden"
                          id="evidence-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('evidence-upload')?.click()}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Seleccionar Imagen
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>Comentarios (opcional)</Label>
                <Textarea
                  placeholder="Añadir comentarios sobre el cambio de estado..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  rows={3}
                />
              </div>

              </div>
            )}
            {/* Botones fijos en la parte inferior */}
            {selectedOrderForUpdate && (
              <div className="flex-shrink-0 flex gap-2 p-6 pt-4 border-t bg-white">
                <Button
                  variant="outline"
                        onClick={() => {
                    setIsUpdateStatusModalOpen(false);
                    setSelectedOrderForUpdate(null);
                    resetModalState();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={
                    !newStatus || 
                    updatingOrder === selectedOrderForUpdate?.id ||
                    (newStatus === 'entregado' && !paymentMethod) ||
                    (newStatus === 'entregado' && (paymentMethod === 'sinpe' || paymentMethod === 'tarjeta') && uploadedReceipts.length === 0) ||
                    (newStatus === 'entregado' && paymentMethod === '2pagos' && (
                      !firstPaymentMethod || !secondPaymentMethod || 
                      !firstPaymentAmount || !secondPaymentAmount ||
                      (firstPaymentMethod === 'sinpe' && !firstPaymentReceipt) ||
                      (firstPaymentMethod === 'tarjeta' && !firstPaymentReceipt) ||
                      (secondPaymentMethod === 'sinpe' && !secondPaymentReceipt) ||
                      (secondPaymentMethod === 'tarjeta' && !secondPaymentReceipt) ||
                      (parseFloat(firstPaymentAmount) + parseFloat(secondPaymentAmount)) !== selectedOrderForUpdate?.totalAmount
                    )) ||
                    ((newStatus === 'devolucion' || newStatus === 'reagendado') && !uploadedEvidence) ||
                    (newStatus === 'reagendado' && !reagendadoDate)
                  }
                  className="flex-1"
                >
                  {updatingOrder === selectedOrderForUpdate?.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar'
                  )}
                      </Button>
                    </div>
                  )}
                </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Notas */}
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-600" />
              Notas del Pedido
            </DialogTitle>
          </DialogHeader>
          {selectedOrderForNotes && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Pedido: {selectedOrderForNotes.id}</p>
                <p className="text-sm text-gray-600">{selectedOrderForNotes.customerName}</p>
                <p className="text-sm text-gray-600">{selectedOrderForNotes.customerProvince} • {selectedOrderForNotes.customerCanton} • {selectedOrderForNotes.customerDistrict}</p>
              </div>

              {/* Notas existentes */}
              {selectedOrderForNotes.notes && (
                <div className="space-y-3">
                  <Label>Notas del Asesor</Label>
                  <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-200">
                    <p className="text-sm whitespace-pre-wrap">{selectedOrderForNotes.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Agregar nueva nota */}
              <div className="space-y-3">
                <Label>Agregar Nota del Mensajero</Label>
                <Textarea
                  placeholder="Escribe una nota sobre este pedido..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseNotes}
                  className="flex-1"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Agregar Nota
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

      {/* Modal del Timeline */}
      <Dialog open={isTimelineModalOpen} onOpenChange={setIsTimelineModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Timeline del Pedido
              </DialogTitle>
            </DialogHeader>
          {selectedOrderForTimeline && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Pedido: {selectedOrderForTimeline.id}</p>
                <p className="text-sm text-gray-600">{selectedOrderForTimeline.customerName}</p>
                <p className="text-sm text-gray-600">{formatCurrency(selectedOrderForTimeline.totalAmount)}</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Historial de Cambios de Estado</h4>
                
                {statusChanges.filter(change => change.orderId === selectedOrderForTimeline.id).length > 0 ? (
                  <div className="space-y-3">
                    {statusChanges.filter(change => change.orderId === selectedOrderForTimeline.id).map((change, index) => (
                      <div key={change.id} className="relative">
                        {/* Línea conectora */}
                        {index < statusChanges.filter(change => change.orderId === selectedOrderForTimeline.id).length - 1 && (
                          <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                        )}
                        
                        <div className="flex items-start gap-3">
                          {/* Icono del estado */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getStatusColor(change.toStatus)}`}>
                            {getStatusIcon(change.toStatus)}
                          </div>
                          
                          {/* Contenido del cambio */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {change.fromStatus} → {change.toStatus}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {change.changedByName}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-gray-500 mb-2">
                              {formatTimestamp(change.timestamp)}
                            </p>
                            
                            {/* Información adicional */}
                            <div className="space-y-1">
                              {change.comment && (
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                  <strong>Comentario:</strong> {change.comment}
                                </p>
                              )}
                              
                              {change.paymentMethod && (
                                <p className="text-sm text-gray-700">
                                  <strong>Método de pago:</strong> {change.paymentMethod}
                                </p>
                              )}
                              
                              {change.receipt && (
                                <div className="text-sm text-gray-700">
                                  <strong>Comprobante:</strong> 
                                  <img src={change.receipt} alt="Comprobante" className="mt-1 max-w-32 h-20 object-contain rounded border" />
                                </div>
                              )}
                              
                              {change.evidence && (
                                <div className="text-sm text-gray-700">
                                  <strong>Evidencia:</strong> 
                                  <img src={change.evidence} alt="Evidencia" className="mt-1 max-w-32 h-20 object-contain rounded border" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay cambios de estado registrados para este pedido</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseTimeline}
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

      {/* Modal de Éxito */}
      <AlertDialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              ¡Actualización Exitosa!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center py-4">
              <div className="space-y-3">
                <p className="text-lg font-medium text-gray-900">
                  {successMessage}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Cerrando automáticamente en {countdown} segundos...</span>
      </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Error */}
      {errorMessage && (
        <AlertDialog open={!!errorMessage} onOpenChange={() => setErrorMessage('')}>
          <AlertDialogContent className="sm:max-w-[400px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Error en la Actualización
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center py-4">
                <div className="space-y-3">
                  <p className="text-lg font-medium text-gray-900">
                    {errorMessage}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setErrorMessage('')}
                    className="w-full"
                  >
                    Cerrar
                  </Button>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Modal de Detalles del Pedido */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <FileText className="w-5 h-5 text-purple-600" />
              Detalles del Pedido {selectedOrderForDetails?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrderForDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Información del Cliente */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Información del Cliente
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Nombre:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Teléfono:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Provincia:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.customerProvince}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Cantón:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.customerCanton}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Distrito:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.customerDistrict}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-600">Dirección:</span>
                      <span className="text-gray-900 text-xs leading-relaxed">{selectedOrderForDetails.customerAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Información del Pedido */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Información del Pedido
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">ID Pedido:</span>
                      <span className="text-gray-900 font-mono">{selectedOrderForDetails.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Tienda:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.tienda || 'ALL STARS'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Estado:</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          selectedOrderForDetails.status === 'entregado' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedOrderForDetails.status === 'en_ruta' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          selectedOrderForDetails.status === 'devolucion' ? 'bg-red-50 text-red-700 border-red-200' :
                          selectedOrderForDetails.status === 'reagendado' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {selectedOrderForDetails.status === 'entregado' ? '✅ Entregado' :
                         selectedOrderForDetails.status === 'en_ruta' ? '🚚 En Ruta' :
                         selectedOrderForDetails.status === 'devolucion' ? '❌ Devolución' :
                         selectedOrderForDetails.status === 'reagendado' ? '📅 Reagendado' :
                         '📝 Pendiente'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Método de Pago:</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          selectedOrderForDetails.paymentMethod === 'efectivo' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedOrderForDetails.paymentMethod === 'sinpe' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {selectedOrderForDetails.paymentMethod === 'efectivo' ? '💵 Efectivo' :
                         selectedOrderForDetails.paymentMethod === 'sinpe' ? '📱 SINPE Móvil' :
                         '💳 Tarjeta'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Monto Total:</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(selectedOrderForDetails.totalAmount)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-600">Productos:</span>
                      <span className="text-gray-900 text-xs leading-relaxed">
                        {selectedOrderForDetails.productos || 'No especificados'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Adicional y Fechas */}
              <div className="space-y-4">
                {/* Información de Fechas */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fechas Importantes
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Fecha de Creación:</span>
                      <span className="text-gray-900">
                        {selectedOrderForDetails.createdAt ? 
                          new Date(selectedOrderForDetails.createdAt).toLocaleDateString('es-CR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'No especificada'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Fecha de Entrega:</span>
                      <span className="text-gray-900">
                        {selectedOrderForDetails.deliveryDate ? 
                          new Date(selectedOrderForDetails.deliveryDate).toLocaleDateString('es-CR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'No especificada'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información de Mensajería */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Información de Entrega
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Mensajero Asignado:</span>
                      <span className="text-gray-900">
                        {typeof selectedOrderForDetails.assignedMessenger === 'string' 
                          ? selectedOrderForDetails.assignedMessenger 
                          : selectedOrderForDetails.assignedMessenger?.name || 'No asignado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Orden de Ruta:</span>
                      <span className="text-gray-900">{selectedOrderForDetails.routeOrder || 'No asignada'}</span>
                    </div>
                    {selectedOrderForDetails.customerLocationLink && (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-600">Link de Ubicación:</span>
                        <a 
                          href={selectedOrderForDetails.customerLocationLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                        >
                          {selectedOrderForDetails.customerLocationLink}
                        </a>
                      </div>
                    )}
                      </div>
                      </div>

                {/* Notas Adicionales */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notas y Comentarios
                  </h3>
                  
                  {/* Notas del Asesor */}
                  {selectedOrderForDetails.asesorNotes && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="font-medium text-orange-700">Notas del Asesor:</span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm leading-relaxed text-orange-900">
                        {selectedOrderForDetails.asesorNotes}
                      </div>
              </div>
                  )}
                  
                  {/* Notas Generales */}
                  {selectedOrderForDetails.notes && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-blue-700">Notas Generales:</span>
                      </div>
                      <div className="bg-white p-3 rounded border text-xs leading-relaxed text-gray-900 max-h-32 overflow-y-auto">
                        {selectedOrderForDetails.notes.split('\n').map((line, index) => (
                          <div key={index} className={line.includes(':') ? 'font-medium text-blue-700' : 'text-gray-700'}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar mensaje si no hay notas */}
                  {!selectedOrderForDetails.notes && !selectedOrderForDetails.asesorNotes && (
                    <div className="mb-4 text-center py-4 text-gray-500 text-sm">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No hay notas registradas para este pedido</p>
                    </div>
                  )}
                  
                  {/* Formulario para añadir nueva nota */}
                  <div className="space-y-3">
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Añadir nueva nota:
                      </label>
                      <textarea
                        value={newDetailNote}
                        onChange={(e) => setNewDetailNote(e.target.value)}
                        placeholder="Añade una nota general sobre este pedido (se guardará en Notas Generales)..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                        disabled={isAddingDetailNote}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAddDetailNote}
                        disabled={!newDetailNote.trim() || isAddingDetailNote}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                      >
                        {isAddingDetailNote ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Añadiendo...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Añadir Nota
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              )}

          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={handleCloseDetails}
              className="w-full md:w-auto"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Completados */}
      <Dialog open={isCompletedModalOpen} onOpenChange={setIsCompletedModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Análisis de Pedidos Completados ({getCompletedOrders().length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumen de Métodos de Pago */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getPaymentMethodData().map((method, index) => (
                <Card key={method.name} className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-blue-500' : 
                        index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                      }`} />
                      <span className="text-sm font-medium text-green-800">{method.name}</span>
                    </div>
                    <p className="text-xl font-bold text-green-700 mt-1">
                      {method.value}
                    </p>
                    <p className="text-xs text-green-600">
                      {formatCurrency(method.amount)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos en Grid Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Barras */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    Distribución por Método
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPaymentMethodData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'value' ? `${value} pedidos` : formatCurrency(Number(value)),
                            name === 'value' ? 'Cantidad' : 'Monto'
                          ]}
                        />
                        <Bar dataKey="value" fill="#10b981" name="Pedidos" />
                      </BarChart>
                    </ResponsiveContainer>
              </div>
                </CardContent>
              </Card>

              {/* Gráfico de Pastel */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    Ingresos por Método
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPaymentMethodData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {getPaymentMethodData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#f59e0b'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), 'Monto']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla Detallada */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-gray-600" />
                  Lista Detallada de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs">Monto</TableHead>
                        <TableHead className="text-xs">Método</TableHead>
                        <TableHead className="text-xs">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCompletedOrders().map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id}</TableCell>
                          <TableCell className="text-sm">{order.customerName}</TableCell>
                          <TableCell className="font-semibold text-green-600 text-sm">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`capitalize text-xs ${
                                order.paymentMethod === 'efectivo' ? 'bg-green-50 text-green-700 border-green-200' :
                                order.paymentMethod === 'sinpe' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {order.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('es-CR') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ingresos */}
      <Dialog open={isRevenueModalOpen} onOpenChange={setIsRevenueModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Análisis de Ingresos - {formatCurrency(routeData.totalRevenue)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumen de Métodos de Pago */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Efectivo</span>
                  </div>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(accountingMetrics.totalCash)}
                  </p>
                  <p className="text-xs text-green-600">
                    {getCashOrders().length} pedidos
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">SINPE</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700 mt-1">
                    {formatCurrency(accountingMetrics.totalSinpe)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {getSinpeOrders().length} pedidos
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Total</span>
                  </div>
                  <p className="text-xl font-bold text-purple-700 mt-1">
                    {formatCurrency(accountingMetrics.totalCash + accountingMetrics.totalSinpe + accountingMetrics.totalTarjeta)}
                  </p>
                  <p className="text-xs text-purple-600">
                    {getCompletedOrders().length} pedidos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos en Grid Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Barras */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Comparación por Método
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPaymentMethodData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'value' ? `${value} pedidos` : formatCurrency(Number(value)),
                            name === 'value' ? 'Cantidad' : 'Monto'
                          ]}
                        />
                        <Bar dataKey="value" fill="#3b82f6" name="Pedidos" />
                      </BarChart>
                    </ResponsiveContainer>
              </div>
                </CardContent>
              </Card>

              {/* Gráfico de Pastel */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    Distribución por Método
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPaymentMethodData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getPaymentMethodData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#8b5cf6'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} pedidos`, 'Cantidad']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reagendados */}
      <Dialog open={isRescheduledModalOpen} onOpenChange={setIsRescheduledModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              Pedidos Reagendados ({getRescheduledOrders().length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Nueva Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getRescheduledOrders().map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString('es-CR') : 'Pendiente'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Reagendado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Devoluciones */}
      <Dialog open={isReturnsModalOpen} onOpenChange={setIsReturnsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-600" />
              Pedidos para Devolver ({getReturnOrders().length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Devolución</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getReturnOrders().map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('es-CR') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Devolución
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Efectivo */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              Pedidos en Efectivo - {formatCurrency(accountingMetrics.totalCash)}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCashOrders().map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('es-CR') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Entregado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal SINPE */}
      <Dialog open={isSinpeModalOpen} onOpenChange={setIsSinpeModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Pedidos con SINPE - {formatCurrency(accountingMetrics.totalSinpe)}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSinpeOrders().map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('es-CR') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {order.comprobante_sinpe ? (
                      <Button
                        size="sm"
                          variant="outline"
                          onClick={() => window.open(order.comprobante_sinpe, '_blank')}
                          className="h-6 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                          title="Ver comprobante SINPE"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Ver
                      </Button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin comprobante</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Entregado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                </div>
        </DialogContent>
      </Dialog>

      {/* Modal Tarjeta */}
      <Dialog open={isTarjetaModalOpen} onOpenChange={setIsTarjetaModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Pedidos con Tarjeta - {formatCurrency(accountingMetrics.totalTarjeta)}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTarjetaOrders().map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="font-semibold text-purple-600">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('es-CR') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {order.comprobante_sinpe ? (
                <Button
                          size="sm"
                  variant="outline"
                          onClick={() => window.open(order.comprobante_sinpe, '_blank')}
                          className="h-6 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                          title="Ver comprobante de tarjeta"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Ver
                </Button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin comprobante</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Entregado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </DialogContent>
        </Dialog>

      {/* Modal 2 Pagos */}
      <Dialog open={isDosPagosModalOpen} onOpenChange={setIsDosPagosModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-600" />
              Pedidos con 2 Pagos
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Efectivo</TableHead>
                  <TableHead>SINPE</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Comprobante SINPE</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getDosPagosOrders().map((order) => {
                  const efectivoAmount = parseFloat(order.efectivo_2_pagos || '0');
                  const sinpeAmount = parseFloat(order.sinpe_2_pagos || '0');
                  const totalAmount = efectivoAmount + sinpeAmount;
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(efectivoAmount)}
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {formatCurrency(sinpeAmount)}
                      </TableCell>
                      <TableCell className="font-bold text-orange-600">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {order.comprobante_sinpe ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(order.comprobante_sinpe, '_blank')}
                            className="h-6 px-2 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                            title="Ver comprobante SINPE"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin comprobante</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Entregado
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
        </Dialog>

      {/* Modal Total a Entregar */}
      <Dialog open={isTotalEntregarModalOpen} onOpenChange={setIsTotalEntregarModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              Total a Entregar - {user?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Total Efectivo</span>
                  </div>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(accountingMetrics.totalCash)}
                  </p>
                  <p className="text-xs text-green-600">
                    Incluye pedidos puros + efectivo de 2 pagos
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Total Gastos</span>
                  </div>
                  <p className="text-xl font-bold text-red-700 mt-1">
                    {formatCurrency(getCurrentMessengerExpenses().total || 0)}
                  </p>
                  <p className="text-xs text-red-600">
                    Gastos del día
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Total a Entregar</span>
                  </div>
                  <p className="text-xl font-bold text-purple-700 mt-1">
                    {formatCurrency(accountingMetrics.totalCash - (getCurrentMessengerExpenses().total || 0))}
                  </p>
                  <p className="text-xs text-purple-600">
                    Efectivo - Gastos
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Fórmula:</h3>
              <p className="text-sm text-gray-600">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                  Total a Entregar = Efectivo - Gastos
                </span>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                  {formatCurrency(accountingMetrics.totalCash)} - {formatCurrency(getCurrentMessengerExpenses().total || 0)} = {formatCurrency(accountingMetrics.totalCash - (getCurrentMessengerExpenses().total || 0))}
                </span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Productos para Devolver */}
      <Dialog open={isDevolverModalOpen} onOpenChange={setIsDevolverModalOpen}>
        <DialogContent className="w-[95vw] max-w-none h-[90vh] max-h-[90vh] p-0 m-4 flex flex-col">
          {/* Header fijo */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                Productos para Devolver - {user?.name}
                <span className="text-xs sm:text-sm font-normal text-gray-500">
                  ({getDevolverOrders().length} productos)
                </span>
              </DialogTitle>
              <DialogDescription className="text-sm">
                Lista de todos los productos que necesitan ser devueltos (Pendientes + Reagendados + Devoluciones)
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              {/* Resumen por estado - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-center p-2 bg-white rounded border">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {getDevolverOrders().filter(order => order.status.toLowerCase() === 'pendiente').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Pendientes</p>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {getDevolverOrders().filter(order => order.status.toLowerCase() === 'reagendado').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Reagendados</p>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    {getDevolverOrders().filter(order => order.status.toLowerCase() === 'devolucion').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Devoluciones</p>
                </div>
              </div>

              {/* Contenido de pedidos */}
              {getDevolverOrders().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay productos para devolver</p>
                </div>
              ) : (
                <>
                  {/* Vista móvil - Cards */}
                  <div className="block sm:hidden space-y-3">
                    {getDevolverOrders().map((order) => (
                      <Card key={order.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="font-mono text-sm font-bold text-blue-600">{order.id}</div>
                            <Badge 
                              variant="outline" 
                              className={
                                order.status.toLowerCase() === 'pendiente' 
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 text-xs'
                                  : order.status.toLowerCase() === 'reagendado'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                  : 'bg-red-50 text-red-700 border-red-200 text-xs'
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{order.customerName}</p>
                            <p className="text-xs text-gray-600 truncate" title={order.productos || 'Sin productos especificados'}>
                              {order.productos || 'Sin productos especificados'}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p><strong>Ubicación:</strong> {order.customerCanton}, {order.customerProvince} - {order.customerDistrict}</p>
                            <p className="truncate" title={order.customerAddress}><strong>Dirección:</strong> {order.customerAddress}</p>
                          </div>
                          {order.deliveryDate && (
                            <p className="text-xs text-gray-400">
                              Fecha: {new Date(order.deliveryDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Vista desktop - Tabla */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Cliente</TableHead>
                          <TableHead className="text-xs">Producto</TableHead>
                          <TableHead className="text-xs">Ubicación</TableHead>
                          <TableHead className="text-xs">Dirección</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getDevolverOrders().map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.id}</TableCell>
                            <TableCell className="font-medium text-xs">{order.customerName}</TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs" title={order.productos || 'Sin productos especificados'}>
                              {order.productos || 'Sin productos especificados'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div>
                                <div className="font-medium">{order.customerCanton}</div>
                                <div className="text-gray-500">
                                  {order.customerProvince} - {order.customerDistrict}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs" title={order.customerAddress}>
                              {order.customerAddress}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  order.status.toLowerCase() === 'pendiente' 
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200 text-xs'
                                    : order.status.toLowerCase() === 'reagendado'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                    : 'bg-red-50 text-red-700 border-red-200 text-xs'
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer fijo */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-t bg-gray-50">
            <div className="flex justify-end">
              <Button onClick={() => setIsDevolverModalOpen(false)} className="px-6">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
