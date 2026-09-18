"use client";

import { useState } from "react";

interface ExpandableDescriptionProps {
  text: string;
}

export function ExpandableDescription({ text }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl bg-surface hover:bg-surface-hover transition-colors cursor-pointer p-3"
      onClick={() => text.length > 200 && setExpanded(!expanded)}
    >
      <p
        className={`whitespace-pre-wrap text-[14px] text-text-primary leading-relaxed ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      {text.length > 200 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="mt-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          {expanded ? "Show less" : "...more"}
        </button>
      )}
    </div>
  );
}
