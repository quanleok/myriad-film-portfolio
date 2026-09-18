"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { type ToolApp } from "@/lib/toolkit";
import { outputTypeLabel, type CharacterOutputType } from "@/lib/toolkit/character-sheet-config";
import { CharacterLibrary } from "./character-sheet/character-library";
import { CharacterOutputGallery } from "./character-sheet/character-output-gallery";
import { CharacterUpload } from "./character-sheet/character-upload";
import type {
  CharacterOutputRecord,
  CharacterRecord,
  UploadedCharacterImage,
} from "./character-sheet/types";

interface CharacterSheetToolProps {
  tool: ToolApp;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 300);
}

export function CharacterSheetTool({ tool }: CharacterSheetToolProps) {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<CharacterOutputRecord[]>([]);
  const [uploadedImage, setUploadedImage] = useState<UploadedCharacterImage | null>(null);
  const [selectedOutputTypes, setSelectedOutputTypes] = useState<Set<CharacterOutputType>>(
    () => new Set(["description"])
  );
  const [hint, setHint] = useState("");
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationLabel, setGenerationLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId]
  );

  const sourceImageUrl = uploadedImage?.url ?? selectedCharacter?.ref_image_url ?? null;

  const fetchCharacters = useCallback(async () => {
    setLoadingCharacters(true);

    try {
      const response = await fetch("/api/toolkit/character-sheet/characters", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        characters?: CharacterRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load characters.");
      }

      const nextCharacters = payload.characters ?? [];
      setCharacters(nextCharacters);
      setSelectedCharacterId((current) => {
        if (current && nextCharacters.some((character) => character.id === current)) {
          return current;
        }
        return nextCharacters[0]?.id ?? null;
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load characters.");
    } finally {
      setLoadingCharacters(false);
    }
  }, []);

  const fetchOutputs = useCallback(async (characterId: string) => {
    setLoadingOutputs(true);

    try {
      const response = await fetch(
        `/api/toolkit/character-sheet/outputs?characterId=${encodeURIComponent(characterId)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        outputs?: CharacterOutputRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load outputs.");
      }

      setOutputs(payload.outputs ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load outputs.");
    } finally {
      setLoadingOutputs(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    if (!selectedCharacterId) {
      setOutputs([]);
      return;
    }
    void fetchOutputs(selectedCharacterId);
  }, [fetchOutputs, selectedCharacterId]);

  const handleCreateCharacter = useCallback(
    async (name: string) => {
      const response = await fetch("/api/toolkit/character-sheet/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ref_image_url: uploadedImage?.url ?? null,
          ref_image_storage_key: uploadedImage?.storageKey ?? null,
        }),
      });

      const payload = (await response.json()) as {
        character?: CharacterRecord;
        error?: string;
      };

      if (!response.ok || !payload.character) {
        setError(payload.error ?? "Could not create character folder.");
        return null;
      }

      setCharacters((current) => [payload.character!, ...current]);
      setSelectedCharacterId(payload.character.id);
      setOutputs([]);
      setError(null);

      return payload.character;
    },
    [uploadedImage]
  );

  const handleUploadFile = useCallback(async (file: File) => {
    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/toolkit/character-sheet/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        url?: string;
        storageKey?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Image upload failed.");
      }

      setUploadedImage({
        url: payload.url,
        storageKey: payload.storageKey ?? null,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedCharacterId || !sourceImageUrl || selectedOutputTypes.size === 0 || generating) {
      return;
    }

    setGenerating(true);
    setError(null);

    const failures: string[] = [];

    try {
      for (const outputType of selectedOutputTypes) {
        setGenerationLabel(`Generating ${outputTypeLabel(outputType)}…`);

        const response = await fetch("/api/toolkit/character-sheet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: sourceImageUrl,
            imageStorageKey: uploadedImage?.storageKey ?? null,
            outputType,
            characterId: selectedCharacterId,
            hint,
          }),
        });

        const payload = (await response.json()) as {
          output?: CharacterOutputRecord;
          error?: string;
        };

        if (!response.ok || !payload.output) {
          failures.push(`${outputTypeLabel(outputType)}: ${payload.error ?? "Generation failed."}`);
          continue;
        }
      }

      await Promise.all([
        fetchCharacters(),
        fetchOutputs(selectedCharacterId),
      ]);
      setUploadedImage(null);
    } catch (generationError) {
      failures.push(
        generationError instanceof Error ? generationError.message : "Generation failed."
      );
    } finally {
      setGenerating(false);
      setGenerationLabel(null);
    }

    if (failures.length) {
      setError(failures.join(" "));
    }
  }, [
    fetchCharacters,
    fetchOutputs,
    generating,
    hint,
    selectedCharacterId,
    selectedOutputTypes,
    sourceImageUrl,
    uploadedImage,
  ]);

  const handlePin = useCallback(
    async (outputId: string) => {
      const response = await fetch(`/api/toolkit/character-sheet/outputs/${outputId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: true }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not pin this output.");
        return;
      }

      if (selectedCharacterId) {
        await Promise.all([fetchCharacters(), fetchOutputs(selectedCharacterId)]);
      }
    },
    [fetchCharacters, fetchOutputs, selectedCharacterId]
  );

  const handleDelete = useCallback(
    async (outputId: string) => {
      const response = await fetch(`/api/toolkit/character-sheet/outputs/${outputId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not delete this output.");
        return;
      }

      if (selectedCharacterId) {
        await Promise.all([fetchCharacters(), fetchOutputs(selectedCharacterId)]);
      }
    },
    [fetchCharacters, fetchOutputs, selectedCharacterId]
  );

  const handleExport = useCallback(() => {
    if (!selectedCharacter) return;

    downloadJson(
      `${selectedCharacter.name.toLowerCase().replace(/\s+/g, "-") || "character"}-sheet.json`,
      {
        tool: tool.slug,
        exportedAt: new Date().toISOString(),
        character: selectedCharacter,
        outputs,
      }
    );
  }, [outputs, selectedCharacter, tool.slug]);

  function toggleOutputType(type: CharacterOutputType) {
    setSelectedOutputTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <div className="grid min-h-[860px] gap-0 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-white/8 xl:border-b-0 xl:border-r">
        <CharacterLibrary
          characters={characters}
          selectedId={selectedCharacterId}
          loading={loadingCharacters}
          onSelect={setSelectedCharacterId}
          onCreate={handleCreateCharacter}
        />
      </aside>

      <div className="min-w-0">
        <div className="border-b border-white/8">
          <CharacterUpload
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            selectedCharacter={selectedCharacter}
            uploadedImage={uploadedImage}
            uploadBusy={uploadingImage}
            selectedOutputTypes={selectedOutputTypes}
            hint={hint}
            generating={generating}
            generationLabel={generationLabel}
            onSelectCharacter={setSelectedCharacterId}
            onCreateCharacter={handleCreateCharacter}
            onUploadFile={handleUploadFile}
            onResetUploadedImage={() => setUploadedImage(null)}
            onToggleOutput={toggleOutputType}
            onHintChange={setHint}
            onGenerate={handleGenerate}
          />
        </div>

        {error ? (
          <div className="px-4 pt-4 sm:px-5">
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-50">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <CharacterOutputGallery
          characterName={selectedCharacter?.name ?? ""}
          outputs={outputs}
          loading={loadingOutputs}
          onPin={handlePin}
          onDelete={handleDelete}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}
