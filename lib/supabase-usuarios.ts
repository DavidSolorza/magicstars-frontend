'use client';

import { createClient } from '@/utils/supabase/client';
import { User, UserRole } from './types';

type SupabaseBrowserClient = ReturnType<typeof createClient>;
let supabaseUsuarios: SupabaseBrowserClient | null = null;

const getSupabaseUsuarios = () => {
  if (!supabaseUsuarios) {
    supabaseUsuarios = createClient();
  }
  return supabaseUsuarios;
};

type ColumnGuess = {
  id?: string;
  email: string;
  name: string;
  role: string;
  password: string;
  phone: string;
  company: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_COLUMN_GUESS: ColumnGuess = {
  email: 'Email',
  name: 'Nombre',
  role: 'Rol',
  password: 'Contraseña',
  phone: 'Telefono',
  company: 'Empresa',
  status: 'Estado',
};

const PASSWORD_CANDIDATES = ['contrasena', 'contraseña', 'password', 'clave', 'pass'];
const PHONE_CANDIDATES = ['telefono', 'teléfono', 'phone', 'celular', 'movil'];
const COMPANY_CANDIDATES = ['empresa', 'company', 'compania', 'compañia'];
const STATUS_CANDIDATES = ['estado', 'status', 'activo', 'habilitado'];
const NAME_CANDIDATES = ['nombre', 'name'];
const ROLE_CANDIDATES = ['rol', 'role', 'perfil'];
const CREATED_AT_CANDIDATES = ['created_at', 'fecha_creacion', 'creado', 'creado_en'];
const UPDATED_AT_CANDIDATES = ['updated_at', 'fecha_actualizacion', 'actualizado', 'actualizado_en'];
const EMAIL_CANDIDATES = ['email', 'correo', 'correo_electronico'];

let columnCache: ColumnGuess | null = null;

const normalizeKey = (value: string) => value?.toLowerCase().trim();

const guessColumn = (
  sample: Record<string, any>,
  candidates: string[],
  fallback: string
) => {
  if (!sample) return fallback;
  const sampleKeys = Object.keys(sample);
  const normalizedMap = new Map<string, string>();
  sampleKeys.forEach((key) => normalizedMap.set(normalizeKey(key), key));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    const match = normalizedMap.get(normalizedCandidate);
    if (match) {
      return match;
    }
  }

  return fallback;
};

const detectColumnMap = async (): Promise<ColumnGuess> => {
  if (columnCache) {
    return columnCache;
  }

  try {
    const supabase = getSupabaseUsuarios();
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);

    if (error) {
      console.warn('⚠️ No se pudo detectar columnas de usuarios automáticamente:', error.message);
      columnCache = { ...DEFAULT_COLUMN_GUESS };
      return columnCache;
    }

    const sample = data?.[0] ?? {};

    columnCache = {
      id: 'id' in sample ? 'id' : undefined,
      email: guessColumn(sample, EMAIL_CANDIDATES, DEFAULT_COLUMN_GUESS.email),
      name: guessColumn(sample, NAME_CANDIDATES, DEFAULT_COLUMN_GUESS.name),
      role: guessColumn(sample, ROLE_CANDIDATES, DEFAULT_COLUMN_GUESS.role),
      password: guessColumn(sample, PASSWORD_CANDIDATES, DEFAULT_COLUMN_GUESS.password),
      phone: guessColumn(sample, PHONE_CANDIDATES, DEFAULT_COLUMN_GUESS.phone),
      company: guessColumn(sample, COMPANY_CANDIDATES, DEFAULT_COLUMN_GUESS.company),
      status: guessColumn(sample, STATUS_CANDIDATES, DEFAULT_COLUMN_GUESS.status),
      createdAt: guessColumn(sample, CREATED_AT_CANDIDATES, DEFAULT_COLUMN_GUESS.createdAt ?? 'created_at'),
      updatedAt: guessColumn(sample, UPDATED_AT_CANDIDATES, DEFAULT_COLUMN_GUESS.updatedAt ?? 'updated_at'),
    };

    // Si la tabla no tiene created_at/updated_at, evitar incluirlas
    if (columnCache.createdAt && !(columnCache.createdAt in sample)) {
      columnCache.createdAt = undefined;
    }
    if (columnCache.updatedAt && !(columnCache.updatedAt in sample)) {
      columnCache.updatedAt = undefined;
    }

    return columnCache;
  } catch (error) {
    console.warn('⚠️ Error detectando columnas de usuarios:', error);
    columnCache = { ...DEFAULT_COLUMN_GUESS };
    return columnCache;
  }
};

export const resetUsuariosColumnCache = () => {
  columnCache = null;
};

export type UsuarioRow = {
  id?: string;
  email: string;
  nombre: string;
  rol: string;
  password?: string;
  telefono?: string | null;
  empresa?: string | null;
  estado?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  raw: Record<string, any>;
};

