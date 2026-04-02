/**
 * Seed runner — Tienda de Mascotas sample dataset
 * ~3 000 clientes · patrones omnicanal · catálogo realista
 *
 * Exports:
 *   forceSeed()    — borra todo y recrea (usado por `npm run seed`)
 *   checkAndSeed() — solo semilla si faltan los datos (usado por instrumentation.ts)
 */

import { createClient, type Client } from "@libsql/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function weightedPick<T>(items: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/** Exponential distribution — mediana 30 días, P80 ≈ 70 días */
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

// ─── Datos de referencia ───────────────────────────────────────────────────────

const MALE_NAMES   = ["Santiago","Mateo","Joaquín","Benjamín","Lucas","Martín","Tomás","Nicolás","Agustín","Franco","Diego","Federico","Rodrigo","Ezequiel","Leandro","Hernán","Gustavo","Pablo","Sergio","Roberto","Gabriel","Alejandro","Maximiliano","Gonzalo","Cristian","Daniel","Ignacio","Emiliano","Facundo","Alan","Eduardo","Marcelo","Raúl","Hugo","Ricardo","Claudio","Sebastián","Andrés","Javier","Oscar","Manuel","Ramiro","Damián","Enzo","Lautaro","Bruno","Nahuel","Iván","Nicolás","Walter","Adrián"];
const FEMALE_NAMES = ["Sofía","Valentina","Camila","Florencia","Lucía","Martina","Julia","Agustina","Micaela","Natalia","Paola","Romina","Valeria","Gabriela","Claudia","Andrea","Verónica","Carolina","Daniela","Yamila","Solange","Rocío","Celeste","Vanesa","Silvana","Marcela","Susana","Laura","Patricia","Karina","Mónica","Viviana","Cecilia","Graciela","Eliana","Belén","María","Ana","Sandra","Lorena","Carla","Gisela","Noelia","Melina","Tamara","Nadia","Brenda","Débora","Mariela","Aldana"];
const SURNAMES     = ["González","Rodríguez","García","Fernández","López","Martínez","Sánchez","Pérez","Álvarez","Gómez","Torres","Díaz","Vázquez","Romero","Ruiz","Moreno","Muñoz","Herrera","Castro","Medina","Rojas","Vargas","Ortiz","Delgado","Reyes","Cruz","Suárez","Núñez","Molina","Blanco","Cabrera","Acosta","Ramírez","Ríos","Navarro","Carrasco","Flores","Silva","Ponce","Salinas","Espinoza","Figueroa","Mendoza","Vega","Ramos","Mamani","Quiroga","Ledesma","Godoy","Pereyra","Ibáñez","Aguilar","Bustos","Correa","Heredia","Miranda","Paredes","Padilla","Villalba","Giménez"];

const CITIES = [
  { city: "San Carlos de Bariloche", state: "Río Negro",  w: 24 },
  { city: "Neuquén",                 state: "Neuquén",    w: 20 },
  { city: "Comodoro Rivadavia",      state: "Chubut",     w: 16 },
  { city: "Trelew",                  state: "Chubut",     w:  9 },
  { city: "Puerto Madryn",           state: "Chubut",     w:  7 },
  { city: "Cipolletti",              state: "Río Negro",  w:  6 },
  { city: "Esquel",                  state: "Chubut",     w:  4 },
  { city: "General Roca",            state: "Río Negro",  w:  4 },
  { city: "Viedma",                  state: "Río Negro",  w:  3 },
  { city: "Zapala",                  state: "Neuquén",    w:  2 },
  { city: "San Martín de los Andes", state: "Neuquén",    w:  2 },
  { city: "Plottier",                state: "Neuquén",    w:  2 },
  { city: "El Bolsón",               state: "Río Negro",  w:  1 },
];

// ─── Catálogo de productos ─────────────────────────────────────────────────────

type Product = { sku: string; name: string; brand: string; category: string; price: number };

