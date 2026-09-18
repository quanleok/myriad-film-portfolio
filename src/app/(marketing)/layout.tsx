"use client";

import { usePathname } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="sticky top-0 z-40">
        <LandingNav scrolled />
      </div>

      {children}
    </div>
  );
}
