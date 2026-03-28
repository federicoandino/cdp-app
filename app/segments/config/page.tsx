"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Info, RotateCcw } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { DEFAULT_SEGMENT_RULES, type SegmentRule, type MTier } from "@/lib/rfm-config";
import { cn } from "@/lib/utils";

const M_OPTIONS: { value: MTier; label: string }[] = [
  { value: "ANY",    label: "Cualquiera" },
  { value: "LOW",    label: "Bajo (33%)"    },
  { value: "MEDIUM", label: "Medio (33%)" },
  { value: "HIGH",   label: "Alto (33%)"   },
];

function NumInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min) onChange(v);
      }}
      className="w-20 text-sm text-center border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  );
}

function MSelect({
  value,
  onChange,
}: {
  value: MTier;
  onChange: (v: MTier) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MTier)}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      {M_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function RFMConfigPage() {
  const [config, setConfig] = useState<SegmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/rfm-config")
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof SegmentRule>(index: number, field: K, value: SegmentRule[K]) => {
    setConfig((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      // Auto-correct: ensure from <= to
      const seg = next[index];
      if (field === "rFrom" && (value as number) > seg.rTo) next[index] = { ...seg, rTo: value as number };
      if (field === "rTo"   && (value as number) < seg.rFrom) next[index] = { ...seg, rFrom: value as number };
      if (field === "fFrom" && (value as number) > seg.fTo) next[index] = { ...seg, fTo: value as number };
      if (field === "fTo"   && (value as number) < seg.fFrom) next[index] = { ...seg, fFrom: value as number };
      return next;
    });
    setSaved(false);
  };

  const handleSaveAndRecalc = async () => {
    setSaving(true);
    try {
      await fetch("/api/rfm-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      await fetch("/api/segments/rfm", { method: "POST" });
      setSaved(true);
    } catch {
      alert("Error al guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("¿Restaurar los valores por defecto?")) return;
    setConfig([...DEFAULT_SEGMENT_RULES]);
    setSaved(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/segments" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="page-title">Configurar Segmentos</h1>
          </div>
          <p className="text-sm text-gray-500">
            Definí los rangos de R, F y M para cada segmento. El orden determina la prioridad — el primer segmento que coincide se aplica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar defaults
          </button>
          <button onClick={handleSaveAndRecalc} disabled={saving} className="btn-primary">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar y Recalcular</>
            )}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Configuración guardada y segmentos recalculados correctamente.
        </div>
      )}

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-8 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-blue-700">
            <p className="font-semibold mb-1">Parámetros de segmentación</p>
            <p><span className="font-medium">R (Recencia):</span> días desde la última compra — rango mínimo y máximo de días</p>
            <p><span className="font-medium">F (Frecuencia):</span> compras por año (anualizado) — rango mínimo y máximo</p>
            <p><span className="font-medium">M (Monto):</span> nivel de gasto relativo al resto de la base — BAJO (33% inferior), MEDIO, ALTO (33% superior)</p>
          </div>
        </div>
      </div>

      {/* Config table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs w-6">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs w-48">Segmento</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs" colSpan={2}>
                R — Días desde última compra
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs" colSpan={2}>
                F — Compras por año
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">
                M — Monto
              </th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th />
              <th />
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">desde</th>
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">hasta</th>
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">desde</th>
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">hasta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 11 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-7 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : config.map((seg, idx) => (
                  <tr
                    key={seg.name}
                    className={cn(
                      "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                      idx === config.length - 1 && "border-b-0"
                    )}
                  >
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <RFMBadge segment={seg.name} size="sm" />
                    </td>
                    {/* R range */}
                    <td className="px-2 py-3 text-center">
                      <NumInput value={seg.rFrom} onChange={(v) => update(idx, "rFrom", v)} min={0} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <NumInput value={seg.rTo} onChange={(v) => update(idx, "rTo", v)} min={seg.rFrom} />
                    </td>
                    {/* F range */}
                    <td className="px-2 py-3 text-center">
                      <NumInput value={seg.fFrom} onChange={(v) => update(idx, "fFrom", v)} min={1} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <NumInput value={seg.fTo} onChange={(v) => update(idx, "fTo", v)} min={seg.fFrom} />
                    </td>
                    {/* M tier */}
                    <td className="px-2 py-3 text-center">
                      <MSelect value={seg.m} onChange={(v) => update(idx, "m", v)} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Los clientes que no coincidan con ningún segmento serán clasificados como "Sin Clasificar".
      </p>
    </div>
  );
}
