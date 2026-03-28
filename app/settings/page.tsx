"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="p-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Preferencias de la plataforma</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1D26] rounded-xl border border-gray-100 dark:border-[#2D3039] shadow-card">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2D3039]">
          <h2 className="section-title">Apariencia</h2>
        </div>

        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Modo oscuro</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isDark ? "Tema oscuro activado" : "Tema claro activado"}
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              isDark ? "bg-indigo-600" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={isDark}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                isDark ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
