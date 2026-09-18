import React from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionShellProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  tone?: "default" | "glass";
  children: ReactNode;
}

export function SectionShell({
  className,
  title,
  description,
  actions,
  padded = true,
  tone = "default",
  children,
  ...props
}: SectionShellProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-role-border-subtle bg-role-bg-page-secondary shadow-[0_10px_26px_-24px_var(--role-overlay-strong)]",
        tone === "glass" && "bg-role-bg-overlay-soft backdrop-blur-md",
        padded && "p-4 md:p-5",
        className
      )}
      {...props}
    >
      {title || description || actions ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? <h3 className="text-sm font-semibold text-role-fg-primary md:text-base">{title}</h3> : null}
            {description ? <p className="text-xs text-role-fg-secondary md:text-sm">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}

      {children}
    </section>
  );
}
