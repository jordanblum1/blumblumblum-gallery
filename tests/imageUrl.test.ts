import { beforeAll, describe, expect, it } from "vitest";

let imageUrl: typeof import("../utils/imageUrl").imageUrl;
let fullSizeUrl: typeof import("../utils/imageUrl").fullSizeUrl;

const image = { public_id: "photo0042_wl8woa", format: "jpg" };

beforeAll(async () => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "testcloud";
  ({ imageUrl, fullSizeUrl } = await import("../utils/imageUrl"));
});

describe("imageUrl", () => {
  it("builds a scaled URL with automatic format and quality", () => {
    expect(imageUrl(image, 720)).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/c_scale,w_720,f_auto,q_auto/photo0042_wl8woa.jpg",
    );
  });

  it("omits the scale transform when no width is given", () => {
    expect(imageUrl(image)).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/f_auto,q_auto/photo0042_wl8woa.jpg",
    );
  });

  it("keeps nested folder public_ids intact", () => {
    expect(imageUrl({ public_id: "gallery/photo1", format: "png" }, 480)).toContain(
      "/gallery/photo1.png",
    );
  });
});

describe("fullSizeUrl", () => {
  it("builds an untransformed URL", () => {
    expect(fullSizeUrl(image)).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/photo0042_wl8woa.jpg",
    );
  });
});
