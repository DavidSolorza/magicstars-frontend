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
    if (filtros.fecha_desde) {
      query = query.gte('fecha', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      query = query.lte('fecha', filtros.fecha_hasta);
    }

    // Intentar ordenar por fecha descendente (más recientes primero)
    // Probamos con diferentes nombres posibles de campos de fecha
    const camposFecha = ['fecha', 'created_at', 'timestamp', 'fecha_movimiento', 'fecha_creacion'];
    let campoOrdenamiento: string | null = null;
    
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
        // Si no hay campo id, mantener el orden por defecto
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
          pageQuery = pageQuery.gte('fecha', filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
          pageQuery = pageQuery.lte('fecha', filtros.fecha_hasta);
        }

        // Aplicar ordenamiento (debe ir antes del range)
        if (campoOrdenamiento) {
          try {
            pageQuery = pageQuery.order(campoOrdenamiento, { ascending: false });
          } catch {
            // Si falla, intentar con los campos de fecha
            for (const campo of camposFecha) {
              try {
                pageQuery = pageQuery.order(campo, { ascending: false });
                break;
              } catch {
                // Continuar
              }
            }
          }
        }

        // Aplicar range después del ordenamiento
        pageQuery = pageQuery.range(from, from + pageSize - 1);

        const { data: pageData, error: pageError } = await pageQuery;

        if (pageError) {
          console.error('❌ Error al consultar página de inventario_control:', pageError);
          break;
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

    if (!filtros.limit || filtros.limit <= 0 || filtros.limit > 10000) {
      // Obtener todos los registros si no hay límite o el límite es muy alto
      movimientos = await obtenerTodosLosRegistros();
    } else {
      // Si hay un límite razonable, aplicarlo directamente
      query = query.limit(filtros.limit);
      const { data, error } = await query;

      if (error) {
        console.error('❌ Error al consultar tabla inventario_control:', error);
        return [];
      }

      movimientos = data || [];
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
        },
        null,
        2
      )
    );

    return movimientos;
  } catch (error) {
    console.error('❌ Error en obtenerMovimientosInventario:', error);
    return [];
  }
};

