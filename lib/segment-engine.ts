import db from "@/db";
import { customers } from "@/db/schema";
import type { SegmentFilter } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

export async function evaluateSegmentCount(filters: SegmentFilter[], accountId: number): Promise<number> {
  const accountFilter = eq(customers.account_id, accountId);

  if (!filters || filters.length === 0) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(customers).where(accountFilter).get();
    return result?.count ?? 0;
  }

  const whereClause = buildWhereClause(filters);
  if (!whereClause) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(customers).where(accountFilter).get();
    return result?.count ?? 0;
  }

  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(accountFilter, sql.raw(whereClause)))
      .get();
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getSegmentCustomerIds(filters: SegmentFilter[], accountId: number): Promise<number[]> {
  const accountFilter = eq(customers.account_id, accountId);

  if (!filters || filters.length === 0) {
    const rows = await db.select({ id: customers.id }).from(customers).where(accountFilter).all();
    return rows.map((c) => c.id);
  }

  const whereClause = buildWhereClause(filters);
  if (!whereClause) {
    const rows = await db.select({ id: customers.id }).from(customers).where(accountFilter).all();
    return rows.map((c) => c.id);
  }

  try {
    const rows = await db.select({ id: customers.id })
      .from(customers)
      .where(and(accountFilter, sql.raw(whereClause)))
      .all();
    return rows.map((c) => c.id);
  } catch {
    return [];
  }
}

export function buildWhereClause(filters: SegmentFilter[]): string | null {
  if (!filters || filters.length === 0) return null;

  const groups = new Map<number, SegmentFilter[]>();
  for (const f of filters) {
    const groupId = f.group ?? 0;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push(f);
  }

  const groupClauses: string[] = [];
  for (const [, groupFilters] of Array.from(groups)) {
    const conditions: string[] = [];
    for (const filter of groupFilters) {
      const condition = buildCondition(filter);
      if (condition) conditions.push(condition);
    }
    if (conditions.length > 0) {
      groupClauses.push(conditions.length === 1 ? conditions[0] : `(${conditions.join(" AND ")})`);
    }
  }

  if (groupClauses.length === 0) return null;
  if (groupClauses.length === 1) return groupClauses[0];
  return `(${groupClauses.join(" OR ")})`;
}

function escapeString(val: string): string {
  return val.replace(/'/g, "''");
}

function buildCondition(filter: SegmentFilter): string | null {
  const { field, operator, value } = filter;
  const col = mapFieldToColumn(field);
  if (!col) return null;

  switch (operator) {
    case "eq": return typeof value === "string" ? `${col} = '${escapeString(value)}'` : `${col} = ${value}`;
    case "neq": return typeof value === "string" ? `${col} != '${escapeString(value)}'` : `${col} != ${value}`;
    case "gt": return `${col} > ${Number(value)}`;
    case "lt": return `${col} < ${Number(value)}`;
    case "gte": return `${col} >= ${Number(value)}`;
    case "lte": return `${col} <= ${Number(value)}`;
    case "between": { const [min, max] = value as [number, number]; return `${col} BETWEEN ${Number(min)} AND ${Number(max)}`; }
    case "contains": return `${col} LIKE '%${escapeString(String(value))}%'`;
    case "not_contains": return `${col} NOT LIKE '%${escapeString(String(value))}%'`;
    case "in": { const vals = (value as unknown[]).map((v) => typeof v === "string" ? `'${escapeString(v)}'` : String(v)); return `${col} IN (${vals.join(", ")})`; }
    case "not_in": { const vals = (value as unknown[]).map((v) => typeof v === "string" ? `'${escapeString(v)}'` : String(v)); return `${col} NOT IN (${vals.join(", ")})`; }
    case "is_true": return `${col} IS NOT NULL AND ${col} != ''`;
    case "is_false": return `(${col} IS NULL OR ${col} = '')`;
    default: return null;
  }
}

function mapFieldToColumn(field: string): string | null {
  const cols: Record<string, string> = {
    email: "customers.email", phone: "customers.phone",
    first_name: "customers.first_name", last_name: "customers.last_name",
    gender: "customers.gender", birth_date: "customers.birth_date",
    city: "customers.city", state: "customers.state", country: "customers.country",
    total_orders: "customers.total_orders", total_spent: "customers.total_spent",
    average_ticket: "customers.average_ticket",
    last_purchase_date: "customers.last_purchase_date", first_purchase_date: "customers.first_purchase_date",
    rfm_recency_score: "customers.rfm_recency_score", rfm_frequency_score: "customers.rfm_frequency_score",
    rfm_monetary_score: "customers.rfm_monetary_score", rfm_total_score: "customers.rfm_total_score",
    rfm_segment: "customers.rfm_segment", source: "customers.source", created_at: "customers.created_at",
  };
  return cols[field] ?? null;
}

export const RFM_SEGMENT_FILTERS: Record<string, SegmentFilter[]> = {
  "Campeones":             [{ id: "r", field: "rfm_segment", operator: "eq", value: "Campeones" }],
  "Clientes Fieles":       [{ id: "r", field: "rfm_segment", operator: "eq", value: "Clientes Fieles" }],
  "Potenciales Fieles":    [{ id: "r", field: "rfm_segment", operator: "eq", value: "Potenciales Fieles" }],
  "Nuevos Clientes":       [{ id: "r", field: "rfm_segment", operator: "eq", value: "Nuevos Clientes" }],
  "Clientes Prometedores": [{ id: "r", field: "rfm_segment", operator: "eq", value: "Clientes Prometedores" }],
  "Requieren Atención":    [{ id: "r", field: "rfm_segment", operator: "eq", value: "Requieren Atención" }],
  "A Punto de Inactivarse":[{ id: "r", field: "rfm_segment", operator: "eq", value: "A Punto de Inactivarse" }],
  "En Riesgo de Perderse": [{ id: "r", field: "rfm_segment", operator: "eq", value: "En Riesgo de Perderse" }],
  "No Puedes Perderlos":   [{ id: "r", field: "rfm_segment", operator: "eq", value: "No Puedes Perderlos" }],
  "Hibernando":            [{ id: "r", field: "rfm_segment", operator: "eq", value: "Hibernando" }],
};
