"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { autoDetectColumns, detectImportType, COMBINED_FIELDS } from "@/lib/column-mapper";
import { cn } from "@/lib/utils";

type ImportType = "customers" | "orders" | "combined";
type Step = "upload" | "map" | "preview" | "result";

interface ImportResult {
  importId: number;
  imported: number;
  skipped: number;
  merged: number;
  total: number;
  errors: string[];
}

const TYPE_LABELS: Record<ImportType, { label: string; desc: string; color: string }> = {
  combined: { label: "Clientes + Órdenes", desc: "Cada fila tiene datos del cliente y de la compra", color: "text-indigo-700" },
  customers: { label: "Solo clientes", desc: "El archivo solo tiene datos de contacto/perfil", color: "text-blue-700" },
  orders: { label: "Solo órdenes", desc: "El archivo tiene transacciones que referencian clientes existentes", color: "text-purple-700" },
};

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [importType, setImportType] = useState<ImportType>("combined");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    const onParsed = (rows: Record<string, unknown>[], cols: string[]) => {
      const autoMap = autoDetectColumns(cols);
      const detected = detectImportType(autoMap);
      setParsedRows(rows);
      setHeaders(cols);
      setColumnMapping(autoMap);
      setImportType(detected);
      setStep("map");
    };

    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          onParsed(result.data as Record<string, unknown>[], result.meta.fields ?? []);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
      onParsed(rows, rows.length > 0 ? Object.keys(rows[0]) : []);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); parseFile(f); }
  }, [parseFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); parseFile(f); }
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType,
          fileName: file?.name ?? "import.csv",
          fileType: file?.name.endsWith(".xlsx") ? "xlsx" : "csv",
          rows: parsedRows,
          columnMapping,
        }),
      });
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      alert("Error al importar: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setHeaders([]);
    setColumnMapping({});
    setResult(null);
  };

  const previewRows = parsedRows.slice(0, 5);
  const mappedCount = Object.values(columnMapping).filter((v) => v && v !== "__skip__").length;
  const typeInfo = TYPE_LABELS[importType];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Importar Datos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Subí tu planilla CSV o Excel — el sistema detecta automáticamente el tipo de datos
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["upload", "map", "preview", "result"] as Step[]).map((s, i) => {
          const labels = ["Subir archivo", "Mapear columnas", "Vista previa", "Resultado"];
          const isActive = step === s;
          const isDone =
            (step === "map" && i === 0) ||
            (step === "preview" && i <= 1) ||
            (step === "result" && i <= 2);
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isActive ? "text-indigo-600" : isDone ? "text-green-600" : "text-gray-400"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  isActive ? "bg-indigo-600 text-white" :
                  isDone ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                )}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span className="hidden sm:block">{labels[i]}</span>
              </div>
              {i < 3 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "bg-white rounded-xl border-2 border-dashed p-16 flex flex-col items-center justify-center gap-5 cursor-pointer transition-all",
            dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
          )}
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Upload className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              Arrastrá y soltá tu archivo aquí
            </p>
            <p className="text-sm text-gray-500 mt-1">
              o <span className="text-indigo-600 font-medium">hacé click para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-3">CSV, XLSX o XLS · El tipo de datos se detecta automáticamente</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Step: Column Mapping */}
      {step === "map" && (
        <div className="space-y-6">
          {/* File info + detected type */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{file?.name}</p>
              <p className="text-xs text-gray-500">{parsedRows.length.toLocaleString()} filas · {headers.length} columnas · {mappedCount} mapeadas</p>
            </div>
            {/* Detected type chip + manual override */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-500">Detectado:</span>
                <span className={cn("text-xs font-semibold", typeInfo.color)}>{typeInfo.label}</span>
              </div>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as ImportType)}
                className="input-field w-auto text-xs py-1.5"
                title="Cambiar tipo manualmente"
              >
                <option value="combined">Clientes + Órdenes</option>
                <option value="customers">Solo clientes</option>
                <option value="orders">Solo órdenes</option>
              </select>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="section-title">Vista previa (primeras 5 filas)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap max-w-[160px] truncate">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column mapping */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="section-title">Mapeo de columnas</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Las columnas detectadas automáticamente ya están asignadas. Corregí las que necesites.
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {headers.map((header) => {
                const mapped = columnMapping[header];
                return (
                  <div key={header} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-48 shrink-0">
                      <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
                        {header}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    <select
                      value={mapped ?? "__skip__"}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                      }
                      className="input-field max-w-xs"
                    >
                      <option value="__skip__">— Ignorar esta columna —</option>
                      {COMBINED_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}{f.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                    {mapped && mapped !== "__skip__" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep("upload")} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep("preview")}
              className="btn-primary"
              disabled={mappedCount === 0}
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview summary */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
            <h3 className="section-title mb-4">Resumen de importación</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{parsedRows.length.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Filas totales</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">{mappedCount}</p>
                <p className="text-xs text-gray-500 mt-1">Columnas mapeadas</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className={cn("text-xl font-bold leading-tight", typeInfo.color)}>{typeInfo.label}</p>
                <p className="text-xs text-gray-500 mt-1">{typeInfo.desc}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Campos que se importarán:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(columnMapping)
                  .filter(([, v]) => v && v !== "__skip__")
                  .map(([col, field]) => (
                    <span key={col} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {col} → {COMBINED_FIELDS.find((f) => f.key === field)?.label ?? field}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700">
                <strong>Deduplicación activa:</strong> Clientes con email duplicado serán actualizados, no duplicados.
                {importType !== "customers" && " Las órdenes quedarán vinculadas al cliente correspondiente."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep("map")} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <button onClick={handleImport} disabled={loading} className="btn-primary">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="w-4 h-4" /> Importar {parsedRows.length.toLocaleString()} registros</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && result && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Importación completada!</h3>
            <p className="text-gray-500 text-sm">El archivo fue procesado exitosamente.</p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5 text-center">
              <p className="text-3xl font-bold text-gray-900">{result.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total procesados</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-card p-5 text-center">
              <p className="text-3xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-gray-500 mt-1">Nuevos creados</p>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 shadow-card p-5 text-center">
              <p className="text-3xl font-bold text-blue-600">{result.merged}</p>
              <p className="text-xs text-gray-500 mt-1">Actualizados</p>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 shadow-card p-5 text-center">
              <p className="text-3xl font-bold text-orange-500">{result.skipped}</p>
              <p className="text-xs text-gray-500 mt-1">Omitidos</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-100 shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Log de errores ({result.errors.length} entradas)
                </h4>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={reset} className="btn-secondary">
              <Upload className="w-4 h-4" /> Nueva importación
            </button>
            <a href="/customers" className="btn-primary">
              Ver clientes <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
