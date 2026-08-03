import type { ImageProps } from "./types";

const cache = new Map<string, string>();

// Fetches an 8px-wide preview from Cloudinary and inlines it as the blur
// placeholder. Already ~1KB — no further minification needed.
export default async function getBase64ImageUrl(
  image: ImageProps,
): Promise<string> {
  let url = cache.get(image.public_id);
  if (url) {
    return url;
  }
  const response = await fetch(
    `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_jpg,w_8,q_70/${image.public_id}.${image.format}`,
  );
  const buffer = await response.arrayBuffer();
  url = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
  cache.set(image.public_id, url);
  return url;
}
