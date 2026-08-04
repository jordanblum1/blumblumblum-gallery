// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageProps } from "../utils/types";

const push = vi.fn();
let query: Record<string, string> = {};

vi.mock("next/router", () => ({
  useRouter: () => ({ query, push, asPath: "/", route: "/" }),
}));

import Modal from "../components/Modal";

// Mirrors getStaticProps: `id` is the stable per-photo index, while array
// order is the shuffled wall order the arrows walk.
const shuffledWall = (count: number): ImageProps[] => {
  const stableIds = Array.from({ length: count }, (_, i) => i);
  const wallOrder = [...stableIds].reverse();
  return wallOrder.map((id, displayIndex) => ({
    id,
    height: 800,
    width: 1200,
    public_id: `photo${id}`,
    format: "jpg",
    navigationId: displayIndex,
  }));
};

const IMAGES = shuffledWall(6);

const nextArrow = () => screen.queryByRole("button", { name: /next photo/i });
const prevArrow = () =>
  screen.queryByRole("button", { name: /previous photo/i });
const counter = () => screen.getByText(/\d+ \/ \d+/).textContent;

beforeAll(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
});

beforeEach(() => {
  push.mockReset();
  query = {};
});

describe("Modal arrow navigation", () => {
  it("keeps both arrows available after stepping forward", () => {
    // Start in the middle of the wall so both directions are valid.
    query = { photoId: String(IMAGES[2].id) };
    render(<Modal images={IMAGES} onClose={vi.fn()} />);

    expect(counter()).toBe("3 / 6");
    expect(nextArrow()).toBeTruthy();
    expect(prevArrow()).toBeTruthy();

    fireEvent.click(nextArrow() as HTMLElement);

    expect(counter()).toBe("4 / 6");
    expect(nextArrow()).toBeTruthy();
    expect(prevArrow()).toBeTruthy();
  });

  it("keeps both arrows available after stepping backward", () => {
    query = { photoId: String(IMAGES[3].id) };
    render(<Modal images={IMAGES} onClose={vi.fn()} />);

    fireEvent.click(prevArrow() as HTMLElement);

    expect(counter()).toBe("3 / 6");
    expect(nextArrow()).toBeTruthy();
    expect(prevArrow()).toBeTruthy();
  });

  it("walks the whole wall one step at a time", () => {
    query = { photoId: String(IMAGES[0].id) };
    render(<Modal images={IMAGES} onClose={vi.fn()} />);

    for (let expected = 2; expected <= IMAGES.length; expected += 1) {
      const arrow = nextArrow();
      expect(arrow, `next arrow missing at ${expected - 1}/6`).toBeTruthy();
      fireEvent.click(arrow as HTMLElement);
      expect(counter()).toBe(`${expected} / 6`);
    }

    // Only the far end withholds the next arrow.
    expect(nextArrow()).not.toBeTruthy();
    expect(prevArrow()).toBeTruthy();
  });

  it("resolves position from the stable id, not the wall index", () => {
    // IMAGES[1].id is 4 for a 6-photo reversed wall; a lookup that confused
    // the two would land on the wrong frame.
    query = { photoId: String(IMAGES[1].id) };
    render(<Modal images={IMAGES} onClose={vi.fn()} />);
    expect(counter()).toBe("2 / 6");
  });
});
