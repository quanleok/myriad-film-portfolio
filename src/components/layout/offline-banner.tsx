"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function goOffline() {
      setOffline(true);
    }
    function goOnline() {
      setOffline(false);
    }

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    if (!navigator.onLine) setOffline(true);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-role-warning-fg px-4 py-2 text-center text-sm font-medium text-role-fg-contrast">
      You&apos;re offline. Some features may not work.
    </div>
  );
}
