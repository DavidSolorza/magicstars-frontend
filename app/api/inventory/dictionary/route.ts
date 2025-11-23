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
 *   producto: string  // Nombre del producto que ya existe en la base de datos
 * }
 * 
 * Ejemplo de uso desde n8n:
 * POST https://tu-dominio.com/api/inventory/dictionary
 * {
 *   "producto": "Collar Orion Talla M"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📚 [API] Agregar producto al diccionario desde n8n:', {
      producto: body.producto,
      timestamp: new Date().toISOString(),
    });

    // Validar campo requerido
    if (!body.producto || typeof body.producto !== 'string' || body.producto.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Campo requerido faltante o inválido',
          required: ['producto'],
          received: Object.keys(body),
          message: 'El campo "producto" es obligatorio y debe ser un string no vacío',
        },
        { status: 400 }
      );
    }

    // Importar configuración
    const { API_URLS } = await import('@/lib/config');
    
    // Preparar payload
    const payload = {
      producto: body.producto.trim(),
    };

    console.log('📤 [API] Enviando a webhook de Railway (diccionario):', {
      producto: payload.producto,
    });

    // Enviar al webhook de Railway/n8n
    const webhookResponse = await fetch(API_URLS.ADD_DICCIONARIO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
      webhookData = await webhookResponse.json();
    } catch (e) {
      // Si la respuesta no es JSON, usar el texto
      webhookData = { message: await webhookResponse.text() };
    }
    
    console.log('✅ [API] Producto agregado al diccionario exitosamente');

    return NextResponse.json(
      {
        success: true,
        message: 'Producto agregado al diccionario exitosamente',
        data: webhookData,
        producto: payload.producto,
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
      required_fields: ['producto'],
      example: {
        producto: 'Collar Orion Talla M',
      },
    },
    { status: 200 }
  );
}

