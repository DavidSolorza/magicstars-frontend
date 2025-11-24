import { createClient } from '@/utils/supabase/client';

// Cliente de Supabase para inventario
export const supabaseInventario = createClient();

// Interfaz para productos del inventario
export interface ProductoInventario {
  idx?: number;
  producto: string;
  cantidad: number;
  tienda: string;
}

export interface InventarioFilters {
  tienda?: string;
  search?: string;
  limit?: number;
}

const mapRowToProducto = (row: Record<string, any>, index: number): ProductoInventario => ({
  idx: typeof row.idx === 'number' ? row.idx : index,
  producto: row.producto || '',
  cantidad: Number(row.cantidad) || 0,
  tienda: row.tienda || '',
});

const buildLike = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `%${trimmed.replace(/%/g, '')}%`;
};

export const obtenerInventario = async (
  filtros: InventarioFilters = {}
): Promise<ProductoInventario[]> => {
  try {
    let query = supabaseInventario
      .from('Inventario')
      .select('*');

    if (filtros.tienda) {
      const tiendaLike = buildLike(filtros.tienda);
      if (tiendaLike) {
        query = query.ilike('tienda', tiendaLike);
      }
    }

    if (filtros.search) {
      const searchLike = buildLike(filtros.search);
      if (searchLike) {
        query = query.ilike('producto', searchLike);
      }
    }

    query = query.order('producto', { ascending: true });

    if (filtros.limit && filtros.limit > 0) {
      query = query.limit(filtros.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error al consultar tabla Inventario:', error);
      return [];
    }

    const productos = (data ?? []).map((item, index) => mapRowToProducto(item, index));

    console.log(
      '📦 Inventario obtenido desde Supabase',
      JSON.stringify(
        {
          filtros: { ...filtros, search: filtros.search ? '<texto>' : undefined },
          total: productos.length,
        },
        null,
        2
      )
    );

    return productos;
  } catch (error) {
    console.error('❌ Error en obtenerInventario:', error);
    return [];
  }
};

export const obtenerInventarioPorTienda = async (tienda: string): Promise<ProductoInventario[]> => {
  return obtenerInventario({ tienda });
};

// Función para obtener TODOS los productos de ALL STARS (cargar una sola vez)
export const obtenerTodosProductosALLSTARS = async (): Promise<ProductoInventario[]> => {
  return obtenerInventarioPorTienda('ALL STARS');
};

// Interfaz para movimientos de inventario_control
export interface MovimientoInventario {
  [key: string]: any; // Para permitir cualquier campo de la tabla
}

export interface FiltrosMovimientos {
  producto?: string;
  tienda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
}

// Función para obtener movimientos de inventario desde la tabla inventario_control
export const obtenerMovimientosInventario = async (
  filtros: FiltrosMovimientos = {}
): Promise<MovimientoInventario[]> => {
  try {
    console.log('🔍 [Supabase] Iniciando consulta a inventario_control con filtros:', filtros);
    
    // Primero hacer una consulta simple sin filtros para verificar que funciona
    let query = supabaseInventario
      .from('inventario_control')
      .select('*');

    // Filtrar por producto si se especifica
    if (filtros.producto) {
      const productoLike = buildLike(filtros.producto);
      if (productoLike) {
        query = query.ilike('producto', productoLike);
      }
    }

    // Filtrar por tienda si se especifica
    if (filtros.tienda) {
      const tiendaLike = buildLike(filtros.tienda);
      if (tiendaLike) {
        query = query.ilike('tienda', tiendaLike);
      }
    }

    // Filtrar por rango de fechas si se especifica
    // Intentar con created_at primero (es el campo estándar en Supabase)
    if (filtros.fecha_desde) {
      query = query.gte('created_at', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      query = query.lte('created_at', filtros.fecha_hasta);
    }

    // Intentar ordenar por created_at (más recientes primero)
    // Si falla, continuaremos sin ordenamiento
    let campoOrdenamiento: string | null = 'created_at';
    
    try {
      query = query.order('created_at', { ascending: false });
    } catch (err) {
      console.warn('⚠️ [Supabase] No se pudo ordenar por created_at, intentando otros campos:', err);
      // Si created_at no funciona, intentar con otros campos
      const camposFecha = ['fecha', 'timestamp', 'fecha_movimiento', 'fecha_creacion'];
      campoOrdenamiento = null;
      
      for (const campo of camposFecha) {
        try {
          query = query.order(campo, { ascending: false });
          campoOrdenamiento = campo;
          break;
        } catch {
          // Continuar con el siguiente campo
        }
      }
      
      // Si no se pudo ordenar por fecha, intentar por ID descendente
      if (!campoOrdenamiento) {
        try {
          query = query.order('id', { ascending: false });
          campoOrdenamiento = 'id';
        } catch {
          // Si no hay campo id, mantener sin ordenamiento explícito
          console.warn('⚠️ [Supabase] No se pudo aplicar ningún ordenamiento');
        }
      }
    }

    // Si no hay límite o el límite es muy alto, obtener TODOS los registros mediante paginación
    const obtenerTodosLosRegistros = async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000; // Tamaño de página para paginación
      let hasMore = true;

      while (hasMore) {
        let pageQuery = supabaseInventario
          .from('inventario_control')
          .select('*');

        // Aplicar los mismos filtros a cada página
        if (filtros.producto) {
          const productoLike = buildLike(filtros.producto);
          if (productoLike) {
            pageQuery = pageQuery.ilike('producto', productoLike);
          }
        }

        if (filtros.tienda) {
          const tiendaLike = buildLike(filtros.tienda);
          if (tiendaLike) {
            pageQuery = pageQuery.ilike('tienda', tiendaLike);
          }
        }

        if (filtros.fecha_desde) {
          pageQuery = pageQuery.gte('created_at', filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
          pageQuery = pageQuery.lte('created_at', filtros.fecha_hasta);
        }

        // Aplicar ordenamiento (debe ir antes del range)
        if (campoOrdenamiento) {
          try {
            pageQuery = pageQuery.order(campoOrdenamiento, { ascending: false });
          } catch {
            // Si falla, intentar con created_at primero
            try {
              pageQuery = pageQuery.order('created_at', { ascending: false });
              campoOrdenamiento = 'created_at';
            } catch {
              // Si falla, intentar con otros campos de fecha
              const camposFecha = ['fecha', 'timestamp', 'fecha_movimiento', 'fecha_creacion'];
              for (const campo of camposFecha) {
                try {
                  pageQuery = pageQuery.order(campo, { ascending: false });
                  campoOrdenamiento = campo;
                  break;
                } catch {
                  // Continuar
                }
              }
            }
          }
        }

        // Aplicar range después del ordenamiento
        pageQuery = pageQuery.range(from, from + pageSize - 1);

        const { data: pageData, error: pageError } = await pageQuery;

        if (pageError) {
          console.error('❌ [Supabase] Error al consultar página de inventario_control:', pageError);
          console.error('❌ [Supabase] Detalles del error:', {
            message: pageError.message,
            details: pageError.details,
            hint: pageError.hint,
            code: pageError.code,
          });
          // Lanzar el error en lugar de solo hacer break para que se capture arriba
          throw new Error(`Error de Supabase en paginación: ${pageError.message || 'Error desconocido'}`);
        }

        if (pageData && pageData.length > 0) {
          allData = [...allData, ...pageData];
          from += pageSize;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
    };

    let movimientos: any[] = [];

    // Intentar primero una consulta simple sin paginación para ver si hay errores
    console.log('🔍 [Supabase] Ejecutando consulta a inventario_control...');
    
    // Si hay un límite razonable, usarlo directamente (más rápido)
    if (filtros.limit && filtros.limit > 0 && filtros.limit <= 10000) {
      query = query.limit(filtros.limit);
      const { data, error } = await query;

      if (error) {
        console.error('❌ [Supabase] Error al consultar tabla inventario_control:', error);
        console.error('❌ [Supabase] Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Error de Supabase: ${error.message || 'Error desconocido'}`);
      }

      movimientos = data || [];
      console.log(`✅ [Supabase] Consulta exitosa: ${movimientos.length} registros obtenidos`);
    } else {
      // Obtener todos los registros mediante paginación
      console.log('📦 [Supabase] Obteniendo todos los registros mediante paginación...');
      movimientos = await obtenerTodosLosRegistros();
      console.log(`✅ [Supabase] Paginación completada: ${movimientos.length} registros obtenidos`);
    }
    
    // Si tenemos datos, intentar ordenarlos manualmente por fecha si no se ordenó correctamente
    if (movimientos.length > 0) {
      // Buscar el campo de fecha más probable
      const primerRegistro = movimientos[0];
      const camposFechaEncontrados = Object.keys(primerRegistro).filter(key => 
        key.toLowerCase().includes('fecha') || 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('created') ||
        key.toLowerCase().includes('timestamp')
      );
      
      if (camposFechaEncontrados.length > 0) {
        const campoFecha = camposFechaEncontrados[0];
        movimientos = movimientos.sort((a: any, b: any) => {
          const fechaA = a[campoFecha] ? new Date(a[campoFecha]).getTime() : 0;
          const fechaB = b[campoFecha] ? new Date(b[campoFecha]).getTime() : 0;
          return fechaB - fechaA; // Orden descendente (más reciente primero)
        });
      }
    }

    console.log(
      '📋 Movimientos de inventario obtenidos desde Supabase',
      JSON.stringify(
        {
          filtros: { ...filtros },
          total: movimientos.length,
          primer_registro: movimientos.length > 0 ? movimientos[0] : null,
          columnas: movimientos.length > 0 ? Object.keys(movimientos[0]) : [],
        },
        null,
        2
      )
    );

    // Log adicional si no hay datos
    if (movimientos.length === 0) {
      console.warn('⚠️ No se obtuvieron registros de inventario_control. Verificar:');
      console.warn('  - Que la tabla exista y tenga datos');
      console.warn('  - Que los filtros no sean muy restrictivos');
      console.warn('  - Que las políticas RLS permitan la lectura');
    }

    return movimientos;
  } catch (error) {
    console.error('❌ Error en obtenerMovimientosInventario:', error);
    return [];
  }
};

