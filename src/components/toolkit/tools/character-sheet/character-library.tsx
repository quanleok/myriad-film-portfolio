"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CharacterRecord } from "./types";

interface CharacterLibraryProps {
  characters: CharacterRecord[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<CharacterRecord | null>;
}

function getCharacterBadge(character: CharacterRecord) {
  return character.thumbnail_url ? (
    <img
      src={character.thumbnail_url}
      alt={character.name}
      className="h-11 w-11 rounded-2xl object-cover"
    />
  ) : (
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-sm font-semibold text-brand-200">
      {character.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function CharacterLibrary({
  characters,
  selectedId,
  loading,
  onSelect,
  onCreate,
}: CharacterLibraryProps) {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return characters;
    return characters.filter((character) => character.name.toLowerCase().includes(normalized));
  }, [characters, deferredQuery]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    const next = await onCreate(name);
    setCreating(false);

    if (next) {
      setNewName("");
      setIsCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-5">
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Character library
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text-primary">Saved folders</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search characters"
            className="h-11 rounded-full border-white/8 bg-black/18 pl-10 text-text-primary focus:border-brand-500/35 focus:ring-brand-500/25"
          />
        </div>
      </div>

      <div className="xl:hidden">
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
          {filtered.map((character) => {
            const active = selectedId === character.id;
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => onSelect(character.id)}
                className={cn(
                  "flex min-w-[140px] shrink-0 items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition-all duration-200",
                  active
                    ? "border-brand-500/35 bg-brand-500/10"
                    : "border-white/8 bg-black/18 hover:border-brand-500/18 hover:bg-black/26"
                )}
              >
                {getCharacterBadge(character)}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{character.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {character.output_count} {character.output_count === 1 ? "output" : "outputs"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 xl:flex xl:flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/14 px-4 py-8 text-center text-sm text-text-secondary">
              Loading character folders…
            </div>
          ) : filtered.length ? (
            filtered.map((character) => {
              const active = selectedId === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => onSelect(character.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition-all duration-200",
                    active
                      ? "border-brand-500/35 bg-brand-500/10 shadow-[0_0_0_1px_rgba(0,232,123,0.12)]"
                      : "border-white/8 bg-black/14 hover:border-brand-500/18 hover:bg-black/24"
                  )}
                >
                  {getCharacterBadge(character)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{character.name}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {character.output_count} {character.output_count === 1 ? "output" : "outputs"}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/14 px-4 py-8 text-center text-sm text-text-secondary">
              {characters.length ? "No characters match this search." : "No characters yet."}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {isCreating ? (
          <div className="rounded-[1.2rem] border border-brand-500/20 bg-brand-500/8 p-3">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Character name"
              className="h-10 rounded-xl border-white/10 bg-black/18 text-text-primary focus:border-brand-500/35 focus:ring-brand-500/25"
            />
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreate()}
                loading={creating}
                className="rounded-full"
              >
                Save folder
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsCreating(false);
                  setNewName("");
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-dashed border-brand-500/22 bg-brand-500/6 px-4 py-3 text-sm font-semibold text-brand-200 transition-all duration-200 hover:border-brand-500/38 hover:bg-brand-500/10"
          >
            <FolderPlus className="h-4 w-4" />
            New character
          </button>
        )}
      </div>
    </div>
  );
}
