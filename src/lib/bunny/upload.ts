import crypto from "crypto";

const BUNNY_API_BASE = "https://video.bunnycdn.com/library";
const BUNNY_TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

interface CreateVideoResponse {
  guid: string;
  title: string;
  status: number;
}

export async function createBunnyVideo(title: string): Promise<CreateVideoResponse> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BUNNY_API_BASE}/${libraryId}/videos`, {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Bunny API error: ${res.status}`);
    return await res.json() as CreateVideoResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BUNNY_API_BASE}/${libraryId}/videos/${videoId}`, {
      method: "DELETE",
      headers: { AccessKey: apiKey },
      signal: controller.signal,
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Bunny delete error: ${res.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a pre-signed TUS upload URL and headers for browser-based uploads.
 * This avoids exposing the API key to the client and works with CORS.
 */
export function getPresignedUploadCredentials(videoId: string): {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
} {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;

  // Expire in 24 hours
  const expirationTime = Math.floor(Date.now() / 1000) + 86400;

  // SHA256(library_id + api_key + expiration_time + video_id)
  const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
  const signature = crypto
    .createHash("sha256")
    .update(signatureString)
    .digest("hex");

  return {
    uploadUrl: BUNNY_TUS_ENDPOINT,
    uploadHeaders: {
      AuthorizationSignature: signature,
      AuthorizationExpire: String(expirationTime),
      VideoId: videoId,
      LibraryId: libraryId,
    },
  };
}

