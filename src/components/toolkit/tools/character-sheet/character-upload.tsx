"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHARACTER_OUTPUT_OPTIONS,
  type CharacterOutputType,
} from "@/lib/toolkit/character-sheet-config";
import { cn } from "@/lib/utils";
import { OutputOptionCard } from "./output-option-card";
import type { CharacterRecord, UploadedCharacterImage } from "./types";

interface CharacterUploadProps {
  characters: CharacterRecord[];
  selectedCharacterId: string | null;
  selectedCharacter: CharacterRecord | null;
  uploadedImage: UploadedCharacterImage | null;
  uploadBusy: boolean;
  selectedOutputTypes: Set<CharacterOutputType>;
  hint: string;
  generating: boolean;
  generationLabel: string | null;
  onSelectCharacter: (id: string) => void;
  onCreateCharacter: (name: string) => Promise<CharacterRecord | null>;
  onUploadFile: (file: File) => Promise<void>;
  onResetUploadedImage: () => void;
  onToggleOutput: (type: CharacterOutputType) => void;
  onHintChange: (value: string) => void;
  onGenerate: () => Promise<void>;
}

export function CharacterUpload({
  characters,
  selectedCharacterId,
  selectedCharacter,
  uploadedImage,
  uploadBusy,
  selectedOutputTypes,
  hint,
  generating,
  generationLabel,
  onSelectCharacter,
  onCreateCharacter,
  onUploadFile,
  onResetUploadedImage,
  onToggleOutput,
  onHintChange,
  onGenerate,
}: CharacterUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [creatingInline, setCreatingInline] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [creatingCharacter, setCreatingCharacter] = useState(false);

  const sourceImageUrl = uploadedImage?.url ?? selectedCharacter?.ref_image_url ?? null;
  const usingSavedReference = !uploadedImage && !!selectedCharacter?.ref_image_url;
  const selectedCount = selectedOutputTypes.size;
  const canGenerate = Boolean(sourceImageUrl && selectedCharacterId && selectedCount > 0 && !generating);

  const selectorValue = useMemo(() => {
    if (creatingInline) return "__new__";
    return selectedCharacterId ?? "";
  }, [creatingInline, selectedCharacterId]);

  async function handleCreateInline() {
    const name = newCharacterName.trim();
    if (!name || creatingCharacter) return;
    setCreatingCharacter(true);
    const next = await onCreateCharacter(name);
    setCreatingCharacter(false);
    if (next) {
      setCreatingInline(false);
      setNewCharacterName("");
    }
  }

  async function handleDrop(file: File | null) {
    if (!file) return;
    await onUploadFile(file);
  }

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Character sheet
          </p>
          <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.05em] text-text-primary">
            Build a reusable character folder
          </h2>
        </div>
        <div className="rounded-full border border-brand-500/18 bg-brand-500/8 px-3.5 py-2 text-xs font-medium text-brand-200">
          Persistent outputs saved to your account
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label
            className={cn(
              "group flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed p-4 text-center transition-all duration-200",
              dragging
                ? "border-brand-500/40 bg-brand-500/8"
                : "border-white/10 bg-black/16 hover:border-brand-500/24 hover:bg-black/24"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleDrop(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            {sourceImageUrl ? (
              <div className="relative h-full w-full overflow-hidden rounded-[1.2rem] border border-white/8 bg-black/30">
                <img
                  src={sourceImageUrl}
                  alt="Character reference"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-full border border-white/10 bg-black/58 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <span>{usingSavedReference ? "Folder reference" : "New upload"}</span>
                  <span>{usingSavedReference ? "Ready" : "Unsaved until generation"}</span>
                </div>
              </div>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/30 text-brand-200">
                  <Upload className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Drop a character image</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    PNG, JPG, or WEBP up to 10MB.
                  </p>
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleDrop(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={uploadBusy}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/png,image/jpeg,image/webp";
                input.onchange = () => void handleDrop(input.files?.[0] ?? null);
                input.click();
              }}
              className="flex-1 rounded-full"
            >
              {sourceImageUrl ? "Change image" : "Upload image"}
            </Button>
            {uploadedImage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onResetUploadedImage}
                className="rounded-full"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CHARACTER_OUTPUT_OPTIONS.map((option) => (
              <OutputOptionCard
                key={option.type}
                type={option.type}
                selected={selectedOutputTypes.has(option.type)}
                onToggle={onToggleOutput}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-primary">Save to character folder</label>
              <select
                value={selectorValue}
                onChange={(event) => {
                  if (event.target.value === "__new__") {
                    setCreatingInline(true);
                    return;
                  }
                  setCreatingInline(false);
                  onSelectCharacter(event.target.value);
                }}
                className="h-12 w-full rounded-[1rem] border border-white/10 bg-black/18 px-4 text-sm font-medium text-text-primary outline-none transition-all duration-150 focus:border-brand-500/35 focus:ring-2 focus:ring-brand-500/25"
              >
                {!characters.length ? <option value="">No folders yet</option> : null}
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
                <option value="__new__">New character folder…</option>
              </select>
              {creatingInline ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newCharacterName}
                    onChange={(event) => setNewCharacterName(event.target.value)}
                    placeholder="Folder name"
                    className="h-11 rounded-xl border-white/10 bg-black/18 text-text-primary focus:border-brand-500/35 focus:ring-brand-500/25"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCreateInline()}
                    loading={creatingCharacter}
                    className="rounded-full sm:px-5"
                  >
                    Create
                  </Button>
                </div>
              ) : null}
            </div>

            <Input
              label="Generation note"
              value={hint}
              onChange={(event) => onHintChange(event.target.value)}
              placeholder="Optional style note or context"
              className="h-12 rounded-[1rem] border-white/10 bg-black/18 text-text-primary focus:border-brand-500/35 focus:ring-brand-500/25"
            />

            <div className="flex flex-col justify-end gap-2">
              <Button
                type="button"
                onClick={() => void onGenerate()}
                disabled={!canGenerate}
                className="h-12 rounded-full px-6"
                leftIcon={
                  generating ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
                }
              >
                {generating
                  ? generationLabel ?? "Generating"
                  : `Generate ${selectedCount || 0} ${selectedCount === 1 ? "output" : "outputs"}`}
              </Button>
              <p className="text-xs text-text-tertiary">
                {sourceImageUrl
                  ? "The active image becomes the source for every selected output."
                  : "Upload or pick a reference image first."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
