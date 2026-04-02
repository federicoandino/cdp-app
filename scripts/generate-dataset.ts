/**
 * Genera tienda-mascotas-dataset.xlsx listo para importar en la app
 * con tipo "combinado" (clientes + órdenes + productos).
 * Run: npx tsx scripts/generate-dataset.ts
 */

import * as XLSX from "xlsx";
import * as path from "path";
import * as os from "os";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function weightedPick<T>(items: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function daysToRepurchase(): number {
  // Distribución exponencial con mediana ~30 días, mínimo 7 días
  const lambda = Math.LN2 / 30;
  const raw = Math.round(-Math.log(Math.random()) / lambda);
  return Math.max(7, Math.min(raw, 730));
}

function addDays(dateStr: string, days: number): string {
  // Usar métodos UTC para evitar bugs de timezone
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split("T")[0];
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

const MALE_NAMES   = ["Santiago","Mateo","Joaquín","Benjamín","Lucas","Martín","Tomás","Nicolás","Agustín","Franco","Diego","Federico","Rodrigo","Ezequiel","Leandro","Hernán","Gustavo","Pablo","Sergio","Roberto","Gabriel","Alejandro","Maximiliano","Gonzalo","Cristian","Daniel","Ignacio","Emiliano","Facundo","Alan","Eduardo","Marcelo","Raúl","Hugo","Ricardo","Claudio","Sebastián","Andrés","Javier","Oscar","Manuel","Ramiro","Damián","Enzo","Lautaro","Bruno","Nahuel","Iván","Walter","Adrián"];
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

type Product = { sku: string; name: string; brand: string; category: string; price: number };

const ALL_PRODUCTS: Product[] = [
  { sku:"PAC-20KG",  name:"Pacha Mix Perro Adulto Carne y Pollo 20kg",      brand:"Pacha",           category:"Alimento Perro",    price:52000  },
  { sku:"PAC-10KG",  name:"Pacha Mix Perro Adulto 10kg",                    brand:"Pacha",           category:"Alimento Perro",    price:28000  },
  { sku:"GCA-21KG",  name:"Gran Campeón Perro Adulto 21kg",                 brand:"Gran Campeón",    category:"Alimento Perro",    price:48000  },
  { sku:"GCA-C20",   name:"Gran Campeón Cachorro 20kg",                     brand:"Gran Campeón",    category:"Alimento Perro",    price:52000  },
  { sku:"SIE-20KG",  name:"Sieger Premium Perro Adulto 20kg",               brand:"Sieger",          category:"Alimento Perro",    price:61000  },
  { sku:"PRO-20KG",  name:"Protemix Perro Adulto 20kg",                     brand:"Protemix",        category:"Alimento Perro",    price:46000  },
  { sku:"NMX-20KG",  name:"Nutri Mix Perro Adulto 20kg",                    brand:"Nutri Mix",       category:"Alimento Perro",    price:32000  },
  { sku:"PED-21KG",  name:"Pedigree Perro Adulto Pollo y Res 21kg",         brand:"Pedigree",        category:"Alimento Perro",    price:38000  },
  { sku:"DCH-21KG",  name:"Dog Chow Adulto Completo 21kg",                  brand:"Dog Chow",        category:"Alimento Perro",    price:44000  },
  { sku:"EUK-P15",   name:"Eukanuba Perro Adulto Medium 15kg",              brand:"Eukanuba",        category:"Alimento Perro",    price:92000  },
  { sku:"RCA-P15",   name:"Royal Canin Medium Adult 15kg",                  brand:"Royal Canin",     category:"Alimento Perro",    price:98000  },
  { sku:"RCA-MX15",  name:"Royal Canin Maxi Adult 15kg",                    brand:"Royal Canin",     category:"Alimento Perro",    price:105000 },
  { sku:"PPL-P12",   name:"Pro Plan Perro Adulto Pollo 12kg",               brand:"Purina Pro Plan", category:"Alimento Perro",    price:85000  },
  { sku:"HLL-P12",   name:"Hill's Science Diet Perro Adulto 12kg",          brand:"Hill's",          category:"Alimento Perro",    price:118000 },
  { sku:"ACA-P11",   name:"Acana Adult Large Breed 11.4kg",                 brand:"Acana",           category:"Alimento Perro",    price:148000 },
  { sku:"EUK-G75",   name:"Eukanuba Gato Adulto 7.5kg",                     brand:"Eukanuba",        category:"Alimento Gato",     price:82400  },
  { sku:"EUK-GK75",  name:"Eukanuba Gato Kitten 7.5kg",                     brand:"Eukanuba",        category:"Alimento Gato",     price:86500  },
  { sku:"OPG-75",    name:"Old Prince Gato Adulto Cordero y Arroz 7.5kg",   brand:"Old Prince",      category:"Alimento Gato",     price:55000  },
  { sku:"RCA-G4",    name:"Royal Canin Gato Adulto Indoor 4kg",             brand:"Royal Canin",     category:"Alimento Gato",     price:62000  },
  { sku:"WHI-G10",   name:"Whiskas Gato Adulto Pollo 10kg",                 brand:"Whiskas",         category:"Alimento Gato",     price:42000  },
  { sku:"PPL-G35",   name:"Pro Plan Gato Adulto Esterilizado 3.5kg",        brand:"Purina Pro Plan", category:"Alimento Gato",     price:52000  },
  { sku:"HLL-G73",   name:"Hill's Science Diet Gato Adulto 7.3kg",          brand:"Hill's",          category:"Alimento Gato",     price:95000  },
  { sku:"GSE-G75",   name:"Gato Selection Adulto 7.5kg",                    brand:"Gato Selection",  category:"Alimento Gato",     price:48000  },
  { sku:"WIS-G85",   name:"Whiskas Gato Adulto Atún 85gr",                  brand:"Whiskas",         category:"Alimento Húmedo",   price:2200   },
  { sku:"FCF-G85",   name:"Fancy Feast Gato Ternera y Vegetales 85gr",      brand:"Fancy Feast",     category:"Alimento Húmedo",   price:3200   },
  { sku:"PED-P340",  name:"Pedigree Perro Adulto Carne 340gr",              brand:"Pedigree",        category:"Alimento Húmedo",   price:3800   },
  { sku:"RCW-P400",  name:"Royal Canin Perro Húmedo Adulto 400gr",          brand:"Royal Canin",     category:"Alimento Húmedo",   price:5500   },
  { sku:"FRL-P",     name:"Antipulgas Frontline Plus Perro",                brand:"Frontline",       category:"Antiparasitario",   price:18500  },
  { sku:"FRL-G",     name:"Antipulgas Frontline Plus Gato",                 brand:"Frontline",       category:"Antiparasitario",   price:15000  },
  { sku:"SER-P",     name:"Collar Antiparasitario Seresto Perro",           brand:"Seresto",         category:"Antiparasitario",   price:35000  },
  { sku:"SER-G",     name:"Collar Antiparasitario Seresto Gato",            brand:"Seresto",         category:"Antiparasitario",   price:28000  },
  { sku:"ARE-10KG",  name:"Arena Felina Gruesa 10kg",                       brand:"Catmax",          category:"Higiene Gato",      price:12800  },
  { sku:"ARE-20KG",  name:"Arena Felina Aglomerante 20kg",                  brand:"Catmax",          category:"Higiene Gato",      price:22500  },
  { sku:"DRC-SH500", name:"Shampoo Dermocanis Neutro 500ml",                brand:"Dermocanis",      category:"Higiene y Cuidado", price:8900   },
  { sku:"BOL-50",    name:"Bolsas Recolectoras Biodegradables x50",         brand:"Genérico",        category:"Higiene Perro",     price:4500   },
  { sku:"KNG-M",     name:"Kong Classic Talle M",                           brand:"Kong",            category:"Juguetes",          price:15600  },
  { sku:"GIW-L",     name:"Pelota Gigwi Squeaker L",                        brand:"Gigwi",           category:"Juguetes",          price:17400  },
  { sku:"COR-RET",   name:"Correa Retráctil Flexi 5m",                      brand:"Flexi",           category:"Accesorios",        price:18900  },
  { sku:"ARN-M",     name:"Arnés Reflectivo Talle M",                       brand:"Genérico",        category:"Accesorios",        price:22000  },
  { sku:"BEB-AUT",   name:"Bebedero Automático 1.5L",                       brand:"Genérico",        category:"Accesorios",        price:12400  },
  { sku:"RAS-TOR",   name:"Rascador Torre para Gato",                       brand:"Genérico",        category:"Accesorios Gato",   price:45000  },
  { sku:"CAM-POL",   name:"Cama Polar Redonda Talle M",                     brand:"Genérico",        category:"Camas y Cuchas",    price:28000  },
  { sku:"DEN-7",     name:"Dentastix Perro Mediano x7",                     brand:"Pedigree",        category:"Snacks y Premios",  price:8200   },
  { sku:"PRE-CAR",   name:"Premio Naturals Carne Deshidratada 100gr",       brand:"Naturals",        category:"Snacks y Premios",  price:6500   },
  { sku:"SNA-GAT",   name:"Temptations Gato Pollo x30",                     brand:"Temptations",     category:"Snacks y Premios",  price:4800   },
];

// Productos con mayor peso en las órdenes (alimentos son el grueso)
const PRODUCT_WEIGHTS = ALL_PRODUCTS.map((p) =>
  p.category.startsWith("Alimento") ? 4 : p.category === "Antiparasitario" ? 2 : 1
);

const CHANNEL_PROFILES = [
  { type: "online_only",   weight: 28, channels: ["ecommerce"],                                channelWeights: [1]            },
  { type: "physical_only", weight: 22, channels: ["tienda física"],                             channelWeights: [1]            },
  { type: "marketplace",   weight:  8, channels: ["marketplace"],                               channelWeights: [1]            },
  { type: "omni_oe",       weight: 20, channels: ["ecommerce","tienda física"],                 channelWeights: [0.55,0.45]    },
  { type: "omni_all",      weight: 12, channels: ["ecommerce","tienda física","marketplace"],   channelWeights: [0.45,0.35,0.20] },
  { type: "omni_om",       weight:  6, channels: ["ecommerce","marketplace"],                   channelWeights: [0.60,0.40]    },
  { type: "omni_pm",       weight:  4, channels: ["tienda física","marketplace"],               channelWeights: [0.55,0.45]    },
];

const ORDER_DIST: [number, number][] = [[1,36],[2,22],[3,15],[4,11],[5,7],[6,5],[7,3],[8,1]];
const PAYMENTS = ["Tarjeta de crédito","Tarjeta de crédito","Tarjeta de débito","Efectivo","Transferencia bancaria","MercadoPago","MercadoPago"];
const STORES   = ["Bariloche Centro","Neuquén Capital","Comodoro Rivadavia","Puerto Madryn","Esquel","General Roca","Cipolletti"];
const TODAY    = "2026-04-01";
const TOTAL    = 3000;

function pickChannel(profile: typeof CHANNEL_PROFILES[0], orderIndex: number, totalOrders: number): string {
  const { channels, channelWeights } = profile;
  if (channels.length === 1) return channels[0];
  if (totalOrders >= channels.length && orderIndex < channels.length) return channels[orderIndex % channels.length];
  return weightedPick(channels, channelWeights);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const rows: Record<string, unknown>[] = [];
const emailCount = new Map<string, number>();
let orderSeq = 1;

for (let c = 0; c < TOTAL; c++) {
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

  for (let oi = 0; oi < orderDates.length; oi++) {
    const product   = weightedPick(ALL_PRODUCTS, PRODUCT_WEIGHTS);
    const qty       = product.category.includes("Húmedo") ? randInt(2, 8) : 1;
    const unitPrice = priceVariance(product.price);
    const subtotal  = unitPrice * qty;
    const discount  = Math.random() < 0.18 ? Math.round(subtotal * (0.05 + Math.random() * 0.10)) : 0;
    const total     = subtotal - discount;
    const channel   = pickChannel(profile, oi, orderDates.length);
    const storeName = channel === "ecommerce" ? "Tienda Online" : channel === "marketplace" ? "MercadoLibre" : rand(STORES);
    const status    = Math.random() < 0.88 ? "completada" : (Math.random() < 0.6 ? "cancelada" : "devuelta");

    rows.push({
      email,
      first_name:      firstName,
      last_name:       lastName,
      phone:           `+549${randInt(2940000000, 2999999999)}`,
      gender,
      city:            location.city,
      state:           location.state,
      country:         "Argentina",
      order_number:    `TDM-${String(orderSeq++).padStart(7,"0")}`,
      order_date:      orderDates[oi],
      channel,
      store_name:      storeName,
      status,
      subtotal,
      discount,
      tax:             0,
      total,
      payment_method:  rand(PAYMENTS),
      currency:        "ARS",
      product_name:    product.name,
      category:        product.category,
      brand:           product.brand,
      sku:             product.sku,
      quantity:        qty,
      unit_price:      unitPrice,
    });
  }

  if ((c + 1) % 500 === 0) process.stdout.write(`\r   Generando... ${c + 1}/${TOTAL} clientes`);
}
process.stdout.write("\n");

const ws = XLSX.utils.json_to_sheet(rows);
ws["!cols"] = [
  {wch:32},{wch:12},{wch:16},{wch:18},{wch:6},{wch:14},{wch:14},{wch:12},
  {wch:14},{wch:12},{wch:14},{wch:26},{wch:12},{wch:10},{wch:10},{wch:10},
  {wch:8},{wch:10},{wch:20},{wch:8},{wch:40},{wch:20},{wch:18},{wch:14},{wch:8},{wch:12},
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Tienda de Mascotas");

const outPath = path.join(os.homedir(), "Desktop", "tienda-mascotas-dataset.xlsx");
XLSX.writeFile(wb, outPath);

console.log(`\n✅  Archivo generado: ${outPath}`);
console.log(`   Filas (órdenes): ${rows.length.toLocaleString("es-AR")}`);
console.log(`   Clientes únicos: ${TOTAL.toLocaleString("es-AR")}`);
