import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, order_items, segments } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const customer = db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .get();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get all orders for this customer
    const customerOrders = db
      .select()
      .from(orders)
      .where(eq(orders.customer_id, id))
      .orderBy(desc(orders.order_date))
      .all();

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      customerOrders.map(async (order) => {
        const items = db
          .select()
          .from(order_items)
          .where(eq(order_items.order_id, order.id))
          .all();
        return { ...order, items };
      })
    );

    // Get segments this customer belongs to (RFM + custom)
    const allSegments = db.select().from(segments).all();
    const customerSegments = allSegments.filter((seg) => {
      if (seg.is_rfm_auto && customer.rfm_segment) {
        return seg.name === customer.rfm_segment;
      }
      return false;
    });

    return NextResponse.json({
      customer,
      orders: ordersWithItems,
      segments: customerSegments,
    });
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
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = [
      "first_name", "last_name", "email", "phone", "gender",
      "birth_date", "address", "city", "state", "country",
      "zip_code", "tags", "custom_attributes",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    db.update(customers).set(updates).where(eq(customers.id, id)).run();

    const updated = db.select().from(customers).where(eq(customers.id, id)).get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/customers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
