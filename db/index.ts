import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "cdp.db");

// Singleton pattern for SQLite
const sqlite = new Database(DB_PATH);

// Performance pragmas
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("cache_size = -32000"); // 32MB cache

export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist (inline DDL, no migration files needed for MVP)
export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      first_name TEXT,
      last_name TEXT,
      gender TEXT,
      birth_date TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      zip_code TEXT,
      tags TEXT DEFAULT '[]',
      custom_attributes TEXT DEFAULT '{}',
      first_purchase_date TEXT,
      last_purchase_date TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      average_ticket REAL DEFAULT 0,
      rfm_recency_score INTEGER,
      rfm_frequency_score INTEGER,
      rfm_monetary_score INTEGER,
      rfm_total_score INTEGER,
      rfm_segment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      order_number TEXT,
      order_date TEXT,
      channel TEXT,
      store_name TEXT,
      status TEXT DEFAULT 'completada',
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      payment_method TEXT,
      currency TEXT DEFAULT 'ARS',
      source_file TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      sku TEXT,
      product_name TEXT,
      category TEXT,
      brand TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      filters TEXT DEFAULT '[]',
      customer_count INTEGER DEFAULT 0,
      is_rfm_auto INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      import_type TEXT NOT NULL,
      rows_total INTEGER DEFAULT 0,
      rows_imported INTEGER DEFAULT 0,
      rows_skipped INTEGER DEFAULT 0,
      rows_duplicates_merged INTEGER DEFAULT 0,
      status TEXT DEFAULT 'procesando',
      error_log TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_rfm_segment ON customers(rfm_segment);
    CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON customers(last_purchase_date);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);
}

// Run init on module load
initializeDatabase();

export default db;
