import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  elevated?: boolean;
  tone?: "default" | "glass";
  edge?: "default" | "neon";
}

export function Card({
  className,
  children,
  interactive = false,
  elevated = false,
  tone = "default",
  edge = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-role-border-subtle bg-role-bg-page-secondary",
        tone === "glass" && "bg-role-bg-overlay-soft backdrop-blur-md",
        edge === "neon" && "neon-edge",
        elevated && "shadow-[var(--role-surface-elev-2)]",
        interactive &&
          "surface-edge-glow cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-role-bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("px-4 py-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("px-4 pb-4", className)} {...props}>
      {children}
    </div>
  );
}
