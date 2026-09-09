import { describe, expect, it } from "vitest";

import { healthStatus } from "../../lib/health";

describe("healthStatus", () => {
  it("returns the stable probe contract", () => {
    expect(healthStatus()).toEqual({ status: "ok", service: "probe" });
  });
});
