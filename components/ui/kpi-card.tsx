"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number;
  className?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "bg-indigo-100 text-indigo-600",
  trend,
  className,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className={cn("kpi-card animate-pulse", className)}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    );
  }

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              "text-xs font-medium",
              trend >= 0 ? "text-green-600" : "text-red-500"
            )}
          >
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
