import { beforeEach, describe, expect, it } from "vitest";
import handler from "../pages/api/admin-auth";

function mockRes() {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
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

describe("admin-auth API", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "correct-horse";
  });

  it("rejects non-POST methods", async () => {
    const res = mockRes();
    await handler({ method: "GET", body: {} } as any, res);
    expect(res.statusCode).toBe(405);
  });

  it("requires a password", async () => {
    const res = mockRes();
    await handler({ method: "POST", body: {} } as any, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects a wrong password", async () => {
    const res = mockRes();
    await handler({ method: "POST", body: { password: "nope" } } as any, res);
    expect(res.statusCode).toBe(401);
  });

  it("accepts the right password and sets the auth cookie", async () => {
    const res = mockRes();
    await handler(
      { method: "POST", body: { password: "correct-horse" } } as any,
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain("admin-auth=");
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
  });
});
