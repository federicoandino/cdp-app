/**
 * RFM (Recency, Frequency, Monetary) scoring engine.
 * Pure functions — no DB access here.
 */

export type RFMScores = {
  recency: number;
  frequency: number;
  monetary: number;
  total: number;
  segment: string;
};

/**
 * Assign quintile scores (1–5) based on a sorted array of values.
 * For recency: lower days = better = higher score (inverse).
 * For F and M: higher value = better = higher score.
 */
export function assignQuintiles(values: number[], inverse = false): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const scoreMap = new Map<number, number>();

  for (let i = 0; i < sorted.length; i++) {
    const percentile = i / n;
    let score: number;
    if (percentile < 0.2) score = 1;
    else if (percentile < 0.4) score = 2;
    else if (percentile < 0.6) score = 3;
    else if (percentile < 0.8) score = 4;
    else score = 5;

    if (inverse) score = 6 - score;
    scoreMap.set(sorted[i], score);
  }

  return scoreMap;
}

export type CustomerRFMInput = {
  id: number;
  last_purchase_date: string | null;
  total_orders: number | null;
  total_spent: number | null;
};

export type CustomerRFMOutput = {
  id: number;
  rfm_recency_score: number;
  rfm_frequency_score: number;
  rfm_monetary_score: number;
  rfm_total_score: number;
  rfm_segment: string;
};

/**
 * Calculate RFM scores for all customers.
 * Takes an array of customers with purchase data, returns scored array.
 */
export function calculateRFM(customers: CustomerRFMInput[], config?: SegmentThreshold[]): CustomerRFMOutput[] {
  const now = new Date();

  // Filter customers who have made at least one purchase
  const withPurchases = customers.filter(
    (c) => c.last_purchase_date && (c.total_orders ?? 0) > 0
  );

  if (withPurchases.length === 0) return [];

  // Calculate recency in days
  const recencyValues = withPurchases.map((c) => {
    const lastDate = new Date(c.last_purchase_date!);
    const diffMs = now.getTime() - lastDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  });

  const frequencyValues = withPurchases.map((c) => c.total_orders ?? 0);
  const monetaryValues = withPurchases.map((c) => c.total_spent ?? 0);

  // Build unique value → score maps
  const recencyMap = assignQuintiles(recencyValues, true); // inverse: fewer days = higher score
  const frequencyMap = assignQuintiles(frequencyValues, false);
  const monetaryMap = assignQuintiles(monetaryValues, false);

  return withPurchases.map((c, i) => {
    const r = recencyMap.get(recencyValues[i]) ?? 1;
    const f = frequencyMap.get(frequencyValues[i]) ?? 1;
    const m = monetaryMap.get(monetaryValues[i]) ?? 1;
    const total = r * 100 + f * 10 + m;
    const segment = classifyRFMSegment(r, f, m, config);

    return {
      id: c.id,
      rfm_recency_score: r,
      rfm_frequency_score: f,
      rfm_monetary_score: m,
      rfm_total_score: total,
      rfm_segment: segment,
    };
  });
}

import { DEFAULT_THRESHOLDS, type SegmentThreshold } from "./rfm-config";

/**
 * Classify customer into an RFM segment based on R, F, M scores.
 * Uses priority-ordered thresholds — first match wins.
 */
export function classifyRFMSegment(r: number, f: number, m: number, config?: SegmentThreshold[]): string {
  const rules = config ?? DEFAULT_THRESHOLDS;
  for (const rule of rules) {
    if (r >= rule.rMin && r <= rule.rMax &&
        f >= rule.fMin && f <= rule.fMax &&
        m >= rule.mMin && m <= rule.mMax) {
      return rule.name;
    }
  }
  return "Sin Clasificar";
}

export const RFM_SEGMENTS = [
  "Campeones",
  "Clientes Leales",
  "Potencial de Lealtad",
  "Clientes Nuevos",
  "Prometedores",
  "Necesitan Atención",
  "A Punto de Dormir",
  "En Riesgo",
  "No Puedo Perderlos",
  "Hibernando",
  "Perdidos",
  "Sin Clasificar",
] as const;

export type RFMSegment = (typeof RFM_SEGMENTS)[number];

export const RFM_SEGMENT_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  "Campeones": { bg: "bg-green-100", text: "text-green-800", badge: "bg-green-100 text-green-800" },
  "Clientes Leales": { bg: "bg-blue-100", text: "text-blue-800", badge: "bg-blue-100 text-blue-800" },
  "Potencial de Lealtad": { bg: "bg-indigo-100", text: "text-indigo-800", badge: "bg-indigo-100 text-indigo-800" },
  "Clientes Nuevos": { bg: "bg-cyan-100", text: "text-cyan-800", badge: "bg-cyan-100 text-cyan-800" },
  "Prometedores": { bg: "bg-teal-100", text: "text-teal-800", badge: "bg-teal-100 text-teal-800" },
  "Necesitan Atención": { bg: "bg-yellow-100", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-800" },
  "A Punto de Dormir": { bg: "bg-orange-100", text: "text-orange-800", badge: "bg-orange-100 text-orange-800" },
  "En Riesgo": { bg: "bg-red-100", text: "text-red-800", badge: "bg-red-100 text-red-800" },
  "No Puedo Perderlos": { bg: "bg-rose-100", text: "text-rose-800", badge: "bg-rose-100 text-rose-800" },
  "Hibernando": { bg: "bg-gray-100", text: "text-gray-600", badge: "bg-gray-100 text-gray-600" },
  "Perdidos": { bg: "bg-zinc-100", text: "text-zinc-500", badge: "bg-zinc-100 text-zinc-500" },
  "Sin Clasificar": { bg: "bg-slate-100", text: "text-slate-500", badge: "bg-slate-100 text-slate-500" },
};
