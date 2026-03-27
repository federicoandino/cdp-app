/**
 * Customer deduplication and merge logic.
 * Runs inside a DB transaction during import.
 */

import db from "@/db";
import { customers } from "@/db/schema";
import { eq, or } from "drizzle-orm";
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

/**
 * Find an existing customer by priority:
 * 1. Email match
 * 2. External ID match
 * 3. Name + phone match
 */
export function findExistingCustomer(incoming: IncomingCustomer) {
  // Priority 1: email
  if (incoming.email) {
    const byEmail = db
      .select()
      .from(customers)
      .where(eq(customers.email, incoming.email.toLowerCase()))
      .get();
    if (byEmail) return byEmail;
  }

  // Priority 2: external_id
  if (incoming.external_id) {
    const byExtId = db
      .select()
      .from(customers)
      .where(eq(customers.external_id, incoming.external_id))
      .get();
    if (byExtId) return byExtId;
  }

  // Priority 3: first_name + phone (fuzzy enough for MVP)
  if (incoming.first_name && incoming.phone) {
    const normalizedPhone = normalizePhone(incoming.phone);
    const byNamePhone = db
      .select()
      .from(customers)
      .where(eq(customers.first_name, incoming.first_name))
      .all()
      .find((c) => c.phone && normalizePhone(c.phone) === normalizedPhone);
    if (byNamePhone) return byNamePhone;
  }

  return null;
}

/**
 * Merge incoming data into existing customer.
 * Rule: non-null incoming values overwrite existing values.
 * Existing non-null values are kept if incoming is null.
 */
export function mergeCustomer(
  existing: NonNullable<ReturnType<typeof findExistingCustomer>>,
  incoming: IncomingCustomer
): Partial<NewCustomer> {
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

/**
 * Upsert a customer: find existing → merge → update, or create new.
 */
export function upsertCustomer(incoming: IncomingCustomer, sourceName: string): DeduplicationResult {
  const existing = findExistingCustomer(incoming);

  if (existing) {
    const merged = mergeCustomer(existing, incoming);
    db.update(customers)
      .set({
        ...merged,
        updated_at: new Date().toISOString(),
      })
      .where(eq(customers.id, existing.id))
      .run();

    return { action: "updated", customerId: existing.id };
  }

  // Create new customer
  if (!incoming.email && !incoming.external_id) {
    return {
      action: "skipped",
      reason: "No email ni ID externo — no se puede crear cliente sin identificador",
    };
  }

  const result = db
    .insert(customers)
    .values({
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
    })
    .run();

  return { action: "created", customerId: Number(result.lastInsertRowid) };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, "");
}
