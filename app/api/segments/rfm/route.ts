export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import db, { client } from "@/db";
import { customers, segments } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { calculateRFM, RFM_SEGMENTS } from "@/lib/rfm";
import { DEFAULT_THRESHOLDS, type SegmentThreshold } from "@/lib/rfm-config";
import { getAccountId } from "@/lib/get-account-id";

function loadConfig(): SegmentThreshold[] {
  try {
    // rfm-config.json solo existe en local; en Vercel usa defaults
    const { existsSync, readFileSync } = require("fs");
    const { join } = require("path");
    const p = join(process.cwd(), "rfm-config.json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  } catch {}
  return DEFAULT_THRESHOLDS;
}

export async function POST() {
  try {
    const accountId = getAccountId();
    const now = new Date().toISOString();

    const allCustomers = await db.select({
      id: customers.id,
      last_purchase_date: customers.last_purchase_date,
      total_orders: customers.total_orders,
      total_spent: customers.total_spent,
    }).from(customers).where(eq(customers.account_id, accountId)).all();

    if (allCustomers.length === 0) {
      return NextResponse.json({ message: "No hay clientes para calcular RFM", updated: 0 });
    }

    const config = loadConfig();
    const scored = calculateRFM(allCustomers, config);

    // ── Bulk update RFM scores: todos los clientes en un solo round-trip ──────
    const BATCH = 500;
    for (let i = 0; i < scored.length; i += BATCH) {
      const chunk = scored.slice(i, i + BATCH);
      await client.batch(
        chunk.map((s) => ({
          sql: `UPDATE customers SET rfm_recency_score=?, rfm_frequency_score=?, rfm_monetary_score=?, rfm_total_score=?, rfm_segment=?, updated_at=? WHERE id=? AND account_id=?`,
          args: [s.rfm_recency_score, s.rfm_frequency_score, s.rfm_monetary_score, s.rfm_total_score, s.rfm_segment ?? null, now, s.id, accountId],
        })),
        "write"
      );
    }

    // ── Actualizar contadores de segmentos en bulk ────────────────────────────
    const segmentCounts = await db.select({
      segment: customers.rfm_segment,
      count: sql<number>`count(*)`,
    }).from(customers)
      .where(and(eq(customers.account_id, accountId), sql`rfm_segment IS NOT NULL`))
      .groupBy(customers.rfm_segment).all();

    const countMap = new Map(segmentCounts.map((r) => [r.segment, r.count]));

    const existingSegs = await db.select().from(segments)
      .where(and(eq(segments.account_id, accountId), eq(segments.is_rfm_auto, true))).all();
    const existingByName = new Map(existingSegs.map((s) => [s.name, s]));

    const segUpserts = RFM_SEGMENTS.filter((name) => name !== "Sin Clasificar").map((name) => {
      const count = countMap.get(name) ?? 0;
      const existing = existingByName.get(name);
      if (existing) {
        return {
          sql: `UPDATE segments SET customer_count=?, updated_at=? WHERE id=?`,
          args: [count, now, existing.id],
        };
      } else {
        const desc = config.find((r) => r.name === name)?.description ?? `Segmento RFM: ${name}`;
        const filters = JSON.stringify([{ id: "rfm", field: "rfm_segment", operator: "eq", value: name }]);
        return {
          sql: `INSERT INTO segments (account_id, name, description, filters, customer_count, is_rfm_auto, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)`,
          args: [accountId, name, desc, filters, count, now, now],
        };
      }
    });

    if (segUpserts.length > 0) await client.batch(segUpserts, "write");

    return NextResponse.json({ message: "RFM recalculado exitosamente", updated: scored.length, total: allCustomers.length });
  } catch (error) {
    console.error("POST /api/segments/rfm error:", error);
    return NextResponse.json({ error: "Error al calcular RFM" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const accountId = getAccountId();

    const rfmSegments = await db.select({
      segment: customers.rfm_segment,
      count: sql<number>`count(*)`,
      avg_ticket: sql<number>`avg(customers.average_ticket)`,
      total_revenue: sql<number>`sum(customers.total_spent)`,
    }).from(customers).where(eq(customers.account_id, accountId)).groupBy(customers.rfm_segment).all();

    const matrixData = await db.select({
      recency: customers.rfm_recency_score,
      frequency: customers.rfm_frequency_score,
      count: sql<number>`count(*)`,
    }).from(customers)
      .where(sql`customers.account_id = ${accountId} AND customers.rfm_recency_score IS NOT NULL`)
      .groupBy(customers.rfm_recency_score, customers.rfm_frequency_score).all();

    return NextResponse.json({ segments: rfmSegments, matrix: matrixData });
  } catch (error) {
    console.error("GET /api/segments/rfm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
