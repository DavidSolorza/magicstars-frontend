'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building,
  Search,
  Filter,
  Download,
  Pencil,
  Trash2,
  PlusCircle,
  Loader2,
  Save,
  X,
  Check,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  TiendaRow,
  fetchTiendas,
  createTienda,
  updateTienda,
  deleteTienda,
  isTiendaActiva,
} from '@/lib/supabase-tiendas';

type FormMode = 'create' | 'edit';

type TiendaFormState = {
  nombre: string;
  estado: string;
};

const DEFAULT_FORM_STATE: TiendaFormState = {
  nombre: '',
  estado: 'Activo',
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'No disponible';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-CR');
};

export default function TiendasPage() {
  const { toast } = useToast();
  const [tiendas, setTiendas] = useState<TiendaRow[]>([]);
  const [filteredTiendas, setFilteredTiendas] = useState<TiendaRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formState, setFormState] = useState<TiendaFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedTienda, setSelectedTienda] = useState<TiendaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TiendaRow | null>(null);

  const buildToastSummary = (tienda: TiendaRow | null) => {
    if (!tienda) return null;

    return (
      <div className="rounded-md border border-muted bg-background/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {tienda.nombre ?? 'Sin nombre'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={isTiendaActiva(tienda.estado) ? 'default' : 'secondary'}>
              {isTiendaActiva(tienda.estado) ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    void loadTiendas();
  }, []);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = tiendas.filter((tienda) => {
      const matchesSearch =
        !normalizedSearch ||
        tienda.nombre?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activas' && isTiendaActiva(tienda.estado)) ||
        (statusFilter === 'inactivas' && !isTiendaActiva(tienda.estado));

      return matchesSearch && matchesStatus;
    });

    setFilteredTiendas(filtered);
  }, [tiendas, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = tiendas.length;
    const activas = tiendas.filter((t) => isTiendaActiva(t.estado)).length;
    const inactivas = total - activas;

    return { total, activas, inactivas };
  }, [tiendas]);

  const loadTiendas = async () => {
    try {
      setLoading(true);
      const data = await fetchTiendas();
      setTiendas(data);
    } catch (error: any) {
      console.error('❌ Error al cargar tiendas:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar tiendas',
        description: error?.message ?? 'Ocurrió un error inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormState(DEFAULT_FORM_STATE);
    setSelectedTienda(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (tienda: TiendaRow) => {
    setFormMode('edit');
    setSelectedTienda(tienda);
    setFormState({
      nombre: tienda.nombre ?? '',
      estado: tienda.estado ?? (isTiendaActiva(tienda.estado) ? 'Activo' : 'Inactivo'),
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setFormError('');
      setSelectedTienda(null);
      setProcessing(false);
    } else {
      setFormOpen(true);
    }
  };

  const handleFormChange = (field: keyof TiendaFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    setFormError('');

    const payload = {
      nombre: formState.nombre.trim(),
      estado: formState.estado.trim() || 'Activo',
    };

    if (!payload.nombre) {
      setFormError('El nombre es obligatorio.');
      setProcessing(false);
      return;
    }

    try {
      if (formMode === 'create') {
        const nuevaTienda = await createTienda({
          nombre: payload.nombre,
          estado: payload.estado,
        });
        toast({
          title: 'Tienda creada',
          description: buildToastSummary(nuevaTienda),
        });
      } else if (selectedTienda) {
        const tiendaActualizada = await updateTienda(selectedTienda, {
          nombre: payload.nombre,
          estado: payload.estado,
        });
        toast({
          title: 'Tienda actualizada',
          description: buildToastSummary(tiendaActualizada),
        });
      }

      setFormOpen(false);
      setFormState(DEFAULT_FORM_STATE);
      setSelectedTienda(null);
      await loadTiendas();
    } catch (error: any) {
      console.error('❌ Error guardando tienda:', error);
      setFormError(error?.message ?? 'No se pudo guardar la tienda.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setProcessing(true);
      const deletedSnapshot = deleteTarget;
      await deleteTienda(deleteTarget);
      toast({
        title: 'Tienda eliminada',
        description: buildToastSummary(deletedSnapshot),
        variant: 'destructive',
      });
      setDeleteTarget(null);
      await loadTiendas();
    } catch (error: any) {
      console.error('❌ Error eliminando tienda:', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar tienda',
        description: error?.message ?? 'No se pudo eliminar la tienda.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    const header = ['Nombre', 'Estado', 'Fecha Creación'];
    const rows = filteredTiendas.map((tienda) => [
      tienda.nombre ?? '',
      isTiendaActiva(tienda.estado) ? 'Activa' : 'Inactiva',
      formatDate(tienda.created_at),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tiendas-magicstars.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header mejorado con gradiente */}
        <div className="relative rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-8 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20"></div>
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                  <Building className="h-4 w-4" />
                  Panel de gestión de tiendas
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                  Gestión de Tiendas
                </h1>
                <p className="text-white/90 text-base">
                  Administra todas las tiendas del sistema de forma centralizada.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={openCreateModal} 
                className="flex items-center gap-2 bg-white text-sky-600 hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <PlusCircle className="w-4 h-4" />
                Nueva tienda
              </Button>
              <Button 
                onClick={exportToCSV} 
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105" 
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estadísticas */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Tiendas</p>
                    <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tiendas registradas</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                    <Building className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tiendas Activas</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.activas}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.activas / stats.total) * 100) : 0}% del total
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-rose-200 dark:border-rose-800">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/30 to-red-400/30 blur-xl" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tiendas Inactivas</p>
                    <p className="text-3xl font-bold text-rose-700 dark:text-rose-400">{stats.inactivas}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.inactivas / stats.total) * 100) : 0}% del total
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección de Filtros */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-sky-50/50 to-indigo-50/50 dark:from-sky-950/50 dark:to-indigo-950/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Filtros y Búsqueda</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Filtra tiendas por estado o búsqueda de texto
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {filteredTiendas.length} resultado{filteredTiendas.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtros de estado */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4 text-sky-500" />
                  Filtros por estado
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={statusFilter === 'todos' ? 'default' : 'outline'}
                    className={`transition-all duration-200 hover:scale-105 ${
                      statusFilter === 'todos' 
                        ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md' 
                        : 'hover:bg-sky-50'
                    }`}
                    onClick={() => setStatusFilter('todos')}
                  >
                    Todas las tiendas
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'activas' ? 'default' : 'outline'}
                    className={`transition-all duration-200 hover:scale-105 ${
                      statusFilter === 'activas' 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md' 
                        : 'hover:bg-emerald-50'
                    }`}
                    onClick={() => setStatusFilter('activas')}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Solo activas
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'inactivas' ? 'default' : 'outline'}
                    className={`transition-all duration-200 hover:scale-105 ${
                      statusFilter === 'inactivas' 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md' 
                        : 'hover:bg-rose-50'
                    }`}
                    onClick={() => setStatusFilter('inactivas')}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Solo inactivas
                  </Button>
                </div>
              </div>

              {/* Búsqueda */}
              <div className="pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Search className="h-4 w-4 text-sky-500" />
                    Buscar
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre de tienda..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-9 h-10 transition-all duration-200 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Tiendas */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Lista de Tiendas</CardTitle>
                    <CardDescription className="mt-1">
                      Información completa de todas las tiendas del sistema
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {filteredTiendas.length} tienda{filteredTiendas.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-emerald-200 dark:border-emerald-800">
                      <TableHead className="font-semibold">Tienda</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Fecha Creación</TableHead>
                      <TableHead className="text-right font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTiendas.map((tienda, index) => (
                      <TableRow 
                        key={tienda.id ?? tienda.nombre} 
                        className="hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200 border-b border-emerald-100/50 dark:border-emerald-900/30"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white shadow-md transition-transform hover:scale-110">
                              {(tienda.nombre ?? '?')
                                .toString()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{tienda.nombre ?? 'Sin nombre'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isTiendaActiva(tienda.estado) ? 'default' : 'secondary'}
                            className={`transition-all duration-200 hover:scale-105 ${
                              isTiendaActiva(tienda.estado) 
                                ? 'bg-emerald-500/90 hover:bg-emerald-600 shadow-sm' 
                                : 'bg-rose-500/90 hover:bg-rose-600'
                            }`}
                          >
                            {isTiendaActiva(tienda.estado) ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(tienda.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(tienda)}
                              aria-label="Editar tienda"
                              className="transition-all duration-200 hover:scale-110 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-110"
                              onClick={() => setDeleteTarget(tienda)}
                              aria-label="Eliminar tienda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredTiendas.length === 0 && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Building className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">No se encontraron tiendas</p>
                      <p className="text-sm text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl border-none shadow-2xl p-0 overflow-hidden">
          {/* Header con gradiente animado */}
          <DialogHeader className="relative bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-4 text-white">
            <div className="absolute inset-0 opacity-20"></div>
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    {formMode === 'create' ? 'Crear Nueva Tienda' : 'Editar Tienda'}
                  </DialogTitle>
                  <DialogDescription className="text-white/90 mt-0.5 text-xs">
                    {formMode === 'create'
                      ? 'Completa la información para registrar una nueva tienda.'
                      : 'Actualiza la información de la tienda seleccionada.'}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <form id="tienda-form" onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Sección de Información */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md">
                      <Building className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Información de la Tienda</h3>
                      <p className="text-xs text-muted-foreground">
                        Datos básicos de la tienda
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2 group/input">
                      <Label htmlFor="nombre" className="text-sm font-medium flex items-center gap-2">
                        <Building className="h-4 w-4 text-emerald-500" />
                        Nombre de la Tienda <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nombre"
                        value={formState.nombre}
                        onChange={(event) => handleFormChange('nombre', event.target.value)}
                        placeholder="Ej: MAGIC STARS"
                        required
                        disabled={processing}
                        className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 group-hover/input:border-emerald-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado" className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Estado
                      </Label>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`h-2 w-2 rounded-full ${isTiendaActiva(formState.estado) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium">
                            {isTiendaActiva(formState.estado) ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <Switch
                          id="estado"
                          checked={isTiendaActiva(formState.estado)}
                          onCheckedChange={(checked) => handleFormChange('estado', checked ? 'Activo' : 'Inactivo')}
                          disabled={processing}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{formError}</AlertDescription>
                </Alert>
              )}
            </form>
          </ScrollArea>
          <DialogFooter className="px-4 py-3 bg-muted/50 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleFormClose(false)} 
              disabled={processing}
              className="transition-all duration-200 hover:scale-105"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="tienda-form" 
              disabled={processing}
              className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white transition-all duration-200 hover:scale-105 shadow-lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : formMode === 'create' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Crear Tienda
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tienda</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la tienda{' '}
              <span className="font-semibold">
                {deleteTarget?.nombre ?? 'seleccionada'}
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={processing}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

