import { NextRequest, NextResponse } from 'next/server';
import { obtenerMovimientosInventario, MovimientoInventario } from '@/lib/supabase-inventario';

/**
 * GET /api/inventory/control
 * 
 * Endpoint para obtener todos los datos de la tabla inventario_control
 * 
 * Query parameters:
 * - producto?: string - Filtrar por nombre de producto
 * - tienda?: string - Filtrar por tienda
 * - fecha_desde?: string - Filtrar desde fecha (formato: YYYY-MM-DD)
 * - fecha_hasta?: string - Filtrar hasta fecha (formato: YYYY-MM-DD)
 * - limit?: number - Límite de resultados (default: todos)
 * 
 * Ejemplo de uso:
 * GET /api/inventory/control
 * GET /api/inventory/control?tienda=ALL STARS
 * GET /api/inventory/control?fecha_desde=2024-01-01&fecha_hasta=2024-12-31
 * GET /api/inventory/control?producto=ACEITE&limit=100
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extraer parámetros de query
    const producto = searchParams.get('producto') || undefined;
    const tienda = searchParams.get('tienda') || undefined;
    const fechaDesde = searchParams.get('fecha_desde') || undefined;
    const fechaHasta = searchParams.get('fecha_hasta') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    console.log('📋 [API] Consulta de inventario_control:', {
      producto,
      tienda,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      limit,
      timestamp: new Date().toISOString(),
    });

    // Obtener movimientos con filtros
    const movimientos = await obtenerMovimientosInventario({
      producto,
      tienda,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      limit,
    });

    // Si hay datos, obtener las columnas disponibles del primer registro
    const columnas = movimientos.length > 0 ? Object.keys(movimientos[0]) : [];

    // Preparar respuesta
    const response = {
      success: true,
      data: movimientos,
      count: movimientos.length,
      columns: columnas,
      filters: {
        producto: producto || null,
        tienda: tienda || null,
        fecha_desde: fechaDesde || null,
        fecha_hasta: fechaHasta || null,
        limit: limit || null,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('✅ [API] Respuesta de inventario_control:', {
      count: movimientos.length,
      columns: columnas.length,
      has_filters: !!(producto || tienda || fechaDesde || fechaHasta),
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('❌ [API] Error al obtener datos de inventario_control:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Error al obtener los datos de inventario_control',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

