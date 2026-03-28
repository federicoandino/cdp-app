"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Download, Edit2, Trash2, ChevronRight, Layers, Settings2 } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import type { Segment } from "@/db/schema";

interface SegmentWithPct extends Segment {
  percentage: number;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<SegmentWithPct[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "rfm" | "custom">("all");

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/segments");
      const data = await res.json();
      setSegments(data.data ?? []);
      setTotalCustomers(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSegments(); }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el segmento "${name}"?`)) return;
    await fetch(`/api/segments/${id}`, { method: "DELETE" });
    fetchSegments();
  };

  const handleExport = async (id: number, name: string) => {
    const res = await fetch(`/api/segments/${id}?customers=true&limit=10000`);
    const data = await res.json();
    const customers = data.customers ?? [];
    const headers = ["ID", "Nombre", "Apellido", "Email", "Teléfono", "Ciudad", "Total Órdenes", "Total Gastado", "Segmento RFM"];
    const csv = [
      headers.join(","),
      ...customers.map((c: Record<string, unknown>) => [
        c.id, c.first_name ?? "", c.last_name ?? "", c.email ?? "",
        c.phone ?? "", c.city ?? "", c.total_orders ?? 0,
        c.total_spent ?? 0, c.rfm_segment ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segmento-${name}-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const filtered = segments.filter((s) => {
    if (activeTab === "rfm") return s.is_rfm_auto;
    if (activeTab === "custom") return !s.is_rfm_auto;
    return true;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Segmentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {segments.length} segmentos · {formatNumber(totalCustomers)} clientes en la base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/segments/config" className="btn-secondary flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Configurar segmentos
          </Link>
          <Link href="/segments/create" className="btn-primary">
            <Plus className="w-4 h-4" /> Crear segmento
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-100 p-1 w-fit mb-6 shadow-card">
        {[
          { key: "all" as const, label: "Todos", count: segments.length },
          { key: "rfm" as const, label: "RFM Automáticos", count: segments.filter(s => s.is_rfm_auto).length },
          { key: "custom" as const, label: "Personalizados", count: segments.filter(s => !s.is_rfm_auto).length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-1.5 rounded text-sm font-medium transition-all",
              activeTab === key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            {label}
            <span className={cn(
              "ml-1.5 text-xs font-normal",
              activeTab === key ? "text-indigo-200" : "text-gray-400"
            )}>
              ({count})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Clientes</th>
              <th>% de la base</th>
              <th>Creado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Layers className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">
                      {activeTab === "custom"
                        ? "No hay segmentos personalizados aún"
                        : "No hay segmentos aún. Calculá el RFM primero."}
                    </p>
                    <div className="flex gap-2">
                      {activeTab !== "rfm" && (
                        <Link href="/segments/create" className="text-indigo-600 text-sm hover:underline">
                          Crear segmento →
                        </Link>
                      )}
                      {activeTab !== "custom" && (
                        <Link href="/segments/config" className="text-indigo-600 text-sm hover:underline">
                          Configurar RFM →
                        </Link>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((seg) => (
                <tr key={seg.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {seg.is_rfm_auto ? (
                        <RFMBadge segment={seg.name} size="sm" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-400" />
                          <span className="text-sm font-medium text-gray-900">{seg.name}</span>
                        </div>
                      )}
                    </div>
                    {seg.description && (
                      <p className="text-xs text-gray-400 mt-0.5 ml-0">{seg.description}</p>
                    )}
                  </td>
                  <td>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      seg.is_rfm_auto ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {seg.is_rfm_auto ? "RFM Auto" : "Personalizado"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{formatNumber(seg.customer_count ?? 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${Math.min(100, seg.percentage ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{(seg.percentage ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="text-gray-400 text-sm">{formatDate(seg.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/segments/${seg.id}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Ver clientes"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleExport(seg.id, seg.name)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Exportar CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!seg.is_rfm_auto && (
                        <>
                          <Link
                            href={`/segments/create?edit=${seg.id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(seg.id, seg.name)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