const FOOD_PERRO: Product[] = [
  { sku:"PAC-20KG",  name:"Pacha Mix Perro Adulto Carne y Pollo 20kg",      brand:"Pacha",            category:"Alimento Perro",  price:52000  },
  { sku:"PAC-10KG",  name:"Pacha Mix Perro Adulto 10kg",                    brand:"Pacha",            category:"Alimento Perro",  price:28000  },
  { sku:"GCA-21KG",  name:"Gran Campeón Perro Adulto 21kg",                 brand:"Gran Campeón",     category:"Alimento Perro",  price:48000  },
  { sku:"GCA-C20",   name:"Gran Campeón Cachorro 20kg",                     brand:"Gran Campeón",     category:"Alimento Perro",  price:52000  },
  { sku:"SIE-20KG",  name:"Sieger Premium Perro Adulto 20kg",               brand:"Sieger",           category:"Alimento Perro",  price:61000  },
  { sku:"SIE-C15",   name:"Sieger Premium Cachorro 15kg",                   brand:"Sieger",           category:"Alimento Perro",  price:65000  },
  { sku:"PRO-20KG",  name:"Protemix Perro Adulto 20kg",                     brand:"Protemix",         category:"Alimento Perro",  price:46000  },
  { sku:"NMX-20KG",  name:"Nutri Mix Perro Adulto 20kg",                    brand:"Nutri Mix",        category:"Alimento Perro",  price:32000  },
  { sku:"PED-21KG",  name:"Pedigree Perro Adulto Pollo y Res 21kg",         brand:"Pedigree",         category:"Alimento Perro",  price:38000  },
  { sku:"DCH-21KG",  name:"Dog Chow Adulto Completo 21kg",                  brand:"Dog Chow",         category:"Alimento Perro",  price:44000  },
  { sku:"DSE-P15",   name:"Dog Selection Cachorro 15kg",                    brand:"Dog Selection",    category:"Alimento Perro",  price:67000  },
  { sku:"EUK-P15",   name:"Eukanuba Perro Adulto Medium 15kg",              brand:"Eukanuba",         category:"Alimento Perro",  price:92000  },
  { sku:"RCA-P15",   name:"Royal Canin Medium Adult 15kg",                  brand:"Royal Canin",      category:"Alimento Perro",  price:98000  },
  { sku:"RCA-MX15",  name:"Royal Canin Maxi Adult 15kg",                    brand:"Royal Canin",      category:"Alimento Perro",  price:105000 },
  { sku:"RCA-MI8",   name:"Royal Canin Mini Adult 8kg",                     brand:"Royal Canin",      category:"Alimento Perro",  price:82000  },
  { sku:"PPL-P12",   name:"Pro Plan Perro Adulto Pollo 12kg",               brand:"Purina Pro Plan",  category:"Alimento Perro",  price:85000  },
  { sku:"PPL-C12",   name:"Pro Plan Cachorro Pollo y Arroz 12kg",           brand:"Purina Pro Plan",  category:"Alimento Perro",  price:89000  },
  { sku:"PUN-P15",   name:"Purina One Perro Adulto Pollo 15kg",             brand:"Purina One",       category:"Alimento Perro",  price:72000  },
  { sku:"HLL-P12",   name:"Hill's Science Diet Perro Adulto 12kg",          brand:"Hill's",           category:"Alimento Perro",  price:118000 },
  { sku:"ACA-P11",   name:"Acana Adult Large Breed 11.4kg",                 brand:"Acana",            category:"Alimento Perro",  price:148000 },
];

