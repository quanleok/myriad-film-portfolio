import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/admin/videos", label: "Content", icon: "video" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/creators", label: "Creators", icon: "star" },
  { href: "/admin/projects", label: "Projects", icon: "folder" },
  { href: "/admin/opportunities", label: "Opportunities", icon: "briefcase" },
  { href: "/admin/reports", label: "Reports", icon: "flag" },
  { href: "/admin/blog", label: "News", icon: "pen" },
] as const;

function NavIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "chart":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "video":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        </svg>
      );
    case "users":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "star":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "folder":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <rect width="20" height="14" x="2" y="6" rx="2" />
          <path d="M12 12h.01" />
        </svg>
      );
    case "flag":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      );
    case "pen":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-page">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-border bg-page-secondary">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <Link href="/admin" className="text-lg font-bold text-text-primary">
            Myriad <span className="text-xs font-normal text-text-tertiary">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
