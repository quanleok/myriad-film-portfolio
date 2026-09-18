import type {
  CharacterDescriptionAnalysis,
  CharacterPaletteAnalysis,
} from "@/lib/toolkit/character-sheet";
import type { CharacterOutputType } from "@/lib/toolkit/character-sheet-config";

export interface CharacterRecord {
  id: string;
  name: string;
  ref_image_url: string | null;
  thumbnail_url: string | null;
  description_json: Record<string, unknown> | null;
  output_count: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterOutputRecord {
  id: string;
  type: CharacterOutputType;
  image_url: string | null;
  metadata_json: {
    prompt?: string;
    provider?: string;
    storageKey?: string | null;
    analysis?: CharacterDescriptionAnalysis;
    palette?: CharacterPaletteAnalysis;
    sourceImageUrl?: string | null;
    sourceImageStorageKey?: string | null;
    mediaType?: string;
  } | null;
  is_pinned: boolean;
  created_at: string;
}

export interface UploadedCharacterImage {
  url: string;
  storageKey: string | null;
}
