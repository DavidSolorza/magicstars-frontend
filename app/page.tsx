'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Star } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('Usuario logueado:', user);
        
        // Redirección específica por rol
        if (user.role === 'admin' || user.role === 'master') {
          console.log('Redirigiendo admin/master a dashboard admin');
          router.push('/dashboard/admin');
        } else if (user.role === 'mensajero' || user.role === 'mensajero-extra') {
          console.log('Redirigiendo mensajero a Mi Ruta Hoy');
          router.push('/dashboard/mensajero/mi-ruta-hoy');
        } else if (user.role === 'mensajero-lider') {
          console.log('Redirigiendo mensajero líder a rutas');
          router.push('/dashboard/mensajero-lider');
        } else {
          console.log('Redirigiendo a:', `/dashboard/${user.role}`);
          router.push(`/dashboard/${user.role}`);
        }
      } else {
        console.log('No hay usuario, redirigiendo a login');
        router.push('/auth/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Magic Stars</h1>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return null;
}