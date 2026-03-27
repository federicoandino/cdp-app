"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Info, RotateCcw } from "lucide-react";
import Link from "next/link";
import { RFMBadge } from "@/components/ui/rfm-badge";
import { DEFAULT_THRESHOLDS, type SegmentThreshold } from "@/lib/rfm-config";
import { cn } from "@/lib/utils";

const SCORE_LABELS: Record<number, string> = {
  1: "1 — Muy bajo",
  2: "2 — Bajo",
  3: "3 — Medio",
  4: "4 — Alto",
  5: "5 — Muy alto",
};

function ScoreSelect({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      {[1, 2, 3, 4, 5].map((v) => (
        <option key={v} value={v} disabled={(min !== undefined && v < min) || (max !== undefined && v > max)}>
          {v}
        </option>
      ))}
    </select>
  );
}

export default function RFMConfigPage() {
  const [config, setConfig] = useState<SegmentThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/rfm-config")
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  const update = (index: number, field: keyof SegmentThreshold, value: number) => {
    setConfig((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      // Auto-correct: ensure min <= max
      const seg = next[index];
      if (field === "rMin" && seg.rMin > seg.rMax) next[index] = { ...seg, rMax: value };
      if (field === "rMax" && seg.rMax < seg.rMin) next[index] = { ...seg, rMin: value };
      if (field === "fMin" && seg.fMin > seg.fMax) next[index] = { ...seg, fMax: value };
      if (field === "fMax" && seg.fMax < seg.fMin) next[index] = { ...seg, fMin: value };
      if (field === "mMin" && seg.mMin > seg.mMax) next[index] = { ...seg, mMax: value };
      if (field === "mMax" && seg.mMax < seg.mMin) next[index] = { ...seg, mMin: value };
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
    setConfig([...DEFAULT_THRESHOLDS]);
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
            <h1 className="page-title">Configurar Segmentos RFM</h1>
          </div>
          <p className="text-sm text-gray-500">
            Definí los rangos de puntaje R, F, M para cada segmento. El orden determina la prioridad — el primer segmento que coincide se aplica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar defaults
          </button>
          <button
            onClick={handleSaveAndRecalc}
            disabled={saving}
            className="btn-primary"
          >
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
            <p className="font-semibold mb-1">Cómo leer los scores (1–5)</p>
            <p><span className="font-medium">R (Recencia):</span> 5 = compró muy recientemente · 1 = hace mucho tiempo</p>
            <p><span className="font-medium">F (Frecuencia):</span> 5 = compra muy seguido · 1 = compró una sola vez</p>
            <p><span className="font-medium">M (Monto):</span> 5 = gasto muy alto · 1 = gasto bajo</p>
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
                R — Recencia
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs" colSpan={2}>
                F — Frecuencia
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs" colSpan={2}>
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
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">desde</th>
              <th className="text-center px-2 py-2 text-xs text-gray-400 font-normal">hasta</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 11 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
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
                      <ScoreSelect value={seg.rMin} onChange={(v) => update(idx, "rMin", v)} max={seg.rMax} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <ScoreSelect value={seg.rMax} onChange={(v) => update(idx, "rMax", v)} min={seg.rMin} />
                    </td>
                    {/* F range */}
                    <td className="px-2 py-3 text-center">
                      <ScoreSelect value={seg.fMin} onChange={(v) => update(idx, "fMin", v)} max={seg.fMax} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <ScoreSelect value={seg.fMax} onChange={(v) => update(idx, "fMax", v)} min={seg.fMin} />
                    </td>
                    {/* M range */}
                    <td className="px-2 py-3 text-center">
                      <ScoreSelect value={seg.mMin} onChange={(v) => update(idx, "mMin", v)} max={seg.mMax} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <ScoreSelect value={seg.mMax} onChange={(v) => update(idx, "mMax", v)} min={seg.mMin} />
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
