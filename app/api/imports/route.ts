export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, order_items, imports } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { upsertCustomer } from "@/lib/deduplication";
import { normalizeValue } from "@/lib/column-mapper";
import { getAccountId } from "@/lib/get-account-id";
import type { NewOrder } from "@/db/schema";

export async function GET() {
  try {
    const accountId = getAccountId();
    const allImports = await db.select().from(imports)
      .where(eq(imports.account_id, accountId))
      .orderBy(sql`created_at DESC`).limit(50).all();
    return NextResponse.json({ data: allImports });
  } catch (error) {
    console.error("GET /api/imports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId();
    const body = await request.json();
    const { importType, fileName, fileType, rows, columnMapping } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const importResult = await db.insert(imports).values({
      account_id: accountId,
      file_name: fileName ?? "unknown",
      file_type: fileType ?? "csv",
      import_type: importType,
      rows_total: rows.length,
      rows_imported: 0,
      rows_skipped: 0,
      rows_duplicates_merged: 0,
      status: "procesando",
      error_log: [],
      created_at: new Date().toISOString(),
    }).run();

    const importId = Number(importResult.lastInsertRowid);
    let imported = 0, skipped = 0, merged = 0;
    const errorLog: string[] = [];

    if (importType === "customers") {
      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRow(rows[i], columnMapping);
          const result = await upsertCustomer(mapped, fileName ?? "import", accountId);
          if (result.action === "created") imported++;
          else if (result.action === "updated") merged++;
          else { skipped++; if (result.reason) errorLog.push(`Fila ${i + 2}: ${result.reason}`); }
        } catch (err) { skipped++; errorLog.push(`Fila ${i + 2}: ${String(err)}`); }
      }
    } else if (importType === "orders") {
      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRow(rows[i], columnMapping);
          let customerId: number | null = null;

          if (mapped.customer_email) {
            const c = await db.select({ id: customers.id }).from(customers)
              .where(eq(customers.email, String(mapped.customer_email).toLowerCase())).get();
            customerId = c?.id ?? null;
          }
          if (!customerId && mapped.customer_external_id) {
            const c = await db.select({ id: customers.id }).from(customers)
              .where(eq(customers.external_id, String(mapped.customer_external_id))).get();
            customerId = c?.id ?? null;
          }
          if (!customerId && mapped.customer_email) {
            const newC = await db.insert(customers).values({
              account_id: accountId,
              email: String(mapped.customer_email).toLowerCase(),
              source: fileName ?? "import",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).run();
            customerId = Number(newC.lastInsertRowid);
          }
          if (!customerId) { skipped++; errorLog.push(`Fila ${i + 2}: No se encontró cliente para vincular`); continue; }

          const orderData: Partial<NewOrder> = {
            account_id: accountId,
            customer_id: customerId,
            order_number: mapped.order_number ? String(mapped.order_number) : null,
            order_date: mapped.order_date ? String(mapped.order_date) : null,
            channel: mapped.channel ? String(mapped.channel) : null,
            store_name: mapped.store_name ? String(mapped.store_name) : null,
            status: mapped.status ? String(mapped.status) : "completada",
            subtotal: mapped.subtotal ? Number(mapped.subtotal) : 0,
            discount: mapped.discount ? Number(mapped.discount) : 0,
            tax: mapped.tax ? Number(mapped.tax) : 0,
            total: mapped.total ? Number(mapped.total) : 0,
            payment_method: mapped.payment_method ? String(mapped.payment_method) : null,
            currency: mapped.currency ? String(mapped.currency) : "ARS",
            source_file: fileName ?? "import",
            created_at: new Date().toISOString(),
          };

          const orderResult = await db.insert(orders).values(orderData).run();
          const orderId = Number(orderResult.lastInsertRowid);

          if (mapped.product_name || mapped.sku) {
            await db.insert(order_items).values({
              order_id: orderId,
              sku: mapped.sku ? String(mapped.sku) : null,
              product_name: mapped.product_name ? String(mapped.product_name) : null,
              category: mapped.category ? String(mapped.category) : null,
              brand: mapped.brand ? String(mapped.brand) : null,
              quantity: mapped.quantity ? Number(mapped.quantity) : 1,
              unit_price: mapped.unit_price ? Number(mapped.unit_price) : 0,
              total_price: mapped.total ? Number(mapped.total) : 0,
            }).run();
          }

          const stats = await db.select({
            count: sql<number>`count(*)`, total: sql<number>`sum(total)`,
            minDate: sql<string>`min(order_date)`, maxDate: sql<string>`max(order_date)`,
          }).from(orders).where(eq(orders.customer_id, customerId)).get();

          if (stats) {
            const totalOrders = stats.count ?? 0;
            const totalSpent = stats.total ?? 0;
            await db.update(customers).set({
              total_orders: totalOrders, total_spent: totalSpent,
              average_ticket: totalOrders > 0 ? totalSpent / totalOrders : 0,
              first_purchase_date: stats.minDate ?? null, last_purchase_date: stats.maxDate ?? null,
              updated_at: new Date().toISOString(),
            }).where(eq(customers.id, customerId)).run();
          }
          imported++;
        } catch (err) { skipped++; errorLog.push(`Fila ${i + 2}: ${String(err)}`); }
      }
    } else if (importType === "combined") {
      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRow(rows[i], columnMapping);
          const custResult = await upsertCustomer(mapped, fileName ?? "import", accountId);
          if (custResult.action === "updated") merged++;
          const customerId = custResult.customerId;
          if (!customerId) { skipped++; errorLog.push(`Fila ${i + 2}: Sin email ni ID — no se puede identificar al cliente`); continue; }

          if (mapped.total != null || mapped.order_date) {
            const orderResult = await db.insert(orders).values({
              account_id: accountId,
              customer_id: customerId,
              order_number: mapped.order_number ? String(mapped.order_number) : null,
              order_date: mapped.order_date ? String(mapped.order_date) : null,
              channel: mapped.channel ? String(mapped.channel) : null,
              store_name: mapped.store_name ? String(mapped.store_name) : null,
              status: mapped.status ? String(mapped.status) : "completada",
              subtotal: mapped.subtotal ? Number(mapped.subtotal) : 0,
              discount: mapped.discount ? Number(mapped.discount) : 0,
              tax: mapped.tax ? Number(mapped.tax) : 0,
              total: mapped.total ? Number(mapped.total) : 0,
              payment_method: mapped.payment_method ? String(mapped.payment_method) : null,
              currency: mapped.currency ? String(mapped.currency) : "ARS",
              source_file: fileName ?? "import",
              created_at: new Date().toISOString(),
            }).run();

            const orderId = Number(orderResult.lastInsertRowid);
            if (mapped.product_name || mapped.sku) {
              await db.insert(order_items).values({
                order_id: orderId,
                sku: mapped.sku ? String(mapped.sku) : null,
                product_name: mapped.product_name ? String(mapped.product_name) : null,
                category: mapped.category ? String(mapped.category) : null,
                brand: mapped.brand ? String(mapped.brand) : null,
                quantity: mapped.quantity ? Number(mapped.quantity) : 1,
                unit_price: mapped.unit_price ? Number(mapped.unit_price) : 0,
                total_price: mapped.total ? Number(mapped.total) : 0,
              }).run();
            }

            const stats = await db.select({
              count: sql<number>`count(*)`, total: sql<number>`sum(total)`,
              minDate: sql<string>`min(order_date)`, maxDate: sql<string>`max(order_date)`,
            }).from(orders).where(eq(orders.customer_id, customerId)).get();

            if (stats) {
              const totalOrders = stats.count ?? 0;
              const totalSpent = stats.total ?? 0;
              await db.update(customers).set({
                total_orders: totalOrders, total_spent: totalSpent,
                average_ticket: totalOrders > 0 ? totalSpent / totalOrders : 0,
                first_purchase_date: stats.minDate ?? null, last_purchase_date: stats.maxDate ?? null,
                updated_at: new Date().toISOString(),
              }).where(eq(customers.id, customerId)).run();
            }
          }
          if (custResult.action === "created") imported++;
        } catch (err) { skipped++; errorLog.push(`Fila ${i + 2}: ${String(err)}`); }
      }
    }

    await db.update(imports).set({
      rows_imported: imported, rows_skipped: skipped, rows_duplicates_merged: merged,
      status: "completado", error_log: errorLog,
    }).where(eq(imports.id, importId)).run();

    if ((importType === "orders" || importType === "combined") && imported > 0) {
      try { await triggerRFMRecalculation(accountId); } catch (e) { console.error("RFM recalc failed:", e); }
    }

    return NextResponse.json({ importId, imported, skipped, merged, total: rows.length, errors: errorLog.slice(0, 20) });
  } catch (error) {
    console.error("POST /api/imports error:", error);
    return NextResponse.json({ error: "Import failed: " + String(error) }, { status: 500 });
  }
}

function mapRow(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [csvCol, systemField] of Object.entries(mapping)) {
    if (systemField && systemField !== "__skip__") {
      result[systemField] = normalizeValue(row[csvCol], systemField);
    }
  }
  return result;
}

async function triggerRFMRecalculation(accountId: number) {
  const { classifyCustomers } = await import("@/lib/rfm");
  const allCustomers = await db.select({
    id: customers.id,
    last_purchase_date: customers.last_purchase_date,
    first_purchase_date: customers.first_purchase_date,
    total_orders: customers.total_orders,
    total_spent: customers.total_spent,
  }).from(customers).where(eq(customers.account_id, accountId)).all();

  const classified = classifyCustomers(allCustomers);
  for (const result of classified) {
    await db.update(customers).set({
      rfm_segment: result.rfm_segment,
      rfm_recency_score: null,
      rfm_frequency_score: null,
      rfm_monetary_score: null,
      rfm_total_score: null,
      updated_at: new Date().toISOString(),
    }).where(eq(customers.id, result.id)).run();
  }
}
