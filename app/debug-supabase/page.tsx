import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function DebugSupabasePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Probar conexión básica
  const { data: connectionTest, error: connectionError } = await supabase
    .from('pedidos_auto_test')
    .select('count', { count: 'exact', head: true })

  // 2. Probar consulta simple
  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos_auto_test')
    .select('*')
    .limit(5)

  // 3. Probar consulta con filtro
  const { data: pedidosConFiltro, error: filtroError } = await supabase
    .from('pedidos_auto_test')
    .select('id_pedido, distrito, valor_total')
    .limit(3)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Diagnóstico de Supabase</h1>
      
      {/* Información de conexión */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Información de Conexión</h2>
        <div className="text-sm space-y-1">
          <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'No configurada'}</p>
          <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada'}</p>
        </div>
      </div>

      {/* Test 1: Contar registros */}
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Test 1: Contar registros</h2>
        {connectionError ? (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800"><strong>Error:</strong> {connectionError.message}</p>
            <p className="text-red-600 text-sm mt-1">Código: {connectionError.code}</p>
            <p className="text-red-600 text-sm">Detalles: {connectionError.details}</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-green-800"><strong>Éxito:</strong> Se encontraron {connectionTest?.length || 0} registros</p>
          </div>
        )}
      </div>

      {/* Test 2: Obtener registros */}
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Test 2: Obtener registros (primeros 5)</h2>
        {pedidosError ? (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800"><strong>Error:</strong> {pedidosError.message}</p>
            <p className="text-red-600 text-sm mt-1">Código: {pedidosError.code}</p>
            <p className="text-red-600 text-sm">Detalles: {pedidosError.details}</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-green-800"><strong>Éxito:</strong> Se obtuvieron {pedidos?.length || 0} registros</p>
            {pedidos && pedidos.length > 0 && (
              <div className="mt-3 space-y-2">
                {pedidos.map((pedido: any, index: number) => (
                  <div key={index} className="bg-white p-2 rounded border text-sm">
                    <p><strong>ID:</strong> {pedido.id_pedido}</p>
                    <p><strong>Distrito:</strong> {pedido.distrito}</p>
                    <p><strong>Valor:</strong> ₡{pedido.valor_total?.toLocaleString() || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test 3: Consulta con filtro */}
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Test 3: Consulta con filtro (columnas específicas)</h2>
        {filtroError ? (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800"><strong>Error:</strong> {filtroError.message}</p>
            <p className="text-red-600 text-sm mt-1">Código: {filtroError.code}</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-green-800"><strong>Éxito:</strong> Se obtuvieron {pedidosConFiltro?.length || 0} registros con filtro</p>
            {pedidosConFiltro && pedidosConFiltro.length > 0 && (
              <div className="mt-3 space-y-2">
                {pedidosConFiltro.map((pedido: any, index: number) => (
                  <div key={index} className="bg-white p-2 rounded border text-sm">
                    <p><strong>ID:</strong> {pedido.id_pedido}</p>
                    <p><strong>Distrito:</strong> {pedido.distrito}</p>
                    <p><strong>Valor:</strong> ₡{pedido.valor_total?.toLocaleString() || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Instrucciones para resolver problemas</h2>
        <div className="text-sm space-y-2">
          <p><strong>Si ves errores de permisos:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ve a Supabase → Authentication → Policies</li>
            <li>Verifica que la tabla pedidos_test tenga políticas RLS habilitadas</li>
            <li>O deshabilita RLS temporalmente para probar</li>
          </ul>
          
          <p><strong>Si no hay datos:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ve a Supabase → Table Editor</li>
            <li>Verifica que la tabla pedidos_test tenga datos</li>
            <li>O inserta algunos datos de prueba</li>
          </ul>
          
          <p><strong>Si hay errores de conexión:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Verifica que el archivo .env.local esté en la raíz del proyecto</li>
            <li>Reinicia el servidor de desarrollo (npm run dev)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
