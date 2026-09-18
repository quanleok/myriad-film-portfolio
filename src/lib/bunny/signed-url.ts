import crypto from "crypto";

export function generateSignedUrl(
  videoId: string,
  expiresInHours: number = 4
): string {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const apiKey = process.env.BUNNY_STREAM_API_KEY!;
  const hostname = process.env.BUNNY_CDN_HOSTNAME!;

  const expires = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const path = `/${videoId}/playlist.m3u8`;

  const hashableBase = `${apiKey}${path}${expires}`;
  const token = crypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `https://${hostname}${path}?token=${token}&expires=${expires}`;
}
