import {
  Clapperboard,
  Film,
  Hammer,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ProjectLaunchMode } from "@/types/project";

export interface CreatorLaunchOption {
  id: ProjectLaunchMode;
  href: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  colorClassName: string;
  borderClassName: string;
  glowClassName: string;
  badgeClassName: string;
}

export const CREATOR_LAUNCH_OPTIONS: CreatorLaunchOption[] = [
  {
    id: "teaser",
    href: "/projects/new?mode=teaser",
    icon: Sparkles,
    title: "Teaser Drop",
    subtitle: "Post the concept first",
    description:
      "Launch a teaser page with the video, hook, and world-building essentials. No pricing, goal, or deadline yet.",
    colorClassName: "text-white",
    borderClassName: "border-white/20 hover:border-white/35",
    glowClassName: "hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]",
    badge: "Lightest",
    badgeClassName: "bg-white/10 text-white/85",
  },
  {
    id: "preorder",
    href: "/projects/new?mode=preorder",
    icon: Rocket,
    title: "Seed Campaign",
    subtitle: "Film not made yet",
    description:
      "Launch a concept page with teaser, characters, and world-building. Collect preorders to fund production.",
    colorClassName: "text-teal-300",
    borderClassName: "border-teal-400/30 hover:border-teal-400/60",
    glowClassName: "hover:shadow-[0_0_20px_rgba(45,212,191,0.15)]",
    badge: "Preorder",
    badgeClassName: "bg-teal-500/10 text-teal-300",
  },
  {
    id: "production",
    href: "/projects/new?mode=production",
    icon: Hammer,
    title: "Direct to Production",
    subtitle: "Start making, take preorders along the way",
    description:
      "Skip the unlock phase and commit to producing your film from day one. Viewers can preorder while you create.",
    colorClassName: "text-purple-500",
    borderClassName: "border-purple-500/30 hover:border-purple-500/60",
    glowClassName: "hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]",
    badge: "Production",
    badgeClassName: "bg-purple-500/10 text-purple-400",
  },
  {
    id: "direct_premiere",
    href: "/projects/new/quick?mode=direct_premiere",
    icon: Clapperboard,
    title: "Schedule Premiere",
    subtitle: "Film is ready, premiere it live",
    description:
      "Upload your film and schedule a premiere event. Viewers watch together live, then it continues as a release surface.",
    colorClassName: "text-amber-500",
    borderClassName: "border-amber-500/30 hover:border-amber-500/60",
    glowClassName: "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    badge: "Event",
    badgeClassName: "bg-amber-500/10 text-amber-400",
  },
  {
    id: "direct_release",
    href: "/projects/new/quick?mode=direct_release",
    icon: Film,
    title: "Release Now",
    subtitle: "Film is ready",
    description:
      "Upload your finished film and make it available to watch immediately. Set a price or release it for free.",
    colorClassName: "text-green-500",
    borderClassName: "border-green-500/30 hover:border-green-500/60",
    glowClassName: "hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
    badge: "Fastest",
    badgeClassName: "bg-green-500/10 text-green-400",
  },
];