const FOOD_GATO: Product[] = [
  { sku:"EUK-G75",   name:"Eukanuba Gato Adulto 7.5kg",                    brand:"Eukanuba",         category:"Alimento Gato",   price:82400  },
  { sku:"EUK-G15",   name:"Eukanuba Gato Adulto 15kg",                     brand:"Eukanuba",         category:"Alimento Gato",   price:149200 },
  { sku:"EUK-GK75",  name:"Eukanuba Gato Kitten 7.5kg",                    brand:"Eukanuba",         category:"Alimento Gato",   price:86500  },
  { sku:"OPG-75",    name:"Old Prince Gato Adulto Cordero y Arroz 7.5kg",  brand:"Old Prince",       category:"Alimento Gato",   price:55000  },
  { sku:"RCA-G4",    name:"Royal Canin Gato Adulto Indoor 4kg",            brand:"Royal Canin",      category:"Alimento Gato",   price:62000  },
  { sku:"RCA-GK4",   name:"Royal Canin Gato Kitten 4kg",                   brand:"Royal Canin",      category:"Alimento Gato",   price:68000  },
  { sku:"WHI-G10",   name:"Whiskas Gato Adulto Pollo 10kg",                brand:"Whiskas",          category:"Alimento Gato",   price:42000  },
  { sku:"BAL-G75",   name:"Balanced Natural Gato Adulto Trucha 7.5kg",     brand:"Balanced",         category:"Alimento Gato",   price:66300  },
  { sku:"PPL-G35",   name:"Pro Plan Gato Adulto Esterilizado 3.5kg",       brand:"Purina Pro Plan",  category:"Alimento Gato",   price:52000  },
  { sku:"HLL-G73",   name:"Hill's Science Diet Gato Adulto 7.3kg",         brand:"Hill's",           category:"Alimento Gato",   price:95000  },
  { sku:"IAM-G75",   name:"Iams Gato Adulto Pollo 7.5kg",                  brand:"Iams",             category:"Alimento Gato",   price:62000  },
  { sku:"PUN-G75",   name:"Purina One Gato Adulto Salmón 7.5kg",           brand:"Purina One",       category:"Alimento Gato",   price:58000  },
  { sku:"GSE-G75",   name:"Gato Selection Adulto 7.5kg",                   brand:"Gato Selection",   category:"Alimento Gato",   price:48000  },
];

const WET_FOOD: Product[] = [
  { sku:"CPL-G85",   name:"Complete Gato Adulto Pollo 85gr",               brand:"Complete",         category:"Alimento Húmedo", price:2500   },
  { sku:"WIS-G85",   name:"Whiskas Gato Adulto Atún 85gr",                 brand:"Whiskas",          category:"Alimento Húmedo", price:2200   },
  { sku:"FRI-G85",   name:"Friskies Gato Adulto Pollo 85gr",               brand:"Friskies",         category:"Alimento Húmedo", price:2100   },
  { sku:"FCF-G85",   name:"Fancy Feast Gato Ternera y Vegetales 85gr",     brand:"Fancy Feast",      category:"Alimento Húmedo", price:3200   },
  { sku:"PPL-G85",   name:"Pro Plan Gato Húmedo Salmón 85gr",              brand:"Purina Pro Plan",  category:"Alimento Húmedo", price:4800   },
  { sku:"PED-P340",  name:"Pedigree Perro Adulto Carne 340gr",             brand:"Pedigree",         category:"Alimento Húmedo", price:3800   },
  { sku:"ALP-P280",  name:"Alpo Perro Carne y Zanahoria 280gr",            brand:"Alpo",             category:"Alimento Húmedo", price:4200   },
  { sku:"RCW-P400",  name:"Royal Canin Perro Húmedo Adulto 400gr",         brand:"Royal Canin",      category:"Alimento Húmedo", price:5500   },
];

const HIGIENE: Product[] = [
  { sku:"DRC-SH500", name:"Shampoo Dermocanis Neutro 500ml",               brand:"Dermocanis",       category:"Higiene y Cuidado",  price:8900  },
  { sku:"PET-SH400", name:"Shampoo Petys Avena 400ml",                     brand:"Petys",            category:"Higiene y Cuidado",  price:7200  },
  { sku:"PET-SS200", name:"Shampoo Seco Spray Petys 200ml",                brand:"Petys",            category:"Higiene y Cuidado",  price:8900  },
  { sku:"PET-COL",   name:"Colonia Petys Fresh 100ml",                     brand:"Petys",            category:"Higiene y Cuidado",  price:5500  },
  { sku:"CEP-DUO",   name:"Cepillo Cardador Doble Cara",                   brand:"Genérico",         category:"Higiene y Cuidado",  price:6200  },
  { sku:"CEP-DEN",   name:"Cepillo Dental para Mascotas",                  brand:"Genérico",         category:"Higiene y Cuidado",  price:4200  },
  { sku:"COR-UNA",   name:"Cortauñas Profesional",                         brand:"Genérico",         category:"Higiene y Cuidado",  price:5800  },
  { sku:"JAB-ANT",   name:"Jabón Antiséptico para Mascotas",               brand:"Genérico",         category:"Higiene y Cuidado",  price:3800  },
  { sku:"FRL-P",     name:"Antipulgas Frontline Plus Perro",               brand:"Frontline",        category:"Antiparasitario",    price:18500 },
  { sku:"FRL-G",     name:"Antipulgas Frontline Plus Gato",                brand:"Frontline",        category:"Antiparasitario",    price:15000 },
  { sku:"SER-P",     name:"Collar Antiparasitario Seresto Perro",          brand:"Seresto",          category:"Antiparasitario",    price:35000 },
  { sku:"SER-G",     name:"Collar Antiparasitario Seresto Gato",           brand:"Seresto",          category:"Antiparasitario",    price:28000 },
  { sku:"ARE-10KG",  name:"Arena Felina Gruesa 10kg",                      brand:"Catmax",           category:"Higiene Gato",       price:12800 },
  { sku:"ARE-20KG",  name:"Arena Felina Aglomerante 20kg",                 brand:"Catmax",           category:"Higiene Gato",       price:22500 },
  { sku:"BOL-50",    name:"Bolsas Recolectoras Biodegradables x50",        brand:"Genérico",         category:"Higiene Perro",      price:4500  },
];

