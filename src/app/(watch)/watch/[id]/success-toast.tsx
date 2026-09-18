"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SuccessToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Clean up the URL params so banner doesn't persist on reload
    router.replace(pathname, { scroll: false });

    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  if (!visible) return null;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 mt-4">
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-in fade-in duration-300">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {message}
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-auto text-green-400/60 hover:text-green-400 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
