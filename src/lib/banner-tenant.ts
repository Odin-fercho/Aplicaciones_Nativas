import type { BannerRow } from '@/lib/banner-types';

/**
 * Comprueba que la fila de banner enlaza al `tenantId` esperado (campo `Cliente`).
 */
export function bannerRowBelongsToTenant(row: BannerRow, tenantId: number): boolean {
  const c = row.Cliente;
  if (c === undefined || c === null) return false;
  const ids: number[] = [];
  if (typeof c === 'number' && Number.isFinite(c)) {
    ids.push(c);
  } else if (Array.isArray(c)) {
    for (const item of c) {
      if (typeof item === 'number' && Number.isFinite(item)) ids.push(item);
      else if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id: number }).id;
        if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
      }
    }
  } else if (typeof c === 'object' && 'id' in c) {
    const id = (c as { id: number }).id;
    if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
  }
  return ids.includes(tenantId);
}
