'use client';

import { createClient } from '@/utils/supabase/client';

type SupabaseBrowserClient = ReturnType<typeof createClient>;
let supabaseTiendas: SupabaseBrowserClient | null = null;

const getSupabaseTiendas = () => {
  if (!supabaseTiendas) {
    supabaseTiendas = createClient();
  }
  return supabaseTiendas;
};

export type TiendaRow = {
  id?: string;
  nombre: string;
  estado?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  raw: Record<string, any>;
};

const normalizeStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === 'activo' ||
  status?.toLowerCase().trim() === 'active';

const mapRowToTienda = (row: Record<string, any>): TiendaRow => {
  return {
    id: row?.id ?? row?.nombre,
    nombre: row?.nombre ?? '',
    estado: row?.estado ?? row?.Estado ?? 'Activo',
    created_at: row?.created_at ?? row?.createdAt ?? null,
    updated_at: row?.updated_at ?? row?.updatedAt ?? null,
    raw: row,
  };
};

export const fetchTiendas = async (): Promise<TiendaRow[]> => {
  const supabase = getSupabaseTiendas();

  const { data, error } = await supabase
    .from('tiendas')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener tiendas de Supabase:', error);
    throw new Error(error.message);
  }

  const tiendas = (data ?? []).map((row) => mapRowToTienda(row));

  tiendas.sort((a, b) => {
    const aNombre = a.nombre?.toLowerCase() ?? '';
    const bNombre = b.nombre?.toLowerCase() ?? '';
    return aNombre.localeCompare(bNombre);
  });

  return tiendas;
};

export const getTiendaByNombre = async (nombre: string): Promise<TiendaRow | null> => {
  const tiendas = await fetchTiendas();
  const normalizedNombre = nombre.trim().toUpperCase();

  return (
    tiendas.find((tienda) => tienda.nombre?.trim().toUpperCase() === normalizedNombre) ?? null
  );
};

type TiendaInput = {
  nombre: string;
  estado?: string | null;
};

const buildPayload = (input: TiendaInput) => {
  const payload: Record<string, any> = {
    nombre: input.nombre.trim().toUpperCase(),
  };

  if (input.estado !== undefined) {
    payload.estado = input.estado ?? 'Activo';
  }

  return payload;
};

export const createTienda = async (input: TiendaInput): Promise<TiendaRow> => {
  const supabase = getSupabaseTiendas();
  
  // Verificar si la tienda ya existe
  const nombreNormalizado = input.nombre.trim().toUpperCase();
  const { data: existingTienda, error: checkError } = await supabase
    .from('tiendas')
    .select('*')
    .ilike('nombre', nombreNormalizado)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('❌ Error al verificar tienda existente:', checkError);
  }

  if (existingTienda) {
    throw new Error(`Ya existe una tienda con el nombre ${nombreNormalizado}. Por favor, usa un nombre diferente.`);
  }

  const payload = buildPayload(input);

  const { data, error } = await supabase
    .from('tiendas')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error al crear tienda en Supabase:', error);
    console.error('📋 Payload enviado:', payload);
    
    // Manejar errores de clave duplicada
    if (error.code === '23505') {
      throw new Error(`Ya existe una tienda con el nombre ${nombreNormalizado}. Por favor, usa un nombre diferente.`);
    }
    
    throw new Error(error.message);
  }

  return mapRowToTienda(data);
};

type TiendaUpdateInput = Partial<TiendaInput>;

export const updateTienda = async (
  tienda: TiendaRow,
  updates: TiendaUpdateInput
): Promise<TiendaRow> => {
  const supabase = getSupabaseTiendas();

  const payload: Record<string, any> = {
    nombre: updates.nombre?.trim().toUpperCase() ?? tienda.nombre,
  };

  if (updates.estado !== undefined) {
    payload.estado = updates.estado ?? 'Activo';
  }

  // Determinar el campo de filtro (id o nombre)
  const filterColumn = tienda.id ? 'id' : 'nombre';
  const filterValue = tienda.id ?? tienda.nombre;

  // Si se está cambiando el nombre, verificar que no exista otra tienda con ese nombre
  if (updates.nombre && updates.nombre.trim().toUpperCase() !== tienda.nombre.trim().toUpperCase()) {
    const nombreNormalizado = updates.nombre.trim().toUpperCase();
    const { data: existingTienda } = await supabase
      .from('tiendas')
      .select('*')
      .ilike('nombre', nombreNormalizado)
      .maybeSingle();

    if (existingTienda && existingTienda.id !== tienda.id) {
      throw new Error(`Ya existe una tienda con el nombre ${nombreNormalizado}. Por favor, usa un nombre diferente.`);
    }
  }

  const { data, error } = await supabase
    .from('tiendas')
    .update(payload)
    .eq(filterColumn, filterValue)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error al actualizar tienda en Supabase:', error);
    throw new Error(error.message);
  }

  return mapRowToTienda(data);
};

export const deleteTienda = async (tienda: TiendaRow): Promise<void> => {
  const supabase = getSupabaseTiendas();
  const filterColumn = tienda.id ? 'id' : 'nombre';
  const filterValue = tienda.id ?? tienda.nombre;

  const { error } = await supabase
    .from('tiendas')
    .delete()
    .eq(filterColumn, filterValue);

  if (error) {
    console.error('❌ Error al eliminar tienda en Supabase:', error);
    throw new Error(error.message);
  }
};

export const isTiendaActiva = (estado?: string | null) =>
  normalizeStatus(estado);

