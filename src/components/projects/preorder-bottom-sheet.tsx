"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { ProjectLifecycleStatus } from "@/types/project";

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

type StripeElement = {
  mount: (selectorOrEl: string | HTMLElement) => void;
  unmount: () => void;
  destroy?: () => void;
};

type StripeElements = {
  create: (type: string, options?: Record<string, unknown>) => StripeElement;
};

type StripeInstance = {
  elements: (options: {
    clientSecret: string;
    appearance?: Record<string, unknown>;
  }) => StripeElements;
  confirmPayment: (options: {
    elements: StripeElements;
    confirmParams?: { return_url?: string };
    redirect?: "if_required" | "always";
  }) => Promise<{
    error?: { message?: string };
    paymentIntent?: { status?: string };
  }>;
};

interface PreorderBottomSheetProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  title: string;
  amountCents: number | null;
  onSuccess?: () => void;
  mode?: "preorder" | "purchase";
  lifecycleStatus?: ProjectLifecycleStatus;
}

let stripeScriptPromise: Promise<void> | null = null;

function loadStripeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.Stripe) return Promise.resolve();

  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Stripe")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Stripe"));
      document.head.appendChild(script);
    });
  }

  return stripeScriptPromise;
}

export function PreorderBottomSheet({
  open,
  onClose,
  projectId,
  title,
  amountCents,
  onSuccess,
  mode = "preorder",
  lifecycleStatus,
}: PreorderBottomSheetProps) {
  const isPurchase = mode === "purchase";
  const { user } = useAuth();
  const pathname = usePathname();
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const containerId = useMemo(
    () => `project-preorder-payment-element-${projectId}`,
    [projectId]
  );

  const stripeRef = useRef<StripeInstance | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripeElement | null>(null);
  const currentLocation =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : (pathname || `/project/${projectId}`);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccessMessage(null);
      return;
    }

    if (!user) return;

    async function setup() {
      setError(null);
      setLoadingIntent(true);

      try {
        const endpoint = isPurchase ? "/api/purchases" : "/api/preorders";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
          const redirect = encodeURIComponent(currentLocation);
          window.location.href = `/login?redirect=${redirect}`;
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? (isPurchase ? "Unable to start purchase checkout" : "Unable to start preorder checkout"));
        }

        if (!payload.clientSecret || typeof payload.clientSecret !== "string") {
          throw new Error("Invalid checkout session returned by server");
        }

        setClientSecret(payload.clientSecret);
      } catch (err) {
        setError(err instanceof Error ? err.message : (isPurchase ? "Unable to start purchase checkout" : "Unable to start preorder checkout"));
      } finally {
        setLoadingIntent(false);
      }
    }

    setup();
  }, [currentLocation, isPurchase, open, projectId, user]);

  useEffect(() => {
    if (!open || !clientSecret) return;

    let mounted = true;

    async function mountElements() {
      try {
        await loadStripeScript();

        if (!mounted) return;

        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          throw new Error("Stripe publishable key is missing");
        }

        const stripeFactory = window.Stripe;
        if (!stripeFactory) {
          throw new Error("Stripe failed to initialize");
        }

        const stripe = stripeFactory(publishableKey);
        stripeRef.current = stripe;

        const rootStyles = getComputedStyle(document.documentElement);
        const token = (name: string) => rootStyles.getPropertyValue(name).trim();
        const isDarkMode = document.documentElement.classList.contains("dark")
          || window.matchMedia("(prefers-color-scheme: dark)").matches;

        const elements = stripe.elements({
          clientSecret: clientSecret!,
          appearance: {
            theme: isDarkMode ? "night" : "stripe",
            variables: {
              colorBackground: token("--role-bg-page-secondary"),
              colorText: token("--role-fg-primary"),
              colorDanger: token("--role-danger-fg"),
              colorPrimary: token("--role-brand-600"),
              colorPrimaryText: token("--role-brand-on"),
              colorTextPlaceholder: token("--role-fg-tertiary"),
              borderRadius: "10px",
            },
          },
        });

        elementsRef.current = elements;

        const paymentElement = elements.create("payment", {
          layout: "tabs",
        });

        paymentElementRef.current = paymentElement;
        paymentElement.mount(`#${containerId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load checkout form");
      }
    }

    mountElements();

    return () => {
      mounted = false;
      paymentElementRef.current?.unmount();
      paymentElementRef.current?.destroy?.();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, [open, clientSecret, containerId]);

  async function handleConfirm() {
    if (!stripeRef.current || !elementsRef.current) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: "if_required",
        confirmParams: {
          return_url: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Payment confirmation failed");
      }

      setSuccessMessage(isPurchase ? "Purchase complete. You now have access." : "Preorder confirmed. You're on the unlock board.");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const disableConfirm = loadingIntent || submitting || !clientSecret || !user;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-role-bg-overlay"
        aria-label="Close preorder checkout"
        onClick={onClose}
      />

      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-border bg-page-secondary p-4 shadow-2xl md:left-1/2 md:max-h-[90vh] md:w-[520px] md:-translate-x-1/2 md:rounded-2xl md:bottom-6">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-text-tertiary/40 md:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-tertiary">{isPurchase ? "Buy Access" : "Seed"}</p>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary">
              {amountCents ? `You will be charged ${formatPrice(amountCents)} (USD).` : "Complete checkout."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!user ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm text-text-secondary">
              Sign in to {isPurchase ? "purchase access" : "preorder"} this project.
            </p>
            <a
              href={`/login?redirect=${encodeURIComponent(currentLocation)}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Sign in to continue
            </a>
          </div>
        ) : (
          <>
            {loadingIntent ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-6 text-center text-sm text-text-secondary">
                Preparing secure checkout...
              </div>
            ) : (
              <div id={containerId} className="min-h-[180px] rounded-lg border border-border bg-surface p-2" />
            )}

            {error ? (
              <p className="mt-3 rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">{error}</p>
            ) : null}

            {successMessage ? (
              <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                lifecycleStatus === "premiering"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : lifecycleStatus === "released"
                    ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
              }`}>
                {successMessage}
              </p>
            ) : null}
          </>
        )}

        {!isPurchase && user ? (
          <p className="mt-3 text-center text-xs text-text-tertiary">
            If this project doesn&apos;t reach its unlock target, you&apos;ll be refunded automatically.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {user ? (
            <Button onClick={handleConfirm} disabled={disableConfirm}>
              {submitting ? "Confirming..." : isPurchase ? `Purchase${amountCents ? ` — ${formatPrice(amountCents)}` : ""}` : `Confirm Preorder${amountCents ? ` — ${formatPrice(amountCents)}` : ""}`}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
