import { beforeEach, describe, expect, it, vi } from "vitest";

const destroy = vi.fn();
vi.mock("../utils/cloudinary", () => ({
  default: { v2: { uploader: { destroy: (...args: unknown[]) => destroy(...args) } } },
}));

import handler from "../pages/api/delete";

function mockRes() {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const request = (over: Record<string, unknown> = {}) =>
  ({
    method: "DELETE",
    query: { public_id: "photo123" },
    cookies: { "admin-auth": "correct-horse" },
    ...over,
  }) as any;

describe("delete API", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "correct-horse";
    destroy.mockReset().mockResolvedValue({ result: "ok" });
  });

  it("rejects non-DELETE methods", async () => {
    const res = mockRes();
    await handler(request({ method: "POST" }), res);
    expect(res.statusCode).toBe(405);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("rejects requests without the auth cookie", async () => {
    const res = mockRes();
    await handler(request({ cookies: {} }), res);
    expect(res.statusCode).toBe(401);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong auth cookie", async () => {
    const res = mockRes();
    await handler(request({ cookies: { "admin-auth": "wrong" } }), res);
    expect(res.statusCode).toBe(401);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("requires a public_id", async () => {
    const res = mockRes();
    await handler(request({ query: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("destroys the requested asset when authorized", async () => {
    const res = mockRes();
    await handler(request(), res);
    expect(res.statusCode).toBe(200);
    expect(destroy).toHaveBeenCalledWith("photo123");
  });

  it("surfaces Cloudinary failures as 500", async () => {
    destroy.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await handler(request(), res);
    expect(res.statusCode).toBe(500);
  });
});
