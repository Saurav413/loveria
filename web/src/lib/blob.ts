import { put } from "@vercel/blob";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Upload image to Vercel Blob when configured.
 * Falls back to storing the data URL directly for local/dev without Blob token.
 */
export async function storeImage(
  dataUrlOrUrl: string,
  pathname: string
): Promise<string> {
  if (dataUrlOrUrl.startsWith("http://") || dataUrlOrUrl.startsWith("https://")) {
    return dataUrlOrUrl;
  }

  const parsed = parseDataUrl(dataUrlOrUrl);
  if (!parsed) {
    throw new Error("Valid image data URL is required.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local/dev fallback — avoid requiring Blob for first run.
    return dataUrlOrUrl;
  }

  const blob = await put(pathname, parsed.buffer, {
    access: "public",
    contentType: parsed.contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}
