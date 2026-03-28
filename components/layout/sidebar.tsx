"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, BarChart3, Layers, Upload,
  ChevronLeft, ChevronRight, ChevronDown, Check,
  Database, Settings, Plus, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/account-provider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/recompra", label: "Análisis Recompra", icon: BarChart3 },
  { href: "/segments", label: "Segmentos", icon: Layers },
  { href: "/import", label: "Importar Datos", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const { accounts, activeAccount, switchAccount, createAccount } = useAccount();

  async function handleCreateAccount() {
    if (!newAccountName.trim()) return;
    setCreatingAccount(true);
    const created = await createAccount(newAccountName.trim());
    setCreatingAccount(false);
    setNewAccountName("");
    if (created) {
      setDropdownOpen(false);
      switchAccount(created.id);
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#1A1D26] text-white transition-all duration-200 shrink-0 relative z-20",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Account Switcher */}
      <div className="relative border-b border-white/10">
        <button
          onClick={() => !collapsed && setDropdownOpen(!dropdownOpen)}
          className={cn(
            "w-full flex items-center h-14 px-3 gap-2.5 hover:bg-white/5 transition-colors",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? activeAccount?.name ?? "Cuenta" : undefined}
        >
          <div className="w-7 h-7 bg-indigo-500 rounded-md flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium text-white truncate">
                {activeAccount?.name ?? "Cargando..."}
              </span>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-gray-400 transition-transform shrink-0",
                dropdownOpen && "rotate-180"
              )} />
            </>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && !collapsed && (
          <div className="absolute top-full left-0 right-0 bg-[#23263a] border border-white/10 rounded-b-lg shadow-xl z-50 overflow-hidden">
            {/* Accounts list */}
            <div className="py-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => { setDropdownOpen(false); if (account.id !== activeAccount?.id) switchAccount(account.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                >
                  <div className="w-5 h-5 bg-indigo-500/30 rounded flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3 text-indigo-400" />
                  </div>
                  <span className="flex-1 text-left text-gray-200 truncate">{account.name}</span>
                  {account.id === activeAccount?.id && (
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* New account */}
            <div className="border-t border-white/10 p-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                  placeholder="Nueva cuenta..."
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleCreateAccount}
                  disabled={creatingAccount || !newAccountName.trim()}
                  className="w-6 h-6 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDropdownOpen(false)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span>{label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-2 space-y-0.5">
        <Link
          href="/settings"
          onClick={() => setDropdownOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-150"
          title={collapsed ? "Configuración" : undefined}
        >
          <Settings className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span>Configuración</span>}
        </Link>

        <button
          onClick={() => { setCollapsed(!collapsed); setDropdownOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-150"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
