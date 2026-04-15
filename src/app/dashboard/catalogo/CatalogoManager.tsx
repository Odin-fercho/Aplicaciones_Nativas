'use client';

import { ImageIcon, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { uploadTenantImage } from '@/lib/tenant-image-upload';

import './catalogo.css';

export type CatalogItem = {
  id: number;
  nombre: string;
  descripcionCorta: string;
  precio: number;
  imagenUrl: string;
  categoria: string;
};

type ModalMode = 'create' | 'edit';

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: '',
};

function formatPrecio(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CatalogoManager() {
  const [items, setItems] = useState<CatalogItem[]>([]);
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

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/tenant/catalog', {
        method: 'GET',
        credentials: 'include',
      });
      const data = (await res.json()) as { items?: CatalogItem[]; error?: string };
      if (!res.ok) {
        setListError(data.error ?? 'No se pudo cargar el catálogo');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setListError('Error de red al cargar el catálogo');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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
    setRemoteImageUrl('');
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setModalMode('edit');
    setEditingId(item.id);
    revokeStaged();
    setRemoteImageUrl(item.imagenUrl);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcionCorta,
      precio: String(item.precio),
      categoria: item.categoria,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    revokeStaged();
    setModalOpen(false);
    setFormError(null);
  };

  const onPickImage = (fileList: FileList | null) => {
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
    const nombre = form.nombre.trim();
    const precioNum = Number.parseFloat(form.precio.replace(',', '.'));
    if (!nombre) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setFormError('Indica un precio válido (≥ 0).');
      return;
    }

    setSaving(true);
    try {
      let imagenArchivo: { name: string }[] | undefined;
      if (stagedFile) {
        const ref = await uploadTenantImage(stagedFile);
        imagenArchivo = [ref];
      }

      const body: Record<string, unknown> = {
        nombre,
        descripcion: form.descripcion,
        precio: precioNum,
        categoria: form.categoria,
        ...(imagenArchivo ? { imagenArchivo } : {}),
        ...(modalMode === 'edit' && editingId !== null ? { id: editingId } : {}),
      };

      const res = await fetch('/api/tenant/catalog', {
        method: modalMode === 'create' ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; item?: CatalogItem };
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar');
        return;
      }
      closeModal();
      setSuccessMsg(modalMode === 'create' ? 'Producto creado correctamente.' : 'Cambios guardados.');
      await loadCatalog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error de red al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="catalogo-header">
        <div>
          <h1>Catálogo</h1>
          <p>
            Gestiona el menú que ven tus clientes en la app. Los cambios se guardan en Baserow y solo
            afectan a tu negocio.
          </p>
        </div>
      </header>

      {listError ? <p className="catalogo-error">{listError}</p> : null}
      {successMsg ? (
        <div className="catalogo-toast" role="status">
          {successMsg}
        </div>
      ) : null}

      <div className="catalogo-glass-panel">
        <div className="catalogo-toolbar">
          <button type="button" className="catalogo-btn-primary" onClick={openCreate}>
            <Plus size={18} strokeWidth={2.5} />
            Nuevo producto
          </button>
          <button
            type="button"
            className="catalogo-btn-ghost"
            onClick={() => void loadCatalog()}
            disabled={loading}
          >
            Actualizar lista
          </button>
        </div>

        {loading ? (
          <div className="catalogo-loading" aria-live="polite">
            <span className="catalogo-spinner" aria-hidden />
            Cargando productos…
          </div>
        ) : items.length === 0 ? (
          <div className="catalogo-empty">
            <p style={{ margin: '0 0 0.5rem' }}>Aún no hay productos.</p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.85 }}>
              Crea el primero con &quot;Nuevo producto&quot; o revisa la conexión con Baserow.
            </p>
          </div>
        ) : (
          <div className="catalogo-table-wrap">
            <table className="catalogo-table">
              <thead>
                <tr>
                  <th scope="col">Imagen</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Categoría</th>
                  <th scope="col" style={{ width: '1%' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URLs externas de tenant
                        <img
                          className="catalogo-thumb"
                          src={item.imagenUrl}
                          alt=""
                          loading="lazy"
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none';
                            const ph = ev.currentTarget.nextElementSibling as HTMLElement | null;
                            if (ph) ph.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="catalogo-thumb-placeholder"
                        style={{ display: item.imagenUrl ? 'none' : 'flex' }}
                        aria-hidden
                      >
                        <ImageIcon size={22} />
                      </div>
                    </td>
                    <td>
                      <strong>{item.nombre}</strong>
                    </td>
                    <td className="catalogo-price">{formatPrecio(item.precio)}</td>
                    <td>
                      {item.categoria ? (
                        <span className="catalogo-badge">{item.categoria}</span>
                      ) : (
                        <span style={{ opacity: 0.5 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="catalogo-btn-ghost"
                        onClick={() => openEdit(item)}
                        aria-label={`Editar ${item.nombre}`}
                      >
                        <Pencil size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div
          className="catalogo-modal-overlay"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div
            className="catalogo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogo-modal-title"
          >
            <h2 id="catalogo-modal-title">
              {modalMode === 'create' ? 'Nuevo producto' : 'Editar producto'}
            </h2>
            <form onSubmit={(e) => void submitForm(e)}>
              {formError ? <p className="catalogo-error" style={{ marginBottom: '1rem' }}>{formError}</p> : null}

              <div className="catalogo-field">
                <label htmlFor="cat-nombre">Nombre</label>
                <input
                  id="cat-nombre"
                  value={form.nombre}
                  onChange={(ev) => setForm((f) => ({ ...f, nombre: ev.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="catalogo-field">
                <label htmlFor="cat-desc">Descripción</label>
                <textarea
                  id="cat-desc"
                  value={form.descripcion}
                  onChange={(ev) => setForm((f) => ({ ...f, descripcion: ev.target.value }))}
                  rows={4}
                />
              </div>

              <div className="catalogo-field">
                <label htmlFor="cat-precio">Precio (COP)</label>
                <input
                  id="cat-precio"
                  type="text"
                  inputMode="decimal"
                  value={form.precio}
                  onChange={(ev) => setForm((f) => ({ ...f, precio: ev.target.value }))}
                  placeholder="0"
                  required
                />
              </div>

              <div className="catalogo-field">
                <label htmlFor="cat-cat">Categoría</label>
                <input
                  id="cat-cat"
                  value={form.categoria}
                  onChange={(ev) => setForm((f) => ({ ...f, categoria: ev.target.value }))}
                  placeholder="Ej. Bebidas, Platos fuertes…"
                  autoComplete="off"
                />
              </div>

              <div className="catalogo-field">
                <span id="cat-img-lbl" className="catalogo-field-labeltext">
                  Foto del producto
                </span>
                <div className="catalogo-file-wrap" role="group" aria-labelledby="cat-img-lbl">
                  <label className="catalogo-file-input-glass">
                    <span className="catalogo-file-input-label">Elegir imagen del dispositivo</span>
                    <span className="catalogo-file-input-meta">PNG, JPG, WebP · máx. ~12 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(ev) => onPickImage(ev.target.files)}
                    />
                  </label>
                  {displayPreview ? (
                    <div className="catalogo-file-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayPreview} alt="Vista previa" />
                      {stagedFile ? (
                        <button
                          type="button"
                          className="catalogo-file-preview-remove"
                          onClick={() => revokeStaged()}
                        >
                          Quitar foto nueva
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="catalogo-field-hint">
                  Si no eliges archivo nuevo al editar, se conserva la imagen ya guardada en Baserow.
                </p>
              </div>

              <div className="catalogo-modal-actions">
                <button type="button" className="catalogo-btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="catalogo-btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="catalogo-spinner" aria-hidden />
                      Guardando…
                    </>
                  ) : modalMode === 'create' ? (
                    'Crear producto'
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
