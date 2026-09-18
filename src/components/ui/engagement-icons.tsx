"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const UPVOTE_LIGHT = "#5DCAA5";
const UPVOTE_DARK = "#1D9E75";
const COMMENT_BASE = "#0F6E56";
const COMMENT_LIGHT = "#5DCAA5";
const COMMENT_FILL = "rgba(15,110,86,0.1)";
const SHARE_BASE = "#7F77DD";
const SHARE_DARK = "#534AB7";
const SHARE_LIGHT = "#AFA9EC";
const SPRING_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

interface EngagementIconProps {
  animated?: boolean;
  active?: boolean;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
}

export function UpvoteIcon({
  animated = false,
  active = false,
  size = 18,
  className,
  reducedMotion = false,
}: EngagementIconProps) {
  const uniqueId = useId().replace(/[:]/g, "");
  const clipId = `upvote-clip-${uniqueId}`;
  const gradientId = `upvote-grad-${uniqueId}`;
  const emphasized = active || animated;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{
        transform:
          emphasized && !reducedMotion ? "translateY(-2px)" : "translateY(0px)",
        transition: reducedMotion ? "none" : `transform 0.3s ${SPRING_EASE}`,
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M12 3L3 12H7.5V21H16.5V12H21L12 3Z" />
        </clipPath>
        <linearGradient id={gradientId} x1="12" y1="21" x2="12" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={UPVOTE_LIGHT} />
          <stop offset="100%" stopColor={UPVOTE_DARK} />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect
          x="0"
          y="0"
          width="24"
          height="24"
          fill={`url(#${gradientId})`}
          style={{
            transform: emphasized ? "translateY(0%)" : "translateY(100%)",
            transition: reducedMotion
              ? "none"
              : `transform 0.45s ${SPRING_EASE}`,
          }}
        />
      </g>

      <path
        d="M12 3L3 12H7.5V21H16.5V12H21L12 3Z"
        stroke={emphasized ? UPVOTE_DARK : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
        style={{
          transition: reducedMotion ? "none" : "stroke 0.3s ease",
        }}
      />
    </svg>
  );
}

export function CommentIcon({
  animated = false,
  size = 18,
  className,
  reducedMotion = false,
}: EngagementIconProps) {
  const [typingStep, setTypingStep] = useState(-1);

  useEffect(() => {
    if (!animated || reducedMotion) {
      setTypingStep(-1);
      return;
    }

    setTypingStep(0);
    const interval = window.setInterval(() => {
      setTypingStep((step) => (step + 1) % 3);
    }, 280);

    return () => window.clearInterval(interval);
  }, [animated, reducedMotion]);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M21 11.5C21 16.19 16.97 20 12 20C10.82 20 9.69 19.81 8.65 19.45L3 21L4.55 15.35C3.56 13.82 3 12.01 3 11.5C3 6.81 7.03 3 12 3C16.97 3 21 6.81 21 11.5Z"
        stroke={animated ? COMMENT_BASE : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={animated ? COMMENT_FILL : "transparent"}
        style={{
          transition: reducedMotion ? "none" : "fill 0.3s ease, stroke 0.3s ease",
        }}
      />
      {[8, 12, 16].map((cx, index) => (
        <circle
          key={cx}
          cx={cx}
          cy={typingStep === index ? 10 : 11.5}
          r="1.2"
          fill={animated ? COMMENT_BASE : "currentColor"}
          style={{
            transition: reducedMotion
              ? "none"
              : "cy 0.18s ease, fill 0.2s ease",
          }}
        />
      ))}
      {animated ? (
        <path
          d="M6.6 16.85C8.08 17.62 9.89 18.05 11.82 18.05"
          stroke={COMMENT_LIGHT}
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity={0.8}
          style={{
            transition: reducedMotion ? "none" : "opacity 0.2s ease",
          }}
        />
      ) : null}
    </svg>
  );
}

export function ShareIcon({
  animated = false,
  active = false,
  size = 18,
  className,
  reducedMotion = false,
}: EngagementIconProps) {
  const emphasized = animated || active;

  const nodeTransition = (delaySeconds: number) =>
    reducedMotion
      ? "none"
      : emphasized
        ? `fill 0.3s ease ${delaySeconds}s`
        : "fill 0.18s ease";

  const lineTransition = (delaySeconds: number) =>
    reducedMotion
      ? "none"
      : emphasized
        ? `stroke-dashoffset 0.4s ease ${delaySeconds}s, stroke 0.3s ease ${delaySeconds}s`
        : "stroke-dashoffset 0.2s ease, stroke 0.2s ease";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <line
        x1="8.5"
        y1="13.5"
        x2="15.5"
        y2="8"
        stroke={emphasized ? SHARE_BASE : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        className="origin-center"
        style={{
          strokeDasharray: 20,
          strokeDashoffset: emphasized ? 0 : 20,
          transition: lineTransition(0.06),
        }}
      />
      <line
        x1="8.5"
        y1="13.5"
        x2="15.5"
        y2="19"
        stroke={emphasized ? SHARE_BASE : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{
          strokeDasharray: 20,
          strokeDashoffset: emphasized ? 0 : 20,
          transition: lineTransition(0.18),
        }}
      />

      <circle
        cx="18"
        cy="6"
        r="3"
        stroke={emphasized ? SHARE_BASE : "currentColor"}
        strokeWidth="1.5"
        fill="none"
        style={{
          transition: reducedMotion ? "none" : "stroke 0.3s ease",
        }}
      />
      <circle
        cx="6"
        cy="13.5"
        r="3"
        stroke={emphasized ? SHARE_BASE : "currentColor"}
        strokeWidth="1.5"
        fill="none"
        style={{
          transition: reducedMotion ? "none" : "stroke 0.3s ease",
        }}
      />
      <circle
        cx="18"
        cy="21"
        r="3"
        stroke={emphasized ? SHARE_BASE : "currentColor"}
        strokeWidth="1.5"
        fill="none"
        style={{
          transition: reducedMotion ? "none" : "stroke 0.3s ease",
        }}
      />

      <circle
        cx="6"
        cy="13.5"
        r="2.35"
        fill={emphasized ? SHARE_BASE : "transparent"}
        style={{ transition: nodeTransition(0) }}
      />
      <circle
        cx="18"
        cy="6"
        r="2.35"
        fill={emphasized ? SHARE_LIGHT : "transparent"}
        style={{ transition: nodeTransition(0.12) }}
      />
      <circle
        cx="18"
        cy="21"
        r="2.35"
        fill={emphasized ? SHARE_DARK : "transparent"}
        style={{ transition: nodeTransition(0.24) }}
      />
    </svg>
  );
}
