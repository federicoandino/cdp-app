import { NextResponse } from "next/server";
import db from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const rows = db.all(sql`
      WITH ranked AS (
        SELECT
          customer_id,
          order_date,
          ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date ASC) AS rn
        FROM orders
        WHERE status != 'cancelada' AND status != 'devuelta'
      ),
      pairs AS (
        SELECT
          CAST(julianday(b.order_date) - julianday(a.order_date) AS INTEGER) AS days
        FROM ranked a
        JOIN ranked b ON a.customer_id = b.customer_id AND b.rn = 2
        WHERE a.rn = 1
      )
      SELECT
        days,
        COUNT(*) AS count
      FROM pairs
      WHERE days >= 0
      GROUP BY days
      ORDER BY days ASC
    `) as { days: number; count: number }[];

    const total = rows.reduce((sum, r) => sum + r.count, 0);

    let cumulative = 0;
    const data = rows.map((r) => {
      cumulative += r.count;
      return {
        day: r.days,
        count: r.count,
        cumulative,
        cumulative_pct: total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0,
      };
    });

    // Key milestone: first day where cumulative_pct >= threshold
    const milestones = [50, 70, 80, 90].map((pct) => {
      const point = data.find((d) => d.cumulative_pct >= pct);
      return { pct, day: point?.day ?? null };
    });

    // Median day
    const medianPoint = data.find((d) => d.cumulative_pct >= 50);

    return NextResponse.json({ data, total, milestones, median: medianPoint?.day ?? null });
  } catch (err) {
    console.error("Error en análisis de recompra:", err);
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}
