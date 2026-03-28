export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { segments, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { evaluateSegmentCount } from "@/lib/segment-engine";
import { getAccountId } from "@/lib/get-account-id";

export async function GET() {
  try {
    const accountId = getAccountId();
    const allSegments = await db.select().from(segments)
      .where(eq(segments.account_id, accountId)).orderBy(segments.created_at).all();

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(customers).where(eq(customers.account_id, accountId)).get();
    const totalCustomers = totalResult?.count ?? 1;

    const enriched = allSegments.map((seg) => ({
      ...seg,
      percentage: totalCustomers > 0 ? ((seg.customer_count ?? 0) / totalCustomers) * 100 : 0,
    }));

    return NextResponse.json({ data: enriched, total: totalCustomers });
  } catch (error) {
    console.error("GET /api/segments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId();
    const body = await request.json();
    const { name, description, filters } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const count = await evaluateSegmentCount(filters ?? [], accountId);

    const result = await db.insert(segments).values({
      account_id: accountId,
      name,
      description: description ?? null,
      filters: filters ?? [],
      customer_count: count,
      is_rfm_auto: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).run();

    const created = await db.select().from(segments)
      .where(eq(segments.id, Number(result.lastInsertRowid))).get();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/segments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
