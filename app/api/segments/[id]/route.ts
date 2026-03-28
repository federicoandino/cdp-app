export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { segments, customers } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { evaluateSegmentCount, getSegmentCustomerIds } from "@/lib/segment-engine";
import { getAccountId } from "@/lib/get-account-id";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = getAccountId();
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const segment = await db.select().from(segments)
      .where(and(eq(segments.id, id), eq(segments.account_id, accountId))).get();
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const includeCustomers = searchParams.get("customers") === "true";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    if (includeCustomers) {
      const allIds = await getSegmentCustomerIds(segment.filters ?? [], accountId);
      const total = allIds.length;
      const slicedIds = allIds.slice((page - 1) * limit, page * limit);
      const customerRows = slicedIds.length > 0
        ? await db.select().from(customers).where(inArray(customers.id, slicedIds)).all()
        : [];
      return NextResponse.json({ segment, customers: customerRows, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    return NextResponse.json({ segment });
  } catch (error) {
    console.error("GET /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = getAccountId();
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, description, filters } = body;
    const count = await evaluateSegmentCount(filters ?? [], accountId);

    await db.update(segments).set({
      name, description, filters: filters ?? [],
      customer_count: count, updated_at: new Date().toISOString(),
    }).where(and(eq(segments.id, id), eq(segments.account_id, accountId))).run();

    const updated = await db.select().from(segments)
      .where(and(eq(segments.id, id), eq(segments.account_id, accountId))).get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = getAccountId();
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const segment = await db.select().from(segments)
      .where(and(eq(segments.id, id), eq(segments.account_id, accountId))).get();
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (segment.is_rfm_auto) return NextResponse.json({ error: "No se pueden eliminar segmentos RFM automáticos" }, { status: 400 });

    await db.delete(segments).where(and(eq(segments.id, id), eq(segments.account_id, accountId))).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
