import bcrypt from 'bcryptjs';

import { baserowListRows } from './baserow-server';
import { getBaserowConfig } from './env';
import type { SessionPayload, UserRole } from '@/types/session';

type BaserowSelectOption = { id: number; value: string; color?: string };

type UsuarioAccesoRow = {
  id: number;
  Email?: string;
  Password_Hash?: string;
  Role?: UserRole | BaserowSelectOption | string;
  /** Link row a Clientes: en user_field_names suele ser array de ids. */
  Cliente?: number[] | { id: number }[];
};

function normalizeRole(raw: UsuarioAccesoRow['Role']): UserRole | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    if (raw === 'ADMIN' || raw === 'OWNER' || raw === 'STAFF') return raw;
    return null;
  }
  if (typeof raw === 'object' && 'value' in raw && typeof raw.value === 'string') {
    const v = raw.value;
    if (v === 'ADMIN' || v === 'OWNER' || v === 'STAFF') return v;
  }
  return null;
}

function resolveTenantId(row: UsuarioAccesoRow): number | null {
  const c = row.Cliente;
  if (c === undefined || c === null) return null;
  if (typeof c === 'number' && Number.isFinite(c)) return c;
  if (typeof c === 'object' && !Array.isArray(c) && 'id' in c) {
    const id = (c as { id: number }).id;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  }
  if (!Array.isArray(c) || c.length === 0) return null;
  const first = c[0];
  if (typeof first === 'number' && Number.isFinite(first)) return first;
  if (typeof first === 'object' && first !== null && 'id' in first) {
    const id = (first as { id: number }).id;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  }
  return null;
}

export type AuthSuccess = {
  ok: true;
  session: SessionPayload;
};

export type AuthFailure = {
  ok: false;
  reason: 'invalid_credentials' | 'misconfigured_user' | 'upstream' | 'server_config';
};

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Autentica contra Baserow (tabla Usuarios_Acceso). El token Baserow solo se usa en servidor.
 * No revela si el fallo fue por email o contraseña (mensaje genérico al cliente).
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  let tableUsuarios: string;
  try {
    ({ tableUsuarios } = getBaserowConfig());
  } catch (err) {
    console.error('[auth] Variables de entorno (Baserow / tablas):', err);
    return { ok: false, reason: 'server_config' };
  }

  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '1',
    filter__Email__equal: normalizedEmail,
  });

  let rows: UsuarioAccesoRow[];
  try {
    const data = await baserowListRows<UsuarioAccesoRow>(tableUsuarios, params);
    rows = data.results;
  } catch (err) {
    console.error('[auth] Error al consultar Baserow (usuarios):', err);
    return { ok: false, reason: 'upstream' };
  }

  const row = rows[0];
  if (!row?.Password_Hash) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  let match = false;
  try {
    match = await bcrypt.compare(password, row.Password_Hash);
  } catch (err) {
    console.error('[auth] Password_Hash no válido para bcrypt:', err);
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!match) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const role = normalizeRole(row.Role);
  const tenantId = resolveTenantId(row);
  const rowEmail = typeof row.Email === 'string' ? row.Email.trim().toLowerCase() : normalizedEmail;

  if (!role || tenantId === null) {
    return { ok: false, reason: 'misconfigured_user' };
  }

  return {
    ok: true,
    session: {
      sub: String(row.id),
      email: rowEmail,
      role,
      tenantId,
    },
  };
}
