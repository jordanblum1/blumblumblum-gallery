import { describe, expect, it } from "vitest";
import { range } from "../utils/range";

describe("range", () => {
  it("produces a half-open range", () => {
    expect(range(2, 5)).toEqual([2, 3, 4]);
  });

  it("returns an empty array when start >= end", () => {
    expect(range(5, 2)).toEqual([]);
    expect(range(3, 3)).toEqual([]);
  });
});
