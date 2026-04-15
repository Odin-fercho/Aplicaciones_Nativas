export type TenantPlantilla = 'catalogo' | 'citas';

export function parseTenantPlantilla(raw: string | undefined | null): TenantPlantilla {
  if (!raw || typeof raw !== 'string') return 'catalogo';
  const v = raw.trim().toLowerCase();
  if (!v) return 'catalogo';

  if (
    v.includes('cita') ||
    v.includes('agenda') ||
    v.includes('servicio') ||
    v === 'citas' ||
    v === 'booking'
  ) {
    return 'citas';
  }

  if (
    v.includes('restaurant') ||
    v.includes('menu') ||
    v.includes('catálogo') ||
    v.includes('catalogo') ||
    v.includes('tienda') ||
    v.includes('comercio')
  ) {
    return 'catalogo';
  }

  return 'catalogo';
}
