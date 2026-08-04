import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
vi.mock("../utils/cloudinary", () => ({
  default: { v2: { uploader: { upload: (...args: unknown[]) => upload(...args) } } },
}));

const parse = vi.fn();
vi.mock("formidable", () => ({ default: () => ({ parse }) }));

vi.mock("fs", () => ({ default: { unlinkSync: vi.fn() } }));

import handler from "../pages/api/upload";

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
    method: "POST",
    cookies: { "admin-auth": "correct-horse" },
    ...over,
  }) as any;

describe("upload API", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "correct-horse";
    upload.mockReset().mockResolvedValue({ public_id: "new-photo", bytes: 1 });
    parse.mockReset().mockResolvedValue([{}, { file: [{ filepath: "/tmp/x" }] }]);
  });

  it("rejects non-POST methods", async () => {
    const res = mockRes();
    await handler(request({ method: "GET" }), res);
    expect(res.statusCode).toBe(405);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects requests without a valid auth cookie", async () => {
    const res = mockRes();
    await handler(request({ cookies: { "admin-auth": "wrong" } }), res);
    expect(res.statusCode).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects requests with no file", async () => {
    parse.mockResolvedValue([{}, {}]);
    const res = mockRes();
    await handler(request(), res);
    expect(res.statusCode).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("stores a web-optimized 2560px jpg master when authorized", async () => {
    const res = mockRes();
    await handler(request(), res);
    expect(res.statusCode).toBe(200);

    const [filepath, options] = upload.mock.calls[0] as [string, any];
    expect(filepath).toBe("/tmp/x");
    expect(options.format).toBe("jpg");
    expect(options.transformation).toEqual(
      expect.arrayContaining([
        { width: 2560, crop: "limit" },
        { quality: "auto:good" },
      ]),
    );
  });
});
