import { baserowListRows } from './baserow-server';
import { getBaserowConfig } from './env';
import { parseTenantPlantilla, type TenantPlantilla } from './tenantPlantilla';

type BaserowSelectOption = { id: number; value: string; color?: string };

/** Fila tabla Clientes (campos API alineados con Expo / Baserow). */
export type ClienteRow = {
  id?: number;
  /** Nombre comercial (preferido en branding). */
  Nombre_Comercial?: string;
  nombre_comercial?: string;
  Nombre?: string;
  nombre?: string;
  Logo_URL?: string;
  logo_url?: string;
  Slogan?: string;
  slogan?: string;
  Slug?: string;
  slug?: string;
  Color_Primario?: string;
  color_primario?: string;
  ColorPrimario?: string;
  colorPrimario?: string;
  Color_Secundario?: string;
  color_secundario?: string;
  WhatsApp?: string;
  whatsapp?: string;
  Tipo_de_Plantilla?: string | BaserowSelectOption;
  tipo_de_plantilla?: string | BaserowSelectOption;
  TipoPlantilla?: string | BaserowSelectOption;
  tipoPlantilla?: string | BaserowSelectOption;
  Direccion?: string;
  direccion?: string;
  Horario?: string;
  horario?: string;
  Telefono?: string;
  telefono?: string;
  Email?: string;
  email?: string;
  Instagram?: string;
  instagram?: string;
  Latitud?: number | string;
  latitud?: number | string;
  Longitud?: number | string;
  longitud?: number | string;
  /** Destino para alertas n8n / automatización (portal). */
  Email_Notificaciones?: string;
  email_notificaciones?: string;
  Telefono_Alerta?: string;
  telefono_alerta?: string;
};

export type TenantPublicDto = {
  id: number;
  nombre: string;
  slogan: string;
  colorPrimario: string;
  colorSecundario: string;
  logoUrl: string;
  whatsapp: string;
  plantilla: TenantPlantilla;
};

/** Datos para el formulario de branding (portal). */
export type TenantBrandingDto = {
  nombreComercial: string;
  logoUrl: string;
  colorPrimario: string;
  colorSecundario: string;
  plantilla: TenantPlantilla;
  slug: string;
  emailNotificaciones: string;
  telefonoAlerta: string;
};

export type TenantProfilePublicDto = {
  direccion: string;
  horario: string;
  telefono: string;
  email: string;
  instagram: string;
  latitud: number | null;
  longitud: number | null;
};

function fieldToString(value: string | BaserowSelectOption | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value;
  }
  return undefined;
}

function normalizeWhatsapp(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function normalizeColor(value: string, fallback: string): string {
  if (!value) return fallback;
  return value.startsWith('#') ? value : `#${value}`;
}

function parseOptionalNumber(value: string | number | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function fetchClienteRowBySlug(slug: string): Promise<ClienteRow | null> {
  const s = slug.trim();
  if (!s) return null;
  const { tableClientes } = getBaserowConfig();
  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '1',
    filter__Slug__equal: s,
  });
  const data = await baserowListRows<ClienteRow>(tableClientes, params);
  return data.results[0] ?? null;
}

