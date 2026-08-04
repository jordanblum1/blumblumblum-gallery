// @vitest-environment jsdom
// Regression test for the /gallery basePath bug: fetch('/api/…') ignores
// basePath, so admin API calls silently landed on the domain root (S3 in
// production) and login always failed. Every admin API call must be built
// from router.basePath.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BASE_PATH = "/gallery";

vi.mock("next/router", () => ({
  useRouter: () => ({
    basePath: BASE_PATH,
    query: {},
    push: vi.fn(),
    asPath: "/admin",
    route: "/admin",
  }),
}));

import AdminPage from "../pages/admin";

// This jsdom setup ships no localStorage, and the page reads its auth session
// from it on mount — a minimal in-memory stand-in keeps both sides working.
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

describe("admin API paths", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageStub);
    store.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
  });

  it("sends the login request under the basePath", async () => {
    render(<AdminPage initialImages={[]} />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${BASE_PATH}/api/admin-auth`);
  });

  it("sends deletes under the basePath", async () => {
    // Pre-authenticate via the localStorage session the page checks on mount.
    localStorage.setItem("adminAuth", JSON.stringify({ timestamp: Date.now() }));
    render(
      <AdminPage
        initialImages={[
          { public_id: "photo123", format: "jpg", width: 100, height: 100 },
        ]}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /delete/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(url).toBe(`${BASE_PATH}/api/delete?public_id=photo123`);
  });
});
