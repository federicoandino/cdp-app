"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, MapPin, Tag, ShoppingBag, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Package, CreditCard, Store, Globe, Edit
} from "lucide-react";
import { RFMBadge, RFMScoreDisplay } from "@/components/ui/rfm-badge";
import { KPICard } from "@/components/ui/kpi-card";
import { formatCurrency, formatDate, formatRelativeDate, daysSince, getInitials, cn } from "@/lib/utils";
import type { Customer, Order, OrderItem, Segment } from "@/db/schema";

interface CustomerData {
  customer: Customer;
  orders: (Order & { items: OrderItem[] })[];
  segments: Segment[];
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="bg-white rounded-xl p-6 h-48 bg-gray-100" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Cliente no encontrado.</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">Volver</button>
      </div>
    );
  }

  const { customer, orders, segments } = data;
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Sin nombre";
  const recencyDays = daysSince(customer.last_purchase_date);

  const channelIcon = (channel: string | null) => {
    switch (channel?.toLowerCase()) {
      case "ecommerce": return <Globe className="w-3.5 h-3.5" />;
      case "tienda física": return <Store className="w-3.5 h-3.5" />;
      default: return <ShoppingBag className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </button>

      {/* Profile header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700 shrink-0">
            {getInitials(customer.first_name, customer.last_name)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{fullName}</h1>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  {customer.email && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" /> {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" /> {customer.phone}
                    </span>
                  )}
                  {customer.city && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" /> {[customer.city, customer.state, customer.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                {/* Tags */}
                {customer.tags && (customer.tags as string[]).length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    {(customer.tags as string[]).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <RFMBadge segment={customer.rfm_segment} />
                <button className="btn-ghost">
                  <Edit className="w-4 h-4" /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Compras</p>
          <p className="text-2xl font-bold text-gray-900">{customer.total_orders ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">órdenes</p>
        </div>
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Total gastado</p>
          <p className="text-2xl font-bold text-indigo-700">{formatCurrency(customer.total_spent)}</p>
        </div>
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Ticket promedio</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.average_ticket)}</p>
        </div>
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Primera compra</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">{formatDate(customer.first_purchase_date)}</p>
        </div>
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Última compra</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">{formatDate(customer.last_purchase_date)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {recencyDays < 9999 ? `hace ${recencyDays} días` : "sin compras"}
          </p>
        </div>
        <div className="kpi-card lg:col-span-1">
          <p className="text-xs text-gray-500 mb-2">Scores RFM</p>
          <RFMScoreDisplay
            r={customer.rfm_recency_score}
            f={customer.rfm_frequency_score}
            m={customer.rfm_monetary_score}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Orders history - 2/3 */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="section-title">Historial de compras</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {orders.length} órdenes
              </span>
            </div>
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin órdenes registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const statusColors: Record<string, string> = {
                    completada: "bg-green-100 text-green-700",
                    cancelada: "bg-red-100 text-red-600",
                    devuelta: "bg-orange-100 text-orange-600",
                  };
                  return (
                    <div key={order.id}>
                      <div
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleOrder(order.id)}
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              #{order.order_number ?? order.id}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(order.order_date)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            {channelIcon(order.channel)}
                            <span>{order.channel ?? "—"}</span>
                          </div>
                          <div>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[order.status ?? ""] ?? "bg-gray-100 text-gray-500")}>
                              {order.status ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-between">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>
                      </div>
                      {/* Expanded items */}
                      {isExpanded && order.items.length > 0 && (
                        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                              <span>Producto</span>
                              <span>Categoría</span>
                              <span className="text-right">Cant.</span>
                              <span className="text-right">Total</span>
                            </div>
                            {order.items.map((item) => (
                              <div key={item.id} className="grid grid-cols-4 gap-3 text-sm text-gray-700">
                                <div>
                                  <p className="font-medium">{item.product_name ?? "—"}</p>
                                  {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                                </div>
                                <span className="text-gray-500">{item.category ?? "—"}</span>
                                <span className="text-right">{item.quantity}</span>
                                <span className="text-right font-semibold">{formatCurrency(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                          {order.payment_method && (
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 border-t border-gray-200 pt-2">
                              <CreditCard className="w-3 h-3" />
                              <span>Pagado con {order.payment_method}</span>
                              {order.store_name && (
                                <>
                                  <span className="mx-1">·</span>
                                  <Store className="w-3 h-3" />
                                  <span>{order.store_name}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: segments + info */}
        <div className="space-y-4">
          {/* Segments */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="section-title mb-3">Segmentos</h3>
            {customer.rfm_segment ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <RFMBadge segment={customer.rfm_segment} />
                  <span className="text-xs text-gray-400">RFM automático</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin segmento asignado aún</p>
            )}
          </div>

          {/* Customer details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="section-title mb-3">Información personal</h3>
            <div className="space-y-2.5 text-sm">
              {customer.gender && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Género</span>
                  <span className="text-gray-700 font-medium">{customer.gender}</span>
                </div>
              )}
              {customer.birth_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Nacimiento</span>
                  <span className="text-gray-700 font-medium">{formatDate(customer.birth_date)}</span>
                </div>
              )}
              {customer.external_id && (
                <div className="flex justify-between">
                  <span className="text-gray-400">ID Externo</span>
                  <span className="text-gray-700 font-medium font-mono text-xs">{customer.external_id}</span>
                </div>
              )}
              {customer.source && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Origen</span>
                  <span className="text-gray-700 font-medium text-xs">{customer.source}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Registrado</span>
                <span className="text-gray-700 font-medium">{formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="section-title mb-3">Timeline</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Compra #{order.order_number ?? order.id}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(order.order_date)} · {formatCurrency(order.total)}</p>
                  </div>
                </div>
              ))}
              {orders.length > 5 && (
                <p className="text-xs text-gray-400 text-center">+{orders.length - 5} más...</p>
              )}
              {orders.length === 0 && (
                <p className="text-xs text-gray-400">Sin actividad registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
