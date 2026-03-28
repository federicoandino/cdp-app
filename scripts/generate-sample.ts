import * as XLSX from "xlsx";
import path from "path";

const customers = [
  { email: "laura.gomez@gmail.com",    external_id: "DNI-28441123", first_name: "Laura",    last_name: "Gómez",      phone: "2944-501234", gender: "F", birth_date: "1988-03-15", city: "Bariloche",        state: "Río Negro",   country: "Argentina", zip_code: "8400" },
  { email: "martin.silva@hotmail.com", external_id: "DNI-31882047", first_name: "Martín",   last_name: "Silva",      phone: "299-4821345", gender: "M", birth_date: "1991-07-22", city: "Neuquén",          state: "Neuquén",     country: "Argentina", zip_code: "8300" },
  { email: "ana.torres@gmail.com",     external_id: "DNI-25563489", first_name: "Ana",      last_name: "Torres",     phone: "297-4651234", gender: "F", birth_date: "1985-11-08", city: "Comodoro Rivadavia", state: "Chubut",    country: "Argentina", zip_code: "9000" },
  { email: "diego.rios@yahoo.com",     external_id: "DNI-33124567", first_name: "Diego",    last_name: "Ríos",       phone: "2944-712345", gender: "M", birth_date: "1993-04-30", city: "Bariloche",        state: "Río Negro",   country: "Argentina", zip_code: "8400" },
  { email: "sofia.mendez@gmail.com",   external_id: "DNI-29887654", first_name: "Sofía",    last_name: "Méndez",     phone: "299-5431234", gender: "F", birth_date: "1990-09-14", city: "Neuquén",          state: "Neuquén",     country: "Argentina", zip_code: "8300" },
  { email: "pablo.vera@gmail.com",     external_id: "DNI-27334512", first_name: "Pablo",    last_name: "Vera",       phone: "2902-421234", gender: "M", birth_date: "1987-01-25", city: "San Martín de los Andes", state: "Neuquén", country: "Argentina", zip_code: "8370" },
  { email: "carolina.paz@hotmail.com", external_id: "DNI-35221098", first_name: "Carolina", last_name: "Paz",        phone: "2945-331234", gender: "F", birth_date: "1995-06-03", city: "Esquel",           state: "Chubut",      country: "Argentina", zip_code: "9200" },
  { email: "lucas.ferrer@gmail.com",   external_id: "DNI-30445678", first_name: "Lucas",    last_name: "Ferrer",     phone: "2944-621345", gender: "M", birth_date: "1992-12-18", city: "Bariloche",        state: "Río Negro",   country: "Argentina", zip_code: "8400" },
  { email: "valentina.rojas@gmail.com",external_id: "DNI-32109876", first_name: "Valentina",last_name: "Rojas",      phone: "299-3251234", gender: "F", birth_date: "1994-08-07", city: "Neuquén",          state: "Neuquén",     country: "Argentina", zip_code: "8300" },
  { email: "german.luna@yahoo.com",    external_id: "DNI-26778234", first_name: "Germán",   last_name: "Luna",       phone: "297-5561234", gender: "M", birth_date: "1986-02-11", city: "Comodoro Rivadavia", state: "Chubut",    country: "Argentina", zip_code: "9000" },
];

