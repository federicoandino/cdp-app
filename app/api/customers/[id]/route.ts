export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, order_items, segments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAccountId } from "@/lib/get-account-id";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = getAccountId();
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const customer = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.account_id, accountId))).get();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const customerOrders = await db.select().from(orders)
      .where(eq(orders.customer_id, id)).orderBy(desc(orders.order_date)).all();

    const ordersWithItems = await Promise.all(
      customerOrders.map(async (order) => {
        const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id)).all();
        return { ...order, items };
      })
    );

    const allSegments = await db.select().from(segments).where(eq(segments.account_id, accountId)).all();
    const customerSegments = allSegments.filter((seg) =>
      seg.is_rfm_auto && customer.rfm_segment && seg.name === customer.rfm_segment
    );

    return NextResponse.json({ customer, orders: ordersWithItems, segments: customerSegments });
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = getAccountId();
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const allowedFields = [
      "first_name", "last_name", "email", "phone", "gender",
      "birth_date", "address", "city", "state", "country", "zip_code", "tags", "custom_attributes",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }
    updates.updated_at = new Date().toISOString();

    await db.update(customers).set(updates)
      .where(and(eq(customers.id, id), eq(customers.account_id, accountId))).run();

    const updated = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.account_id, accountId))).get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/customers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
