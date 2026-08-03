import type { ImageProps } from "./types";

const BASE = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

// f_auto,q_auto lets Cloudinary serve AVIF/WebP at tuned quality — the single
// biggest load-time win over the raw .jpg URLs this app used to build.
export function imageUrl(
  image: Pick<ImageProps, "public_id" | "format">,
  width?: number,
): string {
  const transform = width ? `c_scale,w_${width},f_auto,q_auto` : "f_auto,q_auto";
  return `${BASE}/${transform}/${image.public_id}.${image.format}`;
}

export function fullSizeUrl(
  image: Pick<ImageProps, "public_id" | "format">,
): string {
  return `${BASE}/${image.public_id}.${image.format}`;
}
