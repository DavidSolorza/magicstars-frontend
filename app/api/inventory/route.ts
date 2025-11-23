import { NextRequest, NextResponse } from 'next/server';
import { obtenerInventario, ProductoInventario } from '@/lib/supabase-inventario';

/**
 * GET /api/inventory
 * 
 * Endpoint para que n8n pueda consultar el inventario
 * 
 * Query parameters:
 * - tienda?: string - Filtrar por tienda
 * - search?: string - Buscar por nombre de producto
 * - limit?: number - Límite de resultados
 * 
 * Ejemplo de uso desde n8n:
 * GET https://tu-dominio.com/api/inventory?tienda=ALL STARS&limit=100
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extraer parámetros de query
    const tienda = searchParams.get('tienda') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit')!, 10) 
      : undefined;

    console.log('📦 [API] Consulta de inventario desde n8n:', {
      tienda,
      search,
      limit,
      timestamp: new Date().toISOString(),
    });

    // Obtener inventario con filtros
    const inventario = await obtenerInventario({
      tienda,
      search,
      limit,
    });

    // Preparar respuesta
    const response = {
      success: true,
      data: inventario,
      count: inventario.length,
      filters: {
        tienda: tienda || null,
        search: search || null,
        limit: limit || null,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ [API] Inventario consultado exitosamente: ${inventario.length} productos`);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('❌ [API] Error al consultar inventario:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al consultar el inventario',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * 
 * Endpoint para crear, actualizar o eliminar productos en el inventario desde n8n
 * 
 * Body para "nuevo" o "editar":
 * {
 *   producto: string,
 *   cantidad: number,
 *   tienda: string,
 *   stock_minimo: number,
 *   stock_maximo: number,
 *   tipo_operacion: 'nuevo' | 'editar',
 *   usuario: string
 * }
 * 
 * Body para "eliminar":
 * {
 *   producto: string,
 *   tipo_operacion: 'eliminar',
 *   usuario: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📦 [API] Operación de inventario desde n8n:', {
      tipo_operacion: body.tipo_operacion,
      producto: body.producto,
      timestamp: new Date().toISOString(),
    });

    // Validar campos básicos requeridos
    if (!body.producto || !body.tipo_operacion || !body.usuario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos requeridos faltantes',
          required: ['producto', 'tipo_operacion', 'usuario'],
          received: Object.keys(body),
        },
        { status: 400 }
      );
    }

    // Validar según tipo de operación
    if (body.tipo_operacion === 'eliminar') {
      // Para eliminar solo se necesita producto, tipo_operacion y usuario
      // No se validan otros campos
    } else if (body.tipo_operacion === 'nuevo' || body.tipo_operacion === 'editar') {
      // Para nuevo y editar se requieren todos los campos
      if (
        body.cantidad === undefined ||
        !body.tienda ||
        body.stock_minimo === undefined ||
        body.stock_maximo === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campos requeridos faltantes para operación ' + body.tipo_operacion,
            required: ['producto', 'cantidad', 'tienda', 'stock_minimo', 'stock_maximo', 'tipo_operacion', 'usuario'],
            received: Object.keys(body),
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de operación inválido',
          valid_types: ['nuevo', 'editar', 'eliminar'],
          received: body.tipo_operacion,
        },
        { status: 400 }
      );
    }

    // Importar función para actualizar inventario
    const { API_URLS } = await import('@/lib/config');
    
    // Preparar payload según tipo de operación
    const payload: any = {
      producto: body.producto,
      tipo_operacion: body.tipo_operacion,
      usuario: body.usuario,
    };

    // Solo agregar campos adicionales si no es eliminación
    if (body.tipo_operacion !== 'eliminar') {
      payload.cantidad = body.cantidad;
      payload.tienda = body.tienda;
      payload.stock_minimo = body.stock_minimo;
      payload.stock_maximo = body.stock_maximo;
    }

    console.log('📤 [API] Enviando a webhook de Railway:', {
      tipo_operacion: payload.tipo_operacion,
      producto: payload.producto,
    });

    // Enviar al webhook de Railway/n8n
    const webhookResponse = await fetch(API_URLS.ADD_EDIT_DELETE_INVENTARIO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ [API] Error en webhook de Railway:', errorText);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar en webhook',
          details: errorText,
          status: webhookResponse.status,
        },
        { status: webhookResponse.status }
      );
    }

    const webhookData = await webhookResponse.json();
    
    console.log('✅ [API] Operación de inventario completada exitosamente');

    return NextResponse.json(
      {
        success: true,
        message: `Inventario ${body.tipo_operacion === 'eliminar' ? 'eliminado' : body.tipo_operacion === 'nuevo' ? 'creado' : 'actualizado'} exitosamente`,
        data: webhookData,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [API] Error al procesar operación de inventario:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la operación de inventario',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


