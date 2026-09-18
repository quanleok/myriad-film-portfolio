import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "\uD83C\uDFAD",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 text-4xl text-text-tertiary" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-tertiary">{description}</p>
      )}
      {actionLabel && (
        <div className="mt-4">
          {actionHref ? (
            <a href={actionHref}>
              <Button>{actionLabel}</Button>
            </a>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}
