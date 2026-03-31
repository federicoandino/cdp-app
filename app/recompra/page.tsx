"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, TrendingUp, Clock, Info } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface DataPoint {
  day: number;
  count: number;
  cumulative: number;
  cumulative_pct: number;
}

interface Milestone {
  pct: number;
  day: number | null;
}

interface RecompraData {
  data: DataPoint[];
  total: number;
  milestones: Milestone[];
  median: number | null;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: DataPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DataPoint;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">Día {d.day}</p>
      <p className="text-gray-500">
        <span className="font-medium text-gray-700">{formatNumber(d.count)}</span> nuevas recompras
      </p>
      <p className="text-gray-500">
        <span className="font-medium text-indigo-600">{d.cumulative_pct}%</span> acumulado
      </p>
      <p className="text-gray-400 text-xs mt-1">{formatNumber(d.cumulative)} clientes acumulados</p>
    </div>
  );
}

export default function RecompraPage() {
  const [data, setData] = useState<RecompraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recompra")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  const milestone80 = data?.milestones.find((m) => m.pct === 80);
  const milestone50 = data?.milestones.find((m) => m.pct === 50);

  const chartData = data?.data.filter((d) => d.day <= 365) ?? [];
  const hasOutliers = (data?.data.length ?? 0) > chartData.length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Análisis Recompra</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Comportamiento de clientes que realizaron 2 o más compras
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Clientes con recompra</span>
          </div>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse w-24" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data?.total ?? 0)}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">50% recompró antes del día</span>
          </div>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse w-24" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {milestone50?.day != null ? milestone50.day : "—"}
              <span className="text-sm text-gray-400 font-normal ml-1">días</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">80% recompró antes del día</span>
          </div>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse w-24" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {milestone80?.day != null ? milestone80.day : "—"}
              <span className="text-sm text-gray-400 font-normal ml-1">días</span>
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="section-title">Tiempo hasta la recompra</h2>
          {hasOutliers && (
            <span className="text-xs text-gray-400">
              Mostrando hasta 365 días (existen clientes con recompra posterior)
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Barras: nuevas recompras por día &nbsp;·&nbsp; Línea: % acumulado del total
        </p>

        {loading ? (
          <div className="h-72 bg-gray-50 rounded-lg animate-pulse" />
        ) : error ? (
          <div className="h-72 flex items-center justify-center text-gray-400 text-sm">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
            No hay clientes con 2 o más compras aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                label={{ value: "Días desde la 1ª compra", position: "insideBottom", offset: -8, fontSize: 11, fill: "#9ca3af" }}
                height={45}
              />
              {/* Left Y axis: count */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => formatNumber(v)}
                width={60}
              />
              {/* Right Y axis: cumulative % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#6366f1" }}
                tickFormatter={(v) => `${v}%`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                formatter={(value) => value === "count" ? "Recompras por día" : "% acumulado"}
              />

              {milestone50?.day != null && (
                <ReferenceLine
                  yAxisId="left"
                  x={milestone50.day}
                  stroke="#94a3b8"
                  strokeDasharray="4 3"
                  label={{ value: `50% · día ${milestone50.day}`, position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }}
                />
              )}

              {milestone80?.day != null && (
                <ReferenceLine
                  yAxisId="left"
                  x={milestone80.day}
                  stroke="#6366f1"
                  strokeDasharray="4 3"
                  label={{ value: `80% · día ${milestone80.day}`, position: "insideTopLeft", fontSize: 10, fill: "#6366f1" }}
                />
              )}

              <Bar
                yAxisId="left"
                dataKey="count"
                name="count"
                fill="#c7d2fe"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_pct"
                name="cumulative_pct"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#6366f1" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Milestone chips */}
        {!loading && !error && data && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-50">
            {data.milestones.map(
              (m) =>
                m.day != null && (
                  <div
                    key={m.pct}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    <span className="font-bold">{m.pct}%</span>
                    <span>recompró antes del día</span>
                    <span className="font-bold">{m.day}</span>
                  </div>
                )
            )}
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-indigo-500" />
          <h3 className="section-title">¿Cómo interpretar este gráfico?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Qué muestra el gráfico</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Las barras muestran cuántos clientes hicieron su 2ª compra en cada día. La línea naranja representa el porcentaje acumulado — cuando llega a 80%, el 80% de tus clientes recurrentes ya recompró.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Cómo leer los hitos</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Las líneas de referencia muestran en qué día el 50% y el 80% de tus clientes recurrentes ya habían hecho su segunda compra. Estos son tus ventanas de oportunidad clave para activar campañas.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Aplicación en marketing</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Si el 80% recompra antes del día 267, ese es tu deadline para campañas de reactivación. Clientes que superan ese umbral sin comprar tienen mayor probabilidad de no volver — priorizalos con ofertas especiales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
