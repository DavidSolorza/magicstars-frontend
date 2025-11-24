import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/inventory/dictionary/combos
 * 
 * Endpoint para agregar combos al diccionario desde n8n
 * 
 * Este endpoint permite agregar combos existentes al diccionario con sus productos asociados.
 * El combo debe existir previamente en la base de datos.
 * 
 * Body:
 * {
 *   combo_existente: string,        // Nombre del combo sin cantidades
 *   combo_nuevo: string[]          // Array de productos que van en el combo
 * }
 * 
 * Ejemplo de uso desde n8n:
 * POST https://tu-dominio.com/api/inventory/dictionary/combos
 * {
 *   "combo_existente": "Combo Estrella",
 *   "combo_nuevo": ["Collar Orion Talla M", "Anillo Luna Talla S"]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📦 [API] Agregar combo al diccionario desde n8n:', {
      combo_existente: body.combo_existente,
      productos_count: Array.isArray(body.combo_nuevo) ? body.combo_nuevo.length : 0,
      timestamp: new Date().toISOString(),
    });

    // Validar campo combo_existente
    if (!body.combo_existente || typeof body.combo_existente !== 'string' || body.combo_existente.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo requerido faltante o inválido',
          required: ['combo_existente', 'combo_nuevo'],
          received: Object.keys(body),
          message: 'El campo "combo_existente" es obligatorio y debe ser un string no vacío',
        },
        { status: 400 }
      );
    }

    // Validar campo combo_nuevo
    if (!body.combo_nuevo || !Array.isArray(body.combo_nuevo)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo requerido faltante o inválido',
          required: ['combo_existente', 'combo_nuevo'],
          received: Object.keys(body),
          message: 'El campo "combo_nuevo" es obligatorio y debe ser un array',
        },
        { status: 400 }
      );
    }

    // Validar que el array no esté vacío
    if (body.combo_nuevo.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Array vacío',
          message: 'El campo "combo_nuevo" debe contener al menos un producto',
        },
        { status: 400 }
      );
    }

    // Validar que todos los elementos del array sean strings
    const invalidProducts = body.combo_nuevo.filter(
      (producto: any) => typeof producto !== 'string' || producto.trim() === ''
    );
    
    if (invalidProducts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Productos inválidos en el array',
          message: 'Todos los elementos de "combo_nuevo" deben ser strings no vacíos',
          invalid_count: invalidProducts.length,
        },
        { status: 400 }
      );
    }

    // Importar configuración
    const { API_URLS } = await import('@/lib/config');
    
    // Preparar payload
    const payload = {
      combo_existente: body.combo_existente.trim(),
      combo_nuevo: body.combo_nuevo.map((producto: string) => producto.trim()),
    };

    console.log('📤 [API] Enviando a webhook de Railway (diccionario combos):', {
      url: API_URLS.ADD_DICCIONARIO_COMBOS,
      combo_existente: payload.combo_existente,
      productos_count: payload.combo_nuevo.length,
      payload: JSON.stringify(payload),
    });

    // Enviar al webhook de Railway/n8n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    let webhookResponse;
    try {
      webhookResponse = await fetch(API_URLS.ADD_DICCIONARIO_COMBOS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ [API] Timeout al conectar con webhook de Railway (diccionario combos)');
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
      throw fetchError;
    }

    console.log('📥 [API] Respuesta del webhook (diccionario combos):', {
      status: webhookResponse.status,
      statusText: webhookResponse.statusText,
      ok: webhookResponse.ok,
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ [API] Error en webhook de Railway (diccionario combos):', errorText);
      
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

    let webhookData;
    try {
      const responseText = await webhookResponse.text();
      // Intentar parsear como JSON, si falla usar el texto
      try {
        webhookData = JSON.parse(responseText);
      } catch {
        webhookData = { message: responseText };
      }
    } catch (e) {
      webhookData = { message: 'Respuesta vacía del webhook' };
    }
    
    console.log('✅ [API] Combo agregado al diccionario exitosamente');

    return NextResponse.json(
      {
        success: true,
        message: 'Combo agregado al diccionario exitosamente',
        data: webhookData,
        combo_existente: payload.combo_existente,
        productos_count: payload.combo_nuevo.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [API] Error al agregar combo al diccionario:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la solicitud',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/dictionary/combos
 * 
 * Endpoint opcional para verificar el estado del endpoint
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Endpoint de diccionario de combos de inventario',
      endpoint: '/api/inventory/dictionary/combos',
      method: 'POST',
      description: 'Agrega combos existentes al diccionario con sus productos asociados',
      required_fields: ['combo_existente', 'combo_nuevo'],
      example: {
        combo_existente: 'Combo Estrella',
        combo_nuevo: ['Collar Orion Talla M', 'Anillo Luna Talla S'],
      },
    },
    { status: 200 }
  );
}

