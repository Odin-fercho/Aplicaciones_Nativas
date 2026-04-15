/** Celda "File" de Baserow (user_field_names): string legacy o array con `url`. */
export function baserowFileCellToPublicUrl(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (!raw || !Array.isArray(raw) || raw.length === 0) return '';
  const first = raw[0];
  if (first && typeof first === 'object' && 'url' in first) {
    const u = (first as { url?: unknown }).url;
    return typeof u === 'string' ? u.trim() : '';
  }
  return '';
}

export type BaserowUploadedFileRef = { name: string };

export function parseImagenArchivoBody(raw: unknown): BaserowUploadedFileRef[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: BaserowUploadedFileRef[] = [];
  for (const el of raw) {
    if (el && typeof el === 'object' && 'name' in el) {
      const name = String((el as { name: unknown }).name).trim();
      if (name) out.push({ name });
    }
  }
  return out.length > 0 ? out : null;
}
