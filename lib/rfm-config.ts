export type MTier = "LOW" | "MEDIUM" | "HIGH" | "ANY";

export type SegmentRule = {
  name: string;
  rFrom: number; // days since last purchase, min
  rTo: number;   // days since last purchase, max
  fFrom: number; // purchases per year, min
  fTo: number;   // purchases per year, max
  m: MTier;      // monetary tier (dynamic 33rd/67th pct)
};

/**
 * Default segment rules — priority order (first match wins).
 * R = days since last purchase, F = purchases per year, M = monetary tier.
 */
export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  { name: "Campeones",            rFrom: 0,   rTo: 30,   fFrom: 10, fTo: 999, m: "HIGH"   },
  { name: "No Puedo Perderlos",   rFrom: 31,  rTo: 90,   fFrom: 10, fTo: 999, m: "HIGH"   },
  { name: "En Riesgo",            rFrom: 31,  rTo: 90,   fFrom: 5,  fTo: 9,   m: "MEDIUM" },
  { name: "Clientes Leales",      rFrom: 0,   rTo: 60,   fFrom: 5,  fTo: 9,   m: "HIGH"   },
  { name: "Clientes Nuevos",      rFrom: 0,   rTo: 30,   fFrom: 1,  fTo: 2,   m: "ANY"    },
  { name: "Prometedores",         rFrom: 0,   rTo: 60,   fFrom: 3,  fTo: 4,   m: "ANY"    },
  { name: "Potencial de Lealtad", rFrom: 0,   rTo: 60,   fFrom: 3,  fTo: 4,   m: "HIGH"   },
  { name: "Necesitan Atención",   rFrom: 61,  rTo: 120,  fFrom: 3,  fTo: 5,   m: "MEDIUM" },
  { name: "A Punto de Dormir",    rFrom: 61,  rTo: 120,  fFrom: 1,  fTo: 2,   m: "LOW"    },
  { name: "Hibernando",           rFrom: 91,  rTo: 180,  fFrom: 1,  fTo: 2,   m: "LOW"    },
  { name: "Perdidos",             rFrom: 181, rTo: 9999, fFrom: 1,  fTo: 999, m: "ANY"    },
];
