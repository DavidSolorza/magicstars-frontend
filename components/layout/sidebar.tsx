'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Truck,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Star,
  User,
  Building2,
  Building,
  Warehouse,
  Network,
  DollarSign,
  Route,
  ScanLine,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
    { icon: Package, label: 'Pedidos', href: '/dashboard/admin/pedidos' },
    { icon: Warehouse, label: 'Inventario', href: '/dashboard/admin/inventory' },
    // { icon: Network, label: 'Logística Externa', href: '/dashboard/admin/red-logistic' },
    { icon: Truck, label: 'Rutas', href: '/dashboard/admin/routes' },
    // { icon: Route, label: 'Gestión de Rutas', href: '/dashboard/admin/route-management' },
    { icon: DollarSign, label: 'Liquidación', href: '/dashboard/admin/liquidation' },
    { icon: Users, label: 'Usuarios', href: '/dashboard/admin/usuarios' },
    { icon: Building, label: 'Tienda', href: '/dashboard/admin/tiendas' },
    // { icon: Building2, label: 'Empresas', href: '/dashboard/admin/companies' },
    { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/admin/stats' },
  ],
  master: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
    { icon: Package, label: 'Pedidos', href: '/dashboard/admin/pedidos' },
    { icon: Warehouse, label: 'Inventario', href: '/dashboard/admin/inventory' },
    // { icon: Network, label: 'Logística Externa', href: '/dashboard/admin/red-logistic' },
    { icon: Truck, label: 'Rutas', href: '/dashboard/admin/routes' },
    // { icon: Route, label: 'Gestión de Rutas', href: '/dashboard/admin/route-management' },
    { icon: DollarSign, label: 'Liquidación', href: '/dashboard/admin/liquidation' },
    { icon: Users, label: 'Usuarios', href: '/dashboard/admin/usuarios' },
    { icon: Building, label: 'Tienda', href: '/dashboard/admin/tiendas' },
    // { icon: Building2, label: 'Empresas', href: '/dashboard/admin/companies' },
    { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/admin/stats' },
  ],
  asesor: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/asesor' },
    { icon: Package, label: 'Pedidos Sin Confirmar', href: '/dashboard/asesor/pedidos-sin-confirmar' },
    { icon: Warehouse, label: 'Inventario', href: '/dashboard/asesor/inventory' },
    { icon: Network, label: 'Logística Externa', href: '/dashboard/asesor/red-logistic' },
    // { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/asesor/stats' },
  ],
  mensajero: [
    { icon: Route, label: 'Mi Ruta de Hoy', href: '/dashboard/mensajero/mi-ruta-hoy' },
    { icon: MapPin, label: 'Mapa', href: '/dashboard/mensajero/mapa' },
    { icon: LayoutDashboard, label: 'Mis Pedidos', href: '/dashboard/mensajero' },
    { icon: Truck, label: 'Historial de Rutas', href: '/dashboard/mensajero/route-history' },
    { icon: User, label: 'Mi Perfil', href: '/dashboard/mensajero/profile' },
  ] as any[],
  'mensajero-lider': [
    { icon: Route, label: 'Mi Ruta de Hoy', href: '/dashboard/mensajero/mi-ruta-hoy' },
    { icon: LayoutDashboard, label: 'Mis Pedidos', href: '/dashboard/mensajero' },
    { icon: Truck, label: 'Historial de Rutas', href: '/dashboard/mensajero/route-history' },
    { icon: Route, label: 'Rutas', href: '/dashboard/mensajero-lider' },
    { icon: User, label: 'Mi Perfil', href: '/dashboard/mensajero/profile' },
  ] as any[],
  'mensajero-extra': [
    { icon: Route, label: 'Mi Ruta de Hoy', href: '/dashboard/mensajero/mi-ruta-hoy' },
    { icon: MapPin, label: 'Mapa', href: '/dashboard/mensajero/mapa' },
    { icon: LayoutDashboard, label: 'Mis Pedidos', href: '/dashboard/mensajero' },
    { icon: Truck, label: 'Historial de Rutas', href: '/dashboard/mensajero/route-history' },
    { icon: User, label: 'Mi Perfil', href: '/dashboard/mensajero/profile' },
  ] as any[],
  tienda: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/tienda' },
    { icon: Package, label: 'Pedidos', href: '/dashboard/tienda/orders' },
    { icon: DollarSign, label: 'Liquidación', href: '/dashboard/tienda/liquidacion' },
    // { icon: BarChart3, label: 'Estadísticas', href: '/dashboard/tienda/stats' },
    // { icon: User, label: 'Mi Perfil', href: '/dashboard/tienda/profile' },
  ],
};

