/**
 * RFM segmentation engine — parameter-based.
 * R = days since last purchase, F = purchases per year, M = monetary tier (LOW/MEDIUM/HIGH).
 * M tiers are computed dynamically from the actual customer base (33rd / 67th percentile).
 */

import { DEFAULT_SEGMENT_RULES, type SegmentRule, type MTier } from "./rfm-config";

export type CustomerRFMInput = {
  id: number;
  last_purchase_date: string | null;
  first_purchase_date: string | null;
  total_orders: number | null;
  total_spent: number | null;
};

export type CustomerRFMOutput = {
  id: number;
  rfm_segment: string;
};

/**
 * Classify all customers into segments using business parameters.
 * - R: days since last purchase
 * - F: purchases per year (annualised from first purchase date)
 * - M: monetary tier computed from 33rd / 67th percentile of total_spent in the base
 */
export function classifyCustomers(
  customers: CustomerRFMInput[],
  rules?: SegmentRule[]
): CustomerRFMOutput[] {
  const activeRules = rules ?? DEFAULT_SEGMENT_RULES;
  const now = new Date();

  const withPurchases = customers.filter(
    (c) => c.last_purchase_date && (c.total_orders ?? 0) > 0
  );

  if (withPurchases.length === 0) return [];

  // Compute M tier thresholds from actual distribution
  const spentSorted = [...withPurchases]
    .map((c) => c.total_spent ?? 0)
    .sort((a, b) => a - b);
  const n = spentSorted.length;
  const p33 = spentSorted[Math.floor(n * 0.33)] ?? 0;
  const p67 = spentSorted[Math.floor(n * 0.67)] ?? 0;

  const getMTier = (spent: number): MTier => {
    if (spent <= p33) return "LOW";
    if (spent <= p67) return "MEDIUM";
    return "HIGH";
  };

  return withPurchases.map((c) => {
    // R: days since last purchase
    const lastDate = new Date(c.last_purchase_date!);
    const daysSince = Math.max(
      0,
      Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // F: annualised purchase frequency
    const firstDate = c.first_purchase_date
      ? new Date(c.first_purchase_date)
      : lastDate;
    const daysActive = Math.max(
      1,
      (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const yearsActive = Math.max(1, daysActive / 365);
    const freqPerYear = (c.total_orders ?? 0) / yearsActive;

    // M tier
    const mTier = getMTier(c.total_spent ?? 0);

    // First matching rule wins
    let rfm_segment = "Sin Clasificar";
    for (const rule of activeRules) {
      const rMatch = daysSince >= rule.rFrom && daysSince <= rule.rTo;
      const fMatch = freqPerYear >= rule.fFrom && freqPerYear <= rule.fTo;
      const mMatch = rule.m === "ANY" || mTier === rule.m;
      if (rMatch && fMatch && mMatch) {
        rfm_segment = rule.name;
        break;
      }
    }

    return { id: c.id, rfm_segment };
  });
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
  "Campeones":            { bg: "bg-green-100",  text: "text-green-800",  badge: "bg-green-100 text-green-800"   },
  "Clientes Leales":      { bg: "bg-blue-100",   text: "text-blue-800",   badge: "bg-blue-100 text-blue-800"    },
  "Potencial de Lealtad": { bg: "bg-indigo-100", text: "text-indigo-800", badge: "bg-indigo-100 text-indigo-800" },
  "Clientes Nuevos":      { bg: "bg-cyan-100",   text: "text-cyan-800",   badge: "bg-cyan-100 text-cyan-800"    },
  "Prometedores":         { bg: "bg-teal-100",   text: "text-teal-800",   badge: "bg-teal-100 text-teal-800"    },
  "Necesitan Atención":   { bg: "bg-yellow-100", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-800" },
  "A Punto de Dormir":    { bg: "bg-orange-100", text: "text-orange-800", badge: "bg-orange-100 text-orange-800" },
  "En Riesgo":            { bg: "bg-red-100",    text: "text-red-800",    badge: "bg-red-100 text-red-800"      },
  "No Puedo Perderlos":   { bg: "bg-rose-100",   text: "text-rose-800",   badge: "bg-rose-100 text-rose-800"    },
  "Hibernando":           { bg: "bg-gray-100",   text: "text-gray-600",   badge: "bg-gray-100 text-gray-600"    },
  "Perdidos":             { bg: "bg-zinc-100",   text: "text-zinc-500",   badge: "bg-zinc-100 text-zinc-500"    },
  "Sin Clasificar":       { bg: "bg-slate-100",  text: "text-slate-500",  badge: "bg-slate-100 text-slate-500"  },
};