const orders = [
  // Laura - 3 órdenes (cliente leal)
  { email: "laura.gomez@gmail.com",    order_number: "ORD-1001", order_date: "2024-02-10", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 89500,  subtotal: 89500,  discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Eukanuba Adult Medium 15kg",    category: "Alimento Perro",  brand: "Eukanuba", sku: "EUK-AM-15", quantity: 1, unit_price: 89500 },
  { email: "laura.gomez@gmail.com",    order_number: "ORD-1002", order_date: "2024-03-12", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 124000, subtotal: 130000, discount: 6000, tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Royal Canin Maxi Adult 15kg",   category: "Alimento Perro",  brand: "Royal Canin", sku: "RC-MA-15", quantity: 1, unit_price: 124000 },
  { email: "laura.gomez@gmail.com",    order_number: "ORD-1003", order_date: "2024-04-20", channel: "tienda física", store_name: "Sucursal Bariloche",        status: "completada", total: 45200,  subtotal: 45200,  discount: 0,    tax: 0, payment_method: "efectivo",         currency: "ARS", product_name: "Frontline Combo Perro M",       category: "Antiparasitario", brand: "Frontline", sku: "FRT-CM", quantity: 2, unit_price: 22600 },

  // Martín - 2 órdenes
  { email: "martin.silva@hotmail.com", order_number: "ORD-1004", order_date: "2024-01-15", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 67800,  subtotal: 67800,  discount: 0,    tax: 0, payment_method: "transferencia",    currency: "ARS", product_name: "Gran Campeón Adulto 21kg",      category: "Alimento Perro",  brand: "Gran Campeón", sku: "GC-A-21", quantity: 1, unit_price: 67800 },
  { email: "martin.silva@hotmail.com", order_number: "ORD-1005", order_date: "2024-03-01", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 156000, subtotal: 156000, discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Seresto Collar Perro Grande",   category: "Antiparasitario", brand: "Seresto", sku: "SRS-PG", quantity: 1, unit_price: 156000 },

  // Ana - 1 orden
  { email: "ana.torres@gmail.com",     order_number: "ORD-1006", order_date: "2024-04-05", channel: "tienda física", store_name: "Sucursal Comodoro",         status: "completada", total: 112500, subtotal: 125000, discount: 12500,tax: 0, payment_method: "tarjeta débito",  currency: "ARS", product_name: "Royal Canin Indoor Cat 7.5kg",  category: "Alimento Gato",   brand: "Royal Canin", sku: "RC-IC-75", quantity: 1, unit_price: 112500 },

  // Diego - 2 órdenes
  { email: "diego.rios@yahoo.com",     order_number: "ORD-1007", order_date: "2024-02-28", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 78900,  subtotal: 78900,  discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Kong Classic Talla L",          category: "Juguete",         brand: "Kong", sku: "KONG-L", quantity: 1, unit_price: 78900 },
  { email: "diego.rios@yahoo.com",     order_number: "ORD-1008", order_date: "2024-04-10", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 95600,  subtotal: 95600,  discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Sieger Adulto Razas Grandes 20kg",category: "Alimento Perro",brand: "Sieger", sku: "SIG-A-20", quantity: 1, unit_price: 95600 },

  // Sofía - 1 orden
  { email: "sofia.mendez@gmail.com",   order_number: "ORD-1009", order_date: "2024-03-22", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 43800,  subtotal: 43800,  discount: 0,    tax: 0, payment_method: "transferencia",    currency: "ARS", product_name: "Catmax Arena Clumping 10kg",    category: "Higiene Gato",    brand: "Catmax", sku: "CAT-CLU-10", quantity: 2, unit_price: 21900 },

  // Pablo - 3 órdenes (cliente frecuente)
  { email: "pablo.vera@gmail.com",     order_number: "ORD-1010", order_date: "2023-11-15", channel: "tienda física", store_name: "Sucursal San Martín",       status: "completada", total: 88000,  subtotal: 88000,  discount: 0,    tax: 0, payment_method: "efectivo",         currency: "ARS", product_name: "Protemix Cachorro 15kg",        category: "Alimento Perro",  brand: "Protemix", sku: "PTX-CAC-15", quantity: 1, unit_price: 88000 },
  { email: "pablo.vera@gmail.com",     order_number: "ORD-1011", order_date: "2024-01-08", channel: "tienda física", store_name: "Sucursal San Martín",       status: "completada", total: 91500,  subtotal: 91500,  discount: 0,    tax: 0, payment_method: "tarjeta débito",   currency: "ARS", product_name: "Protemix Adulto 20kg",          category: "Alimento Perro",  brand: "Protemix", sku: "PTX-A-20", quantity: 1, unit_price: 91500 },
  { email: "pablo.vera@gmail.com",     order_number: "ORD-1012", order_date: "2024-03-05", channel: "tienda física", store_name: "Sucursal San Martín",       status: "completada", total: 34200,  subtotal: 34200,  discount: 0,    tax: 0, payment_method: "efectivo",         currency: "ARS", product_name: "Gigwi Pelota Interactiva",      category: "Juguete",         brand: "Gigwi", sku: "GGW-PI", quantity: 3, unit_price: 11400 },

  // Carolina - 1 orden
  { email: "carolina.paz@hotmail.com", order_number: "ORD-1013", order_date: "2024-04-18", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 185000, subtotal: 200000, discount: 15000,tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Pacha Premium Gato Adulto 7.5kg",category: "Alimento Gato", brand: "Pacha", sku: "PCH-GA-75", quantity: 1, unit_price: 185000 },

  // Lucas - 2 órdenes
  { email: "lucas.ferrer@gmail.com",   order_number: "ORD-1014", order_date: "2024-02-14", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 72300,  subtotal: 72300,  discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Eukanuba Senior Medium 12kg",   category: "Alimento Perro",  brand: "Eukanuba", sku: "EUK-SM-12", quantity: 1, unit_price: 72300 },
  { email: "lucas.ferrer@gmail.com",   order_number: "ORD-1015", order_date: "2024-04-02", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 58100,  subtotal: 58100,  discount: 0,    tax: 0, payment_method: "tarjeta crédito", currency: "ARS", product_name: "Frontline Spray 250ml",         category: "Antiparasitario", brand: "Frontline", sku: "FRT-SPR-250", quantity: 1, unit_price: 58100 },

  // Valentina - 1 orden
  { email: "valentina.rojas@gmail.com",order_number: "ORD-1016", order_date: "2024-04-25", channel: "ecommerce",    store_name: "Tienda de Mascotas Online", status: "completada", total: 109700, subtotal: 109700, discount: 0,    tax: 0, payment_method: "transferencia",    currency: "ARS", product_name: "Royal Canin Persian Cat 4kg",   category: "Alimento Gato",   brand: "Royal Canin", sku: "RC-PRS-4", quantity: 1, unit_price: 109700 },

  // Germán - 2 órdenes
  { email: "german.luna@yahoo.com",    order_number: "ORD-1017", order_date: "2024-01-30", channel: "tienda física", store_name: "Sucursal Comodoro",         status: "completada", total: 145000, subtotal: 145000, discount: 0,    tax: 0, payment_method: "tarjeta débito",   currency: "ARS", product_name: "Gran Campeón Cachorro 20kg",    category: "Alimento Perro",  brand: "Gran Campeón", sku: "GC-CAC-20", quantity: 1, unit_price: 145000 },
  { email: "german.luna@yahoo.com",    order_number: "ORD-1018", order_date: "2024-03-28", channel: "tienda física", store_name: "Sucursal Comodoro",         status: "completada", total: 62400,  subtotal: 62400,  discount: 0,    tax: 0, payment_method: "efectivo",         currency: "ARS", product_name: "Kong Extreme Talla XL",         category: "Juguete",         brand: "Kong", sku: "KONG-XL", quantity: 1, unit_price: 62400 },
];

// Build combined rows: one row per order, with customer data repeated
const rows = orders.map((order) => {
  const customer = customers.find((c) => c.email === order.email)!;
  return {
    email: customer.email,
    external_id: customer.external_id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    gender: customer.gender,
    birth_date: customer.birth_date,
    city: customer.city,
    state: customer.state,
    country: customer.country,
    zip_code: customer.zip_code,
    order_number: order.order_number,
    order_date: order.order_date,
    channel: order.channel,
    store_name: order.store_name,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    payment_method: order.payment_method,
    currency: order.currency,
    product_name: order.product_name,
    category: order.category,
    brand: order.brand,
    sku: order.sku,
    quantity: order.quantity,
    unit_price: order.unit_price,
  };
});

const ws = XLSX.utils.json_to_sheet(rows);

// Set column widths
ws["!cols"] = [
  { wch: 30 }, // email
  { wch: 16 }, // external_id
  { wch: 12 }, // first_name
  { wch: 12 }, // last_name
  { wch: 16 }, // phone
  { wch: 8  }, // gender
  { wch: 14 }, // birth_date
  { wch: 22 }, // city
  { wch: 14 }, // state
  { wch: 12 }, // country
  { wch: 10 }, // zip_code
  { wch: 12 }, // order_number
  { wch: 12 }, // order_date
  { wch: 14 }, // channel
  { wch: 28 }, // store_name
  { wch: 12 }, // status
  { wch: 10 }, // total
  { wch: 10 }, // subtotal
  { wch: 10 }, // discount
  { wch: 8  }, // tax
  { wch: 18 }, // payment_method
  { wch: 8  }, // currency
  { wch: 36 }, // product_name
  { wch: 18 }, // category
  { wch: 14 }, // brand
  { wch: 14 }, // sku
  { wch: 8  }, // quantity
  { wch: 12 }, // unit_price
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Importación");

const outPath = path.join(process.cwd(), "sample-import-combined.xlsx");
XLSX.writeFile(wb, outPath);

console.log(`✅ Generado: sample-import-combined.xlsx`);
console.log(`   Clientes: ${customers.length}`);
console.log(`   Órdenes:  ${orders.length} filas`);