export const Sidebar = memo(function Sidebar({ onMobileMenuChange }: { onMobileMenuChange?: (isOpen: boolean) => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Notificar al layout cuando cambie el estado del menú móvil
  useEffect(() => {
    onMobileMenuChange?.(isOpen);
  }, [isOpen, onMobileMenuChange]);

  // Cerrar menú con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el menú está abierto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Memoizar los items del menú para evitar recálculos innecesarios
  const userMenuItems = useMemo(() => {
    if (!user) return [];
    
    // Obtener menú base según el rol
    let items = menuItems[user.role] || [];
    
    // Master usa el mismo menú que admin
    if (user.role === 'master') {
      items = menuItems['admin'];
    }
    
    // Fallback para mensajeros anteriores con flag de líder
    if (user.role === 'mensajero' && user.isMessengerLeader) {
      items = menuItems['mensajero-lider'];
    }

  // Obtener menú base según el rol
  let userMenuItems = (menuItems as any)[user.role] || [];
  
  // Fallback para mensajeros anteriores con flag de líder
  if (user.role === 'mensajero' && user.isMessengerLeader) {
    userMenuItems = menuItems['mensajero-lider'];
  }

  // Agregar botón de escaneo para mensajeros
  if (user.role === 'mensajero' || user.role === 'mensajero-lider' || user.role === 'mensajero-extra') {
    const messengerName = user.name || '';
    const escaneoUrl = `https://inventario-magic-stars.vercel.app/?mensajero=${encodeURIComponent(messengerName)}`;
    userMenuItems = [
      ...userMenuItems,
      { icon: ScanLine, label: 'Escaneo', href: escaneoUrl, isExternal: true },
    ];
  }

  const SidebarContent = () => (
    <>
      {/* Header del sidebar - Mejorado */}
      <div className="relative p-4 border-b border-slate-200/80 flex-shrink-0 bg-gradient-to-r from-sky-50/50 via-indigo-50/50 to-purple-50/50 dark:from-sky-950/50 dark:via-indigo-950/50 dark:to-purple-950/50 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {user.role === 'asesor' && user.company ? (
              <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user.company.name}</h1>
            ) : (
              <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Magic Stars</h1>
            )}
            {user.role === 'asesor' && user.company ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                Asesor
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                {user.role === 'master' ? 'Master' : user.role}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navegación principal - scrollable */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent" role="navigation" aria-label="Navegación principal">
        {userMenuItems.map((item: any, index: number) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isExternal = (item as any).isExternal || false;
          
          const content = (
            <>
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 flex-shrink-0",
                isActive 
                  ? "bg-white/20 backdrop-blur-sm" 
                  : "bg-slate-100/50 dark:bg-slate-800/50 group-hover:bg-slate-200/50 dark:group-hover:bg-slate-700/50"
              )}>
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
                )} />
              </div>
              <span className={cn(
                "font-medium text-sm truncate transition-colors",
                isActive ? "text-white" : "text-slate-700 dark:text-slate-300"
              )}>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full flex-shrink-0 shadow-sm animate-pulse" />
              )}
            </>
          );

          if (isExternal) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 min-h-[44px]",
                  "hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 dark:hover:from-sky-950/30 dark:hover:to-indigo-950/30",
                  "hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]",
                  "text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
                )}
                role="menuitem"
                tabIndex={0}
                aria-label={item.label}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 min-h-[44px] relative",
                isActive 
                  ? "bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-white shadow-lg shadow-sky-500/20 scale-[1.02]" 
                  : "hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 dark:hover:from-sky-950/30 dark:hover:to-indigo-950/30 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
              )}
              prefetch={true}
              role="menuitem"
              tabIndex={0}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label}${isActive ? ' (página actual)' : ''}`}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400/20 via-indigo-400/20 to-purple-400/20 animate-pulse"></div>
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                {content}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sección del usuario y logout - fija en la parte inferior - Mejorada */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-950/80 dark:to-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="relative flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-900/90 dark:to-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 mb-2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group/user">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400/5 via-indigo-400/5 to-purple-400/5 opacity-0 group-hover/user:opacity-100 transition-opacity duration-200"></div>
          <div className="relative w-9 h-9 bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover/user:scale-110">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative">
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        
        {/* Botón de cerrar sesión - siempre visible - Mejorado */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-950/30 dark:hover:to-rose-950/30 min-h-[42px] px-3 py-2.5 transition-colors duration-150 rounded-xl border border-transparent hover:border-red-200/50 dark:hover:border-red-800/50 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] group/logout"
          onClick={logout}
          aria-label="Cerrar sesión"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50/50 dark:bg-red-950/30 group-hover/logout:bg-red-100 dark:group-hover/logout:bg-red-900/40 transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
          </div>
          <span className="font-medium text-sm truncate">
            Cerrar Sesión
          </span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button - mejorado para accesibilidad y responsive */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 sm:top-6 sm:left-6 z-[60] bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-sky-50 hover:to-indigo-50 dark:hover:from-sky-950 dark:hover:to-indigo-950 transition-colors duration-150 hover:scale-110 active:scale-95 w-12 h-12 sm:w-14 sm:h-14 rounded-full"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar"
      >
        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 dark:text-slate-300" />
      </Button>

      {/* Desktop sidebar - siempre visible y empuja el contenido - Mejorado */}
      <aside className="hidden lg:flex w-56 border-r border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white/95 to-slate-50/95 dark:from-slate-950/95 dark:to-slate-900/95 backdrop-blur-sm flex-shrink-0 z-10 flex-col h-screen shadow-lg">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar - overlay que no empuja el contenido */}
      {isOpen && (
        <>
          {/* Backdrop con z-index alto */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-[70]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Sidebar móvil con z-index más alto - Mejorado */}
          <aside 
            id="mobile-sidebar"
            className="lg:hidden fixed left-0 top-0 h-full w-72 sm:w-80 bg-gradient-to-b from-white/98 to-slate-50/98 dark:from-slate-950/98 dark:to-slate-900/98 backdrop-blur-lg border-r border-slate-200/80 dark:border-slate-800/80 z-[80] shadow-2xl transform transition-transform duration-200 ease-out flex flex-col"
            role="navigation"
            aria-label="Menú de navegación principal"
          >
            <div className="relative flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-white flex-shrink-0 shadow-lg overflow-hidden">
              <div className="absolute inset-0 opacity-20"></div>
              <div className="relative flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg backdrop-blur-sm">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-semibold text-base sm:text-lg truncate">Menú</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="relative hover:bg-white/20 text-white w-10 h-10 rounded-xl flex-shrink-0 transition-colors duration-150 hover:scale-110"
                aria-label="Cerrar menú de navegación"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}
    </>
  );
});