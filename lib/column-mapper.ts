/**
 * Column mapping utilities: auto-detects CSV/Excel column names
 * and maps them to known system fields.
 */

export type SystemField = {
  key: string;
  label: string;
  description: string;
  required?: boolean;
};

export const CUSTOMER_FIELDS: SystemField[] = [
  { key: "email", label: "Email", description: "Correo electrónico (clave de dedup)", required: true },
  { key: "external_id", label: "ID Externo", description: "DNI, nro cliente, etc." },
  { key: "first_name", label: "Nombre", description: "Nombre del cliente" },
  { key: "last_name", label: "Apellido", description: "Apellido del cliente" },
  { key: "phone", label: "Teléfono", description: "Número de teléfono" },
  { key: "gender", label: "Género", description: "M / F / Otro" },
  { key: "birth_date", label: "Fecha de Nacimiento", description: "Formato: YYYY-MM-DD" },
  { key: "address", label: "Dirección", description: "Calle y número" },
  { key: "city", label: "Ciudad", description: "Ciudad" },
  { key: "state", label: "Provincia/Estado", description: "Provincia o estado" },
  { key: "country", label: "País", description: "País" },
  { key: "zip_code", label: "Código Postal", description: "CP o ZIP" },
  { key: "tags", label: "Tags", description: "Etiquetas separadas por comas" },
];

export const ORDER_FIELDS: SystemField[] = [
  { key: "order_number", label: "Nro Orden", description: "Número de factura/pedido" },
  { key: "customer_email", label: "Email Cliente", description: "Email para vincular cliente", required: true },
  { key: "customer_external_id", label: "ID Externo Cliente", description: "DNI/nro cliente para vincular" },
  { key: "order_date", label: "Fecha Orden", description: "Fecha de la compra" },
  { key: "channel", label: "Canal", description: "ecommerce / tienda física / marketplace" },
  { key: "store_name", label: "Tienda/Sucursal", description: "Nombre de la tienda" },
  { key: "status", label: "Estado", description: "completada / cancelada / devuelta" },
  { key: "subtotal", label: "Subtotal", description: "Importe antes de descuentos" },
  { key: "discount", label: "Descuento", description: "Monto de descuento" },
  { key: "tax", label: "Impuesto", description: "IVA u otro impuesto" },
  { key: "total", label: "Total", description: "Importe final", required: true },
  { key: "payment_method", label: "Método de Pago", description: "Efectivo, tarjeta, etc." },
  { key: "currency", label: "Moneda", description: "ARS, USD, etc." },
  // Order item fields
  { key: "sku", label: "SKU", description: "Código de producto" },
  { key: "product_name", label: "Producto", description: "Nombre del producto" },
  { key: "category", label: "Categoría", description: "Categoría del producto" },
  { key: "brand", label: "Marca", description: "Marca del producto" },
  { key: "quantity", label: "Cantidad", description: "Unidades" },
  { key: "unit_price", label: "Precio Unitario", description: "Precio por unidad" },
];