const ACCESORIOS: Product[] = [
  { sku:"KNG-M",     name:"Kong Classic Talle M",                          brand:"Kong",             category:"Juguetes",           price:15600 },
  { sku:"GIW-L",     name:"Pelota Gigwi Squeaker L",                       brand:"Gigwi",            category:"Juguetes",           price:17400 },
  { sku:"GIW-S",     name:"Pelota Gigwi S",                                brand:"Gigwi",            category:"Juguetes",           price:11400 },
  { sku:"JUG-RAC",   name:"Juguete Mapache Vinílico",                      brand:"Genérico",         category:"Juguetes",           price:8400  },
  { sku:"CAN-CHO",   name:"Cañita Choclo para Gato",                       brand:"Genérico",         category:"Juguetes Gato",      price:10100 },
  { sku:"CAN-LAN",   name:"Cañita Langosta con Catnip",                    brand:"Genérico",         category:"Juguetes Gato",      price:9600  },
  { sku:"JUG-PEZ",   name:"Juguete Pez Eléctrico para Gato",               brand:"Genérico",         category:"Juguetes Gato",      price:25400 },
  { sku:"CAT-SPR",   name:"Catnip Spray 30ml",                             brand:"Genérico",         category:"Juguetes Gato",      price:7400  },
  { sku:"COM-ACE",   name:"Comedero Acero Inoxidable 500ml",               brand:"Genérico",         category:"Accesorios",         price:5800  },
  { sku:"COM-ADS",   name:"Plato Antideslizante para Mascotas",            brand:"Genérico",         category:"Accesorios",         price:8500  },
  { sku:"BEB-AUT",   name:"Bebedero Automático 1.5L",                      brand:"Genérico",         category:"Accesorios",         price:12400 },
  { sku:"COR-RET",   name:"Correa Retráctil Flexi 5m",                     brand:"Flexi",            category:"Accesorios",         price:18900 },
  { sku:"ARN-M",     name:"Arnés Reflectivo Talle M",                      brand:"Genérico",         category:"Accesorios",         price:22000 },
  { sku:"COL-NAY",   name:"Collar Nylon Regulable",                        brand:"Genérico",         category:"Accesorios",         price:4800  },
  { sku:"MCH-S",     name:"Mochila Transportín Talle S",                   brand:"Genérico",         category:"Transportines",      price:45000 },
  { sku:"TRP-M",     name:"Transportadora Rígida Talle M",                 brand:"Genérico",         category:"Transportines",      price:68000 },
  { sku:"CUE-ARC",   name:"Cueva Archy para Perro",                        brand:"Archy",            category:"Camas y Cuchas",     price:71200 },
  { sku:"MOI-DUO",   name:"Moisés Duo para Mascotas",                      brand:"Genérico",         category:"Camas y Cuchas",     price:64800 },
  { sku:"CAM-POL",   name:"Cama Polar Redonda Talle M",                    brand:"Genérico",         category:"Camas y Cuchas",     price:28000 },
  { sku:"CAM-REC",   name:"Camita Rectangular con Bordes Talle L",         brand:"Genérico",         category:"Camas y Cuchas",     price:35000 },
  { sku:"RAS-TOR",   name:"Rascador Torre para Gato",                      brand:"Genérico",         category:"Accesorios Gato",    price:45000 },
  { sku:"RAS-SIM",   name:"Rascador Simple con Base",                      brand:"Genérico",         category:"Accesorios Gato",    price:18500 },
];

