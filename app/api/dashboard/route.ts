export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, imports } from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getAccountId } from "@/lib/get-account-id";

export async function GET() {
  try {
    const accountId = getAccountId();

    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers).where(eq(customers.account_id, accountId)).get();
    const totalCustomers = totalCustomersResult?.count ?? 0;

    const customersWithPurchasesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`customers.account_id = ${accountId} AND customers.total_orders > 0`)
      .get();
    const customersWithPurchases = customersWithPurchasesResult?.count ?? 0;

    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`sum(customers.total_spent)`,
        avgTicket: sql<number>`avg(customers.average_ticket)`,
      })
      .from(customers).where(eq(customers.account_id, accountId)).get();

    const totalOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders).where(eq(orders.account_id, accountId)).get();
    const totalOrders = totalOrdersResult?.count ?? 0;

    const revenueByMonth = await db
      .select({
        month: sql<string>`strftime('%Y-%m', order_date)`,
        revenue: sql<number>`sum(total)`,
        orders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(sql`orders.account_id = ${accountId} AND order_date IS NOT NULL`)
      .groupBy(sql`strftime('%Y-%m', order_date)`)
      .orderBy(sql`strftime('%Y-%m', order_date) DESC`)
      .limit(12).all()
      .then((rows) => rows.reverse());

    const rfmDistribution = await db
      .select({ segment: customers.rfm_segment, count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`customers.account_id = ${accountId} AND customers.rfm_segment IS NOT NULL`)
      .groupBy(customers.rfm_segment).all();

    const channelDistribution = await db
      .select({
        channel: orders.channel,
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(total)`,
      })
      .from(orders)
      .where(sql`orders.account_id = ${accountId} AND orders.channel IS NOT NULL`)
      .groupBy(orders.channel).all();

    const topCustomers = await db.select().from(customers)
      .where(sql`customers.account_id = ${accountId} AND customers.total_spent > 0`)
      .orderBy(desc(customers.total_spent)).limit(10).all();

    const recentImports = await db.select().from(imports)
      .where(eq(imports.account_id, accountId))
      .orderBy(desc(imports.created_at)).limit(5).all();

    const customerGrowth = await db
      .select({
        month: sql<string>`strftime('%Y-%m', created_at)`,
        count: sql<number>`count(*)`,
      })
      .from(customers)
      .where(sql`customers.account_id = ${accountId} AND created_at IS NOT NULL`)
      .groupBy(sql`strftime('%Y-%m', created_at)`)
      .orderBy(sql`strftime('%Y-%m', created_at) DESC`)
      .limit(12).all()
      .then((rows) => rows.reverse());

    return NextResponse.json({
      kpis: {
        totalCustomers, customersWithPurchases,
        customersWithoutPurchases: totalCustomers - customersWithPurchases,
        totalRevenue: revenueResult?.totalRevenue ?? 0,
        avgTicket: revenueResult?.avgTicket ?? 0,
        totalOrders,
      },
      revenueByMonth, rfmDistribution, channelDistribution,
      topCustomers, recentImports, customerGrowth,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