// Combined fields for planillas that have both customer + order data per row
export const COMBINED_FIELDS: SystemField[] = [
  // Customer fields
  { key: "email", label: "Email cliente", description: "Correo electrónico (clave de dedup)", required: true },
  { key: "external_id", label: "ID Externo / DNI", description: "DNI, nro cliente, etc." },
  { key: "first_name", label: "Nombre", description: "Nombre del cliente" },
  { key: "last_name", label: "Apellido", description: "Apellido del cliente" },
  { key: "phone", label: "Teléfono", description: "Número de teléfono" },
  { key: "gender", label: "Género", description: "M / F / Otro" },
  { key: "birth_date", label: "Fecha de Nacimiento", description: "Fecha de nacimiento del cliente" },
  { key: "city", label: "Ciudad", description: "Ciudad del cliente" },
  { key: "state", label: "Provincia/Estado", description: "Provincia o estado" },
  { key: "country", label: "País", description: "País del cliente" },
  { key: "zip_code", label: "Código Postal", description: "CP o ZIP" },
  { key: "address", label: "Dirección", description: "Calle y número" },
  { key: "tags", label: "Tags", description: "Etiquetas separadas por comas" },
  // Order fields
  { key: "order_number", label: "Nro Orden", description: "Número de factura/pedido" },
  { key: "order_date", label: "Fecha Orden", description: "Fecha de la compra", required: true },
  { key: "total", label: "Total", description: "Importe total de la orden", required: true },
  { key: "subtotal", label: "Subtotal", description: "Importe antes de descuentos" },
  { key: "discount", label: "Descuento", description: "Monto de descuento" },
  { key: "tax", label: "Impuesto/IVA", description: "IVA u otro impuesto" },
  { key: "channel", label: "Canal", description: "ecommerce / tienda física / marketplace" },
  { key: "store_name", label: "Tienda/Sucursal", description: "Nombre de la tienda" },
  { key: "status", label: "Estado Orden", description: "completada / cancelada / devuelta" },
  { key: "payment_method", label: "Método de Pago", description: "Efectivo, tarjeta, etc." },
  { key: "currency", label: "Moneda", description: "ARS, USD, etc." },
  // Item fields (optional)
  { key: "sku", label: "SKU Producto", description: "Código de producto" },
  { key: "product_name", label: "Producto", description: "Nombre del producto" },
  { key: "category", label: "Categoría", description: "Categoría del producto" },
  { key: "brand", label: "Marca", description: "Marca del producto" },
  { key: "quantity", label: "Cantidad", description: "Unidades del producto" },
  { key: "unit_price", label: "Precio Unitario", description: "Precio por unidad" },
];

// Mapping from common column name variants → system field key
const COLUMN_ALIASES: Record<string, string> = {
  // Email
  email: "email",
  correo: "email",
  "e-mail": "email",
  "e_mail": "email",
  "email address": "email",
  "correo electrónico": "email",
  "correo electronico": "email",
  mail: "email",

  // Names
  nombre: "first_name",
  "first name": "first_name",
  "first_name": "first_name",
  firstname: "first_name",
  "nombre de pila": "first_name",
  apellido: "last_name",
  "last name": "last_name",
  "last_name": "last_name",
  lastname: "last_name",
  surname: "last_name",
  "nombre completo": "first_name",
  "full name": "first_name",
  "nombre y apellido": "first_name",

  // Phone
  telefono: "phone",
  teléfono: "phone",
  "tel": "phone",
  phone: "phone",
  "phone number": "phone",
  "número de teléfono": "phone",
  celular: "phone",
  "cel": "phone",
  mobile: "phone",

  // ID
  dni: "external_id",
  "id": "external_id",
  "id cliente": "external_id",
  "customer id": "external_id",
  "customer_id": "external_id",
  "external id": "external_id",
  "external_id": "external_id",
  "cod cliente": "external_id",
  "codigo cliente": "external_id",

  // Gender
  gender: "gender",
  genero: "gender",
  género: "gender",
  sexo: "gender",

  // Dates
  "fecha nacimiento": "birth_date",
  "fecha de nacimiento": "birth_date",
  "birth date": "birth_date",
  "birth_date": "birth_date",
  "birthdate": "birth_date",
  dob: "birth_date",

  // Address
  direccion: "address",
  dirección: "address",
  address: "address",
  domicilio: "address",

  // City
  ciudad: "city",
  city: "city",
  localidad: "city",

  // State
  provincia: "state",
  state: "state",
  "estado": "state",

  // Country
  pais: "country",
  país: "country",
  country: "country",

  // Zip
  "codigo postal": "zip_code",
  "código postal": "zip_code",
  "zip": "zip_code",
  "zip_code": "zip_code",
  "zip code": "zip_code",
  "cp": "zip_code",

  // Order fields
  "nro orden": "order_number",
  "nro. orden": "order_number",
  "numero orden": "order_number",
  "número de orden": "order_number",
  "order number": "order_number",
  "order_number": "order_number",
  "order id": "order_number",
  "order_id": "order_number",
  "factura": "order_number",
  "nro factura": "order_number",

  "fecha": "order_date",
  "fecha orden": "order_date",
  "fecha de compra": "order_date",
  "order date": "order_date",
  "order_date": "order_date",
  "date": "order_date",

  "canal": "channel",
  "channel": "channel",

  "tienda": "store_name",
  "sucursal": "store_name",
  "store": "store_name",
  "store name": "store_name",
  "store_name": "store_name",

  "estado orden": "status",
  "status": "status",
  "estado pedido": "status",

  "subtotal": "subtotal",
  "descuento": "discount",
  "discount": "discount",
  "iva": "tax",
  "tax": "tax",
  "total": "total",
  "monto": "total",
  "importe": "total",
  "amount": "total",

  "medio de pago": "payment_method",
  "metodo de pago": "payment_method",
  "método de pago": "payment_method",
  "payment method": "payment_method",
  "payment_method": "payment_method",
  "forma de pago": "payment_method",

  "moneda": "currency",
  "currency": "currency",

  // Items
  "sku": "sku",
  "codigo producto": "sku",
  "código producto": "sku",
  "product code": "sku",

  "producto": "product_name",
  "product": "product_name",
  "product name": "product_name",
  "product_name": "product_name",
  "descripcion": "product_name",

  "categoria": "category",
  "categoría": "category",
  "category": "category",
  "rubro": "category",

  "marca": "brand",
  "brand": "brand",

  "cantidad": "quantity",
  "quantity": "quantity",
  "qty": "quantity",
  "units": "quantity",

  "precio unitario": "unit_price",
  "unit price": "unit_price",
  "unit_price": "unit_price",
  "precio": "unit_price",
  "price": "unit_price",

  // Linking
  "email cliente": "customer_email",
  "customer email": "customer_email",
  "customer_email": "customer_email",
};

