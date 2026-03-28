export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, imports } from "@/db/schema";
import { sql, desc, gte } from "drizzle-orm";

export async function GET() {
  try {
    // --- KPIs ---
    const totalCustomersResult = db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .get();
    const totalCustomers = totalCustomersResult?.count ?? 0;

    const customersWithPurchasesResult = db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`customers.total_orders > 0`)
      .get();
    const customersWithPurchases = customersWithPurchasesResult?.count ?? 0;

    const revenueResult = db
      .select({
        totalRevenue: sql<number>`sum(customers.total_spent)`,
        avgTicket: sql<number>`avg(customers.average_ticket)`,
      })
      .from(customers)
      .get();

    const totalOrdersResult = db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .get();
    const totalOrders = totalOrdersResult?.count ?? 0;

    // --- Revenue by month (last 12 months) ---
    const revenueByMonth = db
      .select({
        month: sql<string>`strftime('%Y-%m', order_date)`,
        revenue: sql<number>`sum(total)`,
        orders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(sql`order_date >= date('now', '-12 months')`)
      .groupBy(sql`strftime('%Y-%m', order_date)`)
      .orderBy(sql`strftime('%Y-%m', order_date)`)
      .all();

    // --- Customers by RFM segment ---
    const rfmDistribution = db
      .select({
        segment: customers.rfm_segment,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(sql`customers.rfm_segment IS NOT NULL`)
      .groupBy(customers.rfm_segment)
      .all();

    // --- Channel distribution ---
    const channelDistribution = db
      .select({
        channel: orders.channel,
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(total)`,
      })
      .from(orders)
      .where(sql`orders.channel IS NOT NULL`)
      .groupBy(orders.channel)
      .all();

    // --- Top 10 customers by total spent ---
    const topCustomers = db
      .select()
      .from(customers)
      .where(sql`customers.total_spent > 0`)
      .orderBy(desc(customers.total_spent))
      .limit(10)
      .all();

    // --- Last 5 imports ---
    const recentImports = db
      .select()
      .from(imports)
      .orderBy(desc(imports.created_at))
      .limit(5)
      .all();

    // --- Customer growth by month ---
    const customerGrowth = db
      .select({
        month: sql<string>`strftime('%Y-%m', created_at)`,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(sql`created_at >= date('now', '-12 months')`)
      .groupBy(sql`strftime('%Y-%m', created_at)`)
      .orderBy(sql`strftime('%Y-%m', created_at)`)
      .all();

    return NextResponse.json({
      kpis: {
        totalCustomers,
        customersWithPurchases,
        customersWithoutPurchases: totalCustomers - customersWithPurchases,
        totalRevenue: revenueResult?.totalRevenue ?? 0,
        avgTicket: revenueResult?.avgTicket ?? 0,
        totalOrders,
      },
      revenueByMonth,
      rfmDistribution,
      channelDistribution,
      topCustomers,
      recentImports,
      customerGrowth,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
