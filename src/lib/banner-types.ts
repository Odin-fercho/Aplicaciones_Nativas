/** Fila tabla Banners (nombres API alineados con Baserow). */
export type BannerRow = {
  id: number;
  Titulo?: string;
  titulo?: string;
  Subtitulo?: string;
  subtitulo?: string;
  Imagen_URL?: unknown;
  imagen_url?: unknown;
  CTA_Texto?: string;
  cta_texto?: string;
  CTA_Tipo?: string;
  cta_tipo?: string;
  CTA_Valor?: string;
  cta_valor?: string;
  Orden?: number | string;
  orden?: number | string;
  Activo?: boolean;
  activo?: boolean;
  Cliente?: number | number[] | { id: number } | { id: number }[];
};
