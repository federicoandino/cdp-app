import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { customers } from "@/db/schema";
import { sql, eq, like, or, desc, asc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const search = searchParams.get("search") ?? "";
    const segment = searchParams.get("segment") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "created_at";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(customers.first_name, `%${search}%`),
          like(customers.last_name, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.phone, `%${search}%`)
        )
      );
    }

    if (segment) {
      conditions.push(eq(customers.rfm_segment, segment));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause)
      .get();

    const total = countResult?.count ?? 0;

    // Get sorted columns
    type CustomerKey = keyof typeof customers;
    const validSortColumns: Record<string, CustomerKey> = {
      first_name: "first_name",
      last_name: "last_name",
      email: "email",
      total_orders: "total_orders",
      total_spent: "total_spent",
      average_ticket: "average_ticket",
      last_purchase_date: "last_purchase_date",
      rfm_total_score: "rfm_total_score",
      rfm_segment: "rfm_segment",
      city: "city",
      created_at: "created_at",
    };

    const colKey = validSortColumns[sortBy] ?? "created_at";
    const orderFn = sortOrder === "asc" ? asc : desc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortCol = (customers as any)[colKey];

    const rows = db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(orderFn(sortCol))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
