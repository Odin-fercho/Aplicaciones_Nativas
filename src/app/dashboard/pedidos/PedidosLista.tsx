'use client';

import { Check, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import './pedidos.css';

export type InteractionEventItem = {
  id: number;
  tipoLabel: string;
  tipoKind: 'pedido' | 'cita';
  detalle: string;
  total: number;
  estadoLabel: string;
  estadoKind: 'pendiente' | 'completado';
};

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PedidosLista() {
  const [items, setItems] = useState<InteractionEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setError(null);
    try {
      const res = await fetch('/api/tenant/events', { credentials: 'include' });
      const data = (await res.json()) as { items?: InteractionEventItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cargar el historial');
        setItems([]);
        return;
      }
      const list = Array.isArray(data.items) ? [...data.items] : [];
      list.sort((a, b) => b.id - a.id);
      setItems(list);
    } catch {
      setError('Error de red');
      setItems([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load({ silent: true }), 22000);
    return () => window.clearInterval(id);
  }, [load]);

  const marcarCompletado = async (ev: InteractionEventItem) => {
    setCompletingId(ev.id);
    setError(null);
    try {
      const res = await fetch('/api/tenant/events', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ev.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        item?: InteractionEventItem;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No se pudo marcar como completado');
        return;
      }
      if (data.item) {
        setItems((prev) => {
          const next = prev.map((i) => (i.id === data.item!.id ? data.item! : i));
          next.sort((a, b) => b.id - a.id);
          return next;
        });
      } else {
        await load({ silent: true });
      }
    } catch {
      setError('Error de red al actualizar');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="pedidos-page">
      <h1>Pedidos y citas</h1>
      <p>
        Historial de solicitudes registradas cuando un cliente pulsa WhatsApp desde la app. El
        mensaje puede seguir su curso por WhatsApp; aquí queda la copia para estadísticas.
      </p>

      <div className="pedidos-toolbar">
        <button
          type="button"
          className="pedidos-btn-ghost"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          <RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Actualizar
        </button>
        <span className="pedidos-poll-hint">Actualización automática cada ~22 s</span>
      </div>

      {error ? <div className="pedidos-error">{error}</div> : null}

      <div className="pedidos-glass">
        {loading ? (
          <div className="pedidos-loading">
            <span className="pedidos-spinner" aria-hidden />
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="pedidos-empty">Aún no hay pedidos ni citas registradas.</div>
        ) : (
          <ul className="pedidos-list">
            {items.map((ev) => {
              const hecho = ev.estadoKind === 'completado';
              return (
                <li
                  key={ev.id}
                  className={`pedidos-item${hecho ? ' pedidos-item--completado' : ''}`}
                >
                  <div className="pedidos-item-head">
                    <span
                      className={`pedidos-badge pedidos-badge--tipo-${ev.tipoKind === 'cita' ? 'cita' : 'pedido'}`}
                    >
                      {ev.tipoKind === 'cita' ? 'Cita' : 'Pedido'}
                    </span>
                    <span
                      className={`pedidos-badge ${
                        hecho ? 'pedidos-badge--estado-completado' : 'pedidos-badge--pendiente'
                      }`}
                    >
                      {ev.estadoLabel}
                    </span>
                    <span className="pedidos-total">{formatCop(ev.total)}</span>
                    <span className="pedidos-item-id">#{ev.id}</span>
                  </div>
                  <p className="pedidos-detalle">{ev.detalle || '—'}</p>
                  {!hecho ? (
                    <div className="pedidos-item-actions">
                      <button
                        type="button"
                        className="pedidos-btn-complete"
                        disabled={completingId === ev.id}
                        onClick={() => void marcarCompletado(ev)}
                      >
                        {completingId === ev.id ? (
                          <>
                            <span className="pedidos-spinner" aria-hidden />
                            Guardando…
                          </>
                        ) : (
                          <>
                            <Check size={16} strokeWidth={2.5} aria-hidden />
                            Marcar como completado
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
