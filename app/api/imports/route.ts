export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { customers, orders, order_items, imports } from "@/db/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { upsertCustomer } from "@/lib/deduplication";
import { normalizeValue } from "@/lib/column-mapper";
import { getAccountId } from "@/lib/get-account-id";
import type { NewOrder, NewCustomer } from "@/db/schema";

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
      // ── Bulk import optimizado: mínimos round-trips a la DB ──────────────────
      const now = new Date().toISOString();
      const mappedRows = rows.map((r: Record<string, unknown>) => mapRow(r, columnMapping));

      // 1. Recolectar emails únicos del lote
      const emails = [...new Set(
        mappedRows
          .map((r) => r.email ? String(r.email).toLowerCase() : null)
          .filter((e): e is string => !!e)
      )];

      // 2. Un solo SELECT para todos los clientes existentes
      const existingList = emails.length > 0
        ? await db.select().from(customers)
            .where(and(eq(customers.account_id, accountId), inArray(customers.email, emails))).all()
        : [];
      const existingByEmail = new Map(existingList.map((c) => [c.email?.toLowerCase() ?? "", c]));

      // 3. Separar clientes nuevos vs existentes (deduplicar dentro del lote)
      const toInsert = new Map<string, Partial<NewCustomer>>();
      const toUpdate: Array<{ id: number; data: Partial<NewCustomer> }> = [];

      for (const r of mappedRows) {
        const email = r.email ? String(r.email).toLowerCase() : null;
        if (!email) continue;
        const existing = existingByEmail.get(email);
        if (existing) {
          toUpdate.push({
            id: existing.id,
            data: buildCustomerData(r, fileName, now, accountId),
          });
        } else if (!toInsert.has(email)) {
          toInsert.set(email, buildCustomerData(r, fileName, now, accountId));
        }
      }

      // 4. Bulk insert de clientes nuevos (chunks de 40 para respetar límite de params)
      const customerIdByEmail = new Map<string, number>(
        existingList.map((c) => [c.email?.toLowerCase() ?? "", c.id])
      );
      merged += toUpdate.length;

      const insertChunkSize = 40;
      const insertEntries = [...toInsert.entries()];
      for (let i = 0; i < insertEntries.length; i += insertChunkSize) {
        const chunk = insertEntries.slice(i, i + insertChunkSize);
        const values = chunk.map(([, data]) => data) as NewCustomer[];
        try {
          const inserted = await db.insert(customers).values(values)
            .returning({ id: customers.id, email: customers.email }).all();
          for (const c of inserted) {
            if (c.email) customerIdByEmail.set(c.email.toLowerCase(), c.id);
          }
          imported += inserted.length;
        } catch {
          // Fallback individual si hay conflicto de unicidad
          for (const [email, data] of chunk) {
            try {
              const r = await db.insert(customers).values(data as NewCustomer)
                .returning({ id: customers.id }).get();
              if (r) { customerIdByEmail.set(email, r.id); imported++; }
            } catch { skipped++; }
          }
        }
      }

      // 5. Bulk update de clientes existentes (en paralelo, máx 10 a la vez)
      for (let i = 0; i < toUpdate.length; i += 10) {
        const chunk = toUpdate.slice(i, i + 10);
        await Promise.all(chunk.map(({ id, data }) =>
          db.update(customers).set({ ...data, updated_at: now }).where(eq(customers.id, id)).run()
        ));
      }

      // 6. Preparar e insertar órdenes + items en bulk
      type OrderRow = { customerId: number; mapped: Record<string, unknown> };
      const validOrderRows: OrderRow[] = [];
      for (const r of mappedRows) {
        const email = r.email ? String(r.email).toLowerCase() : null;
        const customerId = email ? customerIdByEmail.get(email) : undefined;
        if (!customerId) { skipped++; continue; }
        if (r.total != null || r.order_date) validOrderRows.push({ customerId, mapped: r });
      }

      const orderChunkSize = 50;
      // Map orderId por posición para vincular items
      const orderIdByIndex: number[] = [];

      for (let i = 0; i < validOrderRows.length; i += orderChunkSize) {
        const chunk = validOrderRows.slice(i, i + orderChunkSize);
        const orderValues = chunk.map(({ customerId, mapped: r }) => ({
          account_id: accountId,
          customer_id: customerId,
          order_number: r.order_number ? String(r.order_number) : null,
          order_date:   r.order_date   ? String(r.order_date)   : null,
          channel:      r.channel      ? String(r.channel)      : null,
          store_name:   r.store_name   ? String(r.store_name)   : null,
          status:       r.status       ? String(r.status)       : "completada",
          subtotal: r.subtotal ? Number(r.subtotal) : 0,
          discount: r.discount ? Number(r.discount) : 0,
          tax:      r.tax      ? Number(r.tax)      : 0,
          total:    r.total    ? Number(r.total)    : 0,
          payment_method: r.payment_method ? String(r.payment_method) : null,
          currency:   r.currency ? String(r.currency) : "ARS",
          source_file: fileName ?? "import",
          created_at: now,
        }));

        const insertedOrders = await db.insert(orders).values(orderValues)
          .returning({ id: orders.id }).all();
        for (const o of insertedOrders) orderIdByIndex.push(o.id);
      }

      // 7. Bulk insert de items
      const itemValues = validOrderRows
        .map((row, idx) => {
          const orderId = orderIdByIndex[idx];
          if (!orderId) return null;
          const r = row.mapped;
          if (!r.product_name && !r.sku) return null;
          return {
            order_id:     orderId,
            sku:          r.sku          ? String(r.sku)          : null,
            product_name: r.product_name ? String(r.product_name) : null,
            category:     r.category     ? String(r.category)     : null,
            brand:        r.brand        ? String(r.brand)        : null,
            quantity:     r.quantity     ? Number(r.quantity)     : 1,
            unit_price:   r.unit_price   ? Number(r.unit_price)   : 0,
            total_price:  r.total        ? Number(r.total)        : 0,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      for (let i = 0; i < itemValues.length; i += 50) {
        await db.insert(order_items).values(itemValues.slice(i, i + 50)).run();
      }

      // 8. Actualizar estadísticas de clientes en bulk
      //    Agrupar órdenes por customerId y computar stats en memoria
      const statsMap = new Map<number, { count: number; total: number; minDate: string; maxDate: string }>();
      for (const { customerId, mapped: r } of validOrderRows) {
        const date = r.order_date ? String(r.order_date) : "9999-99-99";
        const total = r.total ? Number(r.total) : 0;
        const prev = statsMap.get(customerId);
        if (!prev) {
          statsMap.set(customerId, { count: 1, total, minDate: date, maxDate: date });
        } else {
          prev.count++;
          prev.total += total;
          if (date < prev.minDate) prev.minDate = date;
          if (date > prev.maxDate) prev.maxDate = date;
        }
      }

      // También considerar órdenes previas que ya estaban en la DB
      const affectedCustomerIds = [...statsMap.keys()];
      for (let i = 0; i < affectedCustomerIds.length; i += 50) {
        const chunk = affectedCustomerIds.slice(i, i + 50);
        const dbStats = await db.select({
          customer_id: orders.customer_id,
          count: sql<number>`count(*)`,
          total: sql<number>`sum(total)`,
          minDate: sql<string>`min(order_date)`,
          maxDate: sql<string>`max(order_date)`,
        }).from(orders)
          .where(inArray(orders.customer_id, chunk))
          .groupBy(orders.customer_id).all();

        await Promise.all(dbStats.map((s) => {
          const totalOrders = s.count ?? 0;
          const totalSpent  = s.total ?? 0;
          return db.update(customers).set({
            total_orders: totalOrders,
            total_spent:  Math.round(totalSpent),
            average_ticket: totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0,
            first_purchase_date: s.minDate ?? null,
            last_purchase_date:  s.maxDate ?? null,
            updated_at: now,
          }).where(eq(customers.id, s.customer_id!)).run();
        }));
      }
    }

    await db.update(imports).set({
      rows_imported: imported, rows_skipped: skipped, rows_duplicates_merged: merged,
      status: "completado", error_log: errorLog,
    }).where(eq(imports.id, importId)).run();

    return NextResponse.json({ importId, imported, skipped, merged, total: rows.length, errors: errorLog.slice(0, 20) });
  } catch (error) {
    console.error("POST /api/imports error:", error);
    return NextResponse.json({ error: "Import failed: " + String(error) }, { status: 500 });
  }
}

