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

    // Validar tipo de operación
    const tipoOperacion = String(body.tipo_operacion).toLowerCase().trim();
    if (!['nuevo', 'editar', 'eliminar'].includes(tipoOperacion)) {
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

    // Validar según tipo de operación
    if (tipoOperacion === 'eliminar') {
      // Para eliminar solo se necesita producto, tipo_operacion y usuario
      // No se validan otros campos
    } else if (tipoOperacion === 'nuevo' || tipoOperacion === 'editar') {
      // Para nuevo y editar se requieren todos los campos
      if (
        body.cantidad === undefined || body.cantidad === null ||
        !body.tienda || String(body.tienda).trim() === '' ||
        body.stock_minimo === undefined || body.stock_minimo === null ||
        body.stock_maximo === undefined || body.stock_maximo === null
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campos requeridos faltantes para operación ' + tipoOperacion,
            required: ['producto', 'cantidad', 'tienda', 'stock_minimo', 'stock_maximo', 'tipo_operacion', 'usuario'],
            received: Object.keys(body),
          },
          { status: 400 }
        );
      }
    }

    // Importar función para actualizar inventario
    const { API_URLS } = await import('@/lib/config');
    
    // La fecha_movimiento ya viene desde el frontend con la hora correcta
    // Si no viene, usar la hora del servidor como fallback
    const getCostaRicaTime = () => {
      // Si el body ya tiene fecha_movimiento, usarla (viene del frontend)
      if (body.fecha_movimiento) {
        console.log('🕐 [API] Usando fecha_movimiento del frontend:', body.fecha_movimiento);
        return body.fecha_movimiento;
      }
      
      // Fallback: usar hora del servidor
      const now = new Date();
      const isoString = now.toISOString();
      console.log('🕐 [API] Usando hora del servidor como fallback:', isoString);
      return isoString;
    };
    
    // Preparar payload según tipo de operación - asegurar tipos correctos
    let payload: any;
    
    if (tipoOperacion === 'eliminar') {
      // Para eliminar: solo producto, tipo_operacion y usuario (exactamente como lo espera el webhook)
      // NO hacer trim() en el nombre del producto para preservar el formato exacto de la BD
      payload = {
        producto: String(body.producto || ''), // Sin trim para preservar espacios exactos
        tipo_operacion: 'eliminar',
        usuario: String(body.usuario || '').trim(),
        fecha_movimiento: getCostaRicaTime(), // Agregar fecha/hora de Costa Rica
      };
      
      // Verificar que el payload tenga los campos requeridos
      const camposRequeridos = ['producto', 'tipo_operacion', 'usuario'];
      const camposEnPayload = Object.keys(payload);
      
      if (!camposRequeridos.every(campo => camposEnPayload.includes(campo))) {
        console.error('❌ [API] Error: Payload de eliminación no tiene los campos correctos', {
          campos_esperados: camposRequeridos,
          campos_encontrados: camposEnPayload,
          payload: payload,
        });
      }
      
      console.log('📤 [API] Payload para ELIMINAR:', JSON.stringify(payload, null, 2));
    } else {
      // Para nuevo/editar: todos los campos exactamente como lo requiere el webhook
      // Formato: producto, cantidad, tienda, stock_minimo, stock_maximo, tipo_operacion, usuario
      payload = {
        producto: String(body.producto).trim(),
        cantidad: Number(body.cantidad),
        tienda: String(body.tienda).trim(),
        stock_minimo: Number(body.stock_minimo),
        stock_maximo: Number(body.stock_maximo),
        tipo_operacion: tipoOperacion,
        usuario: String(body.usuario).trim(),
        fecha_movimiento: getCostaRicaTime(), // Agregar fecha/hora de Costa Rica
      };
      
      // Validar que los números sean válidos
      if (isNaN(payload.cantidad) || isNaN(payload.stock_minimo) || isNaN(payload.stock_maximo)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Valores numéricos inválidos',
            message: 'cantidad, stock_minimo y stock_maximo deben ser números válidos',
          },
          { status: 400 }
        );
      }
    }

    // Log detallado del payload que se enviará
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [API] ENVIANDO A WEBHOOK DE RAILWAY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌐 ENDPOINT URL:', API_URLS.ADD_EDIT_DELETE_INVENTARIO);
    console.log('📋 Tipo de operación:', payload.tipo_operacion);
    console.log('📦 Producto:', payload.producto);
    if (payload.tienda) console.log('🏪 Tienda:', payload.tienda);
    if (payload.cantidad !== undefined) console.log('📊 Cantidad:', payload.cantidad);
    if (payload.stock_minimo !== undefined) console.log('📉 Stock mínimo:', payload.stock_minimo);
    if (payload.stock_maximo !== undefined) console.log('📈 Stock máximo:', payload.stock_maximo);
    console.log('👤 Usuario:', payload.usuario);
    console.log('───────────────────────────────────────────────────────────');
    console.log('📄 Payload JSON completo:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('═══════════════════════════════════════════════════════════');
    
    // Validar que todos los campos requeridos estén presentes
    if (tipoOperacion !== 'eliminar') {
      const camposRequeridos = ['producto', 'cantidad', 'tienda', 'stock_minimo', 'stock_maximo', 'tipo_operacion', 'usuario'];
      const camposFaltantes = camposRequeridos.filter(campo => !(campo in payload) || payload[campo] === undefined || payload[campo] === null);
      if (camposFaltantes.length > 0) {
        console.error('❌ [API] Campos faltantes en payload:', camposFaltantes);
        return NextResponse.json(
          {
            success: false,
            error: 'Campos faltantes en payload',
            campos_faltantes: camposFaltantes,
            payload: payload,
          },
          { status: 400 }
        );
      }
    }
    
    // Log detallado del payload final que se enviará
    if (tipoOperacion === 'eliminar') {
      console.log('📤 [API] Payload para ELIMINAR (solo 3 campos):', {
        campos: Object.keys(payload),
        payload: payload,
        json: JSON.stringify(payload),
      });
    }

    // Enviar al webhook de Railway/n8n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    const payloadJson = JSON.stringify(payload);
    console.log('📤 [API] Enviando request al webhook:', {
      url: API_URLS.ADD_EDIT_DELETE_INVENTARIO,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadJson,
      body_length: payloadJson.length,
    });
    
    let webhookResponse;
    try {
      webhookResponse = await fetch(API_URLS.ADD_EDIT_DELETE_INVENTARIO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payloadJson,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ [API] Timeout al conectar con webhook de Railway');
        return NextResponse.json(
          {
            success: false,
            error: 'Timeout al conectar con el servidor',
            message: 'La solicitud tardó demasiado tiempo. Intenta nuevamente.',
            timestamp: new Date().toISOString(),
          },
          { status: 504 }
        );
      }
      console.error('❌ [API] Error de red al conectar con webhook:', fetchError);
      throw fetchError;
    }

    console.log('📥 [API] Respuesta del webhook:', {
      status: webhookResponse.status,
      statusText: webhookResponse.statusText,
      ok: webhookResponse.ok,
    });

    // Leer la respuesta del webhook una sola vez
    let responseText: string;
    try {
      responseText = await webhookResponse.text();
    } catch (e) {
      console.error('❌ [API] Error al leer respuesta del webhook:', e);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al leer respuesta del servidor',
          message: 'No se pudo leer la respuesta del webhook',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    if (!webhookResponse.ok) {
      // Intentar parsear el error como JSON si es posible
      let errorDetails: any = responseText;
      let errorMessage = '';
      
      try {
        const parsedError = JSON.parse(responseText);
        errorDetails = parsedError;
        
        // Manejar el error específico "No item to return was found"
        if (parsedError.message === 'No item to return was found') {
          errorMessage = 'El producto no existe en el inventario o ya fue eliminado';
        } else if (parsedError.message) {
          errorMessage = parsedError.message;
        } else if (parsedError.error) {
          errorMessage = parsedError.error;
        }
      } catch {
        // Si no es JSON, usar el texto tal cual
        errorDetails = responseText;
        if (responseText.includes('No item to return was found')) {
          errorMessage = 'El producto no existe en el inventario o ya fue eliminado';
        } else {
          errorMessage = responseText;
        }
      }
      
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ [API] ERROR EN WEBHOOK DE RAILWAY');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('🌐 URL del webhook:', API_URLS.ADD_EDIT_DELETE_INVENTARIO);
      console.error('📋 Tipo de operación:', payload.tipo_operacion);
      console.error('📦 Producto:', payload.producto);
      if (payload.tienda) console.error('🏪 Tienda:', payload.tienda);
      if (payload.cantidad !== undefined) console.error('📊 Cantidad:', payload.cantidad);
      if (payload.stock_minimo !== undefined) console.error('📉 Stock mínimo:', payload.stock_minimo);
      if (payload.stock_maximo !== undefined) console.error('📈 Stock máximo:', payload.stock_maximo);
      console.error('👤 Usuario:', payload.usuario);
      console.error('───────────────────────────────────────────────────────────');
      console.error('📤 Payload completo enviado al webhook:');
      console.error(JSON.stringify(payload, null, 2));
      console.error('───────────────────────────────────────────────────────────');
      console.error('📥 Respuesta del webhook:');
      console.error('   Status:', webhookResponse.status);
      console.error('   Status Text:', webhookResponse.statusText);
      console.error('   OK:', webhookResponse.ok);
      console.error('───────────────────────────────────────────────────────────');
      console.error('📄 Error respuesta (primeros 2000 caracteres):');
      console.error(responseText.substring(0, 2000));
      console.error('───────────────────────────────────────────────────────────');
      console.error('🔍 Error detalles parseado:', errorDetails);
      console.error('═══════════════════════════════════════════════════════════');
      
      // Mensaje de error más amigable según el tipo de error
      let userFriendlyMessage = `El servidor respondió con error ${webhookResponse.status}`;
      if (errorMessage) {
        userFriendlyMessage = errorMessage;
      } else if (webhookResponse.status === 500) {
        userFriendlyMessage = 'Error interno del servidor. El producto puede no existir o ya haber sido eliminado.';
      }
      
      // Siempre devolver 200 con success: false para que el frontend pueda manejar el error
      // Incluir más información de debugging
      const errorResponse = {
        success: false,
        error: 'Error al procesar en webhook',
        message: userFriendlyMessage,
        details: typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails),
        status: webhookResponse.status,
        payload_enviado: payload,
        response_text: responseText.substring(0, 500), // Primeros 500 caracteres de la respuesta
      };
      
      console.error('❌ [API] Devolviendo error al frontend:', errorResponse);
      
      return NextResponse.json(errorResponse, { status: 200 });
    }

    // Si la respuesta es exitosa, parsear el JSON
    let webhookData;
    try {
      // Intentar parsear como JSON, si falla usar el texto
      try {
        webhookData = JSON.parse(responseText);
        console.log('📥 [API] Respuesta del webhook (JSON):', JSON.stringify(webhookData, null, 2));
      } catch {
        webhookData = { message: responseText };
        console.log('📥 [API] Respuesta del webhook (texto plano):', responseText.substring(0, 500));
      }
    } catch (e) {
      console.error('❌ [API] Error al parsear respuesta del webhook:', e);
      webhookData = { message: 'Respuesta vacía del webhook' };
    }
    
    console.log('✅ [API] Operación de inventario completada exitosamente:', {
      tipo_operacion: payload.tipo_operacion,
      producto: payload.producto,
      resultado: webhookData,
    });

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


