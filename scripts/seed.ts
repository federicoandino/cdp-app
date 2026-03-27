/**
 * Seed: Tienda de Mascotas — base ficticia realista (Patagonia, Argentina)
 * tiendademascotas.com.ar · Avg ticket ~$100k ARS
 * Recompra: 50% antes del día 30, 80% antes del día 70 (distribución exponencial)
 * Run: npm run seed
 */

import Database from "better-sqlite3";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "cdp.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = OFF");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function weightedPick<T>(items: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/** Exponential distribution → median = 30 días, 80th pct ≈ 70 días */
function daysToRepurchase(): number {
  const lambda = Math.LN2 / 30;
  return Math.max(1, Math.min(Math.round(-Math.log(Math.random()) / lambda), 730));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function randomDateBetween(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split("T")[0];
}

function priceVariance(base: number): number {
  return Math.round(base * (1 + (Math.random() - 0.5) * 0.08));
}

function normalizeStr(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

// ─── Reference data ───────────────────────────────────────────────────────────

const MALE_NAMES   = ["Santiago","Mateo","Joaquín","Benjamín","Lucas","Martín","Tomás","Nicolás","Agustín","Franco","Diego","Federico","Rodrigo","Ezequiel","Leandro","Hernán","Gustavo","Pablo","Sergio","Roberto","Gabriel","Alejandro","Maximiliano","Gonzalo","Cristian","Daniel","Ignacio","Emiliano","Facundo","Alan","Eduardo","Marcelo","Raúl","Hugo","Ricardo","Claudio","Sebastián","Andrés","Javier","Oscar"];
const FEMALE_NAMES = ["Sofía","Valentina","Camila","Florencia","Lucía","Martina","Julia","Agustina","Micaela","Natalia","Paola","Romina","Valeria","Gabriela","Claudia","Andrea","Verónica","Carolina","Daniela","Yamila","Solange","Rocío","Celeste","Vanesa","Silvana","Marcela","Susana","Laura","Patricia","Karina","Mónica","Viviana","Cecilia","Graciela","Eliana","Belén","María","Ana","Sandra","Lorena"];
const SURNAMES     = ["González","Rodríguez","García","Fernández","López","Martínez","Sánchez","Pérez","Álvarez","Gómez","Torres","Díaz","Vázquez","Romero","Ruiz","Moreno","Muñoz","Herrera","Castro","Medina","Rojas","Vargas","Ortiz","Delgado","Reyes","Cruz","Suárez","Núñez","Molina","Blanco","Cabrera","Acosta","Ramírez","Ríos","Navarro","Carrasco","Flores","Silva","Ponce","Salinas","Espinoza","Figueroa","Mendoza","Vega","Ramos","Mamani","Quiroga","Ledesma","Godoy","Pereyra"];

const CITIES = [
  { city: "San Carlos de Bariloche", state: "Río Negro",  w: 26 },
  { city: "Neuquén",                 state: "Neuquén",    w: 22 },
  { city: "Comodoro Rivadavia",      state: "Chubut",     w: 17 },
  { city: "Trelew",                  state: "Chubut",     w: 10 },
  { city: "Puerto Madryn",           state: "Chubut",     w:  8 },
  { city: "Cipolletti",              state: "Río Negro",  w:  6 },
  { city: "Esquel",                  state: "Chubut",     w:  4 },
  { city: "General Roca",            state: "Río Negro",  w:  4 },
  { city: "Viedma",                  state: "Río Negro",  w:  3 },
];

// ─── Catálogo de productos ────────────────────────────────────────────────────

type Product = { sku: string; name: string; brand: string; category: string; price: number };

const FOOD_PERRO: Product[] = [
  { sku:"PAC-20KG",  name:"Pacha Mix Perro Adulto Carne y Pollo 20kg",  brand:"Pacha",           category:"Alimento Perro", price:52000 },
  { sku:"GCA-21KG",  name:"Gran Campeón Perro Adulto 21kg",              brand:"Gran Campeón",    category:"Alimento Perro", price:48000 },
  { sku:"SIE-20KG",  name:"Sieger Premium Perro Adulto 20kg",            brand:"Sieger",          category:"Alimento Perro", price:61000 },
  { sku:"PRO-20KG",  name:"Protemix Perro Adulto 20kg",                  brand:"Protemix",        category:"Alimento Perro", price:46000 },
  { sku:"EUK-P15",   name:"Eukanuba Perro Adulto 15kg",                  brand:"Eukanuba",        category:"Alimento Perro", price:92000 },
  { sku:"RCA-P15",   name:"Royal Canin Perro Adulto Medium 15kg",        brand:"Royal Canin",     category:"Alimento Perro", price:98000 },
  { sku:"PPL-P12",   name:"Pro Plan Perro Adulto 12kg",                  brand:"Purina Pro Plan", category:"Alimento Perro", price:85000 },
  { sku:"DSE-P15",   name:"Dog Selection Cachorro 15kg",                 brand:"Dog Selection",   category:"Alimento Perro", price:67000 },
  { sku:"PAC-P10",   name:"Pacha Mix Perro Adulto 10kg",                 brand:"Pacha",           category:"Alimento Perro", price:28000 },
];

const FOOD_GATO: Product[] = [
  { sku:"EUK-G75",   name:"Eukanuba Gato Adulto 7.5kg",                  brand:"Eukanuba",        category:"Alimento Gato", price:82400 },
  { sku:"EUK-G15",   name:"Eukanuba Gato Adulto 15kg",                   brand:"Eukanuba",        category:"Alimento Gato", price:149200},
  { sku:"EUK-GK75",  name:"Eukanuba Gato Kitten Healthy Star 7.5kg",     brand:"Eukanuba",        category:"Alimento Gato", price:86500 },
  { sku:"OPG-75",    name:"Old Prince Gato Adulto Cordero y Arroz 7.5kg",brand:"Old Prince",      category:"Alimento Gato", price:55000 },
  { sku:"RCA-G4",    name:"Royal Canin Gato Adulto Indoor 4kg",          brand:"Royal Canin",     category:"Alimento Gato", price:62000 },
  { sku:"WHI-G10",   name:"Whiskas Gato Adulto Pollo 10kg",              brand:"Whiskas",         category:"Alimento Gato", price:42000 },
  { sku:"BAL-G75",   name:"Balanced Natural Gato Adulto Trucha 7.5kg",   brand:"Balanced",        category:"Alimento Gato", price:66300 },
  { sku:"PPL-G35",   name:"Pro Plan Gato Adulto Esterilizado 3.5kg",    brand:"Purina Pro Plan", category:"Alimento Gato", price:52000 },
];

const WET_FOOD: Product[] = [
  { sku:"CPL-G85",   name:"Complete Gato Adulto Pollo 85gr",             brand:"Complete",        category:"Alimento Húmedo", price:2500 },
  { sku:"WIS-G85",   name:"Whiskas Gato Adulto Atún 85gr",               brand:"Whiskas",         category:"Alimento Húmedo", price:2200 },
  { sku:"PED-P340",  name:"Pedigree Perro Adulto Carne 340gr",           brand:"Pedigree",        category:"Alimento Húmedo", price:3800 },
  { sku:"RCW-P400",  name:"Royal Canin Perro Húmedo 400gr",              brand:"Royal Canin",     category:"Alimento Húmedo", price:5500 },
];

const HIGIENE: Product[] = [
  { sku:"DRC-SH500", name:"Shampoo Dermocanis 500ml",                    brand:"Dermocanis",      category:"Higiene y Cuidado",  price:8900  },
  { sku:"PET-SH400", name:"Shampoo Petys Neutro 400ml",                  brand:"Petys",           category:"Higiene y Cuidado",  price:7200  },
  { sku:"CEP-DUO",   name:"Cepillo Cardador Doble Cara",                 brand:"Genérico",        category:"Higiene y Cuidado",  price:6200  },
  { sku:"FRL-P",     name:"Antipulgas Frontline Plus Perro",             brand:"Frontline",       category:"Antiparasitario",    price:18500 },
  { sku:"FRL-G",     name:"Antipulgas Frontline Plus Gato",              brand:"Frontline",       category:"Antiparasitario",    price:15000 },
  { sku:"SER-P",     name:"Collar Antiparasitario Seresto Perro",        brand:"Seresto",         category:"Antiparasitario",    price:35000 },
  { sku:"SER-G",     name:"Collar Antiparasitario Seresto Gato",         brand:"Seresto",         category:"Antiparasitario",    price:28000 },
  { sku:"ARE-10KG",  name:"Arena Felina Gruesa 10kg",                    brand:"Catmax",          category:"Higiene Gato",       price:12800 },
  { sku:"ARE-20KG",  name:"Arena Felina Aglomerante 20kg",               brand:"Catmax",          category:"Higiene Gato",       price:22500 },
  { sku:"BOL-50",    name:"Bolsas Recolectoras Biodegradables x50",      brand:"Genérico",        category:"Higiene Perro",      price:4500  },
  { sku:"COR-UNA",   name:"Cortauñas Profesional",                       brand:"Genérico",        category:"Higiene y Cuidado",  price:5800  },
];

const ACCESORIOS: Product[] = [
  { sku:"KNG-M",     name:"Kong Classic Talle M",                        brand:"Kong",            category:"Juguetes",           price:15600 },
  { sku:"GIW-L",     name:"Pelota Gigwi Squeaker L",                     brand:"Gigwi",           category:"Juguetes",           price:17400 },
  { sku:"GIW-S",     name:"Pelota Gigwi S",                              brand:"Gigwi",           category:"Juguetes",           price:11400 },
  { sku:"JUG-RAC",   name:"Juguete Mapache Vinílico",                    brand:"Genérico",        category:"Juguetes",           price:8400  },
  { sku:"CAN-CHO",   name:"Cañita Choclo para Gato",                     brand:"Genérico",        category:"Juguetes Gato",      price:10100 },
  { sku:"CAN-LAN",   name:"Cañita Langosta con Catnip",                  brand:"Genérico",        category:"Juguetes Gato",      price:9600  },
  { sku:"JUG-PEZ",   name:"Juguete Pez Eléctrico para Gato",             brand:"Genérico",        category:"Juguetes Gato",      price:25400 },
  { sku:"CAT-SPR",   name:"Catnip Spray 30ml",                           brand:"Genérico",        category:"Juguetes Gato",      price:7400  },
  { sku:"COM-ACE",   name:"Comedero Acero Inoxidable 500ml",             brand:"Genérico",        category:"Accesorios",         price:5800  },
  { sku:"BEB-AUT",   name:"Bebedero Automático 1.5L",                    brand:"Genérico",        category:"Accesorios",         price:12400 },
  { sku:"COR-RET",   name:"Correa Retráctil Flexi 5m",                   brand:"Flexi",           category:"Accesorios",         price:18900 },
  { sku:"ARN-M",     name:"Arnés Reflectivo Talle M",                    brand:"Genérico",        category:"Accesorios",         price:22000 },
  { sku:"COL-NAY",   name:"Collar Nylon Regulable",                      brand:"Genérico",        category:"Accesorios",         price:4800  },
  { sku:"CUE-ARC",   name:"Cueva Archy para Perro",                      brand:"Archy",           category:"Camas y Cuchas",     price:71200 },
  { sku:"MOI-DUO",   name:"Moisés Duo para Mascotas",                    brand:"Genérico",        category:"Camas y Cuchas",     price:64800 },
  { sku:"RAS-TOR",   name:"Rascador Torre para Gato",                    brand:"Genérico",        category:"Accesorios Gato",    price:45000 },
  { sku:"RAS-SIM",   name:"Rascador Simple con Base",                    brand:"Genérico",        category:"Accesorios Gato",    price:18500 },
];

const SNACKS: Product[] = [
  { sku:"DEN-7",     name:"Dentastix Perro Mediano x7",                  brand:"Pedigree",        category:"Snacks y Premios",   price:8200  },
  { sku:"HUE-NYL",   name:"Hueso Nylon Grande",                          brand:"Genérico",        category:"Snacks y Premios",   price:9800  },
  { sku:"PRE-CAR",   name:"Premio Naturals Carne Deshidratada 100gr",    brand:"Naturals",        category:"Snacks y Premios",   price:6500  },
  { sku:"PRE-POL",   name:"Premio Naturals Pollo Deshidratado 100gr",    brand:"Naturals",        category:"Snacks y Premios",   price:6500  },
  { sku:"SNA-GAT",   name:"Temptations Gato Pollo x30",                  brand:"Temptations",     category:"Snacks y Premios",   price:4800  },
];

// ─── Generador de items por orden ─────────────────────────────────────────────

type OrderItem = {
  sku: string; product_name: string; category: string; brand: string;
  quantity: number; unit_price: number; total_price: number;
};

function buildOrderItems(): OrderItem[] {
  const items: OrderItem[] = [];
  const petType = Math.random() < 0.60 ? "perro" : "gato";
  const mainFood = petType === "perro" ? rand(FOOD_PERRO) : rand(FOOD_GATO);

  const orderType = weightedPick(
    ["food_only", "food_plus", "accessories", "premium"] as const,
    [15, 42, 11, 32]
  );

  const addItem = (p: Product, qty = 1) => {
    const unit = priceVariance(p.price);
    items.push({ sku: p.sku, product_name: p.name, category: p.category, brand: p.brand, quantity: qty, unit_price: unit, total_price: unit * qty });
  };

  if (orderType === "food_only") {
    addItem(mainFood);
    if (Math.random() < 0.35) addItem(rand(WET_FOOD), randInt(2, 6));
    if (Math.random() < 0.25) addItem(rand(SNACKS));

  } else if (orderType === "food_plus") {
    addItem(mainFood);
    const pool = [...HIGIENE, ...SNACKS, ...ACCESORIOS.slice(0, 11)];
    const n = randInt(1, 3);
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let p: Product; let t = 0;
      do { p = rand(pool); t++; } while (used.has(p.sku) && t < 10);
      used.add(p.sku); addItem(p);
    }
    if (Math.random() < 0.3) addItem(rand(WET_FOOD), randInt(2, 4));

  } else if (orderType === "accessories") {
    const pool = [...HIGIENE, ...ACCESORIOS, ...SNACKS];
    const n = randInt(3, 6);
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let p: Product; let t = 0;
      do { p = rand(pool); t++; } while (used.has(p.sku) && t < 10);
      used.add(p.sku); addItem(p);
    }
    if (Math.random() < 0.25) addItem(rand(WET_FOOD), randInt(3, 8));

  } else { // premium
    addItem(mainFood);
    if (Math.random() < 0.35) {
      const pool = petType === "perro"
        ? FOOD_PERRO.filter(f => f.sku !== mainFood.sku)
        : FOOD_GATO.filter(f => f.sku !== mainFood.sku);
      addItem(rand(pool));
    }
    const extraPool = [...HIGIENE, ...ACCESORIOS, ...SNACKS];
    const n = randInt(2, 4);
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let p: Product; let t = 0;
      do { p = rand(extraPool); t++; } while (used.has(p.sku) && t < 10);
      used.add(p.sku); addItem(p);
    }
  }

  return items;
}

