"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-red-500/30">!</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-tertiary">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
