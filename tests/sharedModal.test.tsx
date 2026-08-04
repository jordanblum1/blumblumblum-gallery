// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import SharedModal from "../components/SharedModal";
import type { ImageProps } from "../utils/types";

const makeImages = (count: number): ImageProps[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    height: 800,
    width: 1200,
    public_id: `photo${i}`,
    format: "jpg",
  }));

const IMAGES = makeImages(5);

function renderModal(overrides: Partial<Parameters<typeof SharedModal>[0]> = {}) {
  const goTo = vi.fn();
  const closeModal = vi.fn();
  render(
    <SharedModal
      position={2}
      images={IMAGES}
      goTo={goTo}
      closeModal={closeModal}
      navigation={true}
      direction={0}
      {...overrides}
    />,
  );
  return { goTo, closeModal };
}

const rail = () => screen.getByRole("listbox", { name: /photo thumbnails/i });

beforeAll(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
});

describe("SharedModal navigation", () => {
  it("advances and retreats by exactly one position", () => {
    const { goTo } = renderModal({ position: 2 });

    fireEvent.click(screen.getByRole("button", { name: /next photo/i }));
    expect(goTo).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: /previous photo/i }));
    expect(goTo).toHaveBeenCalledWith(1);
    expect(goTo).toHaveBeenCalledTimes(2);
  });

  it("hides the previous arrow on the first photo", () => {
    renderModal({ position: 0 });
    expect(
      screen.queryByRole("button", { name: /previous photo/i }),
    ).not.toBeTruthy();
    expect(screen.getByRole("button", { name: /next photo/i })).toBeTruthy();
  });

  it("hides the next arrow on the last photo", () => {
    renderModal({ position: IMAGES.length - 1 });
    expect(screen.queryByRole("button", { name: /next photo/i })).not.toBeTruthy();
    expect(
      screen.getByRole("button", { name: /previous photo/i }),
    ).toBeTruthy();
  });

  it("never lets an arrow request an out-of-range position", () => {
    // Walking the full range must only ever ask for indices that exist.
    IMAGES.forEach((_, position) => {
      const { goTo } = renderModal({ position });
      const next = screen.queryByRole("button", { name: /next photo/i });
      const prev = screen.queryByRole("button", { name: /previous photo/i });

      if (next) fireEvent.click(next);
      if (prev) fireEvent.click(prev);

      goTo.mock.calls.forEach(([requested]) => {
        expect(requested).toBeGreaterThanOrEqual(0);
        expect(requested).toBeLessThan(IMAGES.length);
      });
      cleanup();
    });
  });

  it("reports position as a 1-based counter", () => {
    renderModal({ position: 2 });
    expect(screen.getByText("3 / 5")).toBeTruthy();
  });

  it("closes when the close control is used", () => {
    const { closeModal } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});

describe("SharedModal carousel rail", () => {
  it("renders one thumbnail per photo", () => {
    renderModal();
    expect(within(rail()).getAllByRole("option")).toHaveLength(IMAGES.length);
  });

  it("marks only the active thumbnail as selected", () => {
    renderModal({ position: 3 });
    const options = within(rail()).getAllByRole("option");
    const selected = options.filter(
      (o) => o.getAttribute("aria-selected") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(options[3].getAttribute("aria-selected")).toBe("true");
  });

  it("jumps straight to a clicked thumbnail", () => {
    const { goTo } = renderModal({ position: 0 });
    fireEvent.click(within(rail()).getByRole("option", { name: "Photo 4" }));
    expect(goTo).toHaveBeenCalledWith(3);
  });

  it("keeps thumbnails near the cursor eager and the rest lazy", () => {
    // Needs more photos than the eager radius, or everything loads eagerly.
    const many = makeImages(20);
    renderModal({ position: 0, images: many });

    const loading = within(rail())
      .getAllByRole("option")
      .map((o) => o.querySelector("img")?.getAttribute("loading"));

    expect(loading[0]).toBe("eager");
    expect(loading[6]).toBe("eager");
    expect(loading[7]).toBe("lazy");
    expect(loading[19]).toBe("lazy");
  });
});

describe("SharedModal single-photo mode", () => {
  it("drops navigation chrome when navigation is off", () => {
    render(
      <SharedModal
        position={0}
        currentPhoto={IMAGES[0]}
        goTo={vi.fn()}
        closeModal={vi.fn()}
        navigation={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /next photo/i })).not.toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /previous photo/i }),
    ).not.toBeTruthy();
    expect(screen.queryByRole("listbox")).not.toBeTruthy();
    expect(
      screen.getByRole("button", { name: /back to gallery/i }),
    ).toBeTruthy();
  });
});

describe("SharedModal stage layout", () => {
  // Regression guard: frames used to be in-flow flex siblings, so during a
  // transition the outgoing and incoming frames split the row and the photo
  // visibly collapsed. jsdom cannot measure that, but it can hold the
  // structure that prevents it.
  it("takes the photo frame out of flow so frames stack", () => {
    renderModal({ position: 1 });
    const frame = screen.getByAltText("Photograph by Jordan Blum")
      .parentElement as HTMLElement;

    expect(frame.className).toContain("absolute");
    expect(frame.className).toContain("inset-0");
    expect(frame.parentElement?.className).toContain("relative");
  });

  it("keeps the arrows above the stacked frames", () => {
    renderModal({ position: 2 });
    ["next photo", "previous photo"].forEach((name) => {
      const arrow = screen.getByRole("button", { name: new RegExp(name, "i") });
      expect(arrow.className).toContain("absolute");
      expect(arrow.className).toContain("z-10");
      // One padding utility only; two would race in the stylesheet.
      expect(arrow.className.match(/\bp-\d\b/g)).toHaveLength(1);
    });
  });
});

describe("SharedModal image delivery", () => {
  it("serves Cloudinary directly across a fixed width ladder", () => {
    renderModal({ position: 1 });
    const img = screen.getByAltText("Photograph by Jordan Blum");
    const srcset = img.getAttribute("srcset") ?? "";

    [640, 960, 1280, 1600, 2048].forEach((w) => {
      expect(srcset).toContain(`${w}w`);
    });
    // Straight to Cloudinary — not proxied through the Next optimizer.
    expect(srcset).toContain("res.cloudinary.com");
    expect(srcset).not.toContain("/_next/image");
  });
});
