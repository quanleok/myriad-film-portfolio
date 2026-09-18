import { PublicSurfaceHeader } from "@/components/public/public-surface-header";

export default function StandaloneWatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      <PublicSurfaceHeader backHref="/watch" backLabel="Back to watch" />

      <main>{children}</main>
    </div>
  );
}