function buildCustomerData(
  r: Record<string, unknown>,
  sourceName: string | undefined,
  now: string,
  accountId: number,
): Partial<NewCustomer> {
  return {
    account_id:  accountId,
    email:       r.email       ? String(r.email).toLowerCase() : undefined,
    first_name:  r.first_name  ? String(r.first_name)  : undefined,
    last_name:   r.last_name   ? String(r.last_name)   : undefined,
    phone:       r.phone       ? String(r.phone)       : undefined,
    gender:      r.gender      ? String(r.gender)      : undefined,
    birth_date:  r.birth_date  ? String(r.birth_date)  : undefined,
    city:        r.city        ? String(r.city)        : undefined,
    state:       r.state       ? String(r.state)       : undefined,
    country:     r.country     ? String(r.country)     : undefined,
    zip_code:    r.zip_code    ? String(r.zip_code)    : undefined,
    source:      sourceName ?? "import",
    created_at:  now,
    updated_at:  now,
  };
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
  const { calculateRFM } = await import("@/lib/rfm");
  const allCustomers = await db.select({
    id: customers.id, last_purchase_date: customers.last_purchase_date,
    total_orders: customers.total_orders, total_spent: customers.total_spent,
  }).from(customers).where(eq(customers.account_id, accountId)).all();

  const scored = calculateRFM(allCustomers);
  for (const score of scored) {
    await db.update(customers).set({
      rfm_recency_score: score.rfm_recency_score, rfm_frequency_score: score.rfm_frequency_score,
      rfm_monetary_score: score.rfm_monetary_score, rfm_total_score: score.rfm_total_score,
      rfm_segment: score.rfm_segment, updated_at: new Date().toISOString(),
    }).where(eq(customers.id, score.id)).run();
  }
}
