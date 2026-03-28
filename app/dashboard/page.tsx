"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp, ShoppingCart, DollarSign, UserCheck, UserX, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { KPICard } from "@/components/ui/kpi-card";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatCurrency, formatDate, formatNumber, getInitials } from "@/lib/utils";
import { RFM_SEGMENT_COLORS } from "@/lib/rfm";
import type { Customer, Import } from "@/db/schema";

interface DashboardData {
  kpis: {
    totalCustomers: number;
    customersWithPurchases: number;
    customersWithoutPurchases: number;
    totalRevenue: number;
    avgTicket: number;
    totalOrders: number;
  };
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  rfmDistribution: { segment: string | null; count: number }[];
  channelDistribution: { channel: string | null; count: number; revenue: number }[];
  topCustomers: Customer[];
  recentImports: Import[];
  customerGrowth: { month: string; count: number }[];
}

const CHART_COLORS = ["#6366F1", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#F97316"];

const formatMonthLabel = (month: string) => {
  if (!month) return "";
  const [year, m] = month.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[parseInt(m) - 1]} ${year.slice(2)}`;
};

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.name.toLowerCase().includes("revenue") || p.name.toLowerCase().includes("monto")
              ? formatCurrency(p.value)
              : formatNumber(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isEmpty = !loading && (data?.kpis.totalCustomers ?? 0) === 0;

  if (loading) {
    return (
      <div className="p-8">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KPICard key={i} title="" value="" loading />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const revenueData = (data?.revenueByMonth ?? []).map((d) => ({
    ...d,
    month: formatMonthLabel(d.month),
  }));
  const rfmData = (data?.rfmDistribution ?? [])
    .filter((d) => d.segment)
    .sort((a, b) => b.count - a.count);
  const channelData = (data?.channelDistribution ?? [])
    .filter((d) => d.channel)
    .map((d) => ({ name: d.channel!, value: d.count }));

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista general de tu base de clientes</p>
        </div>
        <Link href="/import" className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Importar datos
        </Link>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin datos aún</h3>
          <p className="text-gray-500 text-sm mb-4">
            Importá tu primera lista de clientes o transacciones para ver las métricas aquí.
          </p>
          <Link href="/import" className="btn-primary inline-flex">
            Importar datos →
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Total clientes"
          value={formatNumber(kpis?.totalCustomers ?? 0)}
          icon={Users}
          iconColor="bg-indigo-100 text-indigo-600"
          className="xl:col-span-1"
        />
        <KPICard
          title="Con compras"
          value={formatNumber(kpis?.customersWithPurchases ?? 0)}
          icon={UserCheck}
          iconColor="bg-green-100 text-green-600"
          subtitle={kpis?.totalCustomers ? `${((kpis.customersWithPurchases / kpis.totalCustomers) * 100).toFixed(0)}% del total` : undefined}
        />
        <KPICard
          title="Sin compras"
          value={formatNumber(kpis?.customersWithoutPurchases ?? 0)}
          icon={UserX}
          iconColor="bg-orange-100 text-orange-600"
        />
        <KPICard
          title="Revenue total"
          value={formatCurrency(kpis?.totalRevenue ?? 0)}
          icon={DollarSign}
          iconColor="bg-cyan-100 text-cyan-600"
        />
        <KPICard
          title="Ticket promedio"
          value={formatCurrency(kpis?.avgTicket ?? 0)}
          icon={TrendingUp}
          iconColor="bg-purple-100 text-purple-600"
        />
        <KPICard
          title="Órdenes totales"
          value={formatNumber(kpis?.totalOrders ?? 0)}
          icon={ShoppingCart}
          iconColor="bg-pink-100 text-pink-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue chart - 2/3 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 className="section-title mb-4">Revenue mensual (últimos 12 meses)</h3>
          {revenueData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sin datos de órdenes</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Monto" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel pie - 1/3 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 className="section-title mb-4">Canal de compra</h3>
          {channelData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatNumber(v as number)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RFM bar + top customers */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* RFM distribution */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 className="section-title mb-4">Distribución por segmento RFM</h3>
          {rfmData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-300 text-sm gap-3">
              <p>Sin datos de RFM</p>
              <Link href="/rfm" className="text-indigo-500 text-xs hover:underline">Calcular RFM →</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rfmData.map((seg) => {
                const colors = RFM_SEGMENT_COLORS[seg.segment ?? ""] ?? { badge: "bg-gray-100 text-gray-500" };
                const pct = (kpis?.totalCustomers ?? 1) > 0
                  ? ((seg.count / (kpis?.totalCustomers ?? 1)) * 100)
                  : 0;
                return (
                  <div key={seg.segment} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <RFMBadge segment={seg.segment} size="sm" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                      {formatNumber(seg.count)}
                    </span>
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 10 customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="section-title">Top 10 clientes</h3>
          </div>
          {(data?.topCustomers ?? []).length === 0 ? (
            <div className="py-8 text-center text-gray-300 text-sm">Sin datos</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.topCustomers ?? []).map((c, i) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                    {getInitials(c.first_name, c.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Sin nombre"}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 shrink-0">
                    {formatCurrency(c.total_spent)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent imports */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="section-title">Últimas importaciones</h3>
          <Link href="/import" className="text-xs text-indigo-600 hover:underline">Ver historial</Link>
        </div>
        {(data?.recentImports ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400 text-sm">Sin importaciones aún</p>
            <Link href="/import" className="text-indigo-600 text-sm hover:underline block mt-1">
              Importar datos →
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Total</th>
                <th>Importados</th>
                <th>Actualizados</th>
                <th>Errores</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentImports ?? []).map((imp) => (
                <tr key={imp.id} className="cursor-default">
                  <td className="font-medium text-gray-800 max-w-[200px] truncate">{imp.file_name}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 font-medium capitalize">
                      {imp.import_type}
                    </span>
                  </td>
                  <td>{imp.rows_total}</td>
                  <td className="text-green-600 font-medium">{imp.rows_imported}</td>
                  <td className="text-blue-600 font-medium">{imp.rows_duplicates_merged}</td>
                  <td className="text-orange-500 font-medium">{imp.rows_skipped}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      imp.status === "completado" ? "bg-green-100 text-green-700" :
                      imp.status === "error" ? "bg-red-100 text-red-600" :
                      "bg-yellow-100 text-yellow-600"
                    }`}>
                      {imp.status}
                    </span>
                  </td>
                  <td className="text-gray-400 text-sm">{formatDate(imp.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
