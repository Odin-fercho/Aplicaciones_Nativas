'use client';

import { Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { TenantPlantilla } from '@/lib/tenantPlantilla';

import './configuracion.css';

type BrandingState = {
  nombreComercial: string;
  logoUrl: string;
  colorPrimario: string;
  colorSecundario: string;
  plantilla: TenantPlantilla;
  slug: string;
  emailNotificaciones: string;
  telefonoAlerta: string;
};

const emptyBranding: BrandingState = {
  nombreComercial: '',
  logoUrl: '',
  colorPrimario: '#9b5de5',
  colorSecundario: '#6366f1',
  plantilla: 'catalogo',
  slug: '',
  emailNotificaciones: '',
  telefonoAlerta: '',
};

export function ConfigBranding() {
  const [form, setForm] = useState<BrandingState>(emptyBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/profile', { credentials: 'include' });
      const data = (await res.json()) as { branding?: BrandingState; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cargar la configuración');
        return;
      }
      if (data.branding) {
        setForm({
          nombreComercial: data.branding.nombreComercial,
          logoUrl: data.branding.logoUrl,
          colorPrimario: data.branding.colorPrimario,
          colorSecundario: data.branding.colorSecundario,
          plantilla: data.branding.plantilla === 'citas' ? 'citas' : 'catalogo',
          slug: data.branding.slug,
          emailNotificaciones: data.branding.emailNotificaciones ?? '',
          telefonoAlerta: data.branding.telefonoAlerta ?? '',
        });
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(t);
  }, [success]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/tenant/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercial: form.nombreComercial.trim(),
          logoUrl: form.logoUrl.trim(),
          colorPrimario: form.colorPrimario,
          colorSecundario: form.colorSecundario,
          plantilla: form.plantilla,
          emailNotificaciones: form.emailNotificaciones.trim(),
          telefonoAlerta: form.telefonoAlerta.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; branding?: BrandingState };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No se pudo guardar');
        return;
      }
      if (data.branding) {
        setForm((prev) => ({
          ...prev,
          ...data.branding,
          plantilla: data.branding!.plantilla === 'citas' ? 'citas' : 'catalogo',
        }));
      }
      setSuccess('Guardado con éxito. La app Expo tomará los colores al recargar o al volver al primer plano.');
    } catch {
      setError('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="config-loading">Cargando configuración…</div>;
  }

  return (
    <div className="config-page">
      <h1>Configuración</h1>
      <p>
        Define la personalidad de tu app: nombre comercial, logo, colores y modo Catálogo o Citas.
        Los cambios se guardan en Baserow y la app móvil los lee vía el proxy seguro.
      </p>

      {error ? <div className="config-error">{error}</div> : null}
      {success ? <div className="config-success">{success}</div> : null}

      <div className="config-grid">
        <form className="config-glass" onSubmit={(e) => void onSubmit(e)}>
          <div className="config-field">
            <label htmlFor="cfg-nombre">Nombre comercial</label>
            <input
              id="cfg-nombre"
              type="text"
              value={form.nombreComercial}
              onChange={(ev) => setForm((f) => ({ ...f, nombreComercial: ev.target.value }))}
              autoComplete="organization"
              required
            />
          </div>

          <div className="config-field">
            <label htmlFor="cfg-logo">Logo (URL)</label>
            <input
              id="cfg-logo"
              type="url"
              value={form.logoUrl}
              onChange={(ev) => setForm((f) => ({ ...f, logoUrl: ev.target.value }))}
              placeholder="https://…"
            />
          </div>

          <div className="config-field">
            <label>Color primario</label>
            <div className="config-color-row">
              <input
                type="color"
                value={form.colorPrimario}
                onChange={(ev) => setForm((f) => ({ ...f, colorPrimario: ev.target.value }))}
                aria-label="Color primario"
              />
              <span className="config-color-hex">{form.colorPrimario}</span>
            </div>
          </div>

          <div className="config-field">
            <label>Color secundario</label>
            <div className="config-color-row">
              <input
                type="color"
                value={form.colorSecundario}
                onChange={(ev) => setForm((f) => ({ ...f, colorSecundario: ev.target.value }))}
                aria-label="Color secundario"
              />
              <span className="config-color-hex">{form.colorSecundario}</span>
            </div>
          </div>

          <div className="config-field">
            <label htmlFor="cfg-plantilla">Plantilla (Server-Driven UI)</label>
            <select
              id="cfg-plantilla"
              value={form.plantilla}
              onChange={(ev) =>
                setForm((f) => ({
                  ...f,
                  plantilla: ev.target.value === 'citas' ? 'citas' : 'catalogo',
                }))
              }
            >
              <option value="catalogo">Catálogo (menú / carrito)</option>
              <option value="citas">Citas (WhatsApp, sin calendario complejo)</option>
            </select>
          </div>

          <div className="config-section-title">Notificaciones (n8n / automatización)</div>
          <p className="config-section-hint">
            Estos datos se incluyen en el webhook cuando llega un pedido o cita desde la app, para que
            puedas enrutar alertas por email o SMS en n8n.
          </p>

          <div className="config-field">
            <label htmlFor="cfg-email-n8n">Email de notificaciones</label>
            <input
              id="cfg-email-n8n"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.emailNotificaciones}
              onChange={(ev) => setForm((f) => ({ ...f, emailNotificaciones: ev.target.value }))}
              placeholder="alertas@tuempresa.com"
            />
          </div>

          <div className="config-field">
            <label htmlFor="cfg-tel-alerta">Teléfono de alerta</label>
            <input
              id="cfg-tel-alerta"
              type="tel"
              inputMode="tel"
              value={form.telefonoAlerta}
              onChange={(ev) => setForm((f) => ({ ...f, telefonoAlerta: ev.target.value }))}
              placeholder="+57 …"
            />
          </div>

          {form.slug ? (
            <p className="config-slug-hint">
              Slug público en la app: <strong style={{ color: '#a3e635' }}>{form.slug}</strong>
            </p>
          ) : null}

          <div className="config-actions">
            <button type="submit" className="config-btn-save" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <aside className="config-preview-wrap">
          <p className="config-preview-title">
            <Smartphone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Vista previa
          </p>
          <div className="config-iphone" aria-hidden>
            <div className="config-iphone-screen">
              <div className="config-iphone-notch">
                <div className="config-iphone-notch-pill" />
              </div>
              <div
                className="config-iphone-header"
                style={{ borderBottomColor: `${form.colorSecundario}33` }}
              >
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="config-preview-logo" src={form.logoUrl} alt="" />
                ) : (
                  <div className="config-preview-logo-ph">logo</div>
                )}
                <div className="config-preview-name">
                  {form.nombreComercial || 'Tu marca'}
                </div>
              </div>
              <div className="config-iphone-body">
                <div
                  className="config-preview-pill"
                  style={{ backgroundColor: form.colorSecundario }}
                />
                <div
                  className="config-preview-pill"
                  style={{ backgroundColor: form.colorPrimario, width: '40%' }}
                />
                <div
                  className="config-preview-btn"
                  style={{ backgroundColor: form.colorPrimario }}
                >
                  {form.plantilla === 'citas' ? 'Agendar por WhatsApp' : 'Ver catálogo'}
                </div>
                <div
                  className="config-preview-secondary-bar"
                  style={{ backgroundColor: form.colorSecundario }}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
