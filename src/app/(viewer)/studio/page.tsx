import Link from "next/link";
import { ArrowRight, FileText, FolderOpen, Search } from "lucide-react";
import { IronForgeIcon } from "@/components/ui/myriad-app-icons";

const FORGE_COLUMNS = [
  {
    title: "Script desk",
    body: "Keep scene pages, rewrite notes, dialogue fragments, and reference beats in one project workspace.",
    icon: FileText,
  },
  {
    title: "Media bins",
    body: "Store teaser assets, concept media, and production references without digging through folders outside the app.",
    icon: FolderOpen,
  },
  {
    title: "Fast retrieval",
    body: "Search inside a project for the clip, script beat, or note you need before you publish or deliver.",
    icon: Search,
  },
];

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <div className="overflow-hidden rounded-[32px] border border-violet-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.16),_transparent_30%),linear-gradient(180deg,rgba(12,8,19,0.98)_0%,rgba(7,7,11,1)_100%)] p-8 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200">
                <IronForgeIcon size={14} />
                IronForge
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Keep scripts, media, and production notes in one private workspace.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                IronForge is the filmmaker workspace behind the public release. It stays focused on the simple things that matter: script management, media organization, and quick retrieval when production gets messy.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-92"
              >
                Create project
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white/86 transition-colors hover:bg-white/[0.1]"
              >
                Open dashboard
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {FORGE_COLUMNS.map((column) => {
            const Icon = column.icon;
            return (
              <div key={column.title} className="rounded-[28px] border border-border bg-page-secondary p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/18 bg-violet-400/10 text-violet-200">
                  <Icon size={19} />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-text-primary">{column.title}</h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{column.body}</p>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