const normalizeRole = (role: string): UserRole => {
  const value = role?.toLowerCase().trim();
  if (value === 'admin') return 'admin';
  if (value === 'master') return 'master';
  if (value === 'asesor') return 'asesor';
  if (value === 'mensajero') return 'mensajero';
  if (value === 'mensajero-lider' || value === 'mensajero líder' || value === 'mensajero-líder') return 'mensajero-lider';
  if (value === 'mensajero-extra' || value === 'mensajero extra') return 'mensajero-extra';
  if (value === 'tienda') return 'tienda';
  return 'mensajero';
};

const normalizeStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === 'activo' ||
  status?.toLowerCase().trim() === 'active';

const mapRowToUsuario = (row: Record<string, any>, columns: ColumnGuess): UsuarioRow => {
  const passwordValue = row?.[columns.password];
  const telefonoValue = row?.[columns.phone];
  const empresaValue = row?.[columns.company];
  const estadoValue = row?.[columns.status];

  const nombreValue = row?.[columns.name];
  const rolValue = row?.[columns.role];
  const emailValue = row?.[columns.email];

  return {
    id: columns.id ? String(row?.[columns.id]) : emailValue,
    email: emailValue,
    nombre: nombreValue,
    rol: rolValue,
    password: passwordValue ?? undefined,
    telefono: telefonoValue ?? null,
    empresa: empresaValue ?? null,
    estado: estadoValue ?? null,
    created_at: columns.createdAt ? row?.[columns.createdAt] ?? null : null,
    updated_at: columns.updatedAt ? row?.[columns.updatedAt] ?? null : null,
    raw: row,
  };
};

export const mapUsuarioRowToUser = (usuario: UsuarioRow): User => {
  const companyName = usuario.empresa?.trim() || undefined;
  const normalizedCompanyId = companyName ? companyName.toUpperCase() : undefined;
  const company =
    companyName && normalizedCompanyId
      ? {
          id: normalizedCompanyId,
          name: companyName,
          taxId: '',
          address: '',
          phone: '',
          email: '',
          isActive: normalizeStatus(usuario.estado),
          createdAt: usuario.created_at ?? new Date().toISOString(),
          updatedAt: usuario.updated_at ?? usuario.created_at ?? new Date().toISOString(),
        }
      : undefined;

  return {
    id: usuario.id ?? usuario.email,
    email: usuario.email,
    name: usuario.nombre ?? usuario.email,
    role: normalizeRole(usuario.rol),
    phone: usuario.telefono ?? undefined,
    createdAt: usuario.created_at ?? new Date().toISOString(),
    isActive: normalizeStatus(usuario.estado),
    companyId: normalizedCompanyId,
    company,
    tiendaName: usuario.rol === 'tienda' ? usuario.nombre : undefined,
    isMessengerLeader: normalizeRole(usuario.rol) === 'mensajero-lider',
  };
};

export const fetchUsuarios = async (): Promise<UsuarioRow[]> => {
  const supabase = getSupabaseUsuarios();
  const columns = await detectColumnMap();

  const { data, error } = await supabase
    .from('usuarios')
    .select('*');

  if (error) {
    console.error('❌ Error al obtener usuarios de Supabase:', error);
    throw new Error(error.message);
  }

  const usuarios = (data ?? []).map((row) => mapRowToUsuario(row, columns));

  usuarios.sort((a, b) => {
    const aNombre = a.nombre?.toLowerCase() ?? '';
    const bNombre = b.nombre?.toLowerCase() ?? '';
    return aNombre.localeCompare(bNombre);
  });

  return usuarios;
};

export const getUsuarioByEmail = async (email: string): Promise<UsuarioRow | null> => {
  const usuarios = await fetchUsuarios();
  const normalizedEmail = email.trim().toLowerCase();

  return (
    usuarios.find((usuario) => usuario.email?.trim().toLowerCase() === normalizedEmail) ?? null
  );
};

const compareIdentifier = (value: string | null | undefined, target: string) =>
  value?.trim().toLowerCase() === target.trim().toLowerCase();

