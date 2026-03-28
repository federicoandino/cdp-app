"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Users, TrendingUp, DollarSign, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { RFM_SEGMENT_COLORS, RFM_SEGMENTS } from "@/lib/rfm";
import type { Segment } from "@/db/schema";

interface RFMStats {
  segment: string | null;
  count: number;
  avg_ticket: number;
  total_revenue: number;
}

interface MatrixCell {
  recency: number | null;
  frequency: number | null;
  count: number;
}

export default function RFMPage() {
  const [segments, setSegments] = useState<(Segment & { percentage: number })[]>([]);
  const [rfmStats, setRFMStats] = useState<RFMStats[]>([]);
  const [matrix, setMatrix] = useState<MatrixCell[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [lastRecalc, setLastRecalc] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [segRes, rfmRes] = await Promise.all([
        fetch("/api/segments"),
        fetch("/api/segments/rfm"),
      ]);
      const segData = await segRes.json();
      const rfmData = await rfmRes.json();

      const rfmSegs = (segData.data ?? []).filter((s: Segment) => s.is_rfm_auto);
      setSegments(rfmSegs);
      setTotalCustomers(segData.total ?? 0);
      setRFMStats(rfmData.segments ?? []);
      setMatrix(rfmData.matrix ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecalc = async () => {
    setRecalcLoading(true);
    try {
      const res = await fetch("/api/segments/rfm", { method: "POST" });
      const data = await res.json();
      setLastRecalc(new Date().toLocaleTimeString("es-AR"));
      await fetchData();
      alert(`✓ RFM recalculado: ${data.updated} clientes actualizados`);
    } catch (err) {
      alert("Error al recalcular RFM");
    } finally {
      setRecalcLoading(false);
    }
  };

  // Build matrix grid (5x5: Recency 1-5 vs Frequency 1-5)
  const getMatrixCount = (r: number, f: number) => {
    const cell = matrix.find((c) => c.recency === r && c.frequency === f);
    return cell?.count ?? 0;
  };

  const maxCount = Math.max(...matrix.map((c) => c.count), 1);

  const matrixColors = (count: number) => {
    const pct = count / maxCount;
    if (pct === 0) return "bg-gray-50 text-gray-300";
    if (pct < 0.2) return "bg-indigo-50 text-indigo-400";
    if (pct < 0.4) return "bg-indigo-100 text-indigo-600";
    if (pct < 0.6) return "bg-indigo-200 text-indigo-700";
    if (pct < 0.8) return "bg-indigo-300 text-indigo-800";
    return "bg-indigo-500 text-white";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Análisis RFM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Segmentación automática basada en Recencia, Frecuencia y Monto
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRecalc && (
            <span className="text-xs text-gray-400">Último cálculo: {lastRecalc}</span>
          )}
          <button
            onClick={handleRecalc}
            disabled={recalcLoading}
            className="btn-primary"
          >
            {recalcLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Recalcular RFM</>
            )}
          </button>
        </div>
      </div>

      {/* RFM Matrix */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">Mapa de Calor RFM</h2>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-indigo-50 border border-gray-200" /> Pocos
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-indigo-200" /> Medio
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-indigo-500" /> Muchos
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Y axis label */}
          <div className="flex items-center">
            <div className="text-xs text-gray-400 -rotate-90 whitespace-nowrap w-4" style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}>
              Recencia →
            </div>
          </div>

          <div className="flex-1">
            {/* Column headers (Frequency) */}
            <div className="grid grid-cols-5 gap-1.5 mb-1.5 ml-12">
              {[1, 2, 3, 4, 5].map((f) => (
                <div key={f} className="text-center text-xs text-gray-400 font-medium">F{f}</div>
              ))}
            </div>

            {/* Matrix rows */}
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="grid grid-cols-5 gap-1.5 mb-1.5 items-center">
                <div className="text-xs text-gray-400 font-medium text-right pr-2 col-span-0 w-10 shrink-0 -ml-10 inline-block">
                  R{r}
                </div>
                {[1, 2, 3, 4, 5].map((f) => {
                  const count = getMatrixCount(r, f);
                  return (
                    <div
                      key={f}
                      className={cn(
                        "h-14 rounded-lg flex items-center justify-center font-semibold text-sm transition-all hover:scale-105 cursor-default",
                        matrixColors(count)
                      )}
                      title={`R${r}/F${f}: ${count} clientes`}
                    >
                      {count > 0 ? formatNumber(count) : "—"}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* X axis label */}
            <p className="text-xs text-gray-400 text-center mt-2">Frecuencia →</p>
          </div>
        </div>
      </div>

      {/* Segment cards */}
      <h2 className="section-title mb-4">Segmentos automáticos</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(segments.length > 0 ? segments : RFM_SEGMENTS.filter(s => s !== "Sin Clasificar").map(name => ({
            id: 0, name, customer_count: 0, percentage: 0, is_rfm_auto: true,
            description: null, filters: [], created_at: null, updated_at: null
          }))).map((seg) => {
            const colors = RFM_SEGMENT_COLORS[seg.name] ?? { badge: "bg-gray-100 text-gray-600" };
            const stats = rfmStats.find((s) => s.segment === seg.name);

            return (
              <Link
                key={seg.id || seg.name}
                href={seg.id ? `/segments/${seg.id}` : "#"}
                className="bg-white rounded-xl border border-gray-100 shadow-card p-5 hover:shadow-card-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <RFMBadge segment={seg.name} />
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatNumber(seg.customer_count ?? 0)}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {((seg.percentage ?? 0)).toFixed(1)}% de la base
                  </span>
                  {stats?.avg_ticket && stats.avg_ticket > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {formatCurrency(stats.avg_ticket)} prom.
                    </span>
                  )}
                </div>
                {stats?.total_revenue && stats.total_revenue > 0 && (
                  <p className="text-xs text-indigo-600 font-medium mt-2">
                    {formatCurrency(stats.total_revenue)} revenue total
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* RFM Explanation */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 className="section-title mb-3">¿Cómo se calcula el RFM?</h3>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-blue-700 font-bold text-sm">R</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Recencia</p>
            <p className="text-gray-500 text-xs">
              Días desde la última compra. Score 5 = compró muy recientemente. Score 1 = lleva mucho tiempo sin comprar.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-green-700 font-bold text-sm">F</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Frecuencia</p>
            <p className="text-gray-500 text-xs">
              Cantidad total de compras realizadas. Score 5 = cliente muy frecuente. Score 1 = solo compró una vez.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-indigo-700 font-bold text-sm">M</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Monetario</p>
            <p className="text-gray-500 text-xs">
              Total gastado históricamente. Score 5 = cliente de alto valor económico. Score 1 = bajo gasto acumulado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
