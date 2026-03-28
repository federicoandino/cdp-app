export type SegmentThreshold = {
  name: string;
  rMin: number; rMax: number;
  fMin: number; fMax: number;
  mMin: number; mMax: number;
  description?: string;
};

/**
 * Default RFM segment thresholds — priority order (first match wins).
 * R/F scores are 1–5 quintiles. M is set to 1–5 (any) since classification
 * relies only on R and F dimensions.
 */
export const DEFAULT_THRESHOLDS: SegmentThreshold[] = [
  { name: "Campeones",              rMin: 5, rMax: 5, fMin: 4, fMax: 5, mMin: 1, mMax: 5, description: "Beneficios VIP, early access" },
  { name: "No Puedes Perderlos",    rMin: 1, rMax: 2, fMin: 5, fMax: 5, mMin: 1, mMax: 5, description: "Campaña urgente + oferta fuerte. Recordarles su relación con la marca" },
  { name: "Nuevos Clientes",        rMin: 5, rMax: 5, fMin: 1, fMax: 1, mMin: 1, mMax: 5, description: "Campañas de bienvenida. Mostrar beneficios y nuevas categorías" },
  { name: "Clientes Prometedores",  rMin: 4, rMax: 4, fMin: 1, fMax: 1, mMin: 1, mMax: 5, description: "Seguimiento suave: descuentos suaves, contenidos que inspiren" },
  { name: "Potenciales Fieles",     rMin: 4, rMax: 5, fMin: 2, fMax: 3, mMin: 1, mMax: 5, description: "Campaña de segunda compra. Ofrecer productos complementarios" },
  { name: "Clientes Fieles",        rMin: 3, rMax: 4, fMin: 4, fMax: 5, mMin: 1, mMax: 5, description: "Programas de puntos o nuevos lanzamientos" },
  { name: "En Riesgo de Perderse",  rMin: 1, rMax: 2, fMin: 3, fMax: 4, mMin: 1, mMax: 5, description: "Mensajes personalizados + retargeting + descuentos exclusivos" },
  { name: "Requieren Atención",     rMin: 3, rMax: 3, fMin: 3, fMax: 3, mMin: 1, mMax: 5, description: "Enviar recordatorios, encuestas o promociones para reactivar" },
  { name: "A Punto de Inactivarse", rMin: 3, rMax: 3, fMin: 1, fMax: 2, mMin: 1, mMax: 5, description: "Campaña emocional + incentivo de regreso" },
  { name: "Hibernando",             rMin: 1, rMax: 2, fMin: 1, fMax: 2, mMin: 1, mMax: 5, description: "Intento final de reactivación o darles de baja si no responden" },
];