// ─── Limpiar DB ───────────────────────────────────────────────────────────────

console.log("🗑  Limpiando base de datos...");
sqlite.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM customers;
  DELETE FROM segments;
  DELETE FROM imports;
  DELETE FROM sqlite_sequence WHERE name IN ('customers','orders','order_items','segments','imports');
`);

// ─── Prepared statements ──────────────────────────────────────────────────────

const insertCustomer = sqlite.prepare(`
  INSERT INTO customers
    (first_name,last_name,email,phone,gender,city,state,country,
     first_purchase_date,last_purchase_date,total_orders,total_spent,average_ticket,source)
  VALUES
    (@first_name,@last_name,@email,@phone,@gender,@city,@state,@country,
     @first_purchase_date,@last_purchase_date,@total_orders,@total_spent,@average_ticket,@source)
`);

const insertOrder = sqlite.prepare(`
  INSERT INTO orders
    (customer_id,order_number,order_date,channel,store_name,status,
     subtotal,discount,tax,total,payment_method,currency,source_file)
  VALUES
    (@customer_id,@order_number,@order_date,@channel,@store_name,@status,
     @subtotal,@discount,@tax,@total,@payment_method,@currency,@source_file)
`);

const insertItem = sqlite.prepare(`
  INSERT INTO order_items (order_id,sku,product_name,category,brand,quantity,unit_price,total_price)
  VALUES (@order_id,@sku,@product_name,@category,@brand,@quantity,@unit_price,@total_price)
