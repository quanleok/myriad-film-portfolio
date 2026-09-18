import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { formatCount } from "@/lib/utils";
import type { TalentSummary } from "@/lib/talent";

interface TalentCardProps {
  talent: TalentSummary;
  variant?: "hero" | "default" | "compact";
  showContact?: boolean;
}

export function TalentCard({
  talent,
  variant = "default",
  showContact = false,
}: TalentCardProps) {
  const compact = variant === "compact";
  const hero = variant === "hero";
  const specialties = compact ? talent.specialties.slice(0, 2) : talent.specialties.slice(0, 3);
  const hireMeta = [
    talent.hireAvailabilityLabel,
    talent.hirePriceBandLabel,
  ].filter(Boolean) as string[];
  const hireSpecialties = talent.hireSpecialties.slice(0, compact ? 2 : 3);
  const stats = [
    `${talent.clipCount} clip${talent.clipCount === 1 ? "" : "s"}`,
    `${talent.projectCount} project${talent.projectCount === 1 ? "" : "s"}`,
    talent.totalViews > 0 ? `${formatCount(talent.totalViews)} views` : null,
    talent.followerCount > 0 ? `${formatCount(talent.followerCount)} followers` : null,
  ].filter(Boolean) as string[];
  const avatarSize = compact ? 56 : hero ? 72 : 64;

  return (
    <article
      className={`group flex h-full flex-col rounded-[28px] bg-[#08100d] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b1410] hover:ring-emerald-300/16 ${
        hero ? "min-h-[320px] p-7" : compact ? "min-h-[250px]" : "min-h-[300px]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/68">
          <Sparkles size={12} className="text-emerald-300/74" />
          {talent.kindLabel}
        </div>

        {talent.isFoundingCreator ? (
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/82">
            Founding
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-start gap-4">
        {talent.avatarUrl ? (
          <Image
            src={talent.avatarUrl}
            alt={talent.displayName}
            width={avatarSize}
            height={avatarSize}
            className="rounded-[22px] bg-[#0e1712] object-cover shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-[22px] bg-[#0e1712] font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
            style={{ width: avatarSize, height: avatarSize, fontSize: compact ? 24 : hero ? 30 : 28 }}
          >
            {talent.displayName[0]?.toUpperCase() ?? "C"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className={`truncate font-display font-black tracking-[-0.04em] text-white ${hero ? "text-[2rem]" : compact ? "text-[1.35rem]" : "text-[1.6rem]"}`}>
            {talent.displayName}
          </p>
          <p className="mt-1 truncate text-sm text-white/52">@{talent.username}</p>
          <p className="mt-3 text-sm font-medium text-emerald-100/80">
            {talent.headline}
          </p>
        </div>
      </div>

      {talent.bio ? (
        <p className={`mt-5 text-sm text-white/62 ${compact ? "line-clamp-2 leading-6" : "line-clamp-3 leading-6"}`}>
          {talent.bio}
        </p>
      ) : null}

      {specialties.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/70"
            >
              {specialty}
            </span>
          ))}
        </div>
      ) : null}

      {hireSpecialties.length > 0 || hireMeta.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {hireSpecialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100/80"
            >
              {specialty}
            </span>
          ))}
          {hireMeta.map((item) => (
            <span
              key={item}
              className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/64"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/46">
        {stats.map((stat) => (
          <span key={stat}>{stat}</span>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <Link
          href={`/creator/${talent.username}`}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#061007] transition-all duration-150 hover:bg-emerald-300"
        >
          View profile
          <ArrowRight size={14} />
        </Link>

        {talent.primaryLink && showContact ? (
          <a
            href={talent.primaryLink.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/78 transition-all duration-150 hover:bg-white/[0.08] hover:text-white"
          >
            {talent.primaryLink.label}
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
