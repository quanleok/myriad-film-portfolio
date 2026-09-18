import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar";
import { BlockedCreatorsProvider } from "@/contexts/BlockedCreatorsContext";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlockedCreatorsProvider>
      <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-page"
        >
          Skip to content
        </a>
        <Navbar />
        <Sidebar />
        <div className="transition-all duration-200 lg:ml-16">
          <main id="main-content" className="min-h-screen">{children}</main>
          <Footer />
        </div>
      </SidebarProvider>
    </BlockedCreatorsProvider>
  );
}
