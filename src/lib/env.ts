function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return v;
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/**
 * Evita URLs "quemadas" a loopback en producción y exige HTTPS para APIs públicas.
 * En desarrollo (`NODE_ENV !== 'production'`) no aplica restricciones de host/protocolo.
 */
export function assertSafeExternalUrl(
  raw: string,
  envName: string,
  opts?: { requireHttps?: boolean },
): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${envName} debe ser una URL absoluta válida (p. ej. https://api.ejemplo.com/ruta)`);
  }
  if (process.env.NODE_ENV !== 'production') {
    return trimmed;
  }
  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTNAMES.has(host)) {
    throw new Error(
      `${envName} apunta a "${host}"; en producción usa el dominio real del servicio (variables de entorno en Coolify/Vercel).`,
    );
  }
  if (opts?.requireHttps === true && url.protocol !== 'https:') {
    throw new Error(`${envName} debe usar https:// en producción.`);
  }
  return trimmed;
}

export function getBaserowConfig() {
  const apiUrl = assertSafeExternalUrl(requireEnv('BASEROW_API_URL'), 'BASEROW_API_URL', {
    requireHttps: true,
  });
  return {
    apiUrl,
    token: requireEnv('BASEROW_API_TOKEN'),
    tableUsuarios: requireEnv('BASEROW_TABLE_USUARIOS_ACCESO'),
    tableClientes: requireEnv('BASEROW_TABLE_CLIENTES'),
    tableProductos: process.env.BASEROW_TABLE_PRODUCTOS ?? '617',
    tableBanners: process.env.BASEROW_TABLE_BANNERS ?? '618',
    /** Tabla Eventos_Interaccion (pedidos/citas registrados desde la app). */
    tableEventosInteraccion: process.env.BASEROW_TABLE_EVENTOS_INTERACCION?.trim() ?? '',
    /** IDs de opción del single select `Tipo_de_Plantilla` (tabla Clientes), si aplica. */
    plantillaOptionCatalogoId: process.env.BASEROW_PLANTILLA_OPTION_CATALOGO_ID?.trim() ?? '',
    plantillaOptionCitasId: process.env.BASEROW_PLANTILLA_OPTION_CITAS_ID?.trim() ?? '',
    eventoTipoPedidoOptionId: process.env.BASEROW_EVENTO_TIPO_PEDIDO_OPTION_ID?.trim() ?? '',
    eventoTipoCitaOptionId: process.env.BASEROW_EVENTO_TIPO_CITA_OPTION_ID?.trim() ?? '',
    eventoEstadoPendienteOptionId: process.env.BASEROW_EVENTO_ESTADO_PENDIENTE_OPTION_ID?.trim() ?? '',
    eventoEstadoCompletadoOptionId: process.env.BASEROW_EVENTO_ESTADO_COMPLETADO_OPTION_ID?.trim() ?? '',
  };
}

/** Webhook n8n para automatizaciones (opcional). */
export function getN8nWebhookUrl(): string {
  const raw = process.env.N8N_WEBHOOK_URL?.trim() ?? '';
  if (!raw) return '';
  return assertSafeExternalUrl(raw, 'N8N_WEBHOOK_URL', { requireHttps: true });
}

export function getSessionSecret(): Uint8Array {
  const raw = requireEnv('SESSION_SECRET');
  if (raw.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(raw);
}
