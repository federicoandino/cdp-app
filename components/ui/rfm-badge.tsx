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
