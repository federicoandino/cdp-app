"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatCurrency, formatDate, formatNumber, getInitials } from "@/lib/utils";
import type { Customer, Segment } from "@/db/schema";
import Link from "next/link";

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/segments/${params.id}?customers=true&page=${p}&limit=${LIMIT}`);
      const data = await res.json();
      setSegment(data.segment);
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  const handleExport = async () => {
    const res = await fetch(`/api/segments/${params.id}?customers=true&limit=10000`);
    const data = await res.json();
    const all = data.customers ?? [];
    const headers = ["ID", "Nombre", "Apellido", "Email", "Teléfono", "Ciudad", "Total Órdenes", "Total Gastado", "Segmento RFM"];
    const csv = [
      headers.join(","),
      ...all.map((c: Customer) => [
        c.id, c.first_name ?? "", c.last_name ?? "", c.email ?? "",
        c.phone ?? "", c.city ?? "", c.total_orders ?? 0,
        c.total_spent ?? 0, c.rfm_segment ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segmento-${segment?.name}-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a segmentos
      </button>

      {segment && (
        <>
          <div className="page-header">
            <div className="flex items-center gap-3">
              {segment.is_rfm_auto ? (
                <RFMBadge segment={segment.name} />
              ) : (
                <h1 className="page-title">{segment.name}</h1>
              )}
              {segment.is_rfm_auto && <h1 className="page-title">{segment.name}</h1>}
              <span className="text-sm text-gray-400">{formatNumber(total)} clientes</span>
            </div>
            <button onClick={handleExport} className="btn-secondary">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Email</th>
                  <th>Ciudad</th>
                  <th>Compras</th>
                  <th>Total gastado</th>
                  <th>Última compra</th>
                  <th>Segmento RFM</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No hay clientes en este segmento</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                            {getInitials(c.first_name, c.last_name)}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">
                            {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Sin nombre"}
                          </span>
                        </div>
                      </td>
                      <td className="text-gray-500 text-sm">{c.email ?? "—"}</td>
                      <td className="text-gray-500 text-sm">{c.city ?? "—"}</td>
                      <td className="text-center font-medium">{c.total_orders ?? 0}</td>
                      <td className="font-semibold text-gray-900">{formatCurrency(c.total_spent)}</td>
                      <td className="text-gray-500 text-sm">{formatDate(c.last_purchase_date)}</td>
                      <td><RFMBadge segment={c.rfm_segment} size="sm" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Mostrando {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {formatNumber(total)}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setPage(p => p - 1); fetchData(page - 1); }}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => { setPage(p => p + 1); fetchData(page + 1); }}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