`);

const updateCustomer = sqlite.prepare(`
  UPDATE customers SET total_orders=@to, total_spent=@ts, average_ticket=@at WHERE id=@id
`);

const insertImport = sqlite.prepare(`
  INSERT INTO imports (file_name,file_type,import_type,rows_total,rows_imported,rows_skipped,rows_duplicates_merged,status)
  VALUES (@file_name,@file_type,@import_type,@rows_total,@rows_imported,@rows_skipped,@rows_duplicates_merged,@status)
`);

// ─── Generar datos ────────────────────────────────────────────────────────────

const TODAY = "2026-03-27";
const TOTAL_CUSTOMERS = 620;
// Order count distribution: [qty, weight]
const ORDER_DIST: [number, number][] = [[1,55],[2,22],[3,12],[4,7],[5,3],[6,1]];
const CHANNELS  = ["ecommerce","ecommerce","ecommerce","tienda física","tienda física","marketplace"];
const PAYMENTS  = ["Tarjeta de crédito","Tarjeta de crédito","Tarjeta de débito","Efectivo","Transferencia bancaria","MercadoPago"];
const STORES    = ["Bariloche Centro","Neuquén Capital","Comodoro Rivadavia","Puerto Madryn","Esquel"];

const emailCount: Map<string, number> = new Map();
let orderSeq = 1;
let statCustomers = 0, statOrders = 0, statItems = 0;

console.log("🐾  Generando datos de Tienda de Mascotas...");

const seedAll = sqlite.transaction(() => {
  for (let c = 0; c < TOTAL_CUSTOMERS; c++) {
    const gender    = Math.random() < 0.52 ? "F" : "M";
    const firstName = gender === "F" ? rand(FEMALE_NAMES) : rand(MALE_NAMES);
    const lastName  = rand(SURNAMES) + (Math.random() < 0.25 ? ` ${rand(SURNAMES)}` : "");
    const location  = weightedPick(CITIES, CITIES.map(x => x.w));

    // unique email
    const base      = `${normalizeStr(firstName)}.${normalizeStr(lastName.split(" ")[0])}`;
    const cnt       = (emailCount.get(base) ?? 0) + 1;
    emailCount.set(base, cnt);
    const domains   = ["gmail.com","hotmail.com","yahoo.com.ar","outlook.com"];
    const email     = cnt === 1 ? `${base}@${rand(domains)}` : `${base}${cnt}@${rand(domains)}`;

    // Number of orders for this customer
    const numOrders = weightedPick(ORDER_DIST, ORDER_DIST.map(d => d[1]))[0];

    // First purchase: Jan 2023 – May 2025
    const firstDate  = randomDateBetween("2023-01-10", "2025-05-01");
    const orderDates: string[] = [firstDate];

    for (let i = 1; i < numOrders; i++) {
      const next = addDays(orderDates[i - 1], daysToRepurchase());
      if (next > TODAY) break;
      orderDates.push(next);
    }

    const lastDate = orderDates[orderDates.length - 1];

    const cRow = insertCustomer.run({
      first_name: firstName, last_name: lastName,
      email, phone: `+549${randInt(2940000000, 2999999999)}`,
      gender, city: location.city, state: location.state, country: "Argentina",
      first_purchase_date: firstDate, last_purchase_date: lastDate,
      total_orders: 0, total_spent: 0, average_ticket: 0, source: "seed",
    });
    const customerId = cRow.lastInsertRowid as number;
    statCustomers++;

    let completedOrders = 0;
    let totalSpent = 0;

    for (const orderDate of orderDates) {
      const channel  = rand(CHANNELS);
      const status   = Math.random() < 0.88 ? "completada" : (Math.random() < 0.6 ? "cancelada" : "devuelta");
      const items    = buildOrderItems();
      const subtotal = items.reduce((s, i) => s + i.total_price, 0);
      const discount = Math.random() < 0.18 ? Math.round(subtotal * (0.05 + Math.random() * 0.10)) : 0;
      const total    = subtotal - discount;

      const oRow = insertOrder.run({
        customer_id:    customerId,
        order_number:   `TDM-${String(orderSeq++).padStart(6, "0")}`,
        order_date:     orderDate,
        channel,
        store_name:     channel === "ecommerce" ? "Tienda Online" : channel === "marketplace" ? "MercadoLibre" : rand(STORES),
        status,
        subtotal,
        discount,
        tax:            0,
        total,
        payment_method: rand(PAYMENTS),
        currency:       "ARS",
        source_file:    "seed-mascotas",
      });
      const orderId = oRow.lastInsertRowid as number;
      statOrders++;

      for (const item of items) {
        insertItem.run({ order_id: orderId, ...item });
        statItems++;
      }

      if (status === "completada") {
        completedOrders++;
        totalSpent += total;
      }
    }

    updateCustomer.run({
      id: customerId,
      to: completedOrders,
      ts: Math.round(totalSpent),
      at: completedOrders > 0 ? Math.round(totalSpent / completedOrders) : 0,
    });
  }

  insertImport.run({
    file_name: "seed-tienda-mascotas.csv",
    file_type: "csv",
    import_type: "orders",
    rows_total: statOrders,
    rows_imported: statOrders,
    rows_skipped: 0,
    rows_duplicates_merged: 0,
    status: "completado",
  });
});

seedAll();

// ─── Resumen ──────────────────────────────────────────────────────────────────

const stats = sqlite.prepare(`
  SELECT
    COUNT(DISTINCT c.id) AS customers,
    COUNT(DISTINCT CASE WHEN c.total_orders >= 2 THEN c.id END) AS repeat_customers,
    COUNT(o.id) AS orders,
    CAST(ROUND(AVG(o.total)) AS INTEGER) AS avg_ticket
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completada'
`).get() as { customers: number; repeat_customers: number; orders: number; avg_ticket: number };

console.log(`\n✅ Seed completado — Tienda de Mascotas (Patagonia)`);
console.log(`   Clientes:         ${stats.customers}`);
console.log(`   Con recompra:     ${stats.repeat_customers}`);
console.log(`   Órdenes:          ${stats.orders}`);
console.log(`   Ticket promedio:  $${Number(stats.avg_ticket).toLocaleString("es-AR")}`);
console.log(`   Items generados:  ${statItems}`);

sqlite.pragma("foreign_keys = ON");
sqlite.close();
