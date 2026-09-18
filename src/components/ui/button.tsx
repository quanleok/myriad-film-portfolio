import { cn } from "@/lib/utils";
import { forwardRef, type ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "contrast" | "muted" | "success" | "warning" | "neon";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-display font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--role-cta-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--role-bg-page)] disabled:pointer-events-none disabled:opacity-45",
          {
            "cta-energy": variant === "primary",
            "border border-role-border-strong bg-role-bg-surface text-role-fg-primary hover:border-role-cta-hover hover:bg-role-bg-surface-hover":
              variant === "secondary",
            "text-role-fg-secondary hover:bg-role-bg-surface hover:text-role-fg-primary active:bg-role-bg-surface-active":
              variant === "ghost",
            "bg-role-danger-fg text-role-fg-contrast shadow-[0_10px_24px_-12px_var(--role-danger-border)] hover:brightness-110 active:brightness-95":
              variant === "danger",
            "bg-role-bg-contrast text-role-fg-contrast hover:brightness-105 active:brightness-95": variant === "contrast",
            "border border-role-border-default bg-role-bg-surface text-role-fg-secondary hover:border-role-border-strong hover:bg-role-bg-surface-hover hover:text-role-fg-primary":
              variant === "muted",
            "bg-role-success-fg text-role-fg-contrast shadow-[0_10px_24px_-12px_var(--role-success-border)] hover:brightness-110 active:brightness-95":
              variant === "success",
            "bg-role-warning-fg text-role-fg-contrast shadow-[0_10px_24px_-12px_var(--role-warning-border)] hover:brightness-105 active:brightness-95":
              variant === "warning",
            "border border-role-border-strong bg-role-bg-overlay-soft text-role-fg-primary shadow-[0_0_0_1px_var(--role-edge-soft),0_0_18px_var(--role-glow-soft)] hover:border-role-cta-hover hover:bg-role-bg-surface-hover hover:shadow-[0_0_0_1px_var(--role-edge-strong),0_0_24px_var(--role-glow-strong)]":
              variant === "neon",
          },
          {
            "h-8 gap-1.5 px-3 text-sm": size === "sm",
            "h-10 gap-2 px-4 text-sm": size === "md",
            "h-12 gap-2.5 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        ) : leftIcon ? (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        {children ? <span>{children}</span> : null}

        {!loading && rightIcon ? (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
