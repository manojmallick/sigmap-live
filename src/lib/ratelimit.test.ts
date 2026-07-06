import { describe, it, expect } from "vitest";
import { getClientIp } from "./ratelimit";

const req = (headers: Record<string, string>) =>
  new Request("https://example.com", { headers });

describe("getClientIp — spoof resistance", () => {
  it("prefers the platform-set x-real-ip over x-forwarded-for", () => {
    expect(
      getClientIp(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" }))
    ).toBe("9.9.9.9");
  });

  it("ignores a client-spoofed left-most x-forwarded-for (uses the last hop)", () => {
    // Attacker prepends a fake IP to mint a fresh identity; with no x-real-ip we
    // must NOT return the spoofable first entry.
    const ip = getClientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }));
    expect(ip).not.toBe("6.6.6.6");
    expect(ip).toBe("203.0.113.7");
  });

  it("falls back to 0.0.0.0 when no forwarding headers are present", () => {
    expect(getClientIp(req({}))).toBe("0.0.0.0");
  });
});
