"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StripeConnectButtonProps {
  children: ReactNode;
  returnPath?: string;
  showInlineError?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}

function buildReturnPath(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

export function StripeConnectButton({
  children,
  returnPath,
  showInlineError = true,
  className,
  variant,
  size,
}: StripeConnectButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath:
            returnPath ??
            buildReturnPath(pathname, searchParams?.toString() ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Could not open Stripe onboarding");
      }

      window.location.assign(payload.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open Stripe onboarding"
      );
      setPending(false);
    }
  }

  return (
    <div className={showInlineError ? "space-y-2" : undefined}>
      <Button
        type="button"
        className={className}
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => void handleClick()}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        {pending ? "Opening Stripe..." : children}
      </Button>
      {showInlineError && error ? (
        <p className="max-w-xs text-xs text-role-danger-fg">{error}</p>
      ) : null}
    </div>
  );
}
