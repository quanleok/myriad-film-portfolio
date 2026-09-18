"use client";

import { useMiniPlayer } from "@/contexts/MiniPlayerContext";
import { cn } from "@/lib/utils";

export function SidebarContentWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const { miniPlayer } = useMiniPlayer();
  const hasMiniPlayer = !!miniPlayer;

  return (
    <div className={cn("transition-all duration-200 lg:ml-16", hasMiniPlayer && "pb-20", className)}>
      {children}
    </div>
  );
}
