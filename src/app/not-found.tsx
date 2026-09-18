import Link from "next/link";
import { SpringLogo } from "@/components/ui/spring-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
        <SpringLogo className="h-8 w-8" />
      </div>
      <h1 className="font-display text-4xl font-bold text-text-primary">404</h1>
      <p className="mt-2 text-lg text-text-secondary">
        This page doesn&apos;t exist
      </p>
      <p className="mt-1 text-sm text-text-tertiary">
        The page you&apos;re looking for may have been moved or removed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/explore"
          className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-500"
        >
          Explore Projects
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
