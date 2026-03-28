"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Users, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { RFM_SEGMENT_COLORS, RFM_SEGMENTS } from "@/lib/rfm";
import type { Segment } from "@/db/schema";

interface RFMStats {
  segment: string | null;
  count: number;
  avg_ticket: number;
  total_revenue: number;
}

export default function RFMPage() {
  const [segments, setSegments] = useState<(Segment & { percentage: number })[]>([]);
  const [rfmStats, setRFMStats] = useState<RFMStats[]>([]);
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
      alert(`✓ Segmentos recalculados: ${data.updated} clientes actualizados`);
    } catch {
      alert("Error al recalcular segmentos");
    } finally {
      setRecalcLoading(false);
    }
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
              <><RefreshCw className="w-4 h-4" /> Recalcular</>
            )}
          </button>
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
          {(segments.length > 0
            ? segments
            : RFM_SEGMENTS.filter((s) => s !== "Sin Clasificar").map((name) => ({
                id: 0, name, customer_count: 0, percentage: 0, is_rfm_auto: true,
                description: null, filters: [], created_at: null, updated_at: null,
                account_id: null,
              }))
          ).map((seg) => {
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

      {/* Explanation */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 className="section-title mb-3">¿Cómo se calculan los segmentos?</h3>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-blue-700 font-bold text-sm">R</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Recencia</p>
            <p className="text-gray-500 text-xs">
              Días desde la última compra. Cada segmento define un rango mínimo y máximo de días.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-green-700 font-bold text-sm">F</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Frecuencia</p>
            <p className="text-gray-500 text-xs">
              Compras por año (anualizado desde la primera compra). Define qué tan seguido compra el cliente.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-indigo-700 font-bold text-sm">M</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Monto</p>
            <p className="text-gray-500 text-xs">
              Nivel de gasto relativo a la base: BAJO (33% inferior), MEDIO y ALTO (33% superior). Se calcula dinámicamente.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Los rangos de cada segmento se pueden configurar en{" "}
          <Link href="/segments/config" className="text-indigo-500 hover:underline">
            Configurar Segmentos →
          </Link>
        </p>
      </div>
    </div>
  );
}
