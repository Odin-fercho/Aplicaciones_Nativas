import { getN8nWebhookUrl } from '@/lib/env';

export type N8nOrderWebhookBody = {
  eventId: number;
  tenantId: number;
  nombreCliente: string;
  tipo: 'pedido' | 'cita';
  detalle: string;
  total: number;
  emailNotificaciones: string;
  telefonoAlerta: string;
};

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envía el evento a n8n sin bloquear al llamador. Reintentos ante fallo de red o 5xx.
 */
export function enqueueN8nOrderWebhook(body: N8nOrderWebhookBody): void {
  const url = getN8nWebhookUrl();
  if (!url) return;

  void (async () => {
    const payload = JSON.stringify({
      ...body,
      source: 'odenix-portal',
      timestamp: new Date().toISOString(),
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        });
        if (res.ok) return;
        if (res.status < 500) {
          console.warn('[n8n webhook] respuesta no reintentable:', res.status);
          return;
        }
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          console.error('[n8n webhook] agotados reintentos:', err);
          return;
        }
      } finally {
        clearTimeout(timeout);
      }
      await sleep(BASE_DELAY_MS * attempt);
    }
  })();
}
