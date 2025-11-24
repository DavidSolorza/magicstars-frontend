'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { mockApi } from '@/lib/mock-api';
import { RouteLiquidation, RouteLiquidationStats, RouteLiquidationFilters, PedidoTest, TiendaLiquidationCalculation } from '@/lib/types';
import { getLiquidacionesReales, getMensajerosUnicos, debugTablaPedidos, debugFechasConDatos, getLiquidacionesRealesByTienda } from '@/lib/supabase-pedidos';
import { supabasePedidos } from '@/lib/supabase-pedidos';
import { ProgressLoader, useProgressLoader } from '@/components/ui/progress-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Loader2,
  Building2,
  Calculator,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Fuel,
  Wrench,
  Car,
  ChevronDown,
  Camera,
  ImageIcon,
  Check,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LiquidationCalculation {
  messengerId: string;
  messengerName: string;
  routeDate: string;
  initialAmount: number; // Plata entregada en la mañana
  totalCollected: number; // Total recaudado
  totalSpent: number; // Gastos del mensajero
  sinpePayments: number; // Pagos en SINPE
  cashPayments: number; // Pagos en efectivo
  tarjetaPayments: number; // Pagos en tarjeta
  finalAmount: number; // Monto final a entregar
  orders: PedidoTest[];
  isLiquidated: boolean;
  canEdit: boolean;
}

