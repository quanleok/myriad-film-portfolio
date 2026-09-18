import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatProjectFormat, formatProjectGenre, formatProjectTone } from "./utils";

interface ProjectMetaPillsProps extends React.HTMLAttributes<HTMLDivElement> {
  genre?: string | null;
  tone?: string | null;
  format?: string | null;
  runtimeMinutes?: number | null;
}

export function ProjectMetaPills({ className, genre, tone, format, runtimeMinutes, ...props }: ProjectMetaPillsProps) {
  const values = [
    { key: "genre", label: formatProjectGenre(genre ?? null) },
    { key: "format", label: formatProjectFormat(format ?? null) },
    { key: "tone", label: formatProjectTone(tone ?? null) },
    runtimeMinutes ? { key: "runtime", label: `${runtimeMinutes} min` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  if (!values.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {values.map((item) => (
        <Badge key={item.key} status="neutral" className="text-[10px] uppercase tracking-[0.12em]">
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
