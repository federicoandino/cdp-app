"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, UserPlus } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { formatCurrency, formatDate, formatNumber, getInitials, cn } from "@/lib/utils";
import { RFM_SEGMENTS } from "@/lib/rfm";
import type { Customer } from "@/db/schema";

type SortField = "first_name" | "email" | "total_orders" | "total_spent" | "average_ticket" | "last_purchase_date" | "rfm_total_score" | "rfm_segment" | "city" | "created_at";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const LIMIT = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (segment) params.set("segment", segment);

      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, segment, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, segment, sortBy, sortOrder]);

  const handleSort = (col: SortField) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortField }) => {
    if (sortBy !== col) return <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-40" />;
    return sortOrder === "asc"
      ? <ChevronUp className="w-3 h-3 text-indigo-600" />
      : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  };

  const handleExport = async () => {
    const params = new URLSearchParams({ limit: "10000", sortBy, sortOrder });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (segment) params.set("segment", segment);
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    const rows: Customer[] = data.data ?? [];

    const headers = ["ID", "Nombre", "Apellido", "Email", "Teléfono", "Ciudad", "Total Órdenes", "Total Gastado", "Ticket Promedio", "Última Compra", "Segmento RFM"];
    const csv = [
      headers.join(","),
      ...rows.map((c) => [
        c.id, c.first_name ?? "", c.last_name ?? "", c.email ?? "",
        c.phone ?? "", c.city ?? "", c.total_orders ?? 0,
        c.total_spent ?? 0, c.average_ticket ?? 0,
        c.last_purchase_date ?? "", c.rfm_segment ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${formatNumber(total)} clientes en total` : "Sin datos aún"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <Link href="/import" className="btn-primary">
            <UserPlus className="w-4 h-4" /> Importar clientes
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="input-field w-auto min-w-[180px]"
            >
              <option value="">Todos los segmentos</option>
              {RFM_SEGMENTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {(search || segment) && (
            <button
              onClick={() => { setSearch(""); setSegment(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  { key: "first_name" as SortField, label: "Cliente" },
                  { key: "email" as SortField, label: "Email" },
                  { key: "city" as SortField, label: "Ciudad" },
                  { key: "total_orders" as SortField, label: "Compras" },
                  { key: "total_spent" as SortField, label: "Total gastado" },
                  { key: "average_ticket" as SortField, label: "Ticket prom." },
                  { key: "last_purchase_date" as SortField, label: "Últ. compra" },
                  { key: "rfm_segment" as SortField, label: "Segmento RFM" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="group cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">
                        {search || segment ? "No se encontraron clientes con esos filtros" : "No hay clientes aún"}
                      </p>
                      {!search && !segment && (
                        <Link href="/import" className="text-indigo-600 text-sm hover:underline">
                          Importar clientes →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} onClick={() => window.location.href = `/customers/${customer.id}`}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                          {getInitials(customer.first_name, customer.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Sin nombre"}
                          </p>
                          <p className="text-xs text-gray-400">{customer.phone ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm">{customer.email ?? "—"}</td>
                    <td className="text-gray-500 text-sm">{customer.city ?? "—"}</td>
                    <td className="text-center font-medium text-gray-900">
                      {customer.total_orders ?? 0}
                    </td>
                    <td className="font-semibold text-gray-900">
                      {formatCurrency(customer.total_spent)}
                    </td>
                    <td className="text-gray-600">
                      {formatCurrency(customer.average_ticket)}
                    </td>
                    <td className="text-gray-500 text-sm whitespace-nowrap">
                      {formatDate(customer.last_purchase_date)}
                    </td>
                    <td>
                      <RFMBadge segment={customer.rfm_segment} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Mostrando {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {formatNumber(total)} clientes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors",
                  page === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? page : i === 4 ? totalPages - 1 : i === 5 ? totalPages : totalPages;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
                      page === p ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors",
                  page === totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
