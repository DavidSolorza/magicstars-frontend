import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { PedidoTest } from '@/lib/types'

export default async function TestPedidosPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: pedidos, error } = await supabase
    .from('pedidos_auto_test')
    .select('*')

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error de Conexión</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Pedidos desde Supabase</h1>
      <p className="text-gray-600 mb-4">
        Total de pedidos: {pedidos?.length || 0}
      </p>
      
      <div className="grid gap-4">
        {pedidos?.map((pedido: PedidoTest) => (
          <div key={pedido.id_pedido} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{pedido.id_pedido}</h3>
                <p className="text-gray-600">{pedido.distrito}</p>
                <p className="text-sm text-gray-500">{pedido.productos}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">₡{pedido.valor_total.toLocaleString()}</p>
                {pedido.mensajero_asignado && (
                  <p className="text-sm text-blue-600">Asignado: {pedido.mensajero_asignado}</p>
                )}
                {pedido.mensajero_concretado && (
                  <p className="text-sm text-green-600">Entregado: {pedido.mensajero_concretado}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {(!pedidos || pedidos.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron pedidos en la base de datos.
        </div>
      )}
    </div>
  )
}
