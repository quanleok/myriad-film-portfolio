"use client";

import Link from "next/link";
import { CREATOR_LAUNCH_OPTIONS } from "./creator-launch-options";

export function LaunchModePicker() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Create a Project</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Choose how you want to launch your film on Myriad Spring.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {CREATOR_LAUNCH_OPTIONS.map((mode) => {
          const Icon = mode.icon;

          return (
          <Link
            key={mode.href}
            href={mode.href}
            className={`group relative rounded-xl border bg-surface p-5 transition-all duration-200 ${mode.borderClassName} ${mode.glowClassName}`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 ${mode.colorClassName}`}>
                <Icon size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-white transition-colors">
                    {mode.title}
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mode.badgeClassName}`}>
                    {mode.badge}
                  </span>
                </div>
                <p className={`mt-0.5 text-xs font-medium ${mode.colorClassName}`}>
                  {mode.subtitle}
                </p>
                <p className="mt-1.5 text-sm text-text-tertiary leading-relaxed">
                  {mode.description}
                </p>
              </div>
              <svg
                className="mt-2 h-5 w-5 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-text-tertiary">
        Start with <strong>Teaser Drop</strong> if you want to post the concept first, or <strong>Seed Campaign</strong> if you are ready to collect preorders.
      </p>
    </div>
  );
}
