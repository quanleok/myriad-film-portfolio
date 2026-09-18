import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label ? (
          <label htmlFor={id} className="block text-sm font-semibold text-role-fg-primary">
            {label}
          </label>
        ) : null}

        <textarea
          ref={ref}
          id={id}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-role-border-subtle bg-role-bg-page-secondary px-3 py-2 text-sm font-medium text-role-fg-primary placeholder:text-role-fg-tertiary transition-all duration-150 focus:border-brand-500 focus:bg-role-bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500/35 disabled:opacity-50",
            error && "border-role-danger-border focus:border-role-danger-border focus:ring-role-danger-border/40",
            className
          )}
          {...props}
        />

        {error || hint ? (
          <div className="space-y-1">
            {error ? <p className="text-xs font-medium text-role-danger-fg">{error}</p> : null}
            {hint ? <p className="text-xs text-role-fg-tertiary">{hint}</p> : null}
          </div>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
