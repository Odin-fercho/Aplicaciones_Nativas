import { baserowFileCellToPublicUrl } from '@/lib/baserow-files';

type BaserowSelectOption = { id: number; value: string; color?: string };

/** Fila tabla Productos (nombres API alineados con Baserow / Expo). */
export type ProductRow = {
  id: number;
  Nombre?: string;
  nombre?: string;
  Descripcion_Corta?: string;
  descripcion_corta?: string;
  Precio?: number | string;
  precio?: number | string;
  Imagen_URL?: unknown;
  imagen_url?: unknown;
  Categoria?: string | BaserowSelectOption;
  categoria?: string | BaserowSelectOption;
  Cliente?: number | number[] | { id: number } | { id: number }[];
};

export type CatalogProductDto = {
  id: number;
  nombre: string;
  descripcionCorta: string;
  precio: number;
  imagenUrl: string;
  categoria: string;
};

function mapCategory(raw: ProductRow['Categoria']): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && 'value' in raw && typeof raw.value === 'string') {
    return raw.value;
  }
  return '';
}

export function mapProductRowToDto(row: ProductRow): CatalogProductDto {
  const rawPrice = row.Precio ?? row.precio ?? 0;
  const parsedPrice = typeof rawPrice === 'number' ? rawPrice : Number.parseFloat(String(rawPrice));
  const categoriaRaw = row.Categoria ?? row.categoria;
  const categoria =
    typeof categoriaRaw === 'string'
      ? categoriaRaw
      : categoriaRaw && typeof categoriaRaw === 'object' && 'value' in categoriaRaw
        ? String(categoriaRaw.value)
        : '';
  return {
    id: row.id,
    nombre: row.Nombre ?? row.nombre ?? 'Producto',
    descripcionCorta:
      row.Descripcion_Corta ?? row.descripcion_corta ?? 'Sin descripción disponible.',
    precio: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    imagenUrl: baserowFileCellToPublicUrl(row.Imagen_URL ?? row.imagen_url),
    categoria,
  };
}
