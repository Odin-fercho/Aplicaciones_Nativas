/** Sube una imagen al workspace Baserow vía proxy del portal (sesión requerida). */
export async function uploadTenantImage(file: File): Promise<{ name: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/tenant/upload', {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  const data = (await res.json()) as { name?: string; error?: string; detail?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : typeof data.detail === 'string'
          ? data.detail
          : 'Error al subir la imagen',
    );
  }
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Respuesta de subida inválida');
  }
  return { name: data.name.trim() };
}
