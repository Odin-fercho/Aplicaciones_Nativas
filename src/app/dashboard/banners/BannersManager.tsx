'use client';

import { ImageIcon, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { uploadTenantImage } from '@/lib/tenant-image-upload';

import './banners.css';

export type BannerItem = {
  id: number;
  titulo: string;
  subtitulo: string;
  imagenUrl: string;
  ctaTexto: string;
  ctaTipo: 'whatsapp' | 'url' | 'none';
  ctaValor: string;
  orden: number;
  activo: boolean;
};

type ModalMode = 'create' | 'edit';

const emptyForm = {
  titulo: '',
  subtitulo: '',
  orden: '0',
  activo: true,
  ctaTexto: 'Ver más',
  ctaTipo: 'none' as BannerItem['ctaTipo'],
  ctaValor: '',
};

export function BannersManager() {
  const [items, setItems] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState('');

  const revokeStaged = useCallback(() => {
    setStagedPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setStagedFile(null);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/tenant/banners?scope=manage', {
        method: 'GET',
        credentials: 'include',
      });
      const data = (await res.json()) as { items?: BannerItem[]; error?: string };
      if (!res.ok) {
        setListError(data.error ?? 'No se pudieron cargar los banners');
        setItems([]);
        return;
      }
      const list = Array.isArray(data.items) ? [...data.items] : [];
      list.sort((a, b) => a.orden - b.orden || a.id - b.id);
      setItems(list);
    } catch {
      setListError('Error de red');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 3200);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        revokeStaged();
        setModalOpen(false);
        setFormError(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, revokeStaged]);

  const openCreate = () => {
    setModalMode('create');
    setEditingId(null);
    revokeStaged();
    setForm(emptyForm);
    setRemoteImageUrl('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: BannerItem) => {
    setModalMode('edit');
    setEditingId(item.id);
    revokeStaged();
    setRemoteImageUrl(item.imagenUrl);
    setForm({
      titulo: item.titulo,
      subtitulo: item.subtitulo,
      orden: String(item.orden),
      activo: item.activo,
      ctaTexto: item.ctaTexto || 'Ver más',
      ctaTipo: item.ctaTipo,
      ctaValor: item.ctaValor,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    revokeStaged();
    setModalOpen(false);
    setFormError(null);
  };

  const onPickFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    revokeStaged();
    if (!file) return;
    setStagedFile(file);
    setStagedPreviewUrl(URL.createObjectURL(file));
  };

  const displayPreview = stagedPreviewUrl ?? remoteImageUrl;

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const titulo = form.titulo.trim();
    if (!titulo) {
      setFormError('El título es obligatorio.');
      return;
    }
    const ordenNum = Number.parseInt(form.orden.replace(',', '.'), 10);
    const orden = Number.isFinite(ordenNum) ? ordenNum : 0;

    setSaving(true);
    try {
      let imagenArchivo: { name: string }[] | undefined;
      if (stagedFile) {
        const ref = await uploadTenantImage(stagedFile);
        imagenArchivo = [ref];
      }

      const body: Record<string, unknown> = {
        titulo,
        subtitulo: form.subtitulo,
        orden,
        activo: form.activo,
        ctaTexto: form.ctaTexto.trim() || 'Ver más',
        ctaTipo: form.ctaTipo,
        ctaValor: form.ctaValor.trim(),
        ...(imagenArchivo ? { imagenArchivo } : {}),
        ...(modalMode === 'edit' && editingId !== null ? { id: editingId } : {}),
      };

      const res = await fetch('/api/tenant/banners', {
        method: modalMode === 'create' ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; item?: BannerItem };
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar');
        return;
      }
      closeModal();
      setSuccessMsg(modalMode === 'create' ? 'Banner creado.' : 'Cambios guardados.');
      await loadList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="banners-header">
        <h1>Banners</h1>
        <p>
          Carrusel promocional en la app. Sube imágenes desde tu dispositivo; se almacenan en Baserow
          como archivos vinculados.
        </p>
      </header>

      {listError ? <p className="banners-error">{listError}</p> : null}
      {successMsg ? (
        <div className="banners-toast" role="status">
          {successMsg}
        </div>
      ) : null}

      <div className="banners-glass-panel">
        <div className="banners-toolbar">
          <button type="button" className="banners-btn-primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={2.5} />
            Nuevo banner
          </button>
          <button type="button" className="banners-btn-ghost" onClick={() => void loadList()} disabled={loading}>
            Actualizar lista
          </button>
        </div>

        {loading ? (
          <div className="banners-loading" aria-live="polite">
            <span className="banners-spinner" aria-hidden />
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="banners-empty">No hay banners. Crea uno para destacar ofertas en la app.</div>
        ) : (
          <ul className="banners-list">
            {items.map((item) => (
              <li key={item.id} className="banners-item">
                {item.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="banners-item-thumb" src={item.imagenUrl} alt="" loading="lazy" />
                ) : (
                  <div className="banners-item-ph" aria-hidden>
                    <ImageIcon size={22} />
                  </div>
                )}
                <div className="banners-item-body">
                  <h3>{item.titulo}</h3>
                  <p>{item.subtitulo || 'Sin subtítulo'}</p>
                  <span className={`banners-badge${item.activo ? '' : ' banners-badge--off'}`}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <button type="button" className="banners-btn-ghost" onClick={() => openEdit(item)}>
                  <Pencil size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div
          className="banners-modal-overlay"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div className="banners-modal" role="dialog" aria-modal="true" aria-labelledby="banners-modal-title">
            <h2 id="banners-modal-title">{modalMode === 'create' ? 'Nuevo banner' : 'Editar banner'}</h2>
            <form onSubmit={(e) => void submitForm(e)}>
              {formError ? <p className="banners-error" style={{ marginBottom: '1rem' }}>{formError}</p> : null}

              <div className="banners-field">
                <label htmlFor="ban-titulo">Título</label>
                <input
                  id="ban-titulo"
                  value={form.titulo}
                  onChange={(ev) => setForm((f) => ({ ...f, titulo: ev.target.value }))}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="banners-field">
                <label htmlFor="ban-sub">Subtítulo</label>
                <textarea
                  id="ban-sub"
                  value={form.subtitulo}
                  onChange={(ev) => setForm((f) => ({ ...f, subtitulo: ev.target.value }))}
                  rows={3}
                />
              </div>

              <div className="banners-field">
                <span id="ban-img-lbl" className="banners-field-labeltext">
                  Imagen
                </span>
                <div className="banners-file-wrap" role="group" aria-labelledby="ban-img-lbl">
                  <label className="banners-file-input-glass">
                    <span className="banners-file-input-label">Elegir foto del dispositivo</span>
                    <span className="banners-file-input-meta">PNG, JPG, WebP · máx. ~12 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(ev) => onPickFile(ev.target.files)}
                    />
                  </label>
                  {displayPreview ? (
                    <div className="banners-file-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayPreview} alt="Vista previa" />
                      {stagedFile ? (
                        <button
                          type="button"
                          className="banners-file-preview-remove"
                          onClick={() => {
                            revokeStaged();
                          }}
                        >
                          Quitar foto nueva
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="banners-field-row">
                <div className="banners-field">
                  <label htmlFor="ban-orden">Orden</label>
                  <input
                    id="ban-orden"
                    type="text"
                    inputMode="numeric"
                    value={form.orden}
                    onChange={(ev) => setForm((f) => ({ ...f, orden: ev.target.value }))}
                  />
                </div>
                <div className="banners-field">
                  <label htmlFor="ban-activo">Visible en la app</label>
                  <select
                    id="ban-activo"
                    value={form.activo ? '1' : '0'}
                    onChange={(ev) => setForm((f) => ({ ...f, activo: ev.target.value === '1' }))}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="banners-field">
                <label htmlFor="ban-cta-t">Texto del botón</label>
                <input
                  id="ban-cta-t"
                  value={form.ctaTexto}
                  onChange={(ev) => setForm((f) => ({ ...f, ctaTexto: ev.target.value }))}
                />
              </div>

              <div className="banners-field">
                <label htmlFor="ban-cta-tip">Acción del botón</label>
                <select
                  id="ban-cta-tip"
                  value={form.ctaTipo}
                  onChange={(ev) =>
                    setForm((f) => ({
                      ...f,
                      ctaTipo: ev.target.value as BannerItem['ctaTipo'],
                    }))
                  }
                >
                  <option value="none">Ninguna</option>
                  <option value="url">Abrir URL</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div className="banners-field">
                <label htmlFor="ban-cta-v">URL o número WhatsApp</label>
                <input
                  id="ban-cta-v"
                  value={form.ctaValor}
                  onChange={(ev) => setForm((f) => ({ ...f, ctaValor: ev.target.value }))}
                  placeholder="https://… o 57300…"
                />
              </div>

              <div className="banners-modal-actions">
                <button type="button" className="banners-btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="banners-btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="banners-spinner" aria-hidden />
                      Guardando…
                    </>
                  ) : modalMode === 'create' ? (
                    'Crear banner'
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
