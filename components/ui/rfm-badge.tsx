"use client";

import { RFM_SEGMENT_COLORS } from "@/lib/rfm";
import { cn } from "@/lib/utils";

interface RFMBadgeProps {
  segment: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}

export function RFMBadge({ segment, className, size = "md" }: RFMBadgeProps) {
  if (!segment) return <span className="text-gray-400 text-xs">—</span>;

  const colors = RFM_SEGMENT_COLORS[segment] ?? {
    badge: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        colors.badge,
        className
      )}
    >
      {segment}
    </span>
  );
}

interface RFMScoreProps {
  r?: number | null;
  f?: number | null;
  m?: number | null;
}

export function RFMScoreDisplay({ r, f, m }: RFMScoreProps) {
  const scoreColor = (score: number | null | undefined) => {
    if (!score) return "bg-gray-100 text-gray-400";
    if (score >= 4) return "bg-green-100 text-green-700";
    if (score >= 3) return "bg-yellow-100 text-yellow-700";
    if (score >= 2) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-600";
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", scoreColor(r))}>
        <span className="text-gray-400 font-normal">R</span>{r ?? "—"}
      </div>
      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", scoreColor(f))}>
        <span className="text-gray-400 font-normal">F</span>{f ?? "—"}
      </div>
      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", scoreColor(m))}>
        <span className="text-gray-400 font-normal">M</span>{m ?? "—"}
      </div>
    </div>
  );
}
