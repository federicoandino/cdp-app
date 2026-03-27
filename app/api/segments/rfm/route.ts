import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/db";
import { customers, segments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateRFM, RFM_SEGMENTS } from "@/lib/rfm";
import { DEFAULT_THRESHOLDS, type SegmentThreshold } from "@/lib/rfm-config";

function loadConfig(): SegmentThreshold[] {
  try {
    const p = path.join(process.cwd(), "rfm-config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return DEFAULT_THRESHOLDS;
}

export async function POST() {
  try {
    // Get all customers with purchase data
    const allCustomers = db
      .select({
        id: customers.id,
        last_purchase_date: customers.last_purchase_date,
        total_orders: customers.total_orders,
        total_spent: customers.total_spent,
      })
      .from(customers)
      .all();

    if (allCustomers.length === 0) {
      return NextResponse.json({ message: "No hay clientes para calcular RFM", updated: 0 });
    }

    // Calculate RFM scores using saved config (or defaults)
    const config = loadConfig();
    const scored = calculateRFM(allCustomers, config);

    // Update customers in a transaction
    db.transaction(() => {
      for (const score of scored) {
        db.update(customers)
          .set({
            rfm_recency_score: score.rfm_recency_score,
            rfm_frequency_score: score.rfm_frequency_score,
            rfm_monetary_score: score.rfm_monetary_score,
            rfm_total_score: score.rfm_total_score,
            rfm_segment: score.rfm_segment,
            updated_at: new Date().toISOString(),
          })
          .where(eq(customers.id, score.id))
          .run();
      }
    });

    // Update/create RFM auto segments
    for (const segmentName of RFM_SEGMENTS) {
      if (segmentName === "Sin Clasificar") continue;

      // Count customers in this segment
      const countResult = db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq(customers.rfm_segment, segmentName))
        .get();
      const count = countResult?.count ?? 0;

      // Check if segment exists
      const existing = db
        .select()
        .from(segments)
        .where(eq(segments.name, segmentName))
        .get();

      if (existing) {
        db.update(segments)
          .set({
            customer_count: count,
            updated_at: new Date().toISOString(),
          })
          .where(eq(segments.id, existing.id))
          .run();
      } else {
        db.insert(segments)
          .values({
            name: segmentName,
            description: `Segmento RFM automático: ${segmentName}`,
            filters: [{ id: "rfm", field: "rfm_segment", operator: "eq", value: segmentName }],
            customer_count: count,
            is_rfm_auto: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .run();
      }
    }

    return NextResponse.json({
      message: "RFM recalculado exitosamente",
      updated: scored.length,
      total: allCustomers.length,
    });
  } catch (error) {
    console.error("POST /api/segments/rfm error:", error);
    return NextResponse.json({ error: "Error al calcular RFM" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get RFM summary stats
    const rfmSegments = db
      .select({
        segment: customers.rfm_segment,
        count: sql<number>`count(*)`,
        avg_ticket: sql<number>`avg(customers.average_ticket)`,
        total_revenue: sql<number>`sum(customers.total_spent)`,
      })
      .from(customers)
      .groupBy(customers.rfm_segment)
      .all();

    // Get RFM matrix data (recency vs frequency)
    const matrixData = db
      .select({
        recency: customers.rfm_recency_score,
        frequency: customers.rfm_frequency_score,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(sql`customers.rfm_recency_score IS NOT NULL`)
      .groupBy(customers.rfm_recency_score, customers.rfm_frequency_score)
      .all();

    return NextResponse.json({ segments: rfmSegments, matrix: matrixData });
  } catch (error) {
    console.error("GET /api/segments/rfm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
