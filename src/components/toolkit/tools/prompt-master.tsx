"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ToolApp } from "@/lib/toolkit";

interface PromptMasterToolProps {
  tool: ToolApp;
}

interface PromptScene {
  number: number;
  description: string;
  prompt: string;
  duration_seconds: number;
}

const MODEL_OPTIONS = [
  { value: "seedance-2", label: "Seedance 2" },
  { value: "kling-2.1", label: "Kling 2.1" },
  { value: "runway-gen-4", label: "Runway Gen-4" },
  { value: "sora", label: "Sora" },
  { value: "wan-2.1", label: "Wan 2.1" },
];

const DURATION_OPTIONS = [
  { value: "5", label: "5 seconds" },
  { value: "10", label: "10 seconds" },
  { value: "15", label: "15 seconds" },
  { value: "20", label: "20 seconds" },
];

export function PromptMasterTool({ tool }: PromptMasterToolProps) {
  const [script, setScript] = useState("");
  const [model, setModel] = useState("seedance-2");
  const [sceneDuration, setSceneDuration] = useState("15");
  const [scenes, setScenes] = useState<PromptScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalRuntime = useMemo(
    () => scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0),
    [scenes]
  );

  async function generateScenes() {
    if (!script.trim()) {
      setError("Paste a script first.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/toolkit/prompt-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          model,
          sceneDuration: Number(sceneDuration),
        }),
      });

      const payload = (await response.json()) as {
        scenes?: PromptScene[];
        error?: string;
      };

      if (!response.ok || !payload.scenes) {
        throw new Error(payload.error ?? "Prompt generation failed.");
      }

      setScenes(payload.scenes);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Prompt generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function regenerateScene(scene: PromptScene) {
    setRegeneratingScene(scene.number);
    setError(null);

    try {
      const response = await fetch("/api/toolkit/prompt-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          model,
          sceneDuration: Number(sceneDuration),
          mode: "scene",
          sceneNumber: scene.number,
          sceneDescription: scene.description,
        }),
      });

      const payload = (await response.json()) as {
        scene?: PromptScene;
        error?: string;
      };

      if (!response.ok || !payload.scene) {
        throw new Error(payload.error ?? "Scene regeneration failed.");
      }

      setScenes((current) =>
        current.map((item) =>
          item.number === scene.number ? payload.scene! : item
        )
      );
    } catch (regenerationError) {
      setError(regenerationError instanceof Error ? regenerationError.message : "Scene regeneration failed.");
    } finally {
      setRegeneratingScene(null);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="grid gap-0 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
      <div className="border-b border-[rgba(131,92,255,0.12)] p-5 xl:border-b-0 xl:border-r">
        <div className="rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.9)] p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cdbfff]">
            <Sparkles size={14} />
            {tool.name}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-text-primary">Break any script into scene prompts</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Pick the target video model, set scene duration, and get editable prompt cards ready for copy or revision.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-primary">Script</label>
              <textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Paste the script, treatment, scene beat sheet, or product narrative here."
                className="min-h-[320px] w-full rounded-[1.2rem] border border-[rgba(131,92,255,0.16)] bg-[rgba(16,14,27,0.94)] px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-[rgba(151,114,255,0.42)] focus:ring-2 focus:ring-[rgba(131,92,255,0.24)]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Model"
                options={MODEL_OPTIONS}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="rounded-[1rem] border-[rgba(131,92,255,0.16)] bg-[rgba(16,14,27,0.94)] text-text-primary focus:border-[rgba(151,114,255,0.42)] focus:ring-[rgba(131,92,255,0.24)]"
              />
              <Select
                label="Scene duration"
                options={DURATION_OPTIONS}
                value={sceneDuration}
                onChange={(event) => setSceneDuration(event.target.value)}
                className="rounded-[1rem] border-[rgba(131,92,255,0.16)] bg-[rgba(16,14,27,0.94)] text-text-primary focus:border-[rgba(151,114,255,0.42)] focus:ring-[rgba(131,92,255,0.24)]"
              />
            </div>

            <Button
              onClick={() => void generateScenes()}
              disabled={isGenerating}
              className="w-full rounded-full bg-[#835cff] text-white hover:bg-[#9772ff]"
              leftIcon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={16} />}
            >
              {isGenerating ? "Generating scenes" : "Generate scenes"}
            </Button>

            {error ? (
              <div className="rounded-[1rem] border border-[rgba(255,122,122,0.2)] bg-[rgba(53,11,11,0.34)] px-3 py-2 text-sm text-[#ffb7b7]">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cdbfff]">
              Scene output
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {scenes.length
                ? `${scenes.length} scenes • ~${totalRuntime}s total`
                : "Generate once, then edit and copy prompts scene by scene."}
            </p>
          </div>
          {scenes.length ? (
            <Button
              variant="secondary"
              onClick={() => void copyText(scenes.map((scene) => `Scene ${scene.number}: ${scene.prompt}`).join("\n\n"))}
              className="rounded-full border-[rgba(131,92,255,0.16)] bg-[rgba(18,16,31,0.78)] text-text-primary hover:bg-[rgba(26,22,43,0.92)]"
              leftIcon={<Copy size={15} />}
            >
              Copy all prompts
            </Button>
          ) : null}
        </div>

        {scenes.length ? (
          <div className="space-y-4">
            {scenes.map((scene) => (
              <article
                key={scene.number}
                className="rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[linear-gradient(180deg,rgba(17,15,28,0.94),rgba(10,10,16,0.98))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffb8ef]">
                      Scene {scene.number}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-text-primary">
                      {scene.description}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {scene.duration_seconds}s target length
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void copyText(scene.prompt)}
                      className="rounded-full border-[rgba(131,92,255,0.16)] bg-[rgba(18,16,31,0.78)] text-text-primary hover:bg-[rgba(26,22,43,0.92)]"
                      leftIcon={<Copy size={15} />}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={regeneratingScene === scene.number}
                      onClick={() => void regenerateScene(scene)}
                      className="rounded-full border-[rgba(255,61,210,0.16)] bg-[rgba(42,16,37,0.78)] text-[#fff0fb] hover:bg-[rgba(57,20,49,0.92)]"
                      leftIcon={
                        regeneratingScene === scene.number ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw size={15} />
                        )
                      }
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold text-text-primary">Prompt</label>
                  <textarea
                    value={scene.prompt}
                    onChange={(event) =>
                      setScenes((current) =>
                        current.map((item) =>
                          item.number === scene.number
                            ? { ...item, prompt: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-2 min-h-[168px] w-full rounded-[1.1rem] border border-[rgba(131,92,255,0.16)] bg-[rgba(12,11,20,0.94)] px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-[rgba(151,114,255,0.42)] focus:ring-2 focus:ring-[rgba(131,92,255,0.24)]"
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-dashed border-[rgba(131,92,255,0.18)] bg-[rgba(12,11,18,0.92)] px-8 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-lg font-semibold text-text-primary">No scene prompts yet.</p>
              <p className="text-sm leading-6 text-text-secondary">
                Paste the script, choose the model, and generate prompts. Scene cards will appear here ready for copy, edit, and regeneration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
