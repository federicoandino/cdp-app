import db from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { NewCustomer } from "@/db/schema";

export type DeduplicationResult = {
  action: "created" | "updated" | "skipped";
  customerId?: number;
  reason?: string;
};

export type IncomingCustomer = Partial<NewCustomer> & {
  email?: string | null;
  external_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

type Customer = typeof customers.$inferSelect;

export async function findExistingCustomer(incoming: IncomingCustomer, accountId: number): Promise<Customer | null> {
  if (incoming.email) {
    const byEmail = await db.select().from(customers)
      .where(and(eq(customers.account_id, accountId), eq(customers.email, incoming.email.toLowerCase()))).get();
    if (byEmail) return byEmail;
  }

  if (incoming.external_id) {
    const byExtId = await db.select().from(customers)
      .where(and(eq(customers.account_id, accountId), eq(customers.external_id, incoming.external_id))).get();
    if (byExtId) return byExtId;
  }

  if (incoming.first_name && incoming.phone) {
    const normalizedPhone = normalizePhone(incoming.phone);
    const byName = await db.select().from(customers)
      .where(and(eq(customers.account_id, accountId), eq(customers.first_name, incoming.first_name))).all();
    const match = byName.find((c) => c.phone && normalizePhone(c.phone) === normalizedPhone);
    if (match) return match;
  }

  return null;
}

export function mergeCustomer(existing: Customer, incoming: IncomingCustomer): Partial<NewCustomer> {
  const merged: Partial<NewCustomer> = {};
  const fields: (keyof IncomingCustomer)[] = [
    "external_id", "email", "phone", "first_name", "last_name",
    "gender", "birth_date", "address", "city", "state",
    "country", "zip_code", "tags", "custom_attributes", "source",
  ];
  for (const field of fields) {
    const incomingVal = incoming[field];
    const existingVal = existing[field as keyof typeof existing];
    if (incomingVal !== null && incomingVal !== undefined && incomingVal !== "") {
      (merged as Record<string, unknown>)[field] = incomingVal;
    } else if (existingVal !== null && existingVal !== undefined) {
      (merged as Record<string, unknown>)[field] = existingVal;
    }
  }
  return merged;
}

export async function upsertCustomer(incoming: IncomingCustomer, sourceName: string, accountId: number): Promise<DeduplicationResult> {
  const existing = await findExistingCustomer(incoming, accountId);

  if (existing) {
    const merged = mergeCustomer(existing, incoming);
    await db.update(customers).set({ ...merged, updated_at: new Date().toISOString() })
      .where(eq(customers.id, existing.id)).run();
    return { action: "updated", customerId: existing.id };
  }

  if (!incoming.email && !incoming.external_id) {
    return { action: "skipped", reason: "No email ni ID externo — no se puede crear cliente sin identificador" };
  }

  const result = await db.insert(customers).values({
    account_id: accountId,
    email: incoming.email ?? undefined,
    external_id: incoming.external_id ?? undefined,
    first_name: incoming.first_name ?? undefined,
    last_name: incoming.last_name ?? undefined,
    phone: incoming.phone ?? undefined,
    gender: incoming.gender ?? undefined,
    birth_date: incoming.birth_date ?? undefined,
    address: incoming.address ?? undefined,
    city: incoming.city ?? undefined,
    state: incoming.state ?? undefined,
    country: incoming.country ?? undefined,
    zip_code: incoming.zip_code ?? undefined,
    tags: (incoming.tags as string[]) ?? [],
    custom_attributes: (incoming.custom_attributes as Record<string, unknown>) ?? {},
    source: sourceName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).run();

  return { action: "created", customerId: Number(result.lastInsertRowid) };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, "");
}
