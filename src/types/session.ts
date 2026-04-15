export type UserRole = 'ADMIN' | 'OWNER' | 'STAFF';

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  /** `id` de fila Baserow en tabla Clientes (tenant). */
  tenantId: number;
};