const SNACKS: Product[] = [
  { sku:"DEN-7",     name:"Dentastix Perro Mediano x7",                    brand:"Pedigree",         category:"Snacks y Premios",   price:8200  },
  { sku:"HUE-NYL",   name:"Hueso Nylon Grande",                            brand:"Genérico",         category:"Snacks y Premios",   price:9800  },
  { sku:"PRE-CAR",   name:"Premio Naturals Carne Deshidratada 100gr",      brand:"Naturals",         category:"Snacks y Premios",   price:6500  },
  { sku:"PRE-POL",   name:"Premio Naturals Pollo Deshidratado 100gr",      brand:"Naturals",         category:"Snacks y Premios",   price:6500  },
  { sku:"SNA-GAT",   name:"Temptations Gato Pollo x30",                    brand:"Temptations",      category:"Snacks y Premios",   price:4800  },
  { sku:"GBY-PTO",   name:"Good Boy Strips Pato 100gr",                    brand:"Good Boy",         category:"Snacks y Premios",   price:7800  },
  { sku:"MBN-400",   name:"Milk-Bone Perro Mediano 400gr",                 brand:"Milk-Bone",        category:"Snacks y Premios",   price:12500 },
  { sku:"NAT-HIG",   name:"Snack Natural Hígado Deshidratado 100gr",       brand:"Naturals",         category:"Snacks y Premios",   price:6800  },
  { sku:"CHU-GAT",   name:"Churritos de Pollo para Gato 50gr",             brand:"Genérico",         category:"Snacks y Premios",   price:4200  },
];

// ─── Perfiles de canal (omnicanal) ─────────────────────────────────────────────

type ChannelProfile = {
  type: string;
  weight: number;
  channels: string[];
  channelWeights: number[];
};

const CHANNEL_PROFILES: ChannelProfile[] = [
  { type: "online_only",    weight: 28, channels: ["ecommerce"],                           channelWeights: [1]            },
  { type: "physical_only",  weight: 22, channels: ["tienda física"],                       channelWeights: [1]            },
  { type: "marketplace",    weight:  8, channels: ["marketplace"],                         channelWeights: [1]            },
  { type: "omni_oe",        weight: 20, channels: ["ecommerce","tienda física"],           channelWeights: [0.55, 0.45]   },
  { type: "omni_all",       weight: 12, channels: ["ecommerce","tienda física","marketplace"], channelWeights: [0.45,0.35,0.20] },
  { type: "omni_om",        weight:  6, channels: ["ecommerce","marketplace"],             channelWeights: [0.60, 0.40]   },
  { type: "omni_pm",        weight:  4, channels: ["tienda física","marketplace"],         channelWeights: [0.55, 0.45]   },
];

function pickChannel(profile: ChannelProfile, orderIndex: number, totalOrders: number): string {
  const { channels, channelWeights } = profile;
  if (channels.length === 1) return channels[0];

  // For omni customers: if they have enough orders, guarantee each channel appears at least once
  if (totalOrders >= channels.length && orderIndex < channels.length) {
    // Shuffle channels at the start (deterministic per seed won't matter for randomness)
    return channels[orderIndex % channels.length];
  }
  return weightedPick(channels, channelWeights);
}

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
    if (Math.random() < 0.35) addItem(rand(WET_FOOD), randInt(2, 8));
    if (Math.random() < 0.25) addItem(rand(SNACKS));

  } else if (orderType === "food_plus") {
    addItem(mainFood);
    const pool = [...HIGIENE, ...SNACKS, ...ACCESORIOS.slice(0, 14)];
    const n = randInt(1, 3);
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let p: Product; let t = 0;
      do { p = rand(pool); t++; } while (used.has(p.sku) && t < 10);
      used.add(p.sku); addItem(p);
    }
    if (Math.random() < 0.3) addItem(rand(WET_FOOD), randInt(2, 6));

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

// ─── DDL ──────────────────────────────────────────────────────────────────────