export default function AdminLiquidationPage() {
  const { user } = useAuth();
  const [liquidations, setLiquidations] = useState<RouteLiquidation[]>([]);
  const [stats, setStats] = useState<RouteLiquidationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [filters, setFilters] = useState<RouteLiquidationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [liquidating, setLiquidating] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Estados para el módulo de liquidación mejorado
  const [calculations, setCalculations] = useState<LiquidationCalculation[]>([]);
  const [tiendaCalculations, setTiendaCalculations] = useState<TiendaLiquidationCalculation[]>([]);
  const [pruebaMetrics, setPruebaMetrics] = useState<{
    totalOrders: number;
    totalCollected: number;
    cashPayments: number;
    sinpePayments: number;
    tarjetaPayments: number;
    dosPagosPayments: number;
    totalSpent: number;
    finalAmount: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'mensajeros' | 'tiendas'>('mensajeros');
  
  // Estados para filtros y paginación de tiendas
  const [tiendaStatusFilter, setTiendaStatusFilter] = useState<string>('TODOS');
  const [tiendaCurrentPage, setTiendaCurrentPage] = useState<{ [key: string]: number }>({});
  const [isQuickFilterLoading, setIsQuickFilterLoading] = useState(false);
  const isQuickLoadRef = useRef(false);
  const [quickFilterRange, setQuickFilterRange] = useState<{ start: string; end: string } | null>(null);
  
  
  // Estados para el loader de progreso
  const { isVisible, steps, currentStep, overallProgress, startLoader, updateStep, setStepStatus, closeLoader } = useProgressLoader();
  
  // Estados para modales y formularios
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [selectedLiquidation, setSelectedLiquidation] = useState<LiquidationCalculation | null>(null);
  const [showRouteDetailModal, setShowRouteDetailModal] = useState(false);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<LiquidationCalculation | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedOrderNotes, setSelectedOrderNotes] = useState<PedidoTest | null>(null);
  const [showViewAndLiquidateModal, setShowViewAndLiquidateModal] = useState(false);
  const [selectedViewAndLiquidate, setSelectedViewAndLiquidate] = useState<LiquidationCalculation | null>(null);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  
  // Estados para modal de gastos de todos los mensajeros
  const [showAllExpensesModal, setShowAllExpensesModal] = useState(false);
  const [allExpensesData, setAllExpensesData] = useState<any[]>([]);
  const [loadingAllExpenses, setLoadingAllExpenses] = useState(false);
  
  // Estados para modales adicionales
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);
  const [showSinpeModal, setShowSinpeModal] = useState(false);
  const [showTarjetaModal, setShowTarjetaModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  
  // Estados para datos de modales
  const [selectedPendingOrders, setSelectedPendingOrders] = useState<{
    mensajero: string;
    pedidos: PedidoTest[];
  } | null>(null);
  
  const [selectedSinpeOrders, setSelectedSinpeOrders] = useState<PedidoTest[]>([]);
  const [selectedTarjetaOrders, setSelectedTarjetaOrders] = useState<PedidoTest[]>([]);
  const [selectedDevolverOrders, setSelectedDevolverOrders] = useState<PedidoTest[]>([]);
  const [showPendingNotification, setShowPendingNotification] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingLiquidations, setPendingLiquidations] = useState<any[]>([]);
  
  // Estados para modal de cambio de estado
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [selectedOrderForUpdate, setSelectedOrderForUpdate] = useState<PedidoTest | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ENTREGADO');
  const [statusComment, setStatusComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  
  // Estados para comprobantes
  const [uploadedReceipts, setUploadedReceipts] = useState<string[]>([]);
  const [uploadedCommunicationProof, setUploadedCommunicationProof] = useState<string | null>(null);
  
  // Estados para modal de carga de actualización
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [updateOrderMessage, setUpdateOrderMessage] = useState('');
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Estados para 2 pagos
  const [isDualPayment, setIsDualPayment] = useState(false);
  const [firstPaymentMethod, setFirstPaymentMethod] = useState('efectivo');
  const [secondPaymentMethod, setSecondPaymentMethod] = useState('');
  const [firstPaymentAmount, setFirstPaymentAmount] = useState('');
  const [secondPaymentAmount, setSecondPaymentAmount] = useState('');
  const [firstPaymentReceipt, setFirstPaymentReceipt] = useState<string | null>(null);
  const [secondPaymentReceipt, setSecondPaymentReceipt] = useState<string | null>(null);
  
  // Estados para fecha de reagendación
  const [fechaReagendacion, setFechaReagendacion] = useState('');
  const [reagendadoDate, setReagendadoDate] = useState<Date | null>(null);
  const [isReagendadoDatePickerOpen, setIsReagendadoDatePickerOpen] = useState(false);
  const [isReagendadoAsChange, setIsReagendadoAsChange] = useState(false);
  
  // Estados para detalles de pedidos
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<PedidoTest | null>(null);
  
  // Estados para liquidación
  const [liquidatingRoute, setLiquidatingRoute] = useState<string | null>(null);
  const [isLiquidationCompleted, setIsLiquidationCompleted] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState<number>(0);
  
  // Estados para filtros de pedidos
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  
  // Estados para fecha y restricciones
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isEditingRestricted, setIsEditingRestricted] = useState(false);
  
  // Estados para filtro de rango de fechas de tiendas
  const [tiendaFechaInicio, setTiendaFechaInicio] = useState<string>('');
  const [tiendaFechaFin, setTiendaFechaFin] = useState<string>('');
  const [usarRangoFechas, setUsarRangoFechas] = useState(false);
  const [loadingRangoFechas, setLoadingRangoFechas] = useState(false);
  const [fechasError, setFechasError] = useState<string>('');

  // Función para validar fechas
  const validarFechas = (fechaInicio: string, fechaFin: string) => {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        setFechasError('La fecha de inicio no puede ser posterior a la fecha fin');
        return false;
      }
    }
    setFechasError('');
    return true;
  };

  // Handlers para cambios de fecha
  const handleFechaInicioChange = (fecha: string) => {
    setTiendaFechaInicio(fecha);
    validarFechas(fecha, tiendaFechaFin);
  };

  const handleFechaFinChange = (fecha: string) => {
    setTiendaFechaFin(fecha);
    validarFechas(tiendaFechaInicio, fecha);
  };

  // Inicializar fecha al cargar el componente
  useEffect(() => {
    const initializeDate = async () => {
      if (!selectedDate) {
        const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
        const costaRicaDate = getCostaRicaDateISO();
        setSelectedDate(costaRicaDate);
        return;
      }
      
      // Cargar liquidaciones pendientes al inicializar
      loadPendingLiquidations();
    }
    
    initializeDate();
  }, []);

  // Recargar datos cuando cambie la fecha
  useEffect(() => {
    if (selectedDate || quickFilterRange) {
      // Si es una carga rápida desde filtros, usar modo optimizado
      const isQuickLoad = isQuickLoadRef.current;
      
      if (isQuickLoad) {
        setIsLoadingData(true);
        isQuickLoadRef.current = false; // Resetear el ref después de usarlo
      }
      
      // Cargar datos en paralelo para mayor velocidad
      Promise.all([
        loadData(),
        loadCalculations(isQuickLoad), // Pasar true para evitar el loader completo en filtros rápidos
        loadTiendaCalculations(),
        loadPendingLiquidations()
      ]).finally(() => {
        if (isQuickLoad) {
          setIsQuickFilterLoading(false);
          setIsLoadingData(false);
        }
      });
    }
  }, [selectedDate, quickFilterRange]);

  // Recargar tiendas cuando cambien las fechas del rango
  useEffect(() => {
    if (usarRangoFechas && tiendaFechaInicio && tiendaFechaFin) {
      loadTiendaCalculations();
    }
  }, [tiendaFechaInicio, tiendaFechaFin, usarRangoFechas]);

  // Forzar actualización del modal cuando se actualiza un pedido
  useEffect(() => {
    if (forceRefresh > 0 && selectedViewAndLiquidate) {
      // Forzar re-render del modal actualizando el estado
      setSelectedViewAndLiquidate(prev => prev ? { ...prev } : null);
    }
  }, [forceRefresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [liquidationsData, statsData] = await Promise.all([
        mockApi.getRouteLiquidations(filters),
        mockApi.getRouteLiquidationStats(),
      ]);
      setLiquidations(liquidationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalculations = async (isReload = false) => {
    try {
      
      setIsLoadingData(true);
      
      // Iniciar loader solo si no es una recarga
      if (!isReload) {
        startLoader('Procesando Liquidaciones', [
          { id: 'mensajeros', label: 'Obteniendo mensajeros únicos', status: 'pending' },
          { id: 'pedidos', label: 'Cargando pedidos del día', status: 'pending' },
          { id: 'calculations', label: 'Calculando liquidaciones', status: 'pending' },
          { id: 'finalization', label: 'Finalizando proceso', status: 'pending' }
        ]);
      }
      
      // Paso 1: Obtener liquidaciones reales
      if (!isReload) {
        updateStep('mensajeros', { status: 'loading' });
      }
      
      let liquidacionesReales = [];
      
      // Si hay un rango de fechas del filtro rápido, cargar datos de todas las fechas
      if (quickFilterRange && quickFilterRange.start && quickFilterRange.end) {
        const fechas: string[] = [];
        const fechaInicio = new Date(quickFilterRange.start + 'T00:00:00');
        const fechaFin = new Date(quickFilterRange.end + 'T23:59:59');
        
        // Generar array de fechas en el rango
        for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha = new Date(fecha.getTime() + 24 * 60 * 60 * 1000)) {
          fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        // Cargar datos de todas las fechas en paralelo
        const promesasFechas = fechas.map(fecha => getLiquidacionesReales(fecha));
        const resultadosFechas = await Promise.all(promesasFechas);
        
        // Consolidar datos por mensajero
        const mensajerosConsolidados = new Map<string, {
          mensajero: string;
          pedidos: PedidoTest[];
          totalCollected: number;
          sinpePayments: number;
          cashPayments: number;
          tarjetaPayments: number;
          totalSpent: number;
          initialAmount: number;
          finalAmount: number;
          gastos: any[];
          isLiquidated: boolean;
        }>();
        
        resultadosFechas.forEach((liquidacionesFecha) => {
          liquidacionesFecha.forEach(liquidacion => {
            const mensajeroKey = liquidacion.mensajero.trim().toUpperCase();
            
            if (mensajerosConsolidados.has(mensajeroKey)) {
              const existente = mensajerosConsolidados.get(mensajeroKey)!;
              existente.pedidos = [...existente.pedidos, ...(liquidacion.pedidos || [])];
              existente.totalCollected += Number(liquidacion.totalCollected || 0);
              existente.sinpePayments += Number(liquidacion.sinpePayments || 0);
              existente.cashPayments += Number(liquidacion.cashPayments || 0);
              existente.tarjetaPayments += Number(liquidacion.tarjetaPayments || 0);
              existente.totalSpent += Number(liquidacion.totalSpent || 0);
              // Recalcular finalAmount basado en los totales consolidados
              existente.finalAmount = existente.initialAmount + existente.cashPayments - existente.totalSpent;
              existente.gastos = [...existente.gastos, ...(liquidacion.gastos || [])];
              // Si alguna fecha está liquidada, considerar liquidado
              if (liquidacion.isLiquidated) {
                existente.isLiquidated = true;
              }
            } else {
              const initialAmount = Number(liquidacion.initialAmount || 0);
              const cashPayments = Number(liquidacion.cashPayments || 0);
              const totalSpent = Number(liquidacion.totalSpent || 0);
              mensajerosConsolidados.set(mensajeroKey, {
                mensajero: mensajeroKey,
                pedidos: liquidacion.pedidos || [],
                totalCollected: Number(liquidacion.totalCollected || 0),
                sinpePayments: Number(liquidacion.sinpePayments || 0),
                cashPayments: cashPayments,
                tarjetaPayments: Number(liquidacion.tarjetaPayments || 0),
                totalSpent: totalSpent,
                initialAmount: initialAmount,
                finalAmount: initialAmount + cashPayments - totalSpent,
                gastos: liquidacion.gastos || [],
                isLiquidated: liquidacion.isLiquidated || false
              });
            }
          });
        });
        
        liquidacionesReales = Array.from(mensajerosConsolidados.values());
      } else {
        // Modo normal: una sola fecha
        let fechaParaUsar = selectedDate;
        if (!fechaParaUsar) {
          const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
          fechaParaUsar = getCostaRicaDateISO();
        }
        
        liquidacionesReales = await getLiquidacionesReales(fechaParaUsar);
      }
      
      // Paso 2: Procesar pedidos
      if (!isReload) {
        updateStep('mensajeros', { status: 'completed' });
        updateStep('pedidos', { status: 'loading' });
      }
      
      // Convertir a formato LiquidationCalculation
      // IMPORTANTE: Verificar el estado de liquidación para cada mensajero
      const { checkLiquidationStatus } = await import('@/lib/supabase-pedidos');
      let fechaParaUsar = selectedDate;
      if (!fechaParaUsar && !quickFilterRange) {
        const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
        fechaParaUsar = getCostaRicaDateISO();
      }
      
      // Si hay un rango, usar la fecha de inicio para mostrar
      const fechaParaMostrar = quickFilterRange ? quickFilterRange.start : fechaParaUsar;
      
      const calculationsData: LiquidationCalculation[] = await Promise.all(
        liquidacionesReales.map(async (liquidacion) => {
          // Si hay rango, no verificar estado (ya está consolidado)
          // Si no hay rango, verificar estado de liquidación
          let isLiquidated = liquidacion.isLiquidated;
          if (!quickFilterRange && fechaParaUsar) {
            isLiquidated = await checkLiquidationStatus(liquidacion.mensajero, fechaParaUsar);
          }
          
          return {
            messengerId: liquidacion.mensajero,
            messengerName: liquidacion.mensajero,
            routeDate: fechaParaMostrar || fechaParaUsar,
            initialAmount: 0, // Se puede editar después
            totalCollected: liquidacion.totalCollected || 0,
            totalSpent: liquidacion.totalSpent || 0,
            sinpePayments: liquidacion.sinpePayments || 0,
            cashPayments: liquidacion.cashPayments || 0,
            tarjetaPayments: liquidacion.tarjetaPayments || 0,
            finalAmount: (liquidacion.totalCollected || 0) - (liquidacion.totalSpent || 0),
            orders: liquidacion.pedidos || [],
            isLiquidated: isLiquidated, // Usar el estado verificado
            canEdit: !isLiquidated
          };
        })
      );
      
      // Paso 3: Finalizar cálculos
      if (!isReload) {
        updateStep('pedidos', { status: 'completed' });
        updateStep('calculations', { status: 'loading' });
      }
      
      // Separar cálculos de PRUEBA del resto
      const { pruebaCalculation, otherCalculations } = separatePruebaCalculations(calculationsData);
      
      // Establecer cálculos sin PRUEBA
      setCalculations(otherCalculations);
      
      // Calcular y establecer métricas de PRUEBA
      const pruebaMetricsData = calculatePruebaMetrics(pruebaCalculation);
      setPruebaMetrics(pruebaMetricsData);
      
      // Paso 4: Finalización
      if (!isReload) {
        updateStep('calculations', { status: 'completed' });
        updateStep('finalization', { status: 'loading' });
      }
      
      // Simular un pequeño delay para mostrar el progreso
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isReload) {
        updateStep('finalization', { status: 'completed' });
        
        // Cerrar el loader automáticamente después de un pequeño delay
      setTimeout(() => {
        closeLoader();
        }, 1000);
      }
      
      setIsLoadingData(false);
      
        if (isReload) {
        }
      
    } catch (error) {
      console.error('❌ Error en loadCalculations:', error);
      setIsLoadingData(false);
      setCalculations([]);
      
      // Cerrar el loader en caso de error
      if (!isReload) {
        closeLoader();
      }
    }
  };

  const loadTiendaCalculations = async () => {
    try {
      
      let liquidacionesReales = [];
      
      // Si está habilitado el rango de fechas para tiendas, obtener datos del rango
      if (usarRangoFechas && tiendaFechaInicio && tiendaFechaFin) {
        setLoadingRangoFechas(true);
        
        // Obtener datos de cada fecha en el rango y consolidarlos
        const fechas: string[] = [];
        const fechaInicio = new Date(tiendaFechaInicio + 'T00:00:00');
        const fechaFin = new Date(tiendaFechaFin + 'T23:59:59');
        
        for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha = new Date(fecha.getTime() + 24 * 60 * 60 * 1000)) {
          fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        // Obtener datos de cada fecha
        const promesasFechas = fechas.map(fecha => getLiquidacionesRealesByTienda(fecha));
        const resultadosFechas = await Promise.all(promesasFechas);
        
        // Consolidar datos por tienda
        const tiendasConsolidadas = new Map();
        
        resultadosFechas.forEach((liquidacionesFecha, index) => {
          liquidacionesFecha.forEach(liquidacion => {
            // Validar y limpiar datos
            const tiendaKey = typeof liquidacion.tienda === 'string' ? liquidacion.tienda.trim() : String(liquidacion.tienda || '').trim();
            
            if (!tiendaKey) {
              console.warn('⚠️ Liquidación sin tienda válida:', liquidacion);
              return;
            }
            
            if (tiendasConsolidadas.has(tiendaKey)) {
              const existente = tiendasConsolidadas.get(tiendaKey);
              existente.totalOrders += Number(liquidacion.orders?.length || 0);
              existente.totalValue += Number(liquidacion.totalValue || 0);
              existente.totalCollected += Number(liquidacion.totalCollected || 0);
              existente.sinpePayments += Number(liquidacion.sinpePayments || 0);
              existente.cashPayments += Number(liquidacion.cashPayments || 0);
              existente.tarjetaPayments += Number(liquidacion.tarjetaPayments || 0);
              existente.totalSpent += Number(liquidacion.totalSpent || 0);
              existente.finalAmount += Number(liquidacion.finalAmount || 0);
              existente.deliveredOrders += Number(liquidacion.deliveredOrders || 0);
              existente.pendingOrders += Number(liquidacion.pendingOrders || 0);
              existente.returnedOrders += Number(liquidacion.returnedOrders || 0);
              existente.rescheduledOrders += Number(liquidacion.rescheduledOrders || 0);
              existente.orders = [...existente.orders, ...(liquidacion.orders || [])];
            } else {
              // Mapear el tipo de la función al tipo esperado
              tiendasConsolidadas.set(tiendaKey, {
                tienda: tiendaKey,
                routeDate: fechas[index] || '',
                totalOrders: Number(liquidacion.orders?.length || 0),
                totalValue: Number(liquidacion.totalValue || 0),
                totalCollected: Number(liquidacion.totalCollected || 0),
                totalSpent: Number(liquidacion.totalSpent || 0),
                sinpePayments: Number(liquidacion.sinpePayments || 0),
                cashPayments: Number(liquidacion.cashPayments || 0),
                tarjetaPayments: Number(liquidacion.tarjetaPayments || 0),
                finalAmount: Number(liquidacion.finalAmount || 0),
                orders: liquidacion.orders || [],
                isLiquidated: false,
                canEdit: true,
                deliveredOrders: Number(liquidacion.deliveredOrders || 0),
                pendingOrders: Number(liquidacion.pendingOrders || 0),
                returnedOrders: Number(liquidacion.returnedOrders || 0),
                rescheduledOrders: Number(liquidacion.rescheduledOrders || 0),
                averageOrderValue: Number(liquidacion.averageOrderValue || 0),
                topMessenger: String(liquidacion.topMessenger || ''),
                topDistrict: String(liquidacion.topDistrict || ''),
                gastos: liquidacion.gastos || []
              });
            }
          });
        });
        
        // Recalcular finalAmount para ALL STARS después de consolidar
        liquidacionesReales = Array.from(tiendasConsolidadas.values()).map(liquidacion => {
          const esAllStars = liquidacion.tienda?.toUpperCase().includes('ALL STARS') || 
                             liquidacion.tienda?.toUpperCase().includes('MAGIC STARS');
          
          if (esAllStars) {
            // Para ALL STARS: recalcular finalAmount = cashPayments - totalSpent
            liquidacion.finalAmount = liquidacion.cashPayments - (liquidacion.totalSpent || 0);
          }
          // Para otras tiendas, el finalAmount ya está correcto (totalCollected)
          
          return liquidacion;
        });
        
      } else {
        // Usar fecha simple
      let fechaParaUsar = selectedDate;
      if (!fechaParaUsar) {
        const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
        fechaParaUsar = getCostaRicaDateISO();
      }
      
        liquidacionesReales = await getLiquidacionesRealesByTienda(fechaParaUsar);
      }
      
      
      setTiendaCalculations(liquidacionesReales as unknown as TiendaLiquidationCalculation[]);
      
    } catch (error) {
      console.error('❌ Error en loadTiendaCalculations:', error);
      setTiendaCalculations([]);
    } finally {
      setLoadingRangoFechas(false);
    }
  };

  const loadPendingLiquidations = async () => {
    try {
      console.log('🚀 Obteniendo liquidaciones pendientes...');
      
      const response = await fetch("https://primary-production-85ff.up.railway.app/webhook/alerta-liquidaciones-vencidas", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const pendingLiquidationsRaw = await response.json();
      
      console.log('📋 Liquidaciones pendientes obtenidas:', pendingLiquidationsRaw);
      console.log('📊 Total de liquidaciones pendientes:', Array.isArray(pendingLiquidationsRaw) ? pendingLiquidationsRaw.length : 'No es un array');
      
      // Guardar liquidaciones pendientes para la notificación
      if (Array.isArray(pendingLiquidationsRaw) && pendingLiquidationsRaw.length > 0) {
        // Obtener datos completos de liquidación para cada fecha/mensajero
        const { getLiquidacionesReales } = await import('@/lib/supabase-pedidos');
        
        // Agrupar por fecha única para optimizar las consultas
        const fechasUnicas = Array.from(new Set(pendingLiquidationsRaw.map((liq: any) => liq.fecha)));
        
        // Crear un mapa para almacenar las liquidaciones completas por fecha
        const liquidacionesCompletasMap = new Map<string, Map<string, any>>();
        
        // Obtener liquidaciones completas para cada fecha
        for (const fecha of fechasUnicas) {
          try {
            const liquidacionesDeFecha = await getLiquidacionesReales(fecha);
            const liquidacionesMap = new Map<string, any>();
            
            liquidacionesDeFecha.forEach(liq => {
              liquidacionesMap.set(liq.mensajero.toUpperCase(), {
                totalCollected: liq.totalCollected,
                cashPayments: liq.cashPayments,
                initialAmount: liq.initialAmount,
                finalAmount: liq.finalAmount,
                totalSpent: liq.totalSpent
              });
            });
            
            liquidacionesCompletasMap.set(fecha, liquidacionesMap);
          } catch (error) {
            console.error(`❌ Error obteniendo liquidaciones para fecha ${fecha}:`, error);
          }
        }
        
        // Combinar los datos básicos con los datos completos
        const pendingLiquidationsWithData = pendingLiquidationsRaw.map((liquidation: any) => {
          const fecha = liquidation.fecha;
          const mensajero = liquidation.mensajero?.toUpperCase() || '';
          const liquidacionesDeFecha = liquidacionesCompletasMap.get(fecha);
          const liquidacionCompleta = liquidacionesDeFecha?.get(mensajero);
          
          if (liquidacionCompleta) {
            return {
              ...liquidation,
              total_recaudado: liquidacionCompleta.totalCollected || liquidation.total_recaudado || '0',
              plata_inicial: liquidacionCompleta.initialAmount?.toString() || '0',
              monto_final: liquidacionCompleta.finalAmount?.toString() || '0',
              cashPayments: liquidacionCompleta.cashPayments || 0,
              totalSpent: liquidacionCompleta.totalSpent || 0
            };
          }
          
          // Si no se encontraron datos completos, usar los datos básicos
          return {
            ...liquidation,
            total_recaudado: liquidation.total_recaudado || '0',
            plata_inicial: '0',
            monto_final: '0'
          };
        });
        
        setPendingLiquidations(pendingLiquidationsWithData);
        setShowPendingNotification(true);
      } else {
        setPendingLiquidations([]);
        setShowPendingNotification(false);
      }
      
      // Mostrar detalles de cada liquidación pendiente
      if (Array.isArray(pendingLiquidationsRaw)) {
        pendingLiquidationsRaw.forEach((liquidation, index) => {
          console.log(`📄 Liquidación ${index + 1}:`, {
            fecha: liquidation.fecha,
            mensajero: liquidation.mensajero,
            total_recaudado: liquidation.total_recaudado,
            ya_liquidado: liquidation.ya_liquidado,
            created_at: liquidation.created_at
          });
        });
      } else {
        console.log('⚠️ La respuesta no es un array:', pendingLiquidationsRaw);
      }

      return pendingLiquidationsRaw;
      
    } catch (error) {
      console.error('❌ Error obteniendo liquidaciones pendientes:', error);
      return [];
    }
  };

  const handleViewExpenses = async (calculation: LiquidationCalculation | TiendaLiquidationCalculation) => {
    try {
      const { getGastosMensajeros } = await import('@/lib/supabase-pedidos');
      const gastosData = await getGastosMensajeros(calculation.routeDate);
      
      const nombre = 'messengerName' in calculation ? calculation.messengerName : calculation.tienda;
      const gastosDelMensajero = gastosData.find(g => g.mensajero === nombre);
      
      setSelectedExpenses({
        mensajero: nombre,
        gastos: gastosDelMensajero?.gastos || []
      });
      setShowExpensesModal(true);
    } catch (error) {
      console.error('Error obteniendo gastos:', error);
      const nombre = 'messengerName' in calculation ? calculation.messengerName : calculation.tienda;
      setSelectedExpenses({
        mensajero: nombre,
        gastos: []
      });
      setShowExpensesModal(true);
    }
  };

  const handleViewAllExpenses = async () => {
    try {
      setLoadingAllExpenses(true);
      const { getGastosMensajeros } = await import('@/lib/supabase-pedidos');
      
      // Usar la fecha seleccionada en lugar de la fecha actual
      let fechaParaUsar = selectedDate;
      if (!fechaParaUsar) {
        const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
        fechaParaUsar = getCostaRicaDateISO();
      }
      
      console.log('Buscando gastos para la fecha:', fechaParaUsar);
      const gastosData = await getGastosMensajeros(fechaParaUsar);
      console.log('Gastos encontrados:', gastosData);
      
      setAllExpensesData(gastosData);
      setShowAllExpensesModal(true);
    } catch (error) {
      console.error('Error obteniendo gastos de todos los mensajeros:', error);
      setAllExpensesData([]);
      setShowAllExpensesModal(true);
    } finally {
      setLoadingAllExpenses(false);
    }
  };

  const handleViewPendingOrders = (calculation: LiquidationCalculation | TiendaLiquidationCalculation) => {
    const pendingOrders = calculation.orders.filter(pedido => 
      pedido.estado_pedido !== 'ENTREGADO'
    );
    
    const nombre = 'messengerName' in calculation ? calculation.messengerName : calculation.tienda;
    setSelectedPendingOrders({
      mensajero: nombre,
      pedidos: pendingOrders
    });
    setShowPendingOrdersModal(true);
  };

  const handleViewSinpeOrders = (calculation: LiquidationCalculation | TiendaLiquidationCalculation) => {
    const sinpeOrders = calculation.orders.filter(pedido => 
      pedido.estado_pedido === 'ENTREGADO' && pedido.metodo_pago === 'SINPE'
    );
    setSelectedSinpeOrders(sinpeOrders);
    setShowSinpeModal(true);
  };

  const handleViewTarjetaOrders = (calculation: LiquidationCalculation | TiendaLiquidationCalculation) => {
    const tarjetaOrders = calculation.orders.filter(pedido => 
      pedido.estado_pedido === 'ENTREGADO' && pedido.metodo_pago === 'TARJETA'
    );
    setSelectedTarjetaOrders(tarjetaOrders);
    setShowTarjetaModal(true);
  };

  const handleViewDevolverOrders = () => {
    // Obtener solo los pedidos del mensajero actual que necesitan ser devueltos
    if (!selectedViewAndLiquidate) return;
    
    const devolverOrders = selectedViewAndLiquidate.orders.filter(pedido => 
      pedido.estado_pedido === 'PENDIENTE' || 
      pedido.estado_pedido === 'REAGENDADO' || 
      pedido.estado_pedido === 'DEVOLUCION'
    );
    setSelectedDevolverOrders(devolverOrders);
    setShowDevolverModal(true);
  };

  const handleViewPruebaLiquidation = async () => {
    try {
      // Hacer consulta simple como los otros mensajeros
      const { getLiquidacionesReales } = await import('@/lib/supabase-pedidos');
      const liquidacionesReales = await getLiquidacionesReales(selectedDate);
      
      // Buscar específicamente la liquidación de PRUEBA
      const pruebaLiquidation = liquidacionesReales.find(liq => 
        liq.mensajero?.toUpperCase() === 'PRUEBA'
      );
      
      if (pruebaLiquidation) {
        // Crear el cálculo con los pedidos reales
        const pruebaCalculation: LiquidationCalculation = {
          messengerId: 'PRUEBA',
          messengerName: 'PRUEBA',
          routeDate: selectedDate,
          initialAmount: pruebaLiquidation.initialAmount,
          totalCollected: pruebaLiquidation.totalCollected,
          totalSpent: pruebaLiquidation.totalSpent,
          sinpePayments: pruebaLiquidation.sinpePayments,
          cashPayments: pruebaLiquidation.cashPayments,
          tarjetaPayments: pruebaLiquidation.tarjetaPayments,
          finalAmount: pruebaLiquidation.finalAmount,
          orders: pruebaLiquidation.pedidos || [], // Pedidos reales
          isLiquidated: pruebaLiquidation.isLiquidated,
          canEdit: true
        };
        setSelectedViewAndLiquidate(pruebaCalculation);
        setShowViewAndLiquidateModal(true);
      } else {
        // Si no se encuentra, crear uno temporal con los datos de pruebaMetrics
        const tempPruebaCalculation: LiquidationCalculation = {
          messengerId: 'PRUEBA',
          messengerName: 'PRUEBA',
          routeDate: selectedDate,
          initialAmount: 0,
          totalCollected: pruebaMetrics?.totalCollected || 0,
          totalSpent: pruebaMetrics?.totalSpent || 0,
          sinpePayments: pruebaMetrics?.sinpePayments || 0,
          cashPayments: pruebaMetrics?.cashPayments || 0,
          tarjetaPayments: pruebaMetrics?.tarjetaPayments || 0,
          finalAmount: pruebaMetrics?.finalAmount || 0,
          orders: [], // Sin pedidos disponibles
          isLiquidated: false,
          canEdit: true
        };
        setSelectedViewAndLiquidate(tempPruebaCalculation);
        setShowViewAndLiquidateModal(true);
      }
    } catch (error) {
      console.error('Error cargando liquidación de PRUEBA:', error);
    }
  };

  const handleEditOrderStatus = (pedido: PedidoTest) => {
    setSelectedOrderForUpdate(pedido);
    setNewStatus(pedido.estado_pedido || 'ENTREGADO');
    setStatusComment('');
    setPaymentMethod(pedido.metodo_pago || 'efectivo');
    setIsUpdateStatusModalOpen(true);
  };

  const handleViewPedidoComprobante = (pedido: PedidoTest) => {
    // Función para ver comprobantes de pedidos
    if (pedido.metodo_pago === 'SINPE') {
      // Usar la URL del comprobante SINPE del pedido
      if (pedido.comprobante_sinpe) {
        window.open(pedido.comprobante_sinpe, '_blank');
      } else {
        alert(`No hay comprobante SINPE disponible para el pedido ${pedido.id_pedido}`);
      }
    } else if (pedido.metodo_pago === 'TARJETA') {
      // Para tarjeta, usar la URL del comprobante si existe
      if (pedido.comprobante_sinpe) {
        window.open(pedido.comprobante_sinpe, '_blank');
      } else {
        alert(`No hay comprobante de tarjeta disponible para el pedido ${pedido.id_pedido}`);
      }
    } else if (pedido.metodo_pago === '2PAGOS') {
      // Para 2 pagos, mostrar el comprobante SINPE (ya que es el único comprobante que tienen)
      if (pedido.comprobante_sinpe) {
        window.open(pedido.comprobante_sinpe, '_blank');
      } else {
        alert(`No hay comprobante SINPE disponible para el pedido ${pedido.id_pedido}`);
      }
    } else {
      alert(`Ver comprobante del pedido ${pedido.id_pedido}`);
    }
  };


  // Función para separar cálculos de PRUEBA del resto
  const separatePruebaCalculations = (allCalculations: LiquidationCalculation[]) => {
    const pruebaCalculation = allCalculations.find(c => c.messengerName?.toUpperCase() === 'PRUEBA');
    const otherCalculations = allCalculations.filter(c => c.messengerName?.toUpperCase() !== 'PRUEBA');
    
    return { pruebaCalculation, otherCalculations };
  };

  // Función para calcular métricas de PRUEBA
  const calculatePruebaMetrics = (pruebaCalculation: LiquidationCalculation | undefined) => {
    if (!pruebaCalculation) return null;
    
    const calculated = calculateLiquidation(pruebaCalculation);
    
    // Calcular total de 2 pagos
    const dosPagosPayments = pruebaCalculation.orders.reduce((sum, order) => {
      if (order.estado_pedido === 'ENTREGADO' && order.metodo_pago === '2PAGOS') {
        const efectivoAmount = parseFloat(order.efectivo_2_pagos || '0');
        const sinpeAmount = parseFloat(order.sinpe_2_pagos || '0');
        return sum + efectivoAmount + sinpeAmount;
      }
      return sum;
    }, 0);
    
    return {
      totalOrders: pruebaCalculation.orders.length,
      totalCollected: calculated.totalCollected,
      cashPayments: calculated.cashPayments,
      sinpePayments: calculated.sinpePayments,
      tarjetaPayments: calculated.tarjetaPayments,
      dosPagosPayments,
      totalSpent: calculated.totalSpent,
      finalAmount: calculated.finalAmount
    };
  };

  const calculateLiquidation = (calculation: LiquidationCalculation): LiquidationCalculation => {
    const totalCollected = calculation.orders.reduce((sum, order) => {
      if (order.estado_pedido === 'ENTREGADO') {
        return sum + order.valor_total;
      }
      return sum;
    }, 0);

    const sinpePayments = calculation.orders.reduce((sum, order) => {
      if (order.estado_pedido === 'ENTREGADO') {
        if (order.metodo_pago === 'SINPE') {
        return sum + order.valor_total;
        } else if (order.metodo_pago === '2PAGOS') {
          // Para pedidos con 2 pagos, sumar solo la parte de SINPE
          const sinpeAmount = parseFloat(order.sinpe_2_pagos || '0');
          return sum + sinpeAmount;
        }
      }
      return sum;
    }, 0);

    const cashPayments = calculation.orders.reduce((sum, order) => {
      if (order.estado_pedido === 'ENTREGADO') {
        if (order.metodo_pago === 'EFECTIVO') {
        return sum + order.valor_total;
        } else if (order.metodo_pago === '2PAGOS') {
          // Para pedidos con 2 pagos, sumar solo la parte de efectivo
          const efectivoAmount = parseFloat(order.efectivo_2_pagos || '0');
          return sum + efectivoAmount;
        }
      }
      return sum;
    }, 0);

    const tarjetaPayments = calculation.orders.reduce((sum, order) => {
      if (order.estado_pedido === 'ENTREGADO' && order.metodo_pago === 'TARJETA') {
        return sum + order.valor_total;
      }
      return sum;
    }, 0);

    return {
      ...calculation,
      totalCollected,
      sinpePayments,
      cashPayments,
      tarjetaPayments,
      finalAmount: calculation.initialAmount + cashPayments - calculation.totalSpent
    };
  };

  const handleLiquidateRoute = async (liquidationId: string) => {
    try {
      setLiquidating(liquidationId);
      await mockApi.liquidateRoute(liquidationId, adminNotes);
      setAdminNotes('');
      await loadData();
    } catch (error) {
      console.error('Error liquidating route:', error);
      alert('Error al liquidar la ruta: ' + (error as Error).message);
    } finally {
      setLiquidating(null);
    }
  };

  const handleEditInitialAmount = (messengerId: string, currentAmount: number) => {
    const newAmount = prompt('Ingrese el monto inicial:', currentAmount.toString());
    if (newAmount === null) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    setCalculations(prev => 
      prev.map(calc => 
        calc.messengerId === messengerId 
          ? { ...calc, initialAmount: amount }
          : calc
      )
    );
  };

  const handleViewAndLiquidate = async (calculation: LiquidationCalculation) => {
    // Abrir modal inmediatamente para mejor UX
    setSelectedViewAndLiquidate(calculation);
    setShowViewAndLiquidateModal(true);
    
    // Verificar estado de liquidación en background y actualizar
    try {
      const { checkLiquidationStatus } = await import('@/lib/supabase-pedidos');
      const fechaParaVerificar = selectedDate || calculation.routeDate;
      const isCompleted = await checkLiquidationStatus(calculation.messengerName, fechaParaVerificar);
      setIsLiquidationCompleted(isCompleted);
      
      // Actualizar el estado en el cálculo seleccionado y en la lista
      const updatedCalculation = { ...calculation, isLiquidated: isCompleted, canEdit: !isCompleted };
      setSelectedViewAndLiquidate(updatedCalculation);
      
      setCalculations(prev => 
        prev.map(calc => 
          calc.messengerId === calculation.messengerId 
            ? { ...calc, isLiquidated: isCompleted, canEdit: !isCompleted }
            : calc
        )
      );
      
    } catch (error) {
      console.error('❌ Error verificando estado de liquidación:', error);
      setIsLiquidationCompleted(false);
    }
  };

  const handleViewTiendaLiquidation = async (tiendaCalculation: TiendaLiquidationCalculation) => {
    try {
      
      // Convertir TiendaLiquidationCalculation a LiquidationCalculation para el modal
      // Determinar si es ALL STARS o MAGIC STARS
      const esAllStars = tiendaCalculation.tienda?.toUpperCase().includes('ALL STARS') || 
                         tiendaCalculation.tienda?.toUpperCase().includes('MAGIC STARS');
      
      const calculation: LiquidationCalculation = {
        messengerId: tiendaCalculation.tienda,
        messengerName: tiendaCalculation.tienda,
        routeDate: selectedDate,
        initialAmount: 0,
        totalCollected: tiendaCalculation.totalCollected,
        totalSpent: tiendaCalculation.totalSpent || 0,
        cashPayments: tiendaCalculation.cashPayments,
        sinpePayments: tiendaCalculation.sinpePayments,
        tarjetaPayments: tiendaCalculation.tarjetaPayments || 0,
        // Solo restar gastos si es ALL STARS o MAGIC STARS, para otras tiendas el monto final es el total recaudado
        finalAmount: esAllStars 
          ? tiendaCalculation.cashPayments - (tiendaCalculation.totalSpent || 0)
          : tiendaCalculation.totalCollected,
        orders: tiendaCalculation.orders || [],
        isLiquidated: false,
        canEdit: true
      };

    
    setSelectedViewAndLiquidate(calculation);
    setShowViewAndLiquidateModal(true);
      
    } catch (error) {
      console.error('❌ Error abriendo liquidación de tienda:', error);
    }
  };



  const confirmLiquidation = async (calculation: LiquidationCalculation, initialAmount?: number) => {
    try {
      const fechaParaEnviar = selectedDate || calculation.routeDate;
      const plataInicial = initialAmount || 0;
      const montoFinal = plataInicial + calculation.cashPayments - calculation.totalSpent;
      
      const liquidationData = {
        mensajero: calculation.messengerName,
        fecha: fechaParaEnviar,
        plata_inicial: plataInicial,
        total_recaudado: calculation.totalCollected,
        total_gastos: calculation.totalSpent,
        monto_final: montoFinal,
        pedidos_entregados: calculation.orders.filter(o => o.estado_pedido === 'ENTREGADO').length,
        pedidos_total: calculation.orders.length,
        pagos_efectivo: calculation.cashPayments,
        pagos_sinpe: calculation.sinpePayments,
        pagos_tarjeta: calculation.tarjetaPayments
      };

      const response = await fetch("https://primary-production-85ff.up.railway.app/webhook/add-liquidacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(liquidationData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Si ya existe la liquidación, marcamos como liquidada localmente
        if (responseData.error && responseData.error.includes('duplicate key value violates unique constraint')) {
      setCalculations(prev => 
        prev.map(calc => 
          calc.messengerId === calculation.messengerId 
                ? { ...calc, isLiquidated: true }
            : calc
        )
      );
      
          setSuccessMessage(`Liquidación de ${calculation.messengerName} ya existía y se marcó como completada`);
          setModalType('success');
        } else {
          throw new Error(`Error: ${responseData.error || responseData.message || response.status}`);
        }
      } else {
        setCalculations(prev => 
          prev.map(calc => 
            calc.messengerId === calculation.messengerId 
              ? { ...calc, isLiquidated: true }
              : calc
          )
        );
        
        setSuccessMessage(`Liquidación de ${calculation.messengerName} confirmada exitosamente`);
        setModalType('success');
      }
      
      setShowSuccessModal(true);
      setShowViewAndLiquidateModal(false);
      setSelectedViewAndLiquidate(null);
      
      setTimeout(() => {
        setShowSuccessModal(false);
        loadCalculations(true); // Recargar datos
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setModalType('error');
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 5000);
    }
  };

  // Función para manejar la subida de archivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'communication') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (type === 'receipt') {
          setUploadedReceipts(prev => [...prev, result]);
        } else {
          setUploadedCommunicationProof(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Función específica para comprobantes de pagos duales
  const handleDualPaymentFileUpload = (e: React.ChangeEvent<HTMLInputElement>, paymentType: 'first' | 'second') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (paymentType === 'first') {
        setFirstPaymentReceipt(result);
      } else {
        setSecondPaymentReceipt(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrderForUpdate || !newStatus) return;
    
    try {
      setUpdatingOrder(selectedOrderForUpdate.id_pedido);
      setIsUpdatingOrder(true);
      setUpdateOrderMessage('Actualizando estado del pedido...');
      
      // Construir datos del método de pago y pagos detalle (igual que en mensajeros)
      let metodoPagoData: string | null = null;
      let pagosDetalle: any = null;

      // Solo asignar método de pago si el estado es ENTREGADO
      if (newStatus === 'ENTREGADO') {
        if (paymentMethod === 'efectivo') {
          metodoPagoData = 'efectivo';
          pagosDetalle = null;
        } else if (paymentMethod === 'sinpe') {
          metodoPagoData = 'sinpe';
          pagosDetalle = {
            comprobante: uploadedReceipts[0] || null
          };
        } else if (paymentMethod === 'tarjeta') {
          metodoPagoData = 'tarjeta';
          pagosDetalle = {
            comprobante: uploadedReceipts[0] || null
          };
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
      } else {
        // Para cualquier otro estado (DEVOLUCION, REAGENDADO, etc.), método de pago null
        metodoPagoData = null;
        pagosDetalle = null;
        console.log('🔍 Método de pago establecido a NULL para estado:', newStatus);
      }

      const webhookData = {
        // Datos ya conocidos desde antes
        idPedido: selectedOrderForUpdate.id_pedido,
        mensajero: selectedOrderForUpdate.mensajero_concretado || selectedOrderForUpdate.mensajero_asignado || 'SIN_ASIGNAR',
        usuario: user?.name || 'Admin', // Usuario que realiza la acción
        
        // Datos tomados del formulario
        estadoPedido: newStatus === 'REAGENDADO' ? 'REAGENDO' : newStatus,
        metodoPago: metodoPagoData,
        pagosDetalle: pagosDetalle,
        nota: statusComment || '',
        
        // Datos específicos para reagendado
        reagendadoComoCambio: newStatus === 'REAGENDADO' ? isReagendadoAsChange : false,
        fechaReagendado: newStatus === 'REAGENDADO' && reagendadoDate ? reagendadoDate.toISOString().split('T')[0] : null,
        
        // Datos adicionales del pedido
        clienteNombre: selectedOrderForUpdate.cliente_nombre,
        clienteTelefono: selectedOrderForUpdate.cliente_telefono || '',
        direccion: selectedOrderForUpdate.direccion || '',
        provincia: selectedOrderForUpdate.provincia || '',
        canton: selectedOrderForUpdate.canton || '',
        distrito: selectedOrderForUpdate.distrito || '',
        valorTotal: selectedOrderForUpdate.valor_total,
        productos: selectedOrderForUpdate.productos || 'No especificados',
        
        // Base64 para imagen (CON prefijo data:image/...;base64,)
        imagenBase64: uploadedReceipts.length > 0 ? uploadedReceipts[0] : uploadedCommunicationProof || null,
        mimeType: uploadedReceipts.length > 0 || uploadedCommunicationProof ? "image/jpeg" : null
      };

      // Log para confirmar que se envía null cuando corresponde
      console.log('📤 WebhookData - metodoPago:', webhookData.metodoPago, 'pagosDetalle:', webhookData.pagosDetalle);

      // Log detallado del cambio de estado (igual que en mensajeros)
      console.log('🔄 ===== CAMBIO DE ESTADO DE PEDIDO (ADMIN) =====');
      console.log('📦 PEDIDO COMPLETO:', {
        id: selectedOrderForUpdate.id_pedido,
        cliente: selectedOrderForUpdate.cliente_nombre,
        telefono: selectedOrderForUpdate.cliente_telefono || '',
        direccion: `${selectedOrderForUpdate.direccion || ''}, ${selectedOrderForUpdate.distrito || ''}, ${selectedOrderForUpdate.canton || ''}, ${selectedOrderForUpdate.provincia || ''}`,
        valor: selectedOrderForUpdate.valor_total,
        productos: selectedOrderForUpdate.productos || 'No especificados',
        estadoAnterior: selectedOrderForUpdate.estado_pedido,
        estadoNuevo: newStatus,
        estadoEnviadoAlBackend: newStatus === 'REAGENDADO' ? 'REAGENDO' : newStatus,
        mensajero: selectedOrderForUpdate.mensajero_concretado || selectedOrderForUpdate.mensajero_asignado || 'SIN_ASIGNAR',
        usuario: user?.name || 'Admin',
        nota: statusComment || '',
        fechaReagendado: newStatus === 'REAGENDADO' && reagendadoDate ? reagendadoDate.toISOString().split('T')[0] : null,
        reagendadoComoCambio: newStatus === 'REAGENDADO' ? isReagendadoAsChange : false,
        metodoPago: metodoPagoData,
        tieneEvidencia: uploadedCommunicationProof ? 'Sí' : 'No',
        tieneComprobante: uploadedReceipts.length > 0 ? 'Sí' : 'No'
      });
      
      // Log específico para pagos: distinguir simple vs 2 pagos para evitar acceder a propiedades inexistentes
      if (pagosDetalle) {
        const esDosPagos = Boolean((pagosDetalle as any).primerPago && (pagosDetalle as any).segundoPago);
        if (esDosPagos) {
          console.log('💰 PAGOS DUALES DETALLE (ADMIN):');
          console.log('🔍 Primer pago:', {
            metodo: (pagosDetalle as any).primerPago.metodo,
            monto: (pagosDetalle as any).primerPago.monto,
            tieneComprobante: !!(pagosDetalle as any).primerPago.comprobante
          });
          console.log('🔍 Segundo pago:', {
            metodo: (pagosDetalle as any).segundoPago.metodo,
            monto: (pagosDetalle as any).segundoPago.monto,
            tieneComprobante: !!(pagosDetalle as any).segundoPago.comprobante
          });
        } else {
          console.log('💳 PAGO SIMPLE DETALLE (ADMIN):', pagosDetalle);
        }
      }
      
      console.log('🔄 ===========================================');

      // Log del Base64 para debugging
      if (webhookData.imagenBase64) {
        console.log('🔍 Base64 con prefijo para webhook (ADMIN):');
        console.log('📏 Longitud del Base64 completo:', webhookData.imagenBase64.length);
        console.log('🔍 Muestra del Base64:', webhookData.imagenBase64.substring(0, 100) + '...');
        console.log('✅ Enviando CON prefijo data:image/...;base64,');
      } else {
        console.log('ℹ️ No hay imagen Base64 para enviar (ADMIN)');
      }
      
      console.log('🚀 Enviando datos al webhook (ADMIN):', {
        ...webhookData,
        imagenBase64: webhookData.imagenBase64 ? `[${webhookData.imagenBase64.length} caracteres]` : null
      });

      const response = await fetch("https://primary-production-85ff.up.railway.app/webhook/actualizar-pedido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookData)
      });

      const resultado = await response.json();
      console.log("📡 Respuesta del webhook (ADMIN):", resultado);
      
      if (!response.ok) {
        console.error('❌ Error en la respuesta del webhook (ADMIN):', resultado);
        throw new Error(`Error del servidor: ${resultado.message || 'Error desconocido'}`);
      } else {
        console.log('✅ Webhook ejecutado exitosamente (ADMIN)');
      }

      if (response.ok) {
        setUpdateOrderMessage('Pedido actualizado exitosamente. Recargando datos...');
        
        // Actualizar el estado local inmediatamente para reflejar el cambio
        console.log('🔄 Actualización optimista - Estado:', newStatus, 'Método:', paymentMethod);
        setCalculations(prevCalculations => 
          prevCalculations.map(calc => {
            if (calc.messengerName?.toUpperCase() === (selectedOrderForUpdate.mensajero_concretado || selectedOrderForUpdate.mensajero_asignado)?.toUpperCase()) {
              return {
                ...calc,
                orders: calc.orders.map(order => 
                  order.id_pedido === selectedOrderForUpdate.id_pedido 
                    ? { 
                        ...order, 
                        estado_pedido: newStatus,
                        metodo_pago: newStatus === 'ENTREGADO' ? paymentMethod?.toUpperCase() : order.metodo_pago,
                        comprobante_sinpe: newStatus === 'ENTREGADO' && paymentMethod === 'sinpe' && uploadedReceipts[0] ? uploadedReceipts[0] : order.comprobante_sinpe
                      }
                    : order
                )
              };
            }
            return calc;
          })
        );

        // También actualizar el selectedViewAndLiquidate si está abierto
        if (selectedViewAndLiquidate) {
          setSelectedViewAndLiquidate(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              orders: prev.orders.map(order => 
                order.id_pedido === selectedOrderForUpdate.id_pedido 
                  ? { 
                      ...order, 
                      estado_pedido: newStatus,
                      metodo_pago: newStatus === 'ENTREGADO' ? paymentMethod?.toUpperCase() : order.metodo_pago,
                      comprobante_sinpe: newStatus === 'ENTREGADO' && paymentMethod === 'sinpe' && uploadedReceipts[0] ? uploadedReceipts[0] : order.comprobante_sinpe
                    }
                  : order
              )
            };
          });
        }

        // Recargar datos en background para sincronizar con la base de datos
        loadCalculations(true).catch(error => {
          console.error('Error recargando datos:', error);
        });
        
        // Mostrar modal de éxito
        setUpdateOrderMessage('¡Pedido actualizado exitosamente!');
        setForceRefresh(prev => prev + 1); // Forzar actualización del modal
        
        setTimeout(() => {
          setIsUpdatingOrder(false);
          setIsUpdateStatusModalOpen(false);
          setSelectedOrderForUpdate(null);
          setNewStatus('ENTREGADO');
          setStatusComment('');
          setPaymentMethod('efectivo');
          setUploadedReceipts([]);
          setUploadedCommunicationProof(null);
          setFirstPaymentAmount('');
          setSecondPaymentAmount('');
          setSecondPaymentMethod('');
          setFirstPaymentReceipt(null);
          setSecondPaymentReceipt(null);
          setReagendadoDate(null);
          setIsReagendadoAsChange(false);
        }, 1500);
      } else {
        throw new Error(resultado.message || 'Error al actualizar el pedido');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUpdateOrderMessage(`❌ Error: ${errorMessage}`);
      
      // Mostrar error por 3 segundos antes de cerrar
      setTimeout(() => {
        setIsUpdatingOrder(false);
        setUpdateOrderMessage('');
        setUpdatingOrder(null);
      }, 3000);
    } finally {
      // Limpiar estado de actualización
      setUpdatingOrder(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (isLiquidated: boolean) => {
    if (isLiquidated) {
      return <Badge className="bg-green-100 text-green-800">Liquidado</Badge>;
    }
    return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendiente</Badge>;
  };

  const filteredLiquidations = liquidations.filter(liquidation => {
    const matchesSearch = 
      liquidation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      liquidation.messenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      liquidation.routeDate.includes(searchTerm);
    
    return matchesSearch;
  });

  // Función para obtener datos de tiendas agrupadas para la tabla
  const getTiendaTableData = () => {
    return tiendaCalculations.map(tienda => ({
      id: tienda.tienda,
      name: tienda.tienda,
      totalOrders: tienda.totalOrders,
      totalCollected: tienda.totalCollected,
      cashPayments: tienda.cashPayments,
      sinpePayments: tienda.sinpePayments,
      tarjetaPayments: tienda.tarjetaPayments,
      deliveredOrders: tienda.deliveredOrders,
      pendingOrders: tienda.pendingOrders,
      returnedOrders: tienda.returnedOrders,
      rescheduledOrders: tienda.rescheduledOrders,
      averageOrderValue: tienda.averageOrderValue,
      orders: tienda.orders || []
    }));
  };

  // Función para calcular la tasa de entrega total de mensajeros
  const calculateTotalDeliveryRateMensajeros = () => {
    if (calculations.length === 0) return 0;
    
    let totalOrders = 0;
    let totalDelivered = 0;
    
    calculations.forEach(calculation => {
      const calculated = calculateLiquidation(calculation);
      totalOrders += calculated.orders.length;
      totalDelivered += calculated.orders.filter(o => o.estado_pedido === 'ENTREGADO').length;
    });
    
    return totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0;
  };

  // Función para calcular la tasa de entrega total de tiendas
  const calculateTotalDeliveryRateTiendas = () => {
    if (tiendaCalculations.length === 0) return 0;
    
    let totalOrders = 0;
    let totalDelivered = 0;
    
    tiendaCalculations.forEach(tienda => {
      totalOrders += tienda.totalOrders;
      totalDelivered += tienda.deliveredOrders;
    });
    
    return totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 min-h-[60vh]">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground">Cargando liquidaciones...</p>
        <div className="text-xs text-muted-foreground">
          Obteniendo datos de mensajeros y pedidos
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header mejorado con gradiente */}
      <div className="relative rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20"></div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Calculator className="h-4 w-4" />
                Panel de gestión de liquidaciones
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Módulo de Liquidación
              </h1>
              <p className="text-white/90 text-base">
                Calcula y gestiona la liquidación diaria de mensajeros y tiendas de forma centralizada.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isLoadingData && (
              <div className="flex items-center gap-2 text-sm text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                </div>
                <span className="text-sm">Cargando datos...</span>
              </div>
            )}
            
            {/* Filtro de fecha simple */}
            {!(activeTab === 'tiendas' && usarRangoFechas) && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setQuickFilterRange(null); // Limpiar rango cuando se cambia manualmente
                  }}
                  className="w-40 h-10 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/70 focus:ring-2 focus:ring-white/50"
                  disabled={isLoadingData}
                />
                <Button 
                  variant="outline"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setSelectedDate(today);
                    setQuickFilterRange(null); // Limpiar rango cuando se cambia manualmente
                  }}
                  disabled={isLoadingData}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Hoy
                </Button>
              </div>
            )}

            {/* Filtro de rango de fechas para tiendas */}
            {activeTab === 'tiendas' && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-white" />
                        {!usarRangoFechas ? (
                          <span className="text-xs whitespace-nowrap font-medium text-white">Rango de fechas:</span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-white bg-white/20 px-2 py-1 rounded">
                            <span>
                              {tiendaFechaInicio && tiendaFechaFin 
                                ? `${Math.ceil((new Date(tiendaFechaFin).getTime() - new Date(tiendaFechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1} días`
                                : 'Selecciona fechas'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usarRangoFechas}
                          onChange={(e) => setUsarRangoFechas(e.target.checked)}
                          className="sr-only peer"
                          disabled={loadingRangoFechas}
                        />
                        <div className="w-11 h-6 bg-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                    
                    {usarRangoFechas && (
                      <div className="flex items-center gap-4">
                        {loadingRangoFechas ? (
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cargando rango...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs ml-3 font-medium text-white">Desde</Label>
                              <Input
                                type="date"
                                value={tiendaFechaInicio}
                                onChange={(e) => handleFechaInicioChange(e.target.value)}
                                className={`w-36 h-9 text-sm bg-white/10 backdrop-blur-sm border-white/20 text-white ${fechasError ? 'border-red-300' : ''}`}
                                disabled={loadingRangoFechas}
                                max={tiendaFechaFin || undefined}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium text-white">Hasta</Label>
                              <Input
                                type="date"
                                value={tiendaFechaFin}
                                onChange={(e) => handleFechaFinChange(e.target.value)}
                                className={`w-36 h-9 text-sm bg-white/10 backdrop-blur-sm border-white/20 text-white ${fechasError ? 'border-red-300' : ''}`}
                                disabled={loadingRangoFechas}
                                min={tiendaFechaInicio || undefined}
                              />
                            </div>
                            {fechasError && (
                              <div className="flex items-center gap-1 text-xs text-red-200 bg-red-500/30 px-2 py-1 rounded">
                                <AlertCircle className="w-3 h-3" />
                                <span>{fechasError}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Button 
              asChild 
              className="bg-white text-sky-600 hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Link href="/dashboard/admin">
                <Truck className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Alert de restricción de edición */}
      {isEditingRestricted && (
        <Alert className="border-orange-200 bg-orange-50">
          <Lock className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Edición restringida:</strong> Los pedidos no pueden ser editados una vez que el día ha sido liquidado o ha pasado al día siguiente.
          </AlertDescription>
        </Alert>
      )}

      {/* Sistema de Tabs - Mejorado */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'mensajeros' | 'tiendas')} className="space-y-6">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
          <TabsList className="relative grid w-full grid-cols-2 bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/50 dark:to-indigo-950/50 border border-sky-200/50 dark:border-sky-800/50 shadow-md">
            <TabsTrigger 
              value="mensajeros" 
              className="flex items-center gap-2 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Truck className="w-4 h-4" />
              Liquidaciones de Mensajeros
            </TabsTrigger>
            <TabsTrigger 
              value="tiendas" 
              className="flex items-center gap-2 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Building2 className="w-4 h-4" />
              Liquidaciones por Tienda
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab de Mensajeros */}
        <TabsContent value="mensajeros" className="space-y-6">
          {/* Stats Cards para Mensajeros - Diseño Profesional */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Mensajeros con Pedidos */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Mensajeros con Pedidos</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">{calculations.length}</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Pendientes por Liquidar */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Pendientes por Liquidar</p>
                      <p className="text-lg font-bold text-yellow-900 mt-1">
                        {calculations.filter(c => !c.isLiquidated).length}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Pedidos Totales del Día */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Pedidos Totales</p>
                      <p className="text-lg font-bold text-orange-900 mt-1">
                        {calculations.reduce((sum, c) => sum + c.orders.length, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Tasa de Entrega */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Tasa de Entrega</p>
                      <p className="text-lg font-bold text-emerald-900 mt-1">
                        {calculateTotalDeliveryRateMensajeros()}%
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Total Recaudado */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Recaudado</p>
                      <p className="text-lg font-bold text-green-900 mt-1">
                        {formatCurrency(calculations.reduce((sum, c) => {
                          const calculated = calculateLiquidation(c);
                          return sum + calculated.totalCollected;
                        }, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Total a Entregar */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Calculator className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Total a Entregar</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {formatCurrency(calculations.reduce((sum, c) => {
                          const calculated = calculateLiquidation(c);
                          return sum + (calculated.cashPayments - calculated.totalSpent);
                        }, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Total Efectivo */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Banknote className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Total Efectivo</p>
                      <p className="text-lg font-bold text-emerald-900 mt-1">
                        {formatCurrency(calculations.reduce((sum, c) => {
                          const calculated = calculateLiquidation(c);
                          return sum + calculated.cashPayments;
                        }, 0))}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {(() => {
                          const efectivoCount = calculations.reduce((sum, c) => {
                            return sum + c.orders.filter(o => 
                              o.estado_pedido === 'ENTREGADO' && 
                              o.metodo_pago === 'EFECTIVO'
                            ).length;
                          }, 0);
                          return `${efectivoCount} pedidos`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* SINPE */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">SINPE</p>
                      <p className="text-lg font-bold text-cyan-900 mt-1">
                        {formatCurrency(calculations.reduce((sum, c) => {
                          const calculated = calculateLiquidation(c);
                          return sum + calculated.sinpePayments;
                        }, 0))}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">
                        {(() => {
                          const sinpeCount = calculations.reduce((sum, c) => {
                            return sum + c.orders.filter(o => 
                              o.estado_pedido === 'ENTREGADO' && 
                              o.metodo_pago === 'SINPE'
                            ).length;
                          }, 0);
                          return `${sinpeCount} pedidos`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-pink-50 to-pink-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Tarjeta</p>
                      <p className="text-lg font-bold text-pink-900 mt-1">
                        {formatCurrency(calculations.reduce((sum, c) => {
                          const calculated = calculateLiquidation(c);
                          return sum + calculated.tarjetaPayments;
                        }, 0))}
                      </p>
                      <p className="text-xs text-pink-600 mt-1">
                        {(() => {
                          const tarjetaCount = calculations.reduce((sum, c) => {
                            const calculated = calculateLiquidation(c);
                            return sum + calculated.orders.filter(o => 
                              o.estado_pedido === 'ENTREGADO' && 
                              o.metodo_pago === 'TARJETA'
                            ).length;
                          }, 0);
                          return `${tarjetaCount} pedidos`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

            {/* 2 Pagos */}
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">2 Pagos</p>
                      <p className="text-lg font-bold text-orange-900 mt-1">
                        {(() => {
                          const dosPagosTotal = calculations.reduce((sum, calc) => {
                            const calculated = calculateLiquidation(calc);
                            return sum + calculated.orders
                              .filter(o => o.metodo_pago === '2PAGOS' && o.estado_pedido === 'ENTREGADO')
                              .reduce((s, o) => s + parseFloat(o.efectivo_2_pagos || '0') + parseFloat(o.sinpe_2_pagos || '0'), 0);
                          }, 0);
                          return formatCurrency(dosPagosTotal);
                        })()}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {(() => {
                          const dosPagosCount = calculations.reduce((sum, calc) => {
                            return sum + calc.orders.filter(o => o.metodo_pago === '2PAGOS' && o.estado_pedido === 'ENTREGADO').length;
                          }, 0);
                          return `${dosPagosCount} pedidos`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>

      </div>

      {/* Filtros Rápidos de Fecha */}
      <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sky-800">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros Rápidos de Fecha
              {isQuickFilterLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              )}
              {quickFilterRange && (
                <Badge className="bg-sky-600 text-white ml-2">
                  {quickFilterRange.start} a {quickFilterRange.end}
                </Badge>
              )}
            </div>
            {quickFilterRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setQuickFilterRange(null);
                  const { getCostaRicaDateISO } = await import('@/lib/supabase-pedidos');
                  setSelectedDate(getCostaRicaDateISO());
                }}
                className="text-sky-600 hover:text-sky-800 hover:bg-sky-100"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar filtro
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isQuickFilterLoading}
              onClick={() => {
                isQuickLoadRef.current = true;
                setIsQuickFilterLoading(true);
                const hoy = new Date();
                const fechaInicio = new Date();
                fechaInicio.setDate(fechaInicio.getDate() - 7);
                setQuickFilterRange({
                  start: fechaInicio.toISOString().split('T')[0],
                  end: hoy.toISOString().split('T')[0]
                });
                setSelectedDate(''); // Limpiar fecha específica
              }}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              {isQuickFilterLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Última semana (7 días pasados)'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isQuickFilterLoading}
              onClick={() => {
                isQuickLoadRef.current = true;
                setIsQuickFilterLoading(true);
                const hoy = new Date();
                const fechaInicio = new Date();
                fechaInicio.setDate(fechaInicio.getDate() - 14);
                setQuickFilterRange({
                  start: fechaInicio.toISOString().split('T')[0],
                  end: hoy.toISOString().split('T')[0]
                });
                setSelectedDate(''); // Limpiar fecha específica
              }}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              {isQuickFilterLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Últimos 14 días'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isQuickFilterLoading}
              onClick={() => {
                isQuickLoadRef.current = true;
                setIsQuickFilterLoading(true);
                const hoy = new Date();
                const fechaInicio = new Date();
                fechaInicio.setDate(fechaInicio.getDate() - 30);
                setQuickFilterRange({
                  start: fechaInicio.toISOString().split('T')[0],
                  end: hoy.toISOString().split('T')[0]
                });
                setSelectedDate(''); // Limpiar fecha específica
              }}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              {isQuickFilterLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Últimos 30 días'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isQuickFilterLoading}
              onClick={() => {
                isQuickLoadRef.current = true;
                setIsQuickFilterLoading(true);
                const hoy = new Date();
                const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                setQuickFilterRange({
                  start: primerDia.toISOString().split('T')[0],
                  end: hoy.toISOString().split('T')[0]
                });
                setSelectedDate(''); // Limpiar fecha específica
              }}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              {isQuickFilterLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Mes actual'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isQuickFilterLoading}
              onClick={() => {
                isQuickLoadRef.current = true;
                setIsQuickFilterLoading(true);
                const hoy = new Date();
                const primerDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                const ultimoDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
                setQuickFilterRange({
                  start: primerDiaMesPasado.toISOString().split('T')[0],
                  end: ultimoDiaMesPasado.toISOString().split('T')[0]
                });
                setSelectedDate(''); // Limpiar fecha específica
              }}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              {isQuickFilterLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Mes pasado'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dropdown de Resumen de PRUEBA */}
      {pruebaMetrics && (
        <details className="group">
          <summary className="cursor-pointer list-none">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    Resumen de Pedidos PRUEBA
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      Contabilidad Separada
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600">
                      {pruebaMetrics.totalOrders} pedidos • {formatCurrency(pruebaMetrics.totalCollected)}
                    </span>
                    <ChevronDown className="w-4 h-4 text-blue-600 group-open:rotate-180 transition-transform duration-200" />
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          </summary>
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 mt-2">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Pedidos */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Total Pedidos</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{pruebaMetrics.totalOrders}</p>
                </div>

                {/* Total Recaudado */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Total Recaudado</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.totalCollected)}</p>
                </div>

                {/* Efectivo */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Efectivo</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.cashPayments)}</p>
                </div>

                {/* SINPE */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">SINPE</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.sinpePayments)}</p>
                </div>

                {/* Tarjeta */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Tarjeta</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.tarjetaPayments)}</p>
                </div>

                {/* 2 Pagos */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">2 Pagos</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.dosPagosPayments)}</p>
                </div>

                {/* Monto Final */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Monto Final</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(pruebaMetrics.finalAmount)}</p>
                </div>
              </div>

              {/* Botón Ver Liquidación */}
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleViewPruebaLiquidation}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Liquidación
                </Button>
              </div>
            </CardContent>
          </Card>
        </details>
      )}

          {/* Tabla de Liquidaciones de Mensajeros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Liquidaciones por Ruta - {quickFilterRange 
                ? `${quickFilterRange.start} a ${quickFilterRange.end}` 
                : selectedDate}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Tasa de Entrega Total: <span className="font-semibold">{calculateTotalDeliveryRateMensajeros()}%</span>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mensajero</TableHead>
                    <TableHead>Pedidos por Estado</TableHead>
                <TableHead>Tasa de Entrega</TableHead>
                <TableHead>Total Recaudado</TableHead>
                    <TableHead>SINPE</TableHead>
                    <TableHead>Efectivo</TableHead>
                    <TableHead>Monto Final</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculations.length === 0 ? (
                <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 text-gray-400" />
                          <p className="text-gray-500">
                          No se encontraron mensajeros con pedidos asignados para la fecha {selectedDate}
                        </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                calculations.map((calculation) => {
                  const calculated = calculateLiquidation(calculation);
                  return (
                    <TableRow key={calculation.messengerId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{calculation.messengerName}</span>
                          <div className="text-xs text-muted-foreground">
                            {calculated.orders.length} pedidos
                          </div>
                        </div>
                      </div>
                    </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const statusCounts: Record<string, { count: number; color: string; label: string }> = {
                                  ENTREGADO: { count: 0, color: 'bg-green-500', label: 'Entregado' },
                                  PENDIENTE: { count: 0, color: 'bg-yellow-500', label: 'Pendiente' },
                                  DEVUELTO: { count: 0, color: 'bg-red-500', label: 'Devuelto' },
                                  DEVOLUCION: { count: 0, color: 'bg-orange-500', label: 'Devolución' },
                                  REAGENDADO: { count: 0, color: 'bg-blue-500', label: 'Reagendado' },
                                  CANCELADO: { count: 0, color: 'bg-gray-500', label: 'Cancelado' }
                                };
                                
                                calculated.orders.forEach(order => {
                                  const status = order.estado_pedido;
                                  if (status && statusCounts[status]) {
                                    statusCounts[status].count++;
                                  }
                                });
                                
                                return Object.entries(statusCounts)
                                  .filter(([_, data]) => data.count > 0)
                                  .map(([status, data]) => (
                                    <div key={status} className="flex items-center gap-1">
                                      <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
                                      <span className="text-xs font-medium">{data.count}</span>
                                      <span className="text-xs text-muted-foreground">{data.label}</span>
                                    </div>
                                  ));
                              })()}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          {calculated.orders.length > 0 
                            ? `${Math.round((calculated.orders.filter(o => o.estado_pedido === 'ENTREGADO').length / calculated.orders.length) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-600">
                          {formatCurrency(calculated.totalCollected)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-600">
                          {formatCurrency(calculated.sinpePayments)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-600">
                          {formatCurrency(calculated.cashPayments)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-purple-600">
                          {formatCurrency(calculated.finalAmount)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                                variant="outline"
                            onClick={() => handleViewAndLiquidate(calculated)}
                                className={`h-8 ${calculated.isLiquidated 
                                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' 
                                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                              {calculated.isLiquidated ? (
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                              ) : (
                              <Eye className="w-4 h-4 mr-1" />
                              )}
                              Ver
                            </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab de Tiendas */}
        <TabsContent value="tiendas" className="space-y-6">
          {/* Loader para rango de fechas */}
          {loadingRangoFechas && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Cargando datos del rango de fechas...</span>
                  </div>
                </div>
          )}
          
          {/* Stats Cards para Tiendas - Reorganizado con métricas importantes destacadas */}
          <div className={`space-y-4 ${loadingRangoFechas ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Primera Fila: Métricas Principales (Más Importantes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pedidos Pendientes - PRIMERO Y DESTACADO EN ROJO */}
              <Card className="hover:shadow-xl transition-all duration-200 border-2 border-red-500 shadow-xl bg-gradient-to-br from-red-100 via-red-200 to-red-100 ring-2 ring-red-300">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-red-400">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Pedidos Pendientes</p>
                        <p className="text-3xl font-extrabold text-red-900 mt-1">
                          {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => o.estado_pedido === 'PENDIENTE').length, 0)}
                        </p>
                      </div>
                    </div>
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Tasa de Entrega - MÉTRICA CLAVE */}
              <Card className="hover:shadow-xl transition-all duration-200 border-2 border-emerald-300 shadow-lg bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Tasa de Entrega</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">
                          {calculateTotalDeliveryRateTiendas()}%
                        </p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Recaudado - MÉTRICA FINANCIERA PRINCIPAL */}
              <Card className="hover:shadow-xl transition-all duration-200 border-2 border-purple-300 shadow-lg bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Total Recibido</p>
                        <p className="text-xs text-purple-600">(todos los medios)</p>
                        <p className="text-xl font-bold text-purple-900 mt-1">
                          {formatCurrency(tiendaCalculations.reduce((sum, t) => sum + t.totalCollected, 0))}
                        </p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos Totales del Día */}
              <Card className="hover:shadow-xl transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Pedidos Totales</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          {tiendaCalculations.reduce((sum, t) => sum + t.totalOrders, 0)}
                        </p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segunda Fila: Métricas Operacionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tiendas con Pedidos */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Tiendas con Pedidos</p>
                        <p className="text-lg font-bold text-blue-900 mt-1">{tiendaCalculations.length}</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos sin asignar */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Pedidos sin Asignar</p>
                        <p className="text-lg font-bold text-yellow-900 mt-1">
                          {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => (o.estado_pedido === 'PENDIENTE' || o.estado_pedido === 'EN_RUTA' || !o.estado_pedido) && (!o.mensajero_asignado || o.mensajero_asignado.trim() === '')).length, 0)}
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Estados (resumen) */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Estados</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-700">
                              {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => o.estado_pedido === 'ENTREGADO').length, 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-xs text-yellow-700">
                              {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => o.estado_pedido === 'PENDIENTE').length, 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-red-700">
                              {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => o.estado_pedido === 'DEVOLUCION').length, 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-blue-700">
                              {tiendaCalculations.reduce((sum, t) => sum + t.orders.filter(o => o.estado_pedido === 'REAGENDADO').length, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tercera Fila: Desglose Financiero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Efectivo */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Banknote className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Efectivo</p>
                        <p className="text-lg font-bold text-green-900 mt-1">
                          {formatCurrency(tiendaCalculations.reduce((sum, t) => sum + t.cashPayments, 0))}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {(() => {
                            const efectivoCount = tiendaCalculations.reduce((sum, t) => {
                              return sum + t.orders.filter(o => 
                                o.estado_pedido === 'ENTREGADO' && 
                                o.metodo_pago === 'EFECTIVO'
                              ).length;
                            }, 0);
                            return `${efectivoCount} pedidos`;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* SINPE */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">SINPE</p>
                        <p className="text-lg font-bold text-cyan-900 mt-1">
                          {formatCurrency(tiendaCalculations.reduce((sum, t) => sum + t.sinpePayments, 0))}
                        </p>
                        <p className="text-xs text-cyan-600 mt-1">
                          {(() => {
                            const sinpeCount = tiendaCalculations.reduce((sum, t) => {
                              return sum + t.orders.filter(o => 
                                o.estado_pedido === 'ENTREGADO' && 
                                o.metodo_pago === 'SINPE'
                              ).length;
                            }, 0);
                            return `${sinpeCount} pedidos`;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta */}
              <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-pink-50 to-pink-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Tarjeta</p>
                        <p className="text-lg font-bold text-pink-900 mt-1">
                          {formatCurrency(tiendaCalculations.reduce((sum, t) => sum + t.tarjetaPayments, 0))}
                        </p>
                        <p className="text-xs text-pink-600 mt-1">
                          {(() => {
                            const tarjetaCount = tiendaCalculations.reduce((sum, t) => {
                              return sum + t.orders.filter(o => 
                                o.estado_pedido === 'ENTREGADO' && 
                                o.metodo_pago === 'TARJETA'
                              ).length;
                            }, 0);
                            return `${tarjetaCount} pedidos`;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
                      
          {/* Tabla de Liquidaciones por Tienda */}
          <Card className={loadingRangoFechas ? 'opacity-50 pointer-events-none' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Liquidaciones por Tienda - {
                          usarRangoFechas && tiendaFechaInicio && tiendaFechaFin 
                            ? `${tiendaFechaInicio} a ${tiendaFechaFin}`
                            : selectedDate
                        }
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Pedidos por Estado</TableHead>
                    <TableHead>Tasa de Entrega</TableHead>
                    <TableHead>Total Recaudado</TableHead>
                    <TableHead>SINPE</TableHead>
                    <TableHead>Efectivo</TableHead>
                    <TableHead>Monto Final</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                  {tiendaCalculations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="w-8 h-8 text-gray-400" />
                          <p className="text-gray-500">
                            No se encontraron tiendas con pedidos para la fecha {selectedDate}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tiendaCalculations.map((tienda) => (
                      <TableRow key={tienda.tienda}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{tienda.tienda}</span>
                          </div>
                        </TableCell>
                        
                                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                            {(() => {
                              const statusCounts: Record<string, { count: number; color: string; label: string }> = {
                                ENTREGADO: { count: 0, color: 'bg-green-500', label: 'Entregado' },
                                PENDIENTE: { count: 0, color: 'bg-yellow-500', label: 'Pendiente' },
                                DEVUELTO: { count: 0, color: 'bg-red-500', label: 'Devuelto' },
                                DEVOLUCION: { count: 0, color: 'bg-orange-500', label: 'Devolución' },
                                REAGENDADO: { count: 0, color: 'bg-blue-500', label: 'Reagendado' },
                                CANCELADO: { count: 0, color: 'bg-gray-500', label: 'Cancelado' }
                              };
                              
                              tienda.orders.forEach(order => {
                                const status = order.estado_pedido;
                                if (status && statusCounts[status]) {
                                  statusCounts[status].count++;
                                }
                              });
                              
                              // Contar pedidos pendientes y sin asignar
                              const pendientesCount = tienda.orders.filter(o => o.estado_pedido === 'PENDIENTE').length;
                              const sinAsignarCount = tienda.orders.filter(o => 
                                (o.estado_pedido === 'PENDIENTE' || o.estado_pedido === 'EN_RUTA' || !o.estado_pedido) && 
                                (!o.mensajero_asignado || o.mensajero_asignado.trim() === '')
                              ).length;
                              
                              return (
                                <>
                                  {/* Indicadores destacados para pendientes y sin asignar */}
                                  {pendientesCount > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-800">
                                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-bold text-red-700 dark:text-red-400">Pendientes: {pendientesCount}</span>
                                    </div>
                                  )}
                                  {sinAsignarCount > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-950/30 rounded-lg border border-orange-300 dark:border-orange-800">
                                      <div className="w-3 h-3 bg-orange-600 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Sin Asignar: {sinAsignarCount}</span>
                                    </div>
                                  )}
                                  {/* Estados normales - Excluir PENDIENTE si ya se mostró en el badge destacado */}
                                  {Object.entries(statusCounts)
                                    .filter(([status, data]) => {
                                      // No mostrar PENDIENTE si ya se mostró en el badge destacado
                                      if (status === 'PENDIENTE' && pendientesCount > 0) {
                                        return false;
                                      }
                                      return data.count > 0;
                                    })
                                    .map(([status, data]) => (
                                      <div key={status} className="flex items-center gap-1">
                                        <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
                                        <span className="text-xs font-medium">{data.count}</span>
                                        <span className="text-xs text-muted-foreground">{data.label}</span>
                                      </div>
                                    ))}
                                </>
                              );
                            })()}
                      </div>
                                    </TableCell>
                        
                                    <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {tienda.totalOrders > 0 
                                ? `${Math.round((tienda.deliveredOrders / tienda.totalOrders) * 100)}%`
                                : '0%'
                              }
                            </span>
                          </div>
                        </TableCell>
                        
                                    <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {formatCurrency(tienda.totalCollected)}
                                      </span>
                                </div>
                                    </TableCell>
                        
                                    <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-600">
                              {formatCurrency(tienda.sinpePayments)}
                            </span>
                                      </div>
                                    </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              {formatCurrency(tienda.cashPayments)}
                            </span>
                        </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-purple-600">
                              {formatCurrency(tienda.finalAmount)}
                                    </span>
                              </div>
                        </TableCell>
                        
                        <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                              onClick={() => handleViewTiendaLiquidation(tienda)}
                              className="h-8"
                                >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Detalles
                                </Button>
                              </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Ver y Liquidar - Diseño Completo */}
      {showViewAndLiquidateModal && selectedViewAndLiquidate && (
        <Dialog open={showViewAndLiquidateModal} onOpenChange={setShowViewAndLiquidateModal}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] max-h-[90vh] overflow-y-auto overflow-x-hidden max-w-7xl">
          <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Calculator className="w-6 h-6 text-blue-600" />
                {activeTab === 'mensajeros' 
                  ? `Liquidación de Mensajero - ${selectedViewAndLiquidate.messengerName}`
                  : `Liquidación de Tienda - ${selectedViewAndLiquidate.messengerName}`
                }
            </DialogTitle>
          </DialogHeader>
          
          {selectedViewAndLiquidate && (
            <div className="space-y-4 overflow-hidden">
              {/* Debug info - remover en producción */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <strong>Debug:</strong> Pedidos: {selectedViewAndLiquidate.orders.length}, 
                  Filtro Estado: {orderStatusFilter}, 
                  Filtro Pago: {orderPaymentFilter}
                          </div>
              )}

              {/* Sección Superior */}
            <div className="space-y-4">
                {/* Resumen Financiero con Tamaño Fijo */}
                <div className="flex gap-4">
                {/* Total a Entregar */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-purple-100 text-sm truncate">Total a Entregar</p>
                      <p className="text-2xl font-bold truncate">{formatCurrency(selectedViewAndLiquidate.finalAmount)}</p>
                  </div>
                    <CheckCircle className="w-8 h-8 text-purple-200 flex-shrink-0 ml-2" />
                  </div>
                  </div>

                {/* Total Recaudado */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-blue-100 text-sm truncate">Total Recaudado</p>
                      <p className="text-2xl font-bold truncate">{formatCurrency(selectedViewAndLiquidate.totalCollected)}</p>
                  </div>
                    <DollarSign className="w-8 h-8 text-blue-200 flex-shrink-0 ml-2" />
                  </div>
                </div>
              </div>
              
              {/* Métodos de Pago Compactos */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4 overflow-hidden">
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Banknote className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-green-800 text-xs">Efectivo</span>
              </div>
                  <p className="text-sm font-bold text-green-600 truncate">
                    {formatCurrency(selectedViewAndLiquidate.cashPayments)}
                  </p>
                  <p className="text-xs text-green-500 truncate">
                    {(() => {
                      const efectivoCount = selectedViewAndLiquidate.orders.filter(o => 
                        o.estado_pedido === 'ENTREGADO' && 
                        o.metodo_pago === 'EFECTIVO'
                      ).length;
                      return `${efectivoCount} pedidos`;
                    })()}
                          </p>
                        </div>
                      
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Smartphone className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-blue-800 text-xs">SINPE</span>
                        </div>
                  <p className="text-sm font-bold text-blue-600 truncate">
                    {formatCurrency(selectedViewAndLiquidate.sinpePayments)}
                  </p>
                  <p className="text-xs text-blue-500 truncate">
                    {(() => {
                      const sinpeCount = selectedViewAndLiquidate.orders.filter(o => 
                        o.estado_pedido === 'ENTREGADO' && 
                        o.metodo_pago === 'SINPE'
                      ).length;
                      return `${sinpeCount} pedidos`;
                    })()}
                          </p>
                        </div>
                      
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                  <div className="flex items-center gap-1 mb-1">
                    <CreditCard className="w-3 h-3 text-purple-600 flex-shrink-0" />
                    <span className="font-medium text-purple-800 text-xs">Tarjeta</span>
                        </div>
                  <p className="text-sm font-bold text-purple-600 truncate">
                    {formatCurrency(selectedViewAndLiquidate.tarjetaPayments || 0)}
                  </p>
                  <p className="text-xs text-purple-500 truncate">
                    {(() => {
                      const tarjetaCount = selectedViewAndLiquidate.orders.filter(o => 
                        o.estado_pedido === 'ENTREGADO' && 
                        o.metodo_pago === 'TARJETA'
                      ).length;
                      return `${tarjetaCount} pedidos`;
                    })()}
                          </p>
                        </div>

                <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                  <div className="flex items-center gap-1 mb-1">
                    <Receipt className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    <span className="font-medium text-orange-800 text-xs">2 Pagos</span>
                        </div>
                  <p className="text-sm font-bold text-orange-600 truncate">
                    {(() => {
                      const dosPagosTotal = selectedViewAndLiquidate.orders
                        .filter(o => o.metodo_pago === '2PAGOS' && o.estado_pedido === 'ENTREGADO')
                        .reduce((sum, o) => sum + parseFloat(o.efectivo_2_pagos || '0') + parseFloat(o.sinpe_2_pagos || '0'), 0);
                      return formatCurrency(dosPagosTotal);
                    })()}
                  </p>
                  <p className="text-xs text-orange-500 truncate">
                    {(() => {
                      const dosPagosCount = selectedViewAndLiquidate.orders.filter(o => 
                        o.estado_pedido === 'ENTREGADO' && 
                        o.metodo_pago === '2PAGOS'
                      ).length;
                      return `${dosPagosCount} pedidos`;
                    })()}
                  </p>
                  <div className="mt-1 text-xs text-orange-600">
                    {(() => {
                      const dosPagosEfectivo = selectedViewAndLiquidate.orders
                        .filter(o => o.metodo_pago === '2PAGOS' && o.estado_pedido === 'ENTREGADO')
                        .reduce((sum, o) => sum + parseFloat(o.efectivo_2_pagos || '0'), 0);
                      const dosPagosSinpe = selectedViewAndLiquidate.orders
                        .filter(o => o.metodo_pago === '2PAGOS' && o.estado_pedido === 'ENTREGADO')
                        .reduce((sum, o) => sum + parseFloat(o.sinpe_2_pagos || '0'), 0);
                      return `Ef: ${formatCurrency(dosPagosEfectivo)} | S: ${formatCurrency(dosPagosSinpe)}`;
                    })()}
                        </div>
                </div>

                          </div>

              {/* Card de Gastos - Para mensajeros y para ALL STARS en tiendas */}
              {(() => {
                const esAllStars = selectedViewAndLiquidate.messengerName?.toUpperCase().includes('ALL STARS') || 
                                   selectedViewAndLiquidate.messengerName?.toUpperCase().includes('MAGIC STARS');
                const mostrarGastos = (activeTab === 'mensajeros') || (activeTab === 'tiendas' && esAllStars);
                
                return mostrarGastos && selectedViewAndLiquidate.totalSpent > 0 ? (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-700 uppercase">Gastos</span>
                        {esAllStars && (
                          <span className="text-xs text-red-600 italic">(Todos los mensajeros)</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewExpenses(selectedViewAndLiquidate)}
                        className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-100 flex-shrink-0 font-medium"
                      >
                        <Receipt className="w-3 h-3 mr-1" />
                        Ver Gastos
                      </Button>
                    </div>
                    <p className="text-sm font-bold text-red-600">
                      {formatCurrency(selectedViewAndLiquidate.totalSpent)}
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Filtros Compactos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-700">Filtros:</span>
                  
                  {/* Filtro Total */}
                  <button
                            onClick={() => setOrderStatusFilter('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            orderStatusFilter === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    Total ({selectedViewAndLiquidate.orders.length})
                  </button>

                  {/* Filtros de Estado */}
                  <button
                    onClick={() => setOrderStatusFilter('ENTREGADO')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      orderStatusFilter === 'ENTREGADO' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'
                    }`}
                  >
                    Entregados ({selectedViewAndLiquidate.orders.filter(o => o.estado_pedido === 'ENTREGADO').length})
                  </button>

                  <button
                    onClick={() => setOrderStatusFilter('PENDIENTE')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      orderStatusFilter === 'PENDIENTE' 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'
                    }`}
                  >
                    Pendientes ({selectedViewAndLiquidate.orders.filter(o => o.estado_pedido === 'PENDIENTE').length})
                  </button>

                  <button
                    onClick={() => setOrderStatusFilter('REAGENDADO')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      orderStatusFilter === 'REAGENDADO' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    Reagendados ({selectedViewAndLiquidate.orders.filter(o => o.estado_pedido === 'REAGENDADO').length})
                  </button>

                  <button
                    onClick={() => setOrderStatusFilter('DEVOLUCION')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      orderStatusFilter === 'DEVOLUCION' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                    }`}
                  >
                    Devoluciones ({selectedViewAndLiquidate.orders.filter(o => o.estado_pedido === 'DEVOLUCION').length})
                  </button>
                        </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700">Pago:</span>
                  
                  <button
                    onClick={() => setOrderPaymentFilter(orderPaymentFilter === 'EFECTIVO' ? 'all' : 'EFECTIVO')}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      orderPaymentFilter === 'EFECTIVO' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'
                    }`}
                  >
                                  Efectivo
                  </button>

                  <button
                    onClick={() => setOrderPaymentFilter(orderPaymentFilter === 'SINPE' ? 'all' : 'SINPE')}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      orderPaymentFilter === 'SINPE' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    SINPE
                  </button>

                  <button
                    onClick={() => setOrderPaymentFilter(orderPaymentFilter === 'TARJETA' ? 'all' : 'TARJETA')}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      orderPaymentFilter === 'TARJETA' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    Tarjeta
                  </button>

                  <button
                    onClick={() => setOrderPaymentFilter(orderPaymentFilter === '2PAGOS' ? 'all' : '2PAGOS')}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      orderPaymentFilter === '2PAGOS' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    2 Pagos
                  </button>
                                </div>
                                
                  {/* Botón de Productos para Devolver - Esquina Derecha */}
                  <div className="flex justify-end mt-2">
                          <Button
                      onClick={handleViewDevolverOrders}
                                      variant="outline"
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Productos para Devolver ({(() => {
                        if (!selectedViewAndLiquidate) return 0;
                        return selectedViewAndLiquidate.orders.filter(pedido => 
                          pedido.estado_pedido === 'PENDIENTE' || 
                          pedido.estado_pedido === 'REAGENDADO' || 
                          pedido.estado_pedido === 'DEVOLUCION'
                        ).length;
                      })()})
                          </Button>
                        </div>
                        </div>
                      </div>

              {/* Componente de Tabla de Pedidos */}
              <PedidosTable
                orders={selectedViewAndLiquidate.orders}
                orderStatusFilter={orderStatusFilter}
                orderPaymentFilter={orderPaymentFilter}
                onEditOrder={handleEditOrderStatus}
                onViewComprobante={handleViewPedidoComprobante}
                formatCurrency={formatCurrency}
              />
            
                {/* Botón de Confirmar Liquidación */}
              <div className="flex justify-end">
                {/* Para tiendas, siempre mostrar solo el botón Cerrar */}
                {(() => {
                  // Verificar si es una tienda comparando con tiendaCalculations
                  const esTienda = tiendaCalculations.some(t => t.tienda === selectedViewAndLiquidate.messengerName);
                  
                  if (esTienda || selectedViewAndLiquidate.isLiquidated) {
                    // Para tiendas o liquidaciones ya completadas, mostrar solo cerrar
                    return (
                                    <Button
                        size="lg" 
                        className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3"
                        onClick={() => setShowViewAndLiquidateModal(false)}
                >
                        <X className="w-5 h-5 mr-2" />
                  Cerrar
                                    </Button>
                    );
                  } else {
                    // Para mensajeros no liquidados, mostrar botón de confirmar liquidación
                    const pedidosPendientes = selectedViewAndLiquidate.orders.filter(o => o.estado_pedido === 'PENDIENTE').length;
                    const puedeLiquidar = pedidosPendientes === 0;
                    
                    return (
                                    <Button
                        size="lg" 
                        className={`px-8 py-3 ${
                          puedeLiquidar 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (puedeLiquidar) {
                            confirmLiquidation(selectedViewAndLiquidate);
                          }
                        }}
                        disabled={!puedeLiquidar}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {puedeLiquidar ? 'Confirmar Liquidación' : `No se puede liquidar (${pedidosPendientes} pendientes)`}
                                    </Button>
                    );
                  }
                })()}
                                </div>
                                </div>
          )}
        </DialogContent>
      </Dialog>
      )}

      {/* Modal de Actualización de Estado de Pedido */}
      {isUpdateStatusModalOpen && selectedOrderForUpdate && (
        <Dialog open={isUpdateStatusModalOpen} onOpenChange={setIsUpdateStatusModalOpen}>
          <DialogContent>
          <DialogHeader>
              <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
          </DialogHeader>
            
            <div className="space-y-4">
                  <div>
                <Label>Pedido: {selectedOrderForUpdate.id_pedido}</Label>
                <p className="text-sm text-gray-600">{selectedOrderForUpdate.cliente_nombre}</p>
                                </div>
                                
                <div>
                <Label htmlFor="status">Nuevo Estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTREGADO">Entregado</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                    <SelectItem value="REAGENDADO">Reagendado</SelectItem>
                  </SelectContent>
                </Select>
                                </div>
                                
              {newStatus === 'ENTREGADO' && (
                <div>
                  <Label htmlFor="payment">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="SINPE">SINPE</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                                </div>
              )}

                <div>
                <Label htmlFor="comment">Comentario (opcional)</Label>
                <Textarea
                  id="comment"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Agregar comentario..."
                />
                                  </div>
                                  </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsUpdateStatusModalOpen(false)}>
                Cancelar
              </Button>
                <Button 
                onClick={handleUpdateOrderStatus}
                disabled={updatingOrder === selectedOrderForUpdate.id_pedido}
              >
                {updatingOrder === selectedOrderForUpdate.id_pedido ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Actualizar
                </>
              )}
                </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Modal de Gastos */}
      {showExpensesModal && selectedExpenses && (
        <Dialog open={showExpensesModal} onOpenChange={setShowExpensesModal}>
          <DialogContent className="sm:max-w-[90vw] lg:max-w-[80vw] xl:max-w-[70vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Receipt className="w-6 h-6 text-red-600" />
                Gastos del Mensajero - {selectedExpenses.mensajero}
            </DialogTitle>
          </DialogHeader>
          
            <div className="space-y-4">
              {selectedExpenses.gastos && selectedExpenses.gastos.length > 0 ? (
                <div className="space-y-4">
                  {/* Resumen de gastos */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-800">Total de Gastos</span>
                  </div>
                      <span className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedExpenses.gastos.reduce((sum: number, gasto: any) => sum + gasto.monto, 0))}
                      </span>
                  </div>
                    <p className="text-sm text-red-700 mt-1">
                      {selectedExpenses.gastos.length} {selectedExpenses.gastos.length === 1 ? 'gasto registrado' : 'gastos registrados'}
                        </p>
                  </div>
                      
                  {/* Lista de gastos */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedExpenses.gastos.map((gasto: any, index: number) => (
                      <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                              {gasto.tipo_gasto === 'gasolina' ? (
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Fuel className="w-6 h-6 text-blue-600" />
                                </div>
                              ) : gasto.tipo_gasto === 'mantenimiento' ? (
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                  <Wrench className="w-6 h-6 text-orange-600" />
                                </div>
                              ) : gasto.tipo_gasto === 'peaje' ? (
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Car className="w-6 h-6 text-purple-600" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-semibold text-gray-900">
                                  {gasto.tipo_gasto || 'Gasto'}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  #{index + 1}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {gasto.descripcion || 'Sin descripción'}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(gasto.fecha).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                                
                                {gasto.comprobante_link && (
                                  <a 
                                    href={gasto.comprobante_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    Ver comprobante
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(gasto.monto)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Monto</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                      </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay gastos registrados</h3>
                  <p className="text-gray-500">Este mensajero no tiene gastos registrados para la fecha seleccionada</p>
                </div>
              )}
                      </div>

            <div className="flex justify-end pt-4 border-t">
                <Button 
                onClick={() => setShowExpensesModal(false)}
                className="px-6"
                >
                  Cerrar
                </Button>
              </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Modal de Reporte de Gastos de Todos los Mensajeros */}
      {showAllExpensesModal && (
        <Dialog open={showAllExpensesModal} onOpenChange={setShowAllExpensesModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-red-600" />
                Reporte de Gastos de Todos los Mensajeros
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {allExpensesData && allExpensesData.length > 0 ? (
                <>
                  {/* Resumen Total */}
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-red-600 font-medium">Total de Gastos</p>
                            <p className="text-2xl font-bold text-red-700">
                              {formatCurrency(
                                allExpensesData.reduce((total, mensajero) => 
                                  total + mensajero.gastos.reduce((sum: number, gasto: any) => sum + gasto.monto, 0), 
                                0)
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600 font-medium">
                            {allExpensesData.length} {allExpensesData.length === 1 ? 'mensajero' : 'mensajeros'}
                          </p>
                          <p className="text-xs text-red-500">
                            {allExpensesData.reduce((sum, m) => sum + m.gastos.length, 0)} gastos totales
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de Mensajeros con Gastos */}
                  <div className="space-y-4">
                    {allExpensesData.map((mensajero, index) => {
                      const totalGastosMensajero = mensajero.gastos.reduce((sum: number, gasto: any) => sum + gasto.monto, 0);
                      
                      return (
                        <Card key={index} className="border-l-4 border-l-red-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{mensajero.mensajero}</h3>
                                  <p className="text-sm text-gray-500">
                                    {mensajero.gastos.length} {mensajero.gastos.length === 1 ? 'gasto' : 'gastos'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500 font-medium">Total</p>
                                <p className="text-xl font-bold text-red-600">
                                  {formatCurrency(totalGastosMensajero)}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {mensajero.gastos.map((gasto: any, gastoIndex: number) => (
                                <div 
                                  key={gastoIndex} 
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Receipt className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">
                                        {gasto.descripcion || 'Sin descripción'}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Gasto #{gastoIndex + 1}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-red-600">
                                      {formatCurrency(gasto.monto)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay gastos registrados
                  </h3>
                  <p className="text-gray-500">
                    No se encontraron gastos para el día de hoy
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => setShowAllExpensesModal(false)}
                variant="outline"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Progress Loader */}
      {isVisible && (
        <ProgressLoader
          isVisible={isVisible}
          title="Procesando Liquidaciones"
          steps={steps}
          currentStep={currentStep}
          overallProgress={overallProgress}
          onClose={closeLoader}
        />
      )}

      {/* Modal para actualizar estado del pedido - Idéntico a Mi Ruta Hoy */}
      <Dialog open={isUpdateStatusModalOpen} onOpenChange={setIsUpdateStatusModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="flex-shrink-0 p-6 pb-4">
              <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
            </DialogHeader>
            {selectedOrderForUpdate && (
              <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Pedido: {selectedOrderForUpdate.id_pedido}</p>
                  <p className="text-sm text-gray-600">{selectedOrderForUpdate.cliente_nombre}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(selectedOrderForUpdate.valor_total)}</p>
                          </div>
                              
                <div className="space-y-3">
                  <Label>Nuevo Estado *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      variant={newStatus === 'ENTREGADO' ? 'default' : 'outline'}
                      onClick={() => setNewStatus('ENTREGADO')}
                      className={`h-12 text-sm font-medium ${
                        newStatus === 'ENTREGADO' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700'
                      }`}
                    >
                      ✅ Entregado
                    </Button>
                    <Button
                      variant={newStatus === 'DEVOLUCION' ? 'default' : 'outline'}
                      onClick={() => setNewStatus('DEVOLUCION')}
                      className={`h-12 text-sm font-medium ${
                        newStatus === 'DEVOLUCION' 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700'
                      }`}
                    >
                      ❌ Devolución
                    </Button>
                    <Button
                      variant={newStatus === 'REAGENDADO' ? 'default' : 'outline'}
                      onClick={() => setNewStatus('REAGENDADO')}
                      className={`h-12 text-sm font-medium ${
                        newStatus === 'REAGENDADO' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700'
                      }`}
                    >
                      📅 Reagendado
                    </Button>
                        </div>
                      </div>
                      
                {/* Sección de método de pago para entregado */}
                {newStatus === 'ENTREGADO' && (
                  <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold">Confirmar Método de Pago *</Label>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {selectedOrderForUpdate.metodo_pago === 'EFECTIVO' ? '💵 Efectivo' :
                         selectedOrderForUpdate.metodo_pago === 'SINPE' ? '📱 SINPE' :
                         selectedOrderForUpdate.metodo_pago === 'TARJETA' ? '💳 Tarjeta' :
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
                          setFirstPaymentMethod('efectivo');
                          setSecondPaymentMethod('');
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
                                    Seleccionar
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
                                    Seleccionar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                        {/* Resumen de pagos */}
                        <div className="bg-white p-3 rounded-lg border border-orange-200">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total del Pedido:</span>
                              <span className="font-semibold">{formatCurrency(selectedOrderForUpdate?.valor_total || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Primer Pago:</span>
                              <span className="font-medium">{formatCurrency(parseFloat(firstPaymentAmount) || 0)}</span>
                              </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Segundo Pago:</span>
                              <span className="font-medium">{formatCurrency(parseFloat(secondPaymentAmount) || 0)}</span>
                                </div>
                            <hr className="border-gray-200" />
                            <div className="flex justify-between">
                              <span className="text-gray-600">Diferencia:</span>
                              <span className={`font-bold ${
                                ((parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0)) === (selectedOrderForUpdate?.valor_total || 0)
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {formatCurrency(((parseFloat(firstPaymentAmount) || 0) + (parseFloat(secondPaymentAmount) || 0)) - (selectedOrderForUpdate?.valor_total || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                    )}
                      </div>
                )}

                {/* Comprobante de Comunicación para Devolución y Reagendado */}
                {(newStatus === 'DEVOLUCION' || newStatus === 'REAGENDADO') && (
                  <div className="space-y-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
                    <Label className="text-sm font-semibold">Comprobante de Comunicación *</Label>
                    <p className="text-xs text-gray-600">
                      Adjunta captura de pantalla del chat o llamada con el cliente para evidenciar la comunicación
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {uploadedCommunicationProof ? (
                        <div className="space-y-3">
                          <img
                            src={uploadedCommunicationProof}
                            alt="Comprobante de comunicación"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                                <Button
                                  size="sm"
                                  variant="outline"
                            onClick={() => setUploadedCommunicationProof(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-3 h-3 mr-1" />
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
                            onChange={(e) => handleFileUpload(e, 'communication')}
                            className="hidden"
                            id="communication-upload"
                          />
                                <Button
                                  variant="outline"
                            onClick={() => document.getElementById('communication-upload')?.click()}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Seleccionar Imagen
                                </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selector de fecha obligatorio para reagendado */}
                {newStatus === 'REAGENDADO' && (
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
                        <CalendarUI
                          mode="single"
                          selected={reagendadoDate || undefined}
                          onSelect={(date) => {
                            setReagendadoDate(date || null);
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
                {newStatus === 'REAGENDADO' && (
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

                {/* Comentarios */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Comentarios (opcional)</Label>
                  <Textarea
                    placeholder="Añadir comentarios sobre el pedido..."
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    className="h-20 text-sm resize-none"
                  />
                </div>
              </div>
            )}
            
            <div className="flex-shrink-0 p-6 pt-4 border-t">
              <div className="flex gap-3">
                    <Button
                      variant="outline"
                  onClick={() => setIsUpdateStatusModalOpen(false)}
                  className="flex-1 h-10"
                    >
                      Cancelar
                    </Button>
                    <Button
                  onClick={handleUpdateOrderStatus}
                  className="flex-1 h-10"
                  disabled={updatingOrder === selectedOrderForUpdate?.id_pedido}
                    >
                  {updatingOrder === selectedOrderForUpdate?.id_pedido ? 'Actualizando...' : 'Actualizar Estado'}
                    </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Carga para Actualización de Pedidos */}
      <Dialog open={isUpdatingOrder} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center space-y-4 py-6">
            {updateOrderMessage.includes('❌') ? (
              // Icono de error
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            ) : updateOrderMessage.includes('¡') ? (
              // Icono de éxito
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            ) : (
              // Spinner de carga
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
              </div>
            )}
            <div className="text-center">
              <h3 className={`text-lg font-semibold ${
                updateOrderMessage.includes('❌') ? 'text-red-900' : 
                updateOrderMessage.includes('¡') ? 'text-green-900' : 
                'text-gray-900'
              }`}>
                {updateOrderMessage.includes('❌') ? 'Error al Actualizar' : 
                 updateOrderMessage.includes('¡') ? '¡Actualizado!' : 
                 'Actualizando Pedido'}
              </h3>
              <p className={`text-sm mt-2 ${
                updateOrderMessage.includes('❌') ? 'text-red-600' : 
                updateOrderMessage.includes('¡') ? 'text-green-600' : 
                'text-gray-600'
              }`}>
                {updateOrderMessage}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Éxito/Error */}
      <Dialog open={showSuccessModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center space-y-4 py-4">
            {modalType === 'success' ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¡Liquidación Exitosa!
                  </h3>
                  <p className="text-sm text-gray-600">
                    {successMessage}
                        </p>
                      </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Recargando datos...</span>
                    </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error en Liquidación
                  </h3>
                  <p className="text-sm text-gray-600">
                    {successMessage}
                              </p>
                            </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Cerrando automáticamente...</span>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

      {/* Modal de Productos para Devolver */}
      {showDevolverModal && (
        <Dialog open={showDevolverModal} onOpenChange={setShowDevolverModal}>
          <DialogContent className="sm:max-w-[90vw] lg:max-w-[80vw] xl:max-w-[70vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Package className="w-6 h-6 text-red-600" />
                Productos para Devolver
                <span className="text-sm font-normal text-gray-500">
                  ({selectedDevolverOrders.length} productos)
                </span>
              </DialogTitle>
              <DialogDescription>
                Lista de todos los productos que necesitan ser devueltos (Pendientes + Reagendados + Devoluciones)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Resumen por estado */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {selectedDevolverOrders.filter(p => p.estado_pedido === 'PENDIENTE').length}
                  </p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedDevolverOrders.filter(p => p.estado_pedido === 'REAGENDADO').length}
                  </p>
                  <p className="text-sm text-gray-600">Reagendados</p>
                      </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {selectedDevolverOrders.filter(p => p.estado_pedido === 'DEVOLUCION').length}
                  </p>
                  <p className="text-sm text-gray-600">Devoluciones</p>
                    </div>
                  </div>

              {/* Tabla de pedidos */}
              <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                      <TableHead>ID</TableHead>
                          <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Dirección</TableHead>
                          <TableHead>Estado</TableHead>
                      <TableHead>Mensajero</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {selectedDevolverOrders.map((pedido) => (
                      <TableRow key={pedido.idx}>
                        <TableCell className="font-mono text-sm">{pedido.id_pedido}</TableCell>
                        <TableCell className="font-medium">{pedido.cliente_nombre}</TableCell>
                        <TableCell className="max-w-xs truncate" title={pedido.productos}>
                          {pedido.productos}
                            </TableCell>
                            <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{pedido.canton}</div>
                            <div className="text-gray-500">
                              {pedido.provincia} - {pedido.distrito}
                            </div>
                              </div>
                            </TableCell>
                        <TableCell className="max-w-xs truncate" title={pedido.direccion}>
                          {pedido.direccion}
                            </TableCell>
                            <TableCell>
                              <Badge 
                            variant="outline" 
                            className={
                              pedido.estado_pedido === 'PENDIENTE' 
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : pedido.estado_pedido === 'REAGENDADO'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {pedido.estado_pedido}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                          {pedido.mensajero_asignado || 'Sin asignar'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

              {selectedDevolverOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay productos para devolver</p>
                          </div>
                        )}
                      </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowDevolverModal(false)} className="px-6">
                Cerrar
                            </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Notificación de Liquidaciones Pendientes */}
      {showPendingNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-lg rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Liquidaciones Pendientes
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Hay {pendingLiquidations.length} liquidación(es) pendiente(s) de otros días que requieren tu atención.
                </p>
                <div className="mt-3 flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                    onClick={() => setShowPendingModal(true)}
                  >
                    Ver Detalles
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-yellow-600 hover:bg-yellow-100"
                    onClick={() => setShowPendingNotification(false)}
                  >
                    Cerrar
                  </Button>
                      </div>
                      </div>
              <div className="ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                  variant="ghost"
                  className="text-yellow-600 hover:bg-yellow-100"
                  onClick={() => setShowPendingNotification(false)}
                >
                  <X className="h-4 w-4" />
                            </Button>
                          </div>
                      </div>
                  </div>
            </div>
      )}

      {/* Modal de Liquidaciones Pendientes */}
      {showPendingModal && (
        <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
          <DialogContent className="sm:max-w-[90vw] lg:max-w-[80vw] xl:max-w-[70vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                Liquidaciones Pendientes
                <span className="text-sm font-normal text-gray-500">
                  ({pendingLiquidations.length} liquidaciones)
                </span>
              </DialogTitle>
              <DialogDescription>
                Lista de liquidaciones de días anteriores que aún no han sido procesadas
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Resumen */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                    <p className="font-medium text-yellow-800">
                      Atención Requerida
                    </p>
                    <p className="text-sm text-yellow-700">
                      Estas liquidaciones necesitan ser revisadas y procesadas para mantener el control financiero actualizado.
                        </p>
                      </div>
                    </div>
                  </div>

              {/* Tabla de liquidaciones pendientes */}
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Liquidación</TableHead>
                      <TableHead>Mensajero</TableHead>
                      <TableHead>Total Recaudado</TableHead>
                      <TableHead>Plata Inicial</TableHead>
                      <TableHead>Monto Final</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLiquidations.map((liquidation, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {liquidation.fecha}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {liquidation.mensajero}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(typeof liquidation.total_recaudado === 'number' 
                            ? liquidation.total_recaudado 
                            : parseFloat(liquidation.total_recaudado || '0'))}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatCurrency(typeof liquidation.plata_inicial === 'number' 
                            ? liquidation.plata_inicial 
                            : parseFloat(liquidation.plata_inicial || '0'))}
                        </TableCell>
                        <TableCell className="font-bold text-purple-600">
                          {formatCurrency(typeof liquidation.monto_final === 'number' 
                            ? liquidation.monto_final 
                            : parseFloat(liquidation.monto_final || '0'))}
                        </TableCell>
                        <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                            onClick={() => {
                              // Aquí se podría agregar lógica para navegar a esa fecha
                              setSelectedDate(liquidation.fecha);
                              setShowPendingModal(false);
                            }}
                            className="text-xs"
                          >
                            Ir al Día de la Liquidación
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  </div>

              {pendingLiquidations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay liquidaciones pendientes</p>
                </div>
              )}
              </div>
              
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowPendingModal(false)} className="px-6">
                Cerrar
                </Button>
              </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Modal de Reporte de Gastos de Todos los Mensajeros */}
      {showAllExpensesModal && (
        <Dialog open={showAllExpensesModal} onOpenChange={setShowAllExpensesModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-red-600" />
                Reporte de Gastos de Todos los Mensajeros
              </DialogTitle>
            </DialogHeader>
            
            {loadingAllExpenses ? (
              <div className="flex items-center justify-center py-8">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
                </div>
                <span className="text-sm text-muted-foreground">Cargando gastos...</span>
              </div>
            ) : allExpensesData.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay gastos registrados</h3>
                <p className="text-gray-500">No se encontraron gastos para el día seleccionado</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen total */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Total de Gastos</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(allExpensesData.reduce((sum, mensajero) => sum + mensajero.totalGastos, 0))}
                    </span>
                  </div>
                </div>

                {/* Lista de mensajeros con gastos */}
                <div className="space-y-4">
                  {allExpensesData.map((mensajero, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-800">{mensajero.mensajero}</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(mensajero.totalGastos)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {mensajero.gastos.map((gasto: any, gastoIndex: number) => (
                          <div key={gastoIndex} className="flex items-center justify-between bg-gray-50 rounded p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{gasto.tipo_gasto}</span>
                              {gasto.comprobante_link && (
                                <a 
                                  href={gasto.comprobante_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Ver comprobante
                                </a>
                              )}
                            </div>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(gasto.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowAllExpensesModal(false)} className="px-6">
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
                  </div>
  );
}

// Componente separado para la tabla de pedidos
interface PedidosTableProps {
  orders: PedidoTest[];
  orderStatusFilter: string;
  orderPaymentFilter: string;
  onEditOrder: (pedido: PedidoTest) => void;
  onViewComprobante: (pedido: PedidoTest) => void;
  formatCurrency: (amount: number) => string;
}

const PedidosTable = ({ 
  orders, 
  orderStatusFilter, 
  orderPaymentFilter, 
  onEditOrder, 
  onViewComprobante, 
  formatCurrency 
}: PedidosTableProps) => {
  const filteredOrders = orders.filter(pedido => {
    let statusMatch = true;
    if (orderStatusFilter === 'all') {
      statusMatch = true;
    } else if (orderStatusFilter === 'SIN_ASIGNAR') {
      statusMatch = !pedido.mensajero_asignado || pedido.mensajero_asignado === '';
    } else {
      statusMatch = pedido.estado_pedido === orderStatusFilter;
    }
    
    let paymentMatch = true;
    if (orderPaymentFilter === 'all') {
      paymentMatch = true;
    } else if (orderPaymentFilter === 'OTROS') {
      paymentMatch = !pedido.metodo_pago || !['EFECTIVO', 'SINPE', 'TARJETA', '2PAGOS'].includes(pedido.metodo_pago);
    } else {
      paymentMatch = pedido.metodo_pago === orderPaymentFilter;
    }
    return statusMatch && paymentMatch;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-sm text-gray-800">
          Detalle de Pedidos ({orders.length})
        </h3>
        <div className="text-xs text-gray-500">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
                </div>
                </div>
      <div className="bg-white overflow-x-auto max-h-96">
        <Table className="w-full" style={{ minWidth: '1300px' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-xs">ID</TableHead>
                <TableHead className="w-40 text-xs">Cliente</TableHead>
                <TableHead className="w-60 text-xs">Producto</TableHead>
                <TableHead className="w-40 text-xs">Mensajero</TableHead>
                <TableHead className="w-32 text-xs">Valor</TableHead>
                <TableHead className="w-32 text-xs">Método</TableHead>
                <TableHead className="w-24 text-xs">Estado</TableHead>
                <TableHead className="w-36 text-xs">Fecha</TableHead>
                <TableHead className="w-24 text-xs">Acciones</TableHead>
                <TableHead className="w-60 text-xs">Dirección</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((pedido) => (
                <TableRow key={pedido.id_pedido} className="text-xs">
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          pedido.estado_pedido === 'ENTREGADO' ? 'bg-green-500' :
                          pedido.estado_pedido === 'PENDIENTE' ? 'bg-yellow-500' :
                          pedido.estado_pedido === 'DEVOLUCION' ? 'bg-red-500' :
                          pedido.estado_pedido === 'REAGENDADO' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`}
                      />
                      <span className="truncate">{pedido.id_pedido}</span>
              </div>
                  </TableCell>
                  <TableCell className="truncate text-xs">{pedido.cliente_nombre}</TableCell>
                  <TableCell className="truncate text-xs">{pedido.productos || 'No especificado'}</TableCell>
                  <TableCell className="truncate text-xs">{pedido.mensajero_asignado || 'No asignado'}</TableCell>
                  <TableCell className="font-medium text-xs">{formatCurrency(pedido.valor_total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {pedido.metodo_pago === 'SINPE' && <Smartphone className="w-3 h-3 text-blue-600" />}
                      {pedido.metodo_pago === 'EFECTIVO' && <Banknote className="w-3 h-3 text-green-600" />}
                      {pedido.metodo_pago === 'TARJETA' && <CreditCard className="w-3 h-3 text-purple-600" />}
                      {pedido.metodo_pago === '2PAGOS' && (
                        <div className="flex items-center gap-0.5">
                          <Receipt className="w-3 h-3 text-orange-600" />
                          <Receipt className="w-3 h-3 text-orange-600" />
                </div>
              )}
                      <span 
                        className="text-xs" 
                        title={pedido.metodo_pago === '2PAGOS' ? 
                          `Efectivo: ₡${parseFloat(pedido.efectivo_2_pagos || '0').toLocaleString()} | SINPE: ₡${parseFloat(pedido.sinpe_2_pagos || '0').toLocaleString()}` 
                          : undefined}
                      >
                        {pedido.metodo_pago === 'SINPE' ? 'SINPE' :
                         pedido.metodo_pago === 'EFECTIVO' ? 'EFECTIVO' :
                         pedido.metodo_pago === 'TARJETA' ? 'TARJETA' :
                         pedido.metodo_pago === '2PAGOS' ? '2 PAGOS' :
                         'SIN_METODO'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {pedido.estado_pedido === 'ENTREGADO' && <CheckCircle className="w-3 h-3 text-green-600" />}
                      {pedido.estado_pedido === 'PENDIENTE' && <Clock className="w-3 h-3 text-yellow-600" />}
                      {pedido.estado_pedido === 'DEVOLUCION' && <XCircle className="w-3 h-3 text-red-600" />}
                      {pedido.estado_pedido === 'REAGENDADO' && <AlertCircle className="w-3 h-3 text-blue-600" />}
                      <span className="text-xs">
                        {pedido.estado_pedido === 'ENTREGADO' ? 'ENT' :
                         pedido.estado_pedido === 'PENDIENTE' ? 'PEN' :
                         pedido.estado_pedido === 'DEVOLUCION' ? 'DEV' :
                         pedido.estado_pedido === 'REAGENDADO' ? 'REA' :
                         pedido.estado_pedido || 'PEN'}
                      </span>
                  </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{pedido.fecha_creacion.split('T')[0]}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                <Button
                        size="sm"
                  variant="outline"
                        onClick={() => onEditOrder(pedido)}
                        className="text-xs px-2 py-1 h-6 w-full"
                        title="Editar estado"
                      >
                        Editar
                </Button>
                      {pedido.metodo_pago !== 'EFECTIVO' && (
                <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewComprobante(pedido)}
                          className="text-xs px-2 py-1 h-6 w-full"
                          title="Ver comprobante"
                        >
                          Comprobante
                </Button>
                      )}
              </div>
                  </TableCell>
                  <TableCell className="truncate text-xs">{pedido.direccion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
    </div>
  );
  };