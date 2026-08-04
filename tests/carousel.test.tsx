// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageProps } from "../utils/types";

const push = vi.fn();

vi.mock("next/router", () => ({
  useRouter: () => ({ query: {}, push, asPath: "/", route: "/p/[photoId]" }),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} src={src} />
  ),
}));

import Carousel from "../components/Carousel";

// Stable Cloudinary order: a photo's id is its index, unlike the shuffled wall.
const STABLE: ImageProps[] = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  height: 800,
  width: 1200,
  public_id: `photo${i}`,
  format: "jpg",
  blurDataUrl: "data:image/jpeg;base64,abc",
}));

const nextArrow = () => screen.queryByRole("button", { name: /next photo/i });
const prevArrow = () =>
  screen.queryByRole("button", { name: /previous photo/i });

beforeAll(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
});

beforeEach(() => push.mockReset());

describe("deep-linked photo page", () => {
  // Regression: /p/<id> shipped with navigation hard-coded off, so the URL
  // people share and bookmark rendered a single photo with no way forward.
  it("offers full navigation, not just a way out", () => {
    render(<Carousel currentPhoto={STABLE[2]} images={STABLE} />);

    expect(nextArrow()).toBeTruthy();
    expect(prevArrow()).toBeTruthy();
    expect(screen.getByRole("listbox", { name: /photo thumbnails/i })).toBeTruthy();
    expect(screen.getByText("3 / 6")).toBeTruthy();
  });

  it("routes to the neighbouring photo by stable id", () => {
    render(<Carousel currentPhoto={STABLE[2]} images={STABLE} />);

    fireEvent.click(nextArrow() as HTMLElement);
    expect(push).toHaveBeenCalledWith("/p/3");

    fireEvent.click(prevArrow() as HTMLElement);
    expect(push).toHaveBeenCalledWith("/p/1");
  });

  it("withholds arrows at each end of the set", () => {
    const { unmount } = render(
      <Carousel currentPhoto={STABLE[0]} images={STABLE} />,
    );
    expect(prevArrow()).not.toBeTruthy();
    expect(nextArrow()).toBeTruthy();
    unmount();

    render(<Carousel currentPhoto={STABLE[5]} images={STABLE} />);
    expect(nextArrow()).not.toBeTruthy();
    expect(prevArrow()).toBeTruthy();
  });

  it("never routes past either end", () => {
    const { unmount } = render(
      <Carousel currentPhoto={STABLE[0]} images={STABLE} />,
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(push).not.toHaveBeenCalled();
    unmount();

    render(<Carousel currentPhoto={STABLE[5]} images={STABLE} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(push).not.toHaveBeenCalled();
  });

  it("still renders standalone when the set is absent", () => {
    render(<Carousel currentPhoto={STABLE[2]} />);

    expect(nextArrow()).not.toBeTruthy();
    expect(prevArrow()).not.toBeTruthy();
    expect(
      screen.getByRole("button", { name: /back to gallery/i }),
    ).toBeTruthy();
  });
});
