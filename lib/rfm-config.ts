export type SegmentThreshold = {
  name: string;
  rMin: number; rMax: number;
  fMin: number; fMax: number;
  mMin: number; mMax: number;
};

/**
 * Default RFM segment thresholds — priority order (first match wins).
 * R/F/M scores are 1–5 quintiles.
 */
export const DEFAULT_THRESHOLDS: SegmentThreshold[] = [
  { name: "Campeones",            rMin: 4, rMax: 5, fMin: 4, fMax: 5, mMin: 4, mMax: 5 },
  { name: "No Puedo Perderlos",   rMin: 1, rMax: 2, fMin: 4, fMax: 5, mMin: 4, mMax: 5 },
  { name: "En Riesgo",            rMin: 1, rMax: 2, fMin: 3, fMax: 5, mMin: 3, mMax: 5 },
  { name: "Clientes Leales",      rMin: 3, rMax: 5, fMin: 3, fMax: 5, mMin: 3, mMax: 5 },
  { name: "Clientes Nuevos",      rMin: 4, rMax: 5, fMin: 1, fMax: 5, mMin: 1, mMax: 5 },
  { name: "Prometedores",         rMin: 3, rMax: 4, fMin: 1, fMax: 2, mMin: 1, mMax: 2 },
  { name: "Potencial de Lealtad", rMin: 3, rMax: 5, fMin: 1, fMax: 3, mMin: 1, mMax: 5 },
  { name: "Necesitan Atención",   rMin: 2, rMax: 3, fMin: 2, fMax: 3, mMin: 2, mMax: 3 },
  { name: "A Punto de Dormir",    rMin: 2, rMax: 3, fMin: 1, fMax: 2, mMin: 1, mMax: 2 },
  { name: "Hibernando",           rMin: 1, rMax: 2, fMin: 1, fMax: 2, mMin: 1, mMax: 2 },
  { name: "Perdidos",             rMin: 1, rMax: 1, fMin: 1, fMax: 1, mMin: 1, mMax: 1 },
];