export async function resolveTenantRowIdBySlug(slug: string): Promise<number | null> {
  const row = await fetchClienteRowBySlug(slug);
  const id = row?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

function pickNombreComercial(row: ClienteRow, fallbackNombre: string): string {
  const raw =
    row.Nombre_Comercial ??
    row.nombre_comercial ??
    row.Nombre ??
    row.nombre ??
    fallbackNombre;
  return typeof raw === 'string' ? raw : fallbackNombre;
}

function pickLogoUrl(row: ClienteRow): string {
  const raw = row.Logo_URL ?? row.logo_url ?? '';
  return typeof raw === 'string' ? raw.trim() : '';
}

function pickColorPrimario(row: ClienteRow, fallback: string): string {
  return normalizeColor(
    row.Color_Primario ?? row.color_primario ?? row.ColorPrimario ?? row.colorPrimario ?? '',
    fallback,
  );
}

function pickColorSecundario(row: ClienteRow, fallbackPrimario: string): string {
  const raw =
    row.Color_Secundario ?? row.color_secundario ?? row.Color_Primario ?? row.ColorPrimario ?? '';
  return normalizeColor(typeof raw === 'string' ? raw : '', fallbackPrimario);
}

export function mapClienteRowToTenantDto(row: ClienteRow, fallback: TenantPublicDto): TenantPublicDto {
  const plantillaRaw =
    fieldToString(row.Tipo_de_Plantilla) ??
    fieldToString(row.tipo_de_plantilla) ??
    fieldToString(row.TipoPlantilla) ??
    fieldToString(row.tipoPlantilla);

  const colorPrimario = pickColorPrimario(row, fallback.colorPrimario);

  return {
    id: row.id ?? fallback.id,
    nombre: pickNombreComercial(row, fallback.nombre),
    slogan: row.Slogan ?? row.slogan ?? fallback.slogan,
    colorPrimario,
    colorSecundario: pickColorSecundario(row, colorPrimario),
    logoUrl: pickLogoUrl(row),
    whatsapp: normalizeWhatsapp(row.WhatsApp ?? row.whatsapp ?? fallback.whatsapp),
    plantilla: parseTenantPlantilla(plantillaRaw),
  };
}

export function mapClienteRowToBrandingDto(
  row: ClienteRow | null,
  fallback: TenantPublicDto,
): TenantBrandingDto {
  if (!row || row.id == null) {
    return {
      nombreComercial: fallback.nombre,
      logoUrl: fallback.logoUrl,
      colorPrimario: fallback.colorPrimario,
      colorSecundario: fallback.colorSecundario,
      plantilla: fallback.plantilla,
      slug: '',
      emailNotificaciones: '',
      telefonoAlerta: '',
    };
  }
  const tenant = mapClienteRowToTenantDto(row, fallback);
  const slug = row.Slug ?? row.slug ?? '';
  const emailN =
    row.Email_Notificaciones ?? row.email_notificaciones ?? '';
  const telAlerta = row.Telefono_Alerta ?? row.telefono_alerta ?? '';
  return {
    nombreComercial: pickNombreComercial(row, tenant.nombre),
    logoUrl: tenant.logoUrl,
    colorPrimario: tenant.colorPrimario,
    colorSecundario: tenant.colorSecundario,
    plantilla: tenant.plantilla,
    slug: typeof slug === 'string' ? slug : '',
    emailNotificaciones: typeof emailN === 'string' ? emailN : '',
    telefonoAlerta: typeof telAlerta === 'string' ? telAlerta : '',
  };
}

export function mapClienteRowToProfileDto(row: ClienteRow | null): TenantProfilePublicDto {
  if (!row) {
    return {
      direccion: '',
      horario: '',
      telefono: '',
      email: '',
      instagram: '',
      latitud: null,
      longitud: null,
    };
  }
  return {
    direccion: row.Direccion ?? row.direccion ?? '',
    horario: row.Horario ?? row.horario ?? '',
    telefono: row.Telefono ?? row.telefono ?? '',
    email: row.Email ?? row.email ?? '',
    instagram: row.Instagram ?? row.instagram ?? '',
    latitud: parseOptionalNumber(row.Latitud ?? row.latitud),
    longitud: parseOptionalNumber(row.Longitud ?? row.longitud),
  };
}

export const FALLBACK_TENANT_DTO: TenantPublicDto = {
  id: 0,
  nombre: 'Odenix',
  slogan: 'Gestión inteligente para hacer crecer tu negocio hoy.',
  colorPrimario: '#9b5de5',
  colorSecundario: '#6366f1',
  logoUrl: '',
  whatsapp: '573001234567',
  plantilla: 'catalogo',
};
