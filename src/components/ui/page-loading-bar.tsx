"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageLoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show loading bar on route change
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(80), 300);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(0,232,123,0.55)]"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
