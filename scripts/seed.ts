/**
 * CLI seed — Tienda de Mascotas
 * Borra todos los datos y genera el dataset completo (~3 000 clientes).
 * Run: npm run seed
 */

import { forceSeed } from "../lib/seed-runner";

forceSeed().catch((e) => { console.error(e); process.exit(1); });
