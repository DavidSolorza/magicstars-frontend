'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Building,
  Shield,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  PlusCircle,
  Plus,
  ClipboardCopy,
  Lock,
  User,
  CheckCircle,
  CheckCircle2,
  Truck,
  Loader2,
  Save,
  X,
  Check,
  AlertCircle,
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
import { useAuth } from '@/contexts/auth-context';
import {
  UsuarioRow,
  fetchUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from '@/lib/supabase-usuarios';
import { getTiendasUnicas } from '@/lib/supabase-pedidos';

type FormMode = 'create' | 'edit';

type UsuarioFormState = {
  nombre: string;
  rol: 'admin' | 'master' | 'asesor' | 'mensajero' | 'mensajero-extra' | 'mensajero-lider' | string;
  password: string;
  telefono: string;
  tienda: string;
  estado: string;
};

const DEFAULT_FORM_STATE: UsuarioFormState = {
  nombre: '',
  rol: 'mensajero',
  password: '',
  telefono: '',
  tienda: 'MAGIC STARS',
  estado: 'Activo',
};

const isUsuarioActivo = (estado?: string | null) =>
  estado?.trim().toLowerCase() === 'activo' || estado?.trim().toLowerCase() === 'active';

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

const formatPhone = (phone?: string | null) => {
  if (!phone) return 'Sin teléfono';
  
  // Limpiar el número de espacios y caracteres especiales
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // Si tiene código de país (+506), formatear como +506 XXXX-XXXX
  if (cleaned.startsWith('+506') && cleaned.length === 12) {
    return `+506 ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  
  // Si tiene código de país sin + (506), formatear como +506 XXXX-XXXX
  if (cleaned.startsWith('506') && cleaned.length === 11) {
    return `+506 ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  // Si tiene 8 dígitos, formatear como XXXX-XXXX
  if (cleaned.length === 8 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  
  // Si tiene guión, mantenerlo pero limpiar espacios
  if (phone.includes('-')) {
    return phone.trim();
  }
  
  // Devolver el teléfono limpio
  return cleaned || phone;
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'master':
      return 'destructive';
    case 'asesor':
      return 'default';
    case 'mensajero':
      return 'secondary';
    case 'mensajero-extra':
      return 'outline';
    case 'mensajero-lider':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'master':
      return 'Master';
    case 'asesor':
      return 'Asesor';
    case 'mensajero':
      return 'Mensajero';
    case 'mensajero-extra':
      return 'Mensajero Extra';
    case 'mensajero-lider':
      return 'Mensajero Líder';
    default:
      return role;
  }
};

export default function UsuariosPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UsuarioRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formState, setFormState] = useState<UsuarioFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UsuarioRow | null>(null);
  const [passwordPreview, setPasswordPreview] = useState<UsuarioRow | null>(null);
  const [tiendas, setTiendas] = useState<string[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);

  const buildToastSummary = (usuario: UsuarioRow | null) => {
    if (!usuario) return null;

    const tiendaDisplay = getTiendaDisplay(usuario.rol, usuario.empresa);

    return (
      <div className="rounded-md border border-muted bg-background/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {usuario.nombre ?? 'Sin nombre'}
            </p>
            <p className="text-xs text-muted-foreground">
              {getRoleLabel(usuario.rol)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getRoleBadgeVariant(usuario.rol)}>
              {getRoleLabel(usuario.rol)}
            </Badge>
            <Badge variant={isUsuarioActivo(usuario.estado) ? 'default' : 'secondary'}>
              {isUsuarioActivo(usuario.estado) ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-emerald-600" />
            <span>{usuario.telefono ?? 'Sin teléfono'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-3.5 w-3.5 text-purple-600" />
            <span>{tiendaDisplay}</span>
          </div>
        </div>
      </div>
    );
  };

  // Función para obtener el display de tienda según el rol
  const getTiendaDisplay = (rol: string, empresa?: string | null) => {
    if (rol === 'admin' || rol === 'master' || rol === 'mensajero' || rol === 'mensajero-extra' || rol === 'mensajero-lider') {
      return 'MAGIC STARS';
    }
    return empresa ?? 'Sin tienda';
  };

  // Cargar tiendas del back
  const loadTiendas = async () => {
    try {
      setLoadingTiendas(true);
      const tiendasData = await getTiendasUnicas();
      setTiendas(tiendasData);
    } catch (error) {
      console.error('❌ Error al cargar tiendas:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar tiendas',
        description: 'No se pudieron cargar las tiendas disponibles.',
      });
    } finally {
      setLoadingTiendas(false);
    }
  };

  const handleCopyPassword = async (password: string | undefined) => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast({
        title: 'Contraseña copiada',
        description: 'La contraseña se copió al portapapeles.',
      });
    } catch (error) {
      console.error('❌ Error al copiar contraseña:', error);
      toast({
        title: 'Error al copiar contraseña',
        description: 'No se pudo copiar la contraseña.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadTiendas();
  }, []);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = users.filter((usuario) => {
      const matchesSearch =
        !normalizedSearch ||
        usuario.nombre?.toLowerCase().includes(normalizedSearch) ||
        usuario.telefono?.toLowerCase().includes(normalizedSearch) ||
        getTiendaDisplay(usuario.rol, usuario.empresa).toLowerCase().includes(normalizedSearch);

      const matchesRole = roleFilter === 'todos' || usuario.rol === roleFilter;

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && isUsuarioActivo(usuario.estado)) ||
        (statusFilter === 'inactivos' && !isUsuarioActivo(usuario.estado));

      return matchesSearch && matchesRole && matchesStatus;
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const activos = users.filter((u) => isUsuarioActivo(u.estado)).length;
    const inactivos = total - activos;
    const admins = users.filter((u) => u.rol === 'admin').length;
    const masters = users.filter((u) => u.rol === 'master').length;
    const asesores = users.filter((u) => u.rol === 'asesor').length;
    const mensajeros = users.filter((u) => u.rol === 'mensajero').length;
    const mensajerosExtra = users.filter((u) => u.rol === 'mensajero-extra').length;
    const mensajerosLider = users.filter((u) => u.rol === 'mensajero-lider').length;

    return { total, activos, inactivos, admins, masters, asesores, mensajeros, mensajerosExtra, mensajerosLider };
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsuarios();
      setUsers(data);
    } catch (error: any) {
      console.error('❌ Error al cargar usuarios:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar usuarios',
        description: error?.message ?? 'Ocurrió un error inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormMode('create');
    setFormState(DEFAULT_FORM_STATE);
    setSelectedUser(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (usuario: UsuarioRow) => {
    // Verificar si el usuario actual es master y está intentando editar un admin o master
    if (currentUser && currentUser.role === 'master' && (usuario.rol === 'admin' || usuario.rol === 'master')) {
      toast({
        variant: 'destructive',
        title: 'Acceso denegado',
        description: 'Los usuarios master no pueden editar el perfil ni los permisos de otros master y administradores.',
      });
      return;
    }
    
    setFormMode('edit');
    setSelectedUser(usuario);
    
    // Determinar la tienda a mostrar según el rol
    let tiendaValue = '';
    if (usuario.rol === 'admin' || usuario.rol === 'master') {
      tiendaValue = 'MAGIC STARS';
    } else if (usuario.rol === 'mensajero' || usuario.rol === 'mensajero-extra' || usuario.rol === 'mensajero-lider') {
      tiendaValue = 'MAGIC STARS';
    } else {
      tiendaValue = usuario.empresa ?? '';
    }
    
    setFormState({
      nombre: usuario.nombre ?? '',
      rol: (usuario.rol as UsuarioFormState['rol']) ?? 'mensajero',
      password: '',
      telefono: usuario.telefono ?? '',
      tienda: tiendaValue,
      estado: usuario.estado ?? (isUsuarioActivo(usuario.estado) ? 'Activo' : 'Inactivo'),
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setFormError('');
      setSelectedUser(null);
      setProcessing(false);
    } else {
      setFormOpen(true);
    }
  };

  const handleFormChange = (field: keyof UsuarioFormState, value: string) => {
    setFormState((prev) => {
      const newState = {
      ...prev,
      [field]: value,
      };
      
      // Si se cambia el rol a un mensajero, asignar automáticamente MAGIC STARS
      if (field === 'rol' && (value === 'mensajero' || value === 'mensajero-extra' || value === 'mensajero-lider')) {
        newState.tienda = 'MAGIC STARS';
      }
      
      return newState;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    setFormError('');

    // Determinar la tienda según el rol
    let tiendaFinal = formState.tienda.trim();
    if (formState.rol === 'admin' || formState.rol === 'master' || formState.rol === 'mensajero' || formState.rol === 'mensajero-extra' || formState.rol === 'mensajero-lider') {
      tiendaFinal = 'MAGIC STARS';
    }

    const payload = {
      nombre: formState.nombre.trim(),
      rol: formState.rol.trim(),
      password: formState.password.trim(),
      telefono: formState.telefono.trim(),
      empresa: tiendaFinal, // Usar empresa como campo para tienda
      estado: formState.estado.trim() || 'Activo',
    };

    if (!payload.nombre) {
      setFormError('El nombre es obligatorio.');
      setProcessing(false);
      return;
    }

    // Validar que asesor tenga tienda seleccionada
    if (formState.rol === 'asesor' && !tiendaFinal) {
      setFormError('El asesor debe estar asociado a una tienda.');
      setProcessing(false);
      return;
    }

    if (formMode === 'create' && !payload.password) {
      setFormError('La contraseña es obligatoria para crear un usuario.');
      setProcessing(false);
      return;
    }

    // Verificar restricciones para master
    if (currentUser && currentUser.role === 'master') {
      // Master no puede crear admin o master
      if (formMode === 'create' && (payload.rol === 'admin' || payload.rol === 'master')) {
        setFormError('Los usuarios master no pueden crear administradores ni otros masters.');
        setProcessing(false);
        return;
      }
      
      // Master no puede editar admin o master
      if (formMode === 'edit' && selectedUser && (selectedUser.rol === 'admin' || selectedUser.rol === 'master')) {
        setFormError('Los usuarios master no pueden editar el perfil ni los permisos de otros master y administradores.');
        setProcessing(false);
        return;
      }
      
      // Master no puede cambiar el rol de un usuario a admin o master
      if (formMode === 'edit' && selectedUser && (payload.rol === 'admin' || payload.rol === 'master')) {
        setFormError('Los usuarios master no pueden asignar roles de administrador o master.');
        setProcessing(false);
        return;
      }
    }

    try {
      if (formMode === 'create') {
        // Generar email base
        const nombreNormalizado = payload.nombre.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.');
        let emailBase = `${nombreNormalizado}@magicstars.cr`;
        let emailFinal = emailBase;
        let counter = 1;
        const maxAttempts = 100; // Límite de seguridad
        
        // Verificar si el email ya existe y generar uno único
        const usuariosExistentes = await fetchUsuarios();
        const emailsExistentes = new Set(usuariosExistentes.map(u => u.email?.toLowerCase().trim()).filter(Boolean));
        
        while (emailsExistentes.has(emailFinal.toLowerCase()) && counter < maxAttempts) {
          emailFinal = `${nombreNormalizado}.${counter}@magicstars.cr`;
          counter++;
        }
        
        if (counter >= maxAttempts) {
          // Si llegamos al límite, usar timestamp para garantizar unicidad
          emailFinal = `${nombreNormalizado}.${Date.now()}@magicstars.cr`;
        }
        
        const nuevoUsuario = await createUsuario({
          email: emailFinal, // Email único generado
          nombre: payload.nombre,
          rol: payload.rol,
          password: payload.password,
          telefono: payload.telefono || null,
          empresa: payload.empresa || null,
          estado: payload.estado || 'Activo',
        });
        toast({
          title: 'Usuario creado',
          description: buildToastSummary(nuevoUsuario),
        });
      } else if (selectedUser) {
        const usuarioActualizado = await updateUsuario(selectedUser, {
          nombre: payload.nombre,
          rol: payload.rol,
          password: payload.password || undefined,
          telefono: payload.telefono || null,
          empresa: payload.empresa || null,
          estado: payload.estado || 'Activo',
        });
        toast({
          title: 'Usuario actualizado',
          description: buildToastSummary(usuarioActualizado),
        });
      }

      setFormOpen(false);
      setFormState(DEFAULT_FORM_STATE);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('❌ Error guardando usuario:', error);
      setFormError(error?.message ?? 'No se pudo guardar el usuario.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    // Verificar si el usuario actual es master y está intentando eliminar un admin o master
    if (currentUser && currentUser.role === 'master' && (deleteTarget.rol === 'admin' || deleteTarget.rol === 'master')) {
      toast({
        variant: 'destructive',
        title: 'Acceso denegado',
        description: 'Los usuarios master no pueden eliminar administradores ni otros masters.',
      });
      setDeleteTarget(null);
      return;
    }

    try {
      setProcessing(true);
      const deletedSnapshot = deleteTarget;
      await deleteUsuario(deleteTarget);
      toast({
        title: 'Usuario eliminado',
        description: buildToastSummary(deletedSnapshot),
        variant: 'destructive',
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (error: any) {
      console.error('❌ Error eliminando usuario:', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar usuario',
        description: error?.message ?? 'No se pudo eliminar el usuario.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    const header = ['Nombre', 'Rol', 'Teléfono', 'Tienda', 'Estado', 'Fecha Creación'];
    const rows = filteredUsers.map((usuario) => [
      usuario.nombre ?? '',
      getRoleLabel(usuario.rol),
      usuario.telefono ?? '',
      getTiendaDisplay(usuario.rol, usuario.empresa),
      isUsuarioActivo(usuario.estado) ? 'Activo' : 'Inactivo',
      formatDate(usuario.created_at),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'usuarios-magicstars.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 min-h-[60vh]">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 border-b-purple-500 animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
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
              <Users className="h-8 w-8 text-white" />
            </div>
        <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Shield className="h-4 w-4" />
            Panel de gestión de usuarios
          </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Gestión de Usuarios
          </h1>
              <p className="text-white/90 text-base">
            Administra mensajeros, asesores y administradores del sistema de forma centralizada.
          </p>
        </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? 'Ocultar' : 'Mostrar'} contraseñas
          </Button>
            <Button 
              onClick={openCreateModal} 
              className="flex items-center gap-2 bg-white text-sky-600 hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg"
            >
            <PlusCircle className="w-4 h-4" />
            Nuevo usuario
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

      {/* Cards de Estadísticas - Reorganizadas y mejoradas */}
      <div className="space-y-6">
        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-sky-200 dark:border-sky-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Usuarios</p>
                  <p className="text-3xl font-bold text-sky-700 dark:text-sky-400">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Usuarios registrados</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.activos}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}% del total
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-rose-200 dark:border-rose-800">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/30 to-red-400/30 blur-xl" />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Usuarios Inactivos</p>
                  <p className="text-3xl font-bold text-rose-700 dark:text-rose-400">{stats.inactivos}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total > 0 ? Math.round((stats.inactivos / stats.total) * 100) : 0}% del total
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg">
                  <UserX className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles por Categoría */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Distribución por Roles</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-violet-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Shield className="w-5 h-5 text-violet-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Administradores</p>
                  <p className="text-xl font-bold text-violet-700">{stats.admins}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-purple-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Masters</p>
                  <p className="text-xl font-bold text-purple-700">{stats.masters}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <Building className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Asesores</p>
                  <p className="text-xl font-bold text-amber-700">{stats.asesores}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                    <Truck className="w-5 h-5 text-sky-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Mensajeros</p>
                  <p className="text-xl font-bold text-sky-700">{stats.mensajeros}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-indigo-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Mensajeros Extra</p>
                  <p className="text-xl font-bold text-indigo-700">{stats.mensajerosExtra}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-teal-500/20" />
              <CardContent className="relative p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Mensajeros Líder</p>
                  <p className="text-xl font-bold text-teal-700">{stats.mensajerosLider}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sección de Filtros - Mejorada */}
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
                    Filtra usuarios por rol, estado o búsqueda de texto
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {filteredUsers.length} resultado{filteredUsers.length === 1 ? '' : 's'}
              </Badge>
            </div>
        </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros rápidos */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4 text-sky-500" />
                Filtros rápidos por rol
              </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={roleFilter === 'todos' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'todos' 
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md' 
                      : 'hover:bg-sky-50'
                  }`}
              onClick={() => setRoleFilter('todos')}
            >
              Todos los roles
            </Button>
            <Button
              size="sm"
              variant={roleFilter === 'mensajero' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'mensajero' 
                      ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md' 
                      : 'hover:bg-sky-50'
                  }`}
              onClick={() => setRoleFilter('mensajero')}
            >
              Mensajeros
            </Button>
            <Button
              size="sm"
              variant={roleFilter === 'asesor' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'asesor' 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md' 
                      : 'hover:bg-amber-50'
                  }`}
              onClick={() => setRoleFilter('asesor')}
            >
              Asesores
            </Button>
            <Button
              size="sm"
              variant={roleFilter === 'admin' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'admin' 
                      ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-md' 
                      : 'hover:bg-violet-50'
                  }`}
              onClick={() => setRoleFilter('admin')}
            >
              Admins
            </Button>
                <Button
                  size="sm"
                  variant={roleFilter === 'master' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'master' 
                      ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' 
                      : 'hover:bg-purple-50'
                  }`}
                  onClick={() => setRoleFilter('master')}
                >
                  Masters
                </Button>
                <Button
                  size="sm"
                  variant={roleFilter === 'mensajero-lider' ? 'default' : 'outline'}
                  className={`transition-all duration-200 hover:scale-105 ${
                    roleFilter === 'mensajero-lider' 
                      ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md' 
                      : 'hover:bg-teal-50'
                  }`}
                  onClick={() => setRoleFilter('mensajero-lider')}
                >
                  Mensajeros Líder
                </Button>
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <span className="text-xs text-muted-foreground">Estado</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            </div>

            {/* Filtros de estado */}
            <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={statusFilter === 'activos' ? 'default' : 'outline'}
                className={`transition-all duration-200 hover:scale-105 ${
                  statusFilter === 'activos' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md' 
                    : 'hover:bg-emerald-50'
                }`}
              onClick={() => setStatusFilter('activos')}
            >
                <UserCheck className="w-3 h-3 mr-1" />
              Solo activos
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'inactivos' ? 'default' : 'outline'}
                className={`transition-all duration-200 hover:scale-105 ${
                  statusFilter === 'inactivos' 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md' 
                    : 'hover:bg-rose-50'
                }`}
              onClick={() => setStatusFilter('inactivos')}
            >
                <UserX className="w-3 h-3 mr-1" />
              Solo inactivos
            </Button>
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
                    placeholder="Nombre, teléfono o tienda..."
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

      {/* Tabla de Usuarios - Mejorada */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-10 group-hover:opacity-20 blur transition duration-300"></div>
        <Card className="relative border-0 shadow-lg bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Lista de Usuarios</CardTitle>
                  <CardDescription className="mt-1">
                    Información completa de todos los usuarios del sistema
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                {filteredUsers.length} usuario{filteredUsers.length === 1 ? '' : 's'}
              </Badge>
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
              <Table>
              <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-emerald-200 dark:border-emerald-800">
                    <TableHead className="font-semibold">Usuario</TableHead>
                    <TableHead className="font-semibold">Rol</TableHead>
                    <TableHead className="font-semibold">Teléfono</TableHead>
                    <TableHead className="font-semibold">Tienda</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    {showPasswords && <TableHead className="font-semibold">Contraseña</TableHead>}
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredUsers.map((usuario, index) => (
                    <TableRow 
                      key={usuario.id ?? usuario.nombre} 
                      className="hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200 border-b border-emerald-100/50 dark:border-emerald-900/30"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white shadow-md transition-transform hover:scale-110">
                            {(usuario.nombre ?? '?')
                            .toString()
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">{usuario.nombre ?? 'Sin nombre'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        <Badge 
                          variant={getRoleBadgeVariant(usuario.rol)}
                          className="transition-all duration-200 hover:scale-105"
                        >
                        {getRoleLabel(usuario.rol)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.telefono ? (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="font-mono">{formatPhone(usuario.telefono)}</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(usuario)}
                          className="h-8 text-xs gap-1.5 border-dashed hover:border-solid transition-all duration-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-amber-500" />
                          <span className="font-medium uppercase">{getTiendaDisplay(usuario.rol, usuario.empresa)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isUsuarioActivo(usuario.estado) ? 'default' : 'secondary'}
                          className={`transition-all duration-200 hover:scale-105 ${
                            isUsuarioActivo(usuario.estado) 
                              ? 'bg-emerald-500/90 hover:bg-emerald-600 shadow-sm' 
                              : 'bg-rose-500/90 hover:bg-rose-600'
                          }`}
                      >
                        {isUsuarioActivo(usuario.estado) ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    {showPasswords && (
                      <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded border border-border/50">
                          {usuario.password ?? 'Sin contraseña'}
                        </code>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPasswordPreview(usuario)}
                          aria-label="Ver contraseña"
                          disabled={!usuario.password}
                            className="transition-all duration-200 hover:scale-110 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(usuario)}
                          aria-label="Editar usuario"
                          disabled={!!(currentUser && currentUser.role === 'master' && (usuario.rol === 'admin' || usuario.rol === 'master'))}
                            className="transition-all duration-200 hover:scale-110 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={currentUser && currentUser.role === 'master' && (usuario.rol === 'admin' || usuario.rol === 'master') ? 'No puedes editar administradores ni masters' : 'Editar usuario'}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setDeleteTarget(usuario)}
                          aria-label="Eliminar usuario"
                          disabled={!!(currentUser && currentUser.role === 'master' && (usuario.rol === 'admin' || usuario.rol === 'master'))}
                          title={currentUser && currentUser.role === 'master' && (usuario.rol === 'admin' || usuario.rol === 'master') ? 'No puedes eliminar administradores ni masters' : 'Eliminar usuario'}
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

          {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground mb-1">No se encontraron usuarios</p>
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
      <DialogContent className="max-w-3xl lg:max-w-4xl border-none shadow-2xl p-0 overflow-hidden">
        {/* Header con gradiente animado */}
        <DialogHeader className="relative bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 p-4 text-white">
          <div className="absolute inset-0 opacity-20"></div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {formMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-0.5 text-xs">
                  {formMode === 'create'
                    ? 'Completa la información para registrar un nuevo usuario.'
                    : 'Actualiza la información del usuario seleccionado.'}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-white/20 backdrop-blur-sm text-white border-white/30">
              {getRoleLabel(formState.rol)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <form id="usuario-form" onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Sección de Información Personal */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Información Personal</h3>
                    <p className="text-xs text-muted-foreground">
                      Datos básicos del usuario
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 group/input">
                    <Label htmlFor="nombre" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-500" />
                      Nombre Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      value={formState.nombre}
                      onChange={(event) => handleFormChange('nombre', event.target.value)}
                      placeholder="Ej: Juan Pérez"
                      required
                      disabled={processing}
                      className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 group-hover/input:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-2 group/input">
                    <Label htmlFor="telefono" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      value={formState.telefono}
                      onChange={(event) => handleFormChange('telefono', event.target.value)}
                      placeholder="+506 8888-0000"
                      disabled={processing}
                      className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 group-hover/input:border-emerald-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Credenciales */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950 dark:to-indigo-950 rounded-lg p-4 border border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white shadow-md">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Credenciales de Acceso</h3>
                    <p className="text-xs text-muted-foreground">
                      {formMode === 'edit' ? 'Deja en blanco para mantener la contraseña' : 'Define una contraseña segura'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-sky-500" />
                    Contraseña {formMode === 'create' && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="password"
                    type="text"
                    value={formState.password}
                    onChange={(event) => handleFormChange('password', event.target.value)}
                    placeholder={formMode === 'edit' ? '•••••••• (dejar vacío para no cambiar)' : 'Ingresa una contraseña segura'}
                    required={formMode === 'create'}
                    disabled={processing}
                    className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Sección de Configuración */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500 text-white shadow-md">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Configuración</h3>
                    <p className="text-xs text-muted-foreground">
                      Rol y estado del usuario
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="rol" className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      Rol <span className="text-red-500">*</span>
                    </Label>
                  <Select
                    value={formState.rol}
                    onValueChange={(value) => handleFormChange('rol', value)}
                    disabled={processing}
                  >
                      <SelectTrigger id="rol" className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Administrador
                          </div>
                        </SelectItem>
                        <SelectItem value="master">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Master
                          </div>
                        </SelectItem>
                        <SelectItem value="asesor">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Asesor
                          </div>
                        </SelectItem>
                        <SelectItem value="mensajero">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Mensajero
                          </div>
                        </SelectItem>
                        <SelectItem value="mensajero-extra">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Mensajero Extra
                          </div>
                        </SelectItem>
                        <SelectItem value="mensajero-lider">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Mensajero Líder
                          </div>
                        </SelectItem>
                    </SelectContent>
                  </Select>
                    {/* Info de Asociación debajo del Rol */}
                    {(formState.rol === 'admin' || formState.rol === 'master' || formState.rol === 'mensajero' || formState.rol === 'mensajero-extra' || formState.rol === 'mensajero-lider') && (
                      <div className="flex items-center gap-1.5 mt-1.5 p-2 bg-purple-100/50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                        <Building className="h-3 w-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Asociado a <strong>MAGIC STARS</strong>
                        </p>
                      </div>
                    )}
                    {formState.rol === 'asesor' && (
                      <div className="space-y-1.5 mt-1.5">
                        <Label htmlFor="tienda" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Building className="h-3 w-3 text-amber-500" />
                          Tienda
                        </Label>
                        <Select
                          value={formState.tienda}
                          onValueChange={(value) => handleFormChange('tienda', value)}
                          disabled={processing || loadingTiendas}
                        >
                          <SelectTrigger id="tienda" className="h-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-amber-500">
                            <SelectValue placeholder={loadingTiendas ? 'Cargando tiendas...' : 'Selecciona una tienda'} />
                          </SelectTrigger>
                          <SelectContent>
                            {tiendas.map((tienda) => (
                              <SelectItem key={tienda} value={tienda}>
                                {tienda}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                    Estado
                  </Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`h-2 w-2 rounded-full ${isUsuarioActivo(formState.estado) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium">
                        {isUsuarioActivo(formState.estado) ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <Switch
                      id="estado"
                      checked={isUsuarioActivo(formState.estado)}
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
            form="usuario-form" 
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
                Crear Usuario
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
          <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que deseas eliminar al usuario{' '}
            <span className="font-semibold">
              {deleteTarget?.nombre ?? deleteTarget?.email ?? 'seleccionado'}
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

    <AlertDialog open={!!passwordPreview} onOpenChange={(open) => !open && setPasswordPreview(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Contraseña del usuario</AlertDialogTitle>
          <AlertDialogDescription>
            Revisa la contraseña actual del usuario seleccionado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-muted bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {passwordPreview?.nombre ?? 'Sin nombre'}
              </p>
              <p className="text-xs text-muted-foreground">{passwordPreview?.email}</p>
            </div>
            <Badge variant={getRoleBadgeVariant(passwordPreview?.rol ?? '')}>
              {getRoleLabel(passwordPreview?.rol ?? '')}
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Contraseña</p>
            <code className="mt-1 inline-block rounded bg-background px-2 py-1 text-sm font-semibold">
              {passwordPreview?.password ?? 'Sin contraseña'}
            </code>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPasswordPreview(null)}>
            Cerrar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleCopyPassword(passwordPreview?.password);
            }}
            disabled={!passwordPreview?.password}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copiar contraseña
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

