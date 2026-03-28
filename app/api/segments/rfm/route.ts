export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/db";
import { customers, segments } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { classifyCustomers, RFM_SEGMENTS } from "@/lib/rfm";
import { DEFAULT_SEGMENT_RULES, type SegmentRule } from "@/lib/rfm-config";
import { getAccountId } from "@/lib/get-account-id";

function loadConfig(): SegmentRule[] {
  try {
    const p = path.join(process.cwd(), "rfm-config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return DEFAULT_SEGMENT_RULES;
}

export async function POST() {
  try {
    const accountId = getAccountId();

    const allCustomers = await db.select({
      id: customers.id,
      last_purchase_date: customers.last_purchase_date,
      first_purchase_date: customers.first_purchase_date,
      total_orders: customers.total_orders,
      total_spent: customers.total_spent,
    }).from(customers).where(eq(customers.account_id, accountId)).all();

    if (allCustomers.length === 0) {
      return NextResponse.json({ message: "No hay clientes para calcular RFM", updated: 0 });
    }

    const config = loadConfig();
    const classified = classifyCustomers(allCustomers, config);

    for (const result of classified) {
      await db.update(customers).set({
        rfm_segment: result.rfm_segment,
        rfm_recency_score: null,
        rfm_frequency_score: null,
        rfm_monetary_score: null,
        rfm_total_score: null,
        updated_at: new Date().toISOString(),
      }).where(and(eq(customers.id, result.id), eq(customers.account_id, accountId))).run();
    }

    for (const segmentName of RFM_SEGMENTS) {
      if (segmentName === "Sin Clasificar") continue;

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(eq(customers.account_id, accountId), eq(customers.rfm_segment, segmentName)))
        .get();
      const count = countResult?.count ?? 0;

      const existing = await db.select().from(segments)
        .where(and(eq(segments.account_id, accountId), eq(segments.name, segmentName))).get();

      if (existing) {
        await db.update(segments).set({
          customer_count: count, updated_at: new Date().toISOString(),
        }).where(eq(segments.id, existing.id)).run();
      } else {
        await db.insert(segments).values({
          account_id: accountId,
          name: segmentName,
          description: `Segmento RFM automático: ${segmentName}`,
          filters: [{ id: "rfm", field: "rfm_segment", operator: "eq", value: segmentName }],
          customer_count: count,
          is_rfm_auto: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).run();
      }
    }

    return NextResponse.json({
      message: "RFM recalculado exitosamente",
      updated: classified.length,
      total: allCustomers.length,
    });
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

    return NextResponse.json({ segments: rfmSegments, matrix: [] });
  } catch (error) {
    console.error("GET /api/segments/rfm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
