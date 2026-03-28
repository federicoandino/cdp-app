import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  created_at: text("created_at").default(sql`(datetime('now'))`),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").references(() => accounts.id),
  external_id: text("external_id"),
  email: text("email"),
  phone: text("phone"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  gender: text("gender"),
  birth_date: text("birth_date"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  zip_code: text("zip_code"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  custom_attributes: text("custom_attributes", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  first_purchase_date: text("first_purchase_date"),
  last_purchase_date: text("last_purchase_date"),
  total_orders: integer("total_orders").default(0),
  total_spent: real("total_spent").default(0),
  average_ticket: real("average_ticket").default(0),
  rfm_recency_score: integer("rfm_recency_score"),
  rfm_frequency_score: integer("rfm_frequency_score"),
  rfm_monetary_score: integer("rfm_monetary_score"),
  rfm_total_score: integer("rfm_total_score"),
  rfm_segment: text("rfm_segment"),
  created_at: text("created_at").default(sql`(datetime('now'))`),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
  source: text("source"),
}, (table) => ({
  emailAccountIdx: uniqueIndex("customers_email_account_idx").on(table.email, table.account_id),
}));

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").references(() => accounts.id),
  customer_id: integer("customer_id").references(() => customers.id),
  order_number: text("order_number"),
  order_date: text("order_date"),
  channel: text("channel"),
  store_name: text("store_name"),
  status: text("status").default("completada"),
  subtotal: real("subtotal").default(0),
  discount: real("discount").default(0),
  tax: real("tax").default(0),
  total: real("total").default(0),
  payment_method: text("payment_method"),
  currency: text("currency").default("ARS"),
  source_file: text("source_file"),
  created_at: text("created_at").default(sql`(datetime('now'))`),
});

export const order_items = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  order_id: integer("order_id").references(() => orders.id),
  sku: text("sku"),
  product_name: text("product_name"),
  category: text("category"),
  brand: text("brand"),
  quantity: integer("quantity").default(1),
  unit_price: real("unit_price").default(0),
  total_price: real("total_price").default(0),
});

export const segments = sqliteTable("segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").references(() => accounts.id),
  name: text("name").notNull(),
  description: text("description"),
  filters: text("filters", { mode: "json" }).$type<SegmentFilter[]>().default([]),
  customer_count: integer("customer_count").default(0),
  is_rfm_auto: integer("is_rfm_auto", { mode: "boolean" }).default(false),
  created_at: text("created_at").default(sql`(datetime('now'))`),
  updated_at: text("updated_at").default(sql`(datetime('now'))`),
});

export const imports = sqliteTable("imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").references(() => accounts.id),
  file_name: text("file_name").notNull(),
  file_type: text("file_type").notNull(),
  import_type: text("import_type").notNull(),
  rows_total: integer("rows_total").default(0),
  rows_imported: integer("rows_imported").default(0),
  rows_skipped: integer("rows_skipped").default(0),
  rows_duplicates_merged: integer("rows_duplicates_merged").default(0),
  status: text("status").default("procesando"),
  error_log: text("error_log", { mode: "json" }).$type<string[]>().default([]),
  created_at: text("created_at").default(sql`(datetime('now'))`),
});

export type SegmentFilterOperator =
  | "eq" | "neq" | "gt" | "lt" | "gte" | "lte"
  | "between" | "contains" | "not_contains"
  | "in" | "not_in" | "is_true" | "is_false";

export type SegmentFilter = {
  id: string;
  field: string;
  operator: SegmentFilterOperator;
  value: unknown;
  group?: number;
};

export type Account = typeof accounts.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof order_items.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type Import = typeof imports.$inferSelect;