// Field sets used for import-type detection
const ORDER_SIGNAL_FIELDS = new Set(["order_date", "total", "subtotal", "order_number", "payment_method", "channel", "status"]);
const CUSTOMER_SIGNAL_FIELDS = new Set(["email", "first_name", "last_name", "phone", "birth_date", "gender"]);
const ORDER_ONLY_LINK_FIELDS = new Set(["customer_email", "customer_external_id"]);

/**
 * Detects the import type from the auto-detected column mapping.
 * Returns "combined", "customers", or "orders".
 */
export function detectImportType(mapping: Record<string, string>): "combined" | "customers" | "orders" {
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));

  const hasOrderSignals = [...ORDER_SIGNAL_FIELDS].some((f) => mappedFields.has(f));
  const hasCustomerSignals = [...CUSTOMER_SIGNAL_FIELDS].some((f) => mappedFields.has(f));
  const hasOrderLinkOnly = [...ORDER_ONLY_LINK_FIELDS].some((f) => mappedFields.has(f));

  if (hasOrderSignals && hasCustomerSignals) return "combined";
  if (hasOrderSignals && hasOrderLinkOnly) return "orders";
  if (hasOrderSignals) return "combined"; // order cols + email (mapped to "email" not "customer_email") → combined
  return "customers";
}

export function autoDetectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g, " ");

    const match = COLUMN_ALIASES[normalized] || COLUMN_ALIASES[header.toLowerCase().trim()];
    if (match) {
      mapping[header] = match;
    }
  }

  return mapping;
}

export function normalizeValue(value: unknown, fieldKey: string): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();

  switch (fieldKey) {
    case "total":
    case "subtotal":
    case "discount":
    case "tax":
    case "unit_price":
    case "total_price": {
      const num = parseFloat(str.replace(/[$,\s]/g, ""));
      return isNaN(num) ? null : num;
    }
    case "quantity": {
      const num = parseInt(str, 10);
      return isNaN(num) ? 1 : num;
    }
    case "gender": {
      const g = str.toUpperCase();
      if (g === "M" || g === "MASCULINO" || g === "MALE") return "M";
      if (g === "F" || g === "FEMENINO" || g === "FEMALE") return "F";
      return "No especificado";
    }
    case "email":
      return str.toLowerCase();
    case "birth_date":
    case "order_date":
    case "first_purchase_date":
    case "last_purchase_date": {
      // Try to parse various date formats
      const parsed = parseDateString(str);
      return parsed;
    }
    default:
      return str;
  }
}

function parseDateString(str: string): string | null {
  if (!str) return null;

  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Try DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try MM/DD/YYYY (US format)
  const mdyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try Excel serial date (number)
  const serial = parseFloat(str);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().substring(0, 10);
  }

  // Fallback: try Date constructor
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substring(0, 10);
    }
  } catch {
    // ignore
  }

  return null;
}
