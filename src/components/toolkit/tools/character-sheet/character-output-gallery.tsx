"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterOutputCard } from "./character-output-card";
import type { CharacterOutputRecord } from "./types";

interface CharacterOutputGalleryProps {
  characterName: string;
  outputs: CharacterOutputRecord[];
  loading: boolean;
  onPin: (outputId: string) => Promise<void>;
  onDelete: (outputId: string) => Promise<void>;
  onExport: () => void;
}

export function CharacterOutputGallery({
  characterName,
  outputs,
  loading,
  onPin,
  onDelete,
  onExport,
}: CharacterOutputGalleryProps) {
  return (
    <div className="min-h-[320px] space-y-5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Output gallery
          </p>
          <h3 className="mt-2 text-xl font-semibold text-text-primary">
            {characterName ? `${characterName}'s outputs` : "Saved outputs"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {outputs.length
              ? `${outputs.length} saved ${outputs.length === 1 ? "result" : "results"}`
              : "No outputs yet. Upload an image and generate."}
          </p>
        </div>
        {outputs.length ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onExport}
            className="rounded-full"
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Export JSON
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/12 px-6 py-16 text-center text-sm text-text-secondary">
          Loading saved outputs…
        </div>
      ) : outputs.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {outputs.map((output) => (
            <CharacterOutputCard
              key={output.id}
              output={output}
              onPin={onPin}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/14 px-6 py-16 text-center">
          <p className="text-base font-semibold text-text-primary">No outputs yet.</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Upload a reference image, pick one or more outputs, and generate your first saved character sheet.
          </p>
        </div>
      )}
    </div>
  );
}