const DROP_STATEMENTS = [
  "DROP TABLE IF EXISTS order_items",
  "DROP TABLE IF EXISTS orders",
  "DROP TABLE IF EXISTS segments",
  "DROP TABLE IF EXISTS imports",
  "DROP TABLE IF EXISTS customers",
  "DROP TABLE IF EXISTS accounts",
];

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id),
    external_id TEXT, email TEXT, phone TEXT,
    first_name TEXT, last_name TEXT, gender TEXT, birth_date TEXT,
    address TEXT, city TEXT, state TEXT, country TEXT, zip_code TEXT,
    tags TEXT DEFAULT '[]', custom_attributes TEXT DEFAULT '{}',
    first_purchase_date TEXT, last_purchase_date TEXT,
    total_orders INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, average_ticket REAL DEFAULT 0,
    rfm_recency_score INTEGER, rfm_frequency_score INTEGER,
    rfm_monetary_score INTEGER, rfm_total_score INTEGER, rfm_segment TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    source TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS customers_email_account_idx ON customers(email, account_id)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id),
    customer_id INTEGER REFERENCES customers(id),
    order_number TEXT, order_date TEXT, channel TEXT, store_name TEXT,
    status TEXT DEFAULT 'completada',
    subtotal REAL DEFAULT 0, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0,
    payment_method TEXT, currency TEXT DEFAULT 'ARS', source_file TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    sku TEXT, product_name TEXT, category TEXT, brand TEXT,
    quantity INTEGER DEFAULT 1, unit_price REAL DEFAULT 0, total_price REAL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id),
    name TEXT NOT NULL, description TEXT, filters TEXT DEFAULT '[]',
    customer_count INTEGER DEFAULT 0, is_rfm_auto INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id),
    file_name TEXT NOT NULL, file_type TEXT NOT NULL, import_type TEXT NOT NULL,
    rows_total INTEGER DEFAULT 0, rows_imported INTEGER DEFAULT 0,
    rows_skipped INTEGER DEFAULT 0, rows_duplicates_merged INTEGER DEFAULT 0,
    status TEXT DEFAULT 'procesando', error_log TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

// ─── Migración de esquema ──────────────────────────────────────────────────────

/**
 * Verifica si el esquema actual es el correcto (con account_id).
 * Si no lo es (DB vieja o nueva), hace DROP + CREATE de todas las tablas.
 */
async function ensureSchema(client: Client): Promise<void> {
  let needsRecreate = false;
  try {
    await client.execute("SELECT account_id FROM customers LIMIT 1");
  } catch {
    needsRecreate = true;
  }

  if (needsRecreate) {
    for (const drop of DROP_STATEMENTS) await client.execute(drop);
  }
  for (const ddl of DDL_STATEMENTS) await client.execute(ddl);
}

// ─── Lógica principal de seed ──────────────────────────────────────────────────

const TODAY           = "2026-04-01";
const TOTAL_CUSTOMERS = 3000;
const BATCH_SIZE      = 300;

// Distribución de órdenes: promedio ≈ 2.7 órdenes/cliente → ~8 100 órdenes totales
const ORDER_DIST: [number, number][] = [[1,36],[2,22],[3,15],[4,11],[5,7],[6,5],[7,3],[8,1]];
const PAYMENTS = ["Tarjeta de crédito","Tarjeta de crédito","Tarjeta de débito","Efectivo","Transferencia bancaria","MercadoPago","MercadoPago"];
const STORES   = ["Bariloche Centro","Neuquén Capital","Comodoro Rivadavia","Puerto Madryn","Esquel","General Roca","Cipolletti"];

type InStatement = { sql: string; args: (string | number | null)[] };

