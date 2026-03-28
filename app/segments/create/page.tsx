"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Save, Eye, Users, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SegmentFilter, SegmentFilterOperator } from "@/db/schema";
import { RFM_SEGMENTS } from "@/lib/rfm";

type FilterField = {
  key: string;
  label: string;
  group: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
};

const FILTER_FIELDS: FilterField[] = [
  // Personal
  { key: "gender", label: "Género", group: "Personal", type: "select", options: ["M", "F", "Otro", "No especificado"] },
  { key: "city", label: "Ciudad", group: "Personal", type: "text" },
  { key: "state", label: "Provincia/Estado", group: "Personal", type: "text" },
  { key: "country", label: "País", group: "Personal", type: "text" },
  { key: "email", label: "Tiene email", group: "Personal", type: "text" },
  { key: "phone", label: "Tiene teléfono", group: "Personal", type: "text" },
  // Comportamiento
  { key: "total_orders", label: "Total de compras", group: "Compras", type: "number" },
  { key: "total_spent", label: "Total gastado ($)", group: "Compras", type: "number" },
  { key: "average_ticket", label: "Ticket promedio ($)", group: "Compras", type: "number" },
  { key: "last_purchase_date", label: "Última compra (fecha)", group: "Compras", type: "date" },
  { key: "first_purchase_date", label: "Primera compra (fecha)", group: "Compras", type: "date" },
  // RFM
  { key: "rfm_recency_score", label: "Score Recencia (R)", group: "RFM", type: "number" },
  { key: "rfm_frequency_score", label: "Score Frecuencia (F)", group: "RFM", type: "number" },
  { key: "rfm_monetary_score", label: "Score Monetario (M)", group: "RFM", type: "number" },
  { key: "rfm_segment", label: "Segmento RFM", group: "RFM", type: "select", options: [...RFM_SEGMENTS] },
];

const OPERATORS_FOR_TYPE: Record<string, { key: SegmentFilterOperator; label: string }[]> = {
  text: [
    { key: "eq", label: "es exactamente" },
    { key: "neq", label: "no es" },
    { key: "contains", label: "contiene" },
    { key: "not_contains", label: "no contiene" },
    { key: "is_true", label: "tiene valor (no vacío)" },
    { key: "is_false", label: "está vacío" },
  ],
  number: [
    { key: "eq", label: "es igual a" },
    { key: "neq", label: "no es igual a" },
    { key: "gt", label: "mayor que" },
    { key: "gte", label: "mayor o igual que" },
    { key: "lt", label: "menor que" },
    { key: "lte", label: "menor o igual que" },
    { key: "between", label: "entre" },
  ],
  date: [
    { key: "gte", label: "después de" },
    { key: "lte", label: "antes de" },
    { key: "between", label: "entre fechas" },
  ],
  select: [
    { key: "eq", label: "es" },
    { key: "neq", label: "no es" },
    { key: "in", label: "es alguno de" },
    { key: "not_in", label: "no es ninguno de" },
  ],
};

let filterIdCounter = 0;

function CreateSegmentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<SegmentFilter[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing segment if editing
  useEffect(() => {
    if (editId) {
      fetch(`/api/segments/${editId}`)
        .then((r) => r.json())
        .then(({ segment }) => {
          if (segment) {
            setName(segment.name);
            setDescription(segment.description ?? "");
            setFilters(segment.filters ?? []);
          }
        });
    }
  }, [editId]);

  // Debounced preview count
  const fetchPreview = useCallback(async (currentFilters: SegmentFilter[]) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: currentFilters }),
      });
      const data = await res.json();
      setPreviewCount(data.count ?? 0);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview(filters);
    }, 500);
  }, [filters, fetchPreview]);

  const addFilter = (groupId = 0) => {
    const newFilter: SegmentFilter = {
      id: String(++filterIdCounter),
      field: "total_orders",
      operator: "gte",
      value: 1,
      group: groupId,
    };
    setFilters((prev) => [...prev, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<SegmentFilter>) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("El nombre del segmento es requerido");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/segments/${editId}` : "/api/segments";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, filters }),
      });
      if (res.ok) {
        router.push("/segments");
      }
    } finally {
      setSaving(false);
    }
  };

  // Group filters by group ID
  const groups = Array.from(new Set(filters.map((f) => f.group ?? 0)));
  if (groups.length === 0) groups.push(0);

  const FilterRow = ({ filter }: { filter: SegmentFilter }) => {
    const field = FILTER_FIELDS.find((f) => f.key === filter.field);
    const operators = OPERATORS_FOR_TYPE[field?.type ?? "text"];

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Field selector */}
        <select
          value={filter.field}
          onChange={(e) => {
            const newField = FILTER_FIELDS.find((f) => f.key === e.target.value);
            const defaultOp = (OPERATORS_FOR_TYPE[newField?.type ?? "text"][0].key) as SegmentFilterOperator;
            updateFilter(filter.id, {
              field: e.target.value,
              operator: defaultOp,
              value: "",
            });
          }}
          className="input-field w-auto min-w-[180px]"
        >
          {["Personal", "Compras", "RFM"].map((group) => (
            <optgroup key={group} label={group}>
              {FILTER_FIELDS.filter((f) => f.group === group).map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Operator selector */}
        <select
          value={filter.operator}
          onChange={(e) => updateFilter(filter.id, { operator: e.target.value as SegmentFilterOperator })}
          className="input-field w-auto min-w-[160px]"
        >
          {operators.map((op) => (
            <option key={op.key} value={op.key}>{op.label}</option>
          ))}
        </select>

        {/* Value input */}
        {filter.operator !== "is_true" && filter.operator !== "is_false" && (
          <>
            {field?.type === "select" ? (
              filter.operator === "in" || filter.operator === "not_in" ? (
                <div className="flex flex-wrap gap-1 items-center">
                  {(field.options ?? []).map((opt) => {
                    const vals = (filter.value as string[]) ?? [];
                    const checked = vals.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newVals = checked
                            ? vals.filter((v) => v !== opt)
                            : [...vals, opt];
                          updateFilter(filter.id, { value: newVals });
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                          checked ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <select
                  value={filter.value as string}
                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  className="input-field w-auto min-w-[180px]"
                >
                  <option value="">Seleccionar...</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )
            ) : filter.operator === "between" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type={field?.type === "number" ? "number" : "date"}
                  placeholder="Mínimo"
                  value={(filter.value as [unknown, unknown])?.[0] as string ?? ""}
                  onChange={(e) => updateFilter(filter.id, { value: [e.target.value, (filter.value as [unknown, unknown])?.[1] ?? ""] })}
                  className="input-field w-28"
                />
                <span className="text-gray-400 text-sm">y</span>
                <input
                  type={field?.type === "number" ? "number" : "date"}
                  placeholder="Máximo"
                  value={(filter.value as [unknown, unknown])?.[1] as string ?? ""}
                  onChange={(e) => updateFilter(filter.id, { value: [(filter.value as [unknown, unknown])?.[0] ?? "", e.target.value] })}
                  className="input-field w-28"
                />
              </div>
            ) : (
              <input
                type={field?.type === "number" ? "number" : field?.type === "date" ? "date" : "text"}
                placeholder="Valor..."
                value={filter.value as string ?? ""}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                className="input-field w-40"
              />
            )}
          </>
        )}

        {/* Remove filter */}
        <button
          onClick={() => removeFilter(filter.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="page-title">{editId ? "Editar segmento" : "Crear segmento"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview count */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-lg">
            {previewLoading ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <Users className="w-4 h-4 text-indigo-600" />
            )}
            <span className="text-sm font-semibold text-indigo-700">
              {previewCount === null ? "—" : previewCount.toLocaleString()} clientes
            </span>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar segmento</>}
          </button>
        </div>
      </div>

      {/* Segment metadata */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del segmento *</label>
          <input
            type="text"
            placeholder="Ej: Clientes VIP Argentina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field max-w-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <input
            type="text"
            placeholder="Descripción breve del segmento..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field max-w-lg"
          />
        </div>
      </div>

      {/* Rule builder */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="section-title">Constructor de reglas</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Las reglas dentro de un grupo se combinan con <strong>AND</strong>. Los grupos se combinan con <strong>OR</strong>.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {filters.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-3">Sin reglas. Agregá condiciones para definir el segmento.</p>
              <button onClick={() => addFilter(0)} className="btn-secondary">
                <Plus className="w-4 h-4" /> Agregar primera regla
              </button>
            </div>
          ) : (
            <>
              {groups.map((groupId, gi) => {
                const groupFilters = filters.filter((f) => (f.group ?? 0) === groupId);
                return (
                  <div key={groupId} className="border border-gray-200 rounded-xl overflow-hidden">
                    {gi > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-100">
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">O bien (OR)</span>
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      {groupFilters.map((filter, fi) => (
                        <div key={filter.id}>
                          {fi > 0 && (
                            <div className="flex items-center gap-2 my-2">
                              <div className="flex-1 h-px bg-gray-100" />
                              <span className="text-xs font-semibold text-gray-400 uppercase">Y además (AND)</span>
                              <div className="flex-1 h-px bg-gray-100" />
                            </div>
                          )}
                          <FilterRow filter={filter} />
                        </div>
                      ))}
                      <button
                        onClick={() => addFilter(groupId)}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar condición AND
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => addFilter(Math.max(...groups) + 1)}
                className="btn-secondary w-full justify-center"
              >
                <Plus className="w-4 h-4" /> Agregar grupo OR
              </button>
            </>
          )}

          {filters.length > 0 && (
            <button
              onClick={() => addFilter(0)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar condición
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {filters.length > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            {previewLoading ? (
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            ) : (
              <Eye className="w-5 h-5 text-indigo-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              Vista previa en tiempo real
            </p>
            <p className="text-xs text-indigo-600">
              {previewLoading ? "Calculando..." : previewCount !== null ? (
                `Este segmento incluye ${previewCount.toLocaleString()} clientes con los filtros actuales`
              ) : "Error al calcular"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateSegmentPage() {
  return <Suspense><CreateSegmentPageInner /></Suspense>;
}
