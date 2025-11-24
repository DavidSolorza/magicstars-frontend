import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/inventory/dictionary
 * 
 * Endpoint para agregar productos al diccionario desde n8n
 * 
 * Este endpoint permite agregar productos existentes en la base de datos al diccionario.
 * El producto debe existir previamente en la base de datos.
 * 
 * Body:
 * {
 *   producto_existente: string  // Nombre del producto que ya existe en la base de datos
 * }
 * 
 * Ejemplo de uso desde n8n:
 * POST https://tu-dominio.com/api/inventory/dictionary
 * {
 *   "producto_existente": "Collar Orion Talla M"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📚 [API] Agregar producto al diccionario desde n8n:', {
      producto_existente: body.producto_existente,
      timestamp: new Date().toISOString(),
    });

    // Validar campo requerido - aceptar tanto producto_existente como producto para compatibilidad
    const productoExistente = body.producto_existente || body.producto;
    
    if (!productoExistente || typeof productoExistente !== 'string' || productoExistente.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo requerido faltante o inválido',
          required: ['producto_existente'],
          received: Object.keys(body),
          message: 'El campo "producto_existente" es obligatorio y debe ser un string no vacío',
        },
        { status: 400 }
      );
    }

    // Importar configuración
    const { API_URLS } = await import('@/lib/config');
    
    // Preparar payload con el nombre correcto del campo
    const payload = {
      producto_existente: productoExistente.trim(),
    };

    console.log('📤 [API] Enviando a webhook de Railway (diccionario):', {
      url: API_URLS.ADD_DICCIONARIO,
      producto_existente: payload.producto_existente,
      payload: JSON.stringify(payload),
    });

    // Enviar al webhook de Railway/n8n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    let webhookResponse;
    try {
      webhookResponse = await fetch(API_URLS.ADD_DICCIONARIO, {
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
        console.error('❌ [API] Timeout al conectar con webhook de Railway (diccionario)');
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

    console.log('📥 [API] Respuesta del webhook (diccionario):', {
      status: webhookResponse.status,
      statusText: webhookResponse.statusText,
      ok: webhookResponse.ok,
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ [API] Error en webhook de Railway (diccionario):', errorText);
      
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
    
    console.log('✅ [API] Producto agregado al diccionario exitosamente');

    return NextResponse.json(
      {
        success: true,
        message: 'Producto agregado al diccionario exitosamente',
        data: webhookData,
        producto_existente: payload.producto_existente,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [API] Error al agregar producto al diccionario:', error);
    
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
 * GET /api/inventory/dictionary
 * 
 * Endpoint opcional para verificar el estado del endpoint
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Endpoint de diccionario de inventario',
      endpoint: '/api/inventory/dictionary',
      method: 'POST',
      description: 'Agrega productos existentes al diccionario',
      required_fields: ['producto_existente'],
      example: {
        producto_existente: 'Collar Orion Talla M',
      },
    },
    { status: 200 }
  );
}