async function runSeed(client: Client, verbose = true): Promise<void> {
  const log = verbose ? console.log.bind(console) : () => {};
  const write = verbose ? (s: string) => process.stdout.write(s) : () => {};

  log("📋  Verificando esquema...");
  await ensureSchema(client);

  log("🗑   Limpiando datos existentes...");
  await client.batch([
    { sql: "DELETE FROM order_items", args: [] },
    { sql: "DELETE FROM orders",      args: [] },
    { sql: "DELETE FROM segments",    args: [] },
    { sql: "DELETE FROM imports",     args: [] },
    { sql: "DELETE FROM customers",   args: [] },
    { sql: "DELETE FROM accounts",    args: [] },
  ], "write");

  const accountResult = await client.execute({
    sql: "INSERT INTO accounts (name, created_at) VALUES (?, ?) RETURNING id",
    args: ["Tienda de Mascotas", new Date().toISOString()],
  });
  const accountId = Number((accountResult.rows[0] as unknown as { id: number }).id);

  log(`🐾  Generando ${TOTAL_CUSTOMERS.toLocaleString()} clientes con patrones omnicanal...`);

  const emailCount = new Map<string, number>();
  let orderSeq = 1;
  let customerId = 0, orderId = 0, orderItemId = 0;
  let statOrders = 0, statItems = 0;
  const stmts: InStatement[] = [];
  const now = new Date().toISOString();

  const flush = async () => {
    if (stmts.length === 0) return;
    const chunks: InStatement[][] = [];
    for (let i = 0; i < stmts.length; i += BATCH_SIZE) chunks.push(stmts.slice(i, i + BATCH_SIZE));
    for (const chunk of chunks) await client.batch(chunk, "write");
    stmts.length = 0;
  };

  for (let c = 0; c < TOTAL_CUSTOMERS; c++) {
    const gender    = Math.random() < 0.52 ? "F" : "M";
    const firstName = gender === "F" ? rand(FEMALE_NAMES) : rand(MALE_NAMES);
    const lastName  = rand(SURNAMES) + (Math.random() < 0.25 ? ` ${rand(SURNAMES)}` : "");
    const location  = weightedPick(CITIES, CITIES.map(x => x.w));
    const profile   = weightedPick(CHANNEL_PROFILES, CHANNEL_PROFILES.map(x => x.weight));

    const base = `${normalizeStr(firstName)}.${normalizeStr(lastName.split(" ")[0])}`;
    const cnt  = (emailCount.get(base) ?? 0) + 1;
    emailCount.set(base, cnt);
    const domains = ["gmail.com","hotmail.com","yahoo.com.ar","outlook.com","icloud.com"];
    const email   = cnt === 1 ? `${base}@${rand(domains)}` : `${base}${cnt}@${rand(domains)}`;

    const numOrders = weightedPick(ORDER_DIST, ORDER_DIST.map(d => d[1]))[0];
    const firstDate = randomDateBetween("2022-06-01", "2025-06-01");
    const orderDates: string[] = [firstDate];
    for (let i = 1; i < numOrders; i++) {
      const next = addDays(orderDates[i - 1], daysToRepurchase());
      if (next > TODAY) break;
      orderDates.push(next);
    }
    const lastDate = orderDates[orderDates.length - 1];

    customerId++;
    stmts.push({
      sql: `INSERT INTO customers (id,account_id,first_name,last_name,email,phone,gender,city,state,country,first_purchase_date,last_purchase_date,total_orders,total_spent,average_ticket,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,?,?,?)`,
      args: [customerId, accountId, firstName, lastName, email, `+549${randInt(2940000000,2999999999)}`, gender, location.city, location.state, "Argentina", firstDate, lastDate, "seed", now, now],
    });

    let completedOrders = 0;
    let totalSpent = 0;

    for (let oi = 0; oi < orderDates.length; oi++) {
      const orderDate = orderDates[oi];
      const channel   = pickChannel(profile, oi, orderDates.length);
      const status    = Math.random() < 0.88 ? "completada" : (Math.random() < 0.6 ? "cancelada" : "devuelta");
      const items     = buildOrderItems();
      const subtotal  = items.reduce((s, i) => s + i.total_price, 0);
      const discount  = Math.random() < 0.18 ? Math.round(subtotal * (0.05 + Math.random() * 0.10)) : 0;
      const total     = subtotal - discount;
      const storeName = channel === "ecommerce" ? "Tienda Online" : channel === "marketplace" ? "MercadoLibre" : rand(STORES);

      orderId++;
      stmts.push({
        sql: `INSERT INTO orders (id,account_id,customer_id,order_number,order_date,channel,store_name,status,subtotal,discount,tax,total,payment_method,currency,source_file,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)`,
        args: [orderId, accountId, customerId, `TDM-${String(orderSeq++).padStart(7,"0")}`, orderDate, channel, storeName, status, subtotal, discount, total, rand(PAYMENTS), "ARS", "seed-mascotas", now],
      });
      statOrders++;

      for (const item of items) {
        orderItemId++;
        stmts.push({
          sql: `INSERT INTO order_items (id,order_id,sku,product_name,category,brand,quantity,unit_price,total_price) VALUES (?,?,?,?,?,?,?,?,?)`,
          args: [orderItemId, orderId, item.sku, item.product_name, item.category, item.brand, item.quantity, item.unit_price, item.total_price],
        });
        statItems++;
      }

      if (status === "completada") { completedOrders++; totalSpent += total; }
    }

    stmts.push({
      sql: `UPDATE customers SET total_orders=?,total_spent=?,average_ticket=? WHERE id=?`,
      args: [completedOrders, Math.round(totalSpent), completedOrders > 0 ? Math.round(totalSpent / completedOrders) : 0, customerId],
    });

    if (stmts.length >= BATCH_SIZE * 3) {
      await flush();
      write(`\r   Progreso: ${c + 1}/${TOTAL_CUSTOMERS} clientes (${statOrders.toLocaleString()} órdenes)...`);
    }
  }
  await flush();
  if (verbose) process.stdout.write("\n");

  await client.execute({
    sql: `INSERT INTO imports (account_id,file_name,file_type,import_type,rows_total,rows_imported,rows_skipped,rows_duplicates_merged,status,error_log,created_at) VALUES (?,?,?,?,?,?,0,0,?,?,?)`,
    args: [accountId, "seed-tienda-mascotas.csv", "csv", "orders", statOrders, statOrders, "completado", "[]", now],
  });

  if (verbose) {
    const s = await client.execute(
      `SELECT COUNT(DISTINCT c.id) AS customers,
              COUNT(DISTINCT CASE WHEN c.total_orders >= 2 THEN c.id END) AS repeat_customers,
              COUNT(DISTINCT CASE WHEN (SELECT COUNT(DISTINCT o2.channel) FROM orders o2 WHERE o2.customer_id = c.id AND o2.status='completada') >= 2 THEN c.id END) AS omni_customers,
              COUNT(o.id) AS orders,
              CAST(ROUND(AVG(o.total)) AS INTEGER) AS avg_ticket
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status='completada'
       WHERE c.source = 'seed'`
    );
    const r = s.rows[0] as unknown as { customers: number; repeat_customers: number; omni_customers: number; orders: number; avg_ticket: number };
    log(`\n✅  Seed completado — Tienda de Mascotas (Patagonia)`);
    log(`    Cuenta:              ${accountId} (Tienda de Mascotas)`);
    log(`    Clientes:            ${Number(r.customers).toLocaleString("es-AR")}`);
    log(`    Con recompra:        ${Number(r.repeat_customers).toLocaleString("es-AR")}`);
    log(`    Omnicanal:           ${Number(r.omni_customers).toLocaleString("es-AR")}`);
    log(`    Órdenes totales:     ${Number(r.orders).toLocaleString("es-AR")}`);
    log(`    Ticket promedio:     $${Number(r.avg_ticket).toLocaleString("es-AR")}`);
    log(`    Items generados:     ${statItems.toLocaleString("es-AR")}`);
  }
}

// ─── Exports públicos ──────────────────────────────────────────────────────────

function makeClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./cdp.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

/** Borra todo y recrea el dataset (usado por `npm run seed`). */
export async function forceSeed(): Promise<void> {
  const client = makeClient();
  try {
    await runSeed(client, true);
  } finally {
    client.close();
  }
}

/**
 * Verifica si el dataset semilla ya existe.
 * Si la cuenta "Tienda de Mascotas" tiene menos de 500 clientes con source='seed',
 * corre el seed completo. Usado en instrumentation.ts al iniciar el servidor.
 */
export async function checkAndSeed(): Promise<void> {
  const client = makeClient();
  try {
    await ensureSchema(client);

    const result = await client.execute(
      "SELECT COUNT(*) as cnt FROM customers WHERE source = 'seed'"
    );
    const count = Number((result.rows[0] as unknown as { cnt: number }).cnt);

    if (count < 500) {
      console.log("🌱  [auto-seed] Dataset de Tienda de Mascotas no encontrado — sembrando...");
      await runSeed(client, true);
    }
  } catch (err) {
    console.error("⚠️  [auto-seed] Error durante la inicialización:", err);
  } finally {
    client.close();
  }
}
