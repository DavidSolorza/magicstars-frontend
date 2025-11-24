'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useHydration } from '@/hooks/use-hydration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Star, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// Mover el array fuera del componente para evitar problemas de hidratación
const demoUsers = [
  { email: 'admin@magicstars.com', role: 'Administrador', password: 'Admin1234' },
  { email: 'asesor@magicstars.com', role: 'Asesor', password: 'Asesor1234' },
  { email: 'asesor-allstars@magicstars.com', role: 'Asesor - All Stars', password: 'AllStars1234' },
  { email: 'asesor-beautyfan@magicstars.com', role: 'Asesor - Beauty Fan', password: 'BeautyFan1234' },
  { email: 'tienda@paramachos.cr', role: 'Tienda - PARA MACHOS', password: 'ParaMachos1234' },
  { email: 'tienda@crexion.cr', role: 'Tienda - CREXION', password: 'Crexion1234' },
  { email: 'tienda@allstars.cr', role: 'Tienda - ALL STARS', password: 'AllStars1234' },
  { email: 'tienda@blix.cr', role: 'Tienda - BLIX', password: 'Blix1234' },
  { email: 'tienda@mixmart.cr', role: 'Tienda - MIXMART', password: 'Mixmart1234' },
  { email: 'tienda@beststore.cr', role: 'Tienda - BEST STORE', password: 'BestStore1234' },
  { email: 'tienda@solutionstore.cr', role: 'Tienda - SOLUTION STORE', password: 'SolutionStore1234' },
  { email: 'tienda@vitalelite.cr', role: 'Tienda - VITAL ELITE', password: 'VitalElite1234' },
  { email: 'tienda@mancare.cr', role: 'Tienda - MANCARE', password: 'Mancare1234' },
  { email: 'tienda@magicbum.cr', role: 'Tienda - MAGIC BUM', password: 'MagicBum1234' },
  { email: 'tienda@rutalibre.cr', role: 'Tienda - RUTA LIBRE', password: 'RutaLibre1234' },
  { email: 'tienda@ninolandia.cr', role: 'Tienda - NIÑOLANDIA', password: 'Ninolandia1234' },
  { email: 'tienda@beautyfan.cr', role: 'Tienda - BEAUTY FAN', password: 'BeautyFan1234' },
  { email: 'alex@magicstars.com', role: 'Mensajero - Alex', password: 'Alex1234' },
  { email: 'andrey@magicstars.com', role: 'Mensajero - Andrey', password: 'Andrey5678' },
  { email: 'anibal@magicstars.com', role: 'Mensajero - Anibal', password: 'Anibal9012' },
  { email: 'anthony@magicstars.com', role: 'Mensajero - Anthony', password: 'Anthony3456' },
  { email: 'gabriel@magicstars.com', role: 'Mensajero - Gabriel', password: 'Gabriel7890' },
  { email: 'gerson@magicstars.com', role: 'Mensajero - Gerson', password: 'Gerson2468' },
  { email: 'irving@magicstars.com', role: 'Mensajero - Irving', password: 'Irving1357' },
  { email: 'javier@magicstars.com', role: 'Mensajero - Javier', password: 'Javier4680' },
  { email: 'jose@magicstars.com', role: 'Mensajero - Jose', password: 'Jose8024' },
  { email: 'josue@magicstars.com', role: 'Mensajero - Josue', password: 'Josue1593' },
  { email: 'loria@magicstars.com', role: 'Mensajero - Loria', password: 'Loria7531' },
  { email: 'luis@magicstars.com', role: 'Mensajero - Luis', password: 'Luis1234' },
  { email: 'luisq@magicstars.com', role: 'Mensajero - LuisQ', password: 'LuisQ9642' },
  { email: 'manuel@magicstars.com', role: 'Mensajero - Manuel', password: 'Manuel8520' },
  { email: 'michael@magicstars.com', role: 'Mensajero - Michael', password: 'Michael7410' },
  { email: 'pablo@magicstars.com', role: 'Mensajero - Pablo', password: 'Pablo9630' },
  { email: 'pablonocturna@magicstars.com', role: 'Mensajero - PabloNocturna', password: 'PabloNocturna2580' },
  { email: 'jeank@magicstars.com', role: 'Mensajero - JeanK', password: 'JeanK1234' },
  { email: 'cristopher@magicstars.com', role: 'Mensajero - Cristopher', password: 'Cristopher5678' },
  { email: 'scott@magicstars.com', role: 'Mensajero - Scott', password: 'Scott1234' },
  { email: 'wayner@magicstars.com', role: 'Mensajero - Wayner', password: 'Wayner1234' },
  { email: 'norman@magicstars.com', role: 'Mensajero - Norman', password: 'Norman1234' },
  { email: 'prueba@magicstars.com', role: 'Usuario Prueba', password: 'prueba' },
];

export default function LoginPage() {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isHydrated = useHydration();
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Iniciando proceso de login...');
      const user = await login(emailOrName, password);
      console.log('✅ Usuario recibido del login:', user);
      
      // Esperar un poco para que el contexto se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirigir según el rol del usuario
      if (user?.role === 'admin' || user?.role === 'master') {
        console.log('🔄 Redirigiendo a admin dashboard');
        router.push('/dashboard/admin');
      } else if (user?.role === 'asesor') {
        console.log('🔄 Redirigiendo a asesor dashboard');
        router.push('/dashboard/asesor');
      } else if (user?.role === 'mensajero') {
        console.log('🔄 Redirigiendo a mi ruta de hoy');
        router.push('/dashboard/mensajero/mi-ruta-hoy');
      } else if (user?.role === 'mensajero-lider') {
        console.log('🔄 Redirigiendo a gestión de rutas');
        router.push('/dashboard/mensajero-lider');
      } else if (user?.role === 'mensajero-extra') {
        console.log('🔄 Redirigiendo a mi ruta de hoy');
        router.push('/dashboard/mensajero/mi-ruta-hoy');
      } else if (user?.role === 'tienda') {
        console.log('🔄 Redirigiendo a tienda dashboard');
        router.push('/dashboard/tienda');
      } else {
        console.log('🔄 Redirigiendo a página principal');
        router.push('/');
      }
    } catch (err: any) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title - Mejorado */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 rounded-2xl blur opacity-20 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Star className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sistema de Delivery
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestión Multi-Empresa de Pedidos
            </p>
          </div>
        </div>

        {/* Login Form - Mejorado */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300"></div>
          <Card className="relative border-0 shadow-2xl bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
                  <CardDescription className="mt-1">
                    Ingresa tus credenciales para acceder al sistema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="emailOrName" className="text-sm font-medium flex items-center gap-2">
                    <span>Email o Nombre</span>
                  </Label>
                  <Input
                    id="emailOrName"
                    type="text"
                    placeholder="alex@magicstars.com o Alex"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <span>Contraseña</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Alex1234"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 hover:from-sky-600 hover:via-indigo-600 hover:to-purple-600 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="relative w-4 h-4 mr-2">
                        <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white animate-spin"></div>
                      </div>
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Users - DESACTIVADO */}
        {/* 
        {isHydrated && (
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Usuarios de Demostración</CardTitle>
              <CardDescription className="text-xs">
                Haz clic para usar las credenciales de usuarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {demoUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  className="w-full justify-start text-xs h-auto py-2"
                  onClick={() => {
                    setEmailOrName(user.email);
                    setPassword(user.password);
                  }}
                  disabled={loading}
                >
                  <div className="text-left">
                    <div className="font-medium">{user.role}</div>
                    <div className="text-muted-foreground">{user.email}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
        */}
      </div>
    </div>
  );
}