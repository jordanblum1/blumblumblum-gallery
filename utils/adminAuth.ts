import { createHash, timingSafeEqual } from "crypto";
import type { NextApiRequest } from "next";

// The login endpoint sets an HttpOnly `admin-auth` cookie holding the admin
// password; mutating endpoints must verify it — the UI gate alone protects
// nothing. Hashing both sides first gives timingSafeEqual equal-length input.
export function isAuthorized(req: NextApiRequest): boolean {
  const cookie = req.cookies["admin-auth"];
  const expected = process.env.ADMIN_PASSWORD;
  if (!cookie || !expected) return false;
  const a = createHash("sha256").update(cookie).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
