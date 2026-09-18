"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { BlockedCreatorsProvider } from "@/contexts/BlockedCreatorsContext";
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar";
import { SidebarContentWrapper } from "@/components/layout/sidebar-content-wrapper";
import { LandingNav } from "@/components/landing/landing-nav";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brandV2Enabled = isFeatureEnabled("FF_BRAND_V2");
  const pathname = usePathname();
  const isPublicPreorderSurface =
    pathname === "/explore" ||
    pathname.startsWith("/explore/") ||
    pathname === "/browse" ||
    pathname.startsWith("/browse/") ||
    pathname === "/premieres" ||
    pathname.startsWith("/premieres/") ||
    pathname === "/project" ||
    pathname.startsWith("/project/");

  return (
    <BlockedCreatorsProvider>
      <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-page"
        >
          Skip to content
        </a>
        {isPublicPreorderSurface ? (
          <div className="min-h-screen bg-page text-text-primary">
            <LandingNav />
            <main
              id="main-content"
              className={`min-h-screen ${brandV2Enabled ? "text-cinema-sub" : ""}`}
            >
              {children}
            </main>
            <Footer />
          </div>
        ) : (
          <>
            <Navbar />
            <Sidebar />
            <SidebarContentWrapper className={brandV2Enabled ? "cinema-backdrop" : undefined}>
              <main id="main-content" className={`min-h-screen ${brandV2Enabled ? "text-cinema-sub" : ""}`}>{children}</main>
              <Footer />
            </SidebarContentWrapper>
          </>
        )}
      </SidebarProvider>
      <MobileBottomNav />
    </BlockedCreatorsProvider>
  );
}
