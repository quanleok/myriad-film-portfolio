import { PublicSurfaceHeader } from "@/components/public/public-surface-header";

export default function CreatorProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      <PublicSurfaceHeader />
      <main>{children}</main>
    </div>
  );
}
