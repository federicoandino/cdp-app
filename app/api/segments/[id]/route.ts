import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { segments, customers } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { evaluateSegmentCount, getSegmentCustomerIds } from "@/lib/segment-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const segment = db.select().from(segments).where(eq(segments.id, id)).get();
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const includeCustomers = searchParams.get("customers") === "true";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    if (includeCustomers) {
      const allIds = getSegmentCustomerIds(segment.filters ?? []);
      const total = allIds.length;
      const slicedIds = allIds.slice((page - 1) * limit, page * limit);

      const customerRows =
        slicedIds.length > 0
          ? db.select().from(customers).where(inArray(customers.id, slicedIds)).all()
          : [];

      return NextResponse.json({
        segment,
        customers: customerRows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    return NextResponse.json({ segment });
  } catch (error) {
    console.error("GET /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, description, filters } = body;

    const count = evaluateSegmentCount(filters ?? []);

    db.update(segments)
      .set({
        name,
        description,
        filters: filters ?? [],
        customer_count: count,
        updated_at: new Date().toISOString(),
      })
      .where(eq(segments.id, id))
      .run();

    const updated = db.select().from(segments).where(eq(segments.id, id)).get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const segment = db.select().from(segments).where(eq(segments.id, id)).get();
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (segment.is_rfm_auto) {
      return NextResponse.json({ error: "No se pueden eliminar segmentos RFM automáticos" }, { status: 400 });
    }

    db.delete(segments).where(eq(segments.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/segments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