export const loginUsuario = async (
  identifier: string,
  password: string
): Promise<UsuarioRow> => {
  const usuarios = await fetchUsuarios();
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const usuario = usuarios.find((item) => {
    const emailMatches = compareIdentifier(item.email, normalizedIdentifier);
    const nameMatches = compareIdentifier(item.nombre, normalizedIdentifier);
    return emailMatches || nameMatches;
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  const storedPassword = usuario.password?.trim();

  if (!storedPassword) {
    throw new Error('El usuario no tiene contraseña configurada');
  }

  if (storedPassword !== password.trim()) {
    throw new Error('Credenciales inválidas');
  }

  if (!normalizeStatus(usuario.estado)) {
    throw new Error('Usuario inactivo');
  }

  return usuario;
};

type UsuarioInput = {
  email: string;
  nombre: string;
  rol: string;
  password: string;
  telefono?: string | null;
  empresa?: string | null;
  estado?: string | null;
};

const buildPayload = (input: UsuarioInput, columns: ColumnGuess) => {
  const payload: Record<string, any> = {
    [columns.email]: input.email,
    [columns.name]: input.nombre,
    [columns.role]: input.rol,
    [columns.password]: input.password,
  };

  if (columns.phone) {
    payload[columns.phone] = input.telefono ?? null;
  }

  if (columns.company) {
    payload[columns.company] = input.empresa ?? null;
  }

  if (columns.status) {
    payload[columns.status] = input.estado ?? 'Activo';
  }

  return payload;
};

export const createUsuario = async (input: UsuarioInput): Promise<UsuarioRow> => {
  const supabase = getSupabaseUsuarios();
  const columns = await detectColumnMap();
  
  // Verificar si el email ya existe antes de insertar
  const { data: existingUser, error: checkError } = await supabase
    .from('usuarios')
    .select('*')
    .eq(columns.email ?? 'Email', input.email)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('❌ Error al verificar usuario existente:', checkError);
  }

  if (existingUser) {
    throw new Error(`Ya existe un usuario con el email ${input.email}. Por favor, usa un email diferente.`);
  }

  const payload = buildPayload(input, columns);
  
  // Asegurarse de que no estamos incluyendo el ID en el payload si existe
  if (columns.id && payload[columns.id]) {
    delete payload[columns.id];
  }

  const { data, error } = await supabase
    .from('usuarios')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error al crear usuario en Supabase:', error);
    console.error('📋 Payload enviado:', payload);
    console.error('📋 Columnas detectadas:', columns);
    
    // Manejar errores de clave duplicada de forma más amigable
    if (error.code === '23505') {
      // Si el error es por la primary key, probablemente el email ya existe
      if (error.message.includes('usuarios_pkey')) {
        // Intentar verificar nuevamente el email
        const { data: recheckUser } = await supabase
          .from('usuarios')
          .select(columns.email ?? 'Email')
          .eq(columns.email ?? 'Email', input.email)
          .maybeSingle();
        
        if (recheckUser) {
          throw new Error(`Ya existe un usuario con el email ${input.email}. Por favor, genera un email diferente.`);
        } else {
          throw new Error('Ya existe un usuario con este identificador. Por favor, intenta con un nombre diferente para generar un email único.');
        }
      } else if (error.message.includes('email') || error.message.includes('Email')) {
        throw new Error(`Ya existe un usuario con el email ${input.email}`);
      } else {
        throw new Error('Ya existe un usuario con estos datos. Por favor, verifica la información.');
      }
    }
    
    throw new Error(error.message);
  }

  return mapRowToUsuario(data, columns);
};

type UsuarioUpdateInput = Partial<UsuarioInput>;

export const updateUsuario = async (
  usuario: UsuarioRow,
  updates: UsuarioUpdateInput
): Promise<UsuarioRow> => {
  const supabase = getSupabaseUsuarios();
  const columns = await detectColumnMap();
  const emailColumn = columns.email ?? 'Email';
  const nameColumn = columns.name ?? 'Nombre';
  const roleColumn = columns.role ?? 'Rol';
  const passwordColumn = columns.password ?? 'Contraseña';

  const payload: Record<string, any> = {
    [columns.email ?? 'Email']: updates.email ?? usuario.email,
    [columns.name ?? 'Nombre']: updates.nombre ?? usuario.nombre,
    [columns.role ?? 'Rol']: updates.rol ?? usuario.rol,
  };

  if (typeof updates.password === 'string' && updates.password.trim() !== '') {
    payload[columns.password ?? 'Contraseña'] = updates.password;
  }

  if (columns.phone) {
    const phoneValue =
      updates.telefono !== undefined ? updates.telefono : usuario.telefono;
    payload[columns.phone] = phoneValue ?? null;
  }

  if (columns.company) {
    const companyValue =
      updates.empresa !== undefined ? updates.empresa : usuario.empresa;
    payload[columns.company] = companyValue ?? null;
  }

  if (columns.status) {
    const statusValue =
      updates.estado !== undefined ? updates.estado : usuario.estado;
    payload[columns.status] = statusValue ?? 'Activo';
  }

  const filterColumn = columns.id ? columns.id : columns.email ?? 'Email';
  const filterValue = columns.id ? usuario.id : usuario.email;

  const { data, error } = await supabase
    .from('usuarios')
    .update(payload)
    .eq(filterColumn, filterValue)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error al actualizar usuario en Supabase:', error);
    throw new Error(error.message);
  }

  return mapRowToUsuario(data, columns);
};

export const deleteUsuario = async (usuario: UsuarioRow): Promise<void> => {
  const supabase = getSupabaseUsuarios();
  const columns = await detectColumnMap();
  const filterColumnName = columns.id ? columns.id : columns.email ?? 'Email';
  const filterValue = columns.id ? usuario.id : usuario.email;

  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq(filterColumnName, filterValue);

  if (error) {
    console.error('❌ Error al eliminar usuario en Supabase:', error);
    throw new Error(error.message);
  }
};

