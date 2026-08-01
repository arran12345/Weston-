import { describe, expect, it } from "vitest";

import { startOfLocalMonth } from "@/domains/allocation/services/month";

describe("startOfLocalMonth", () => {
  it("normalises any day to the first of its month", () => {
    expect(startOfLocalMonth(new Date("2026-07-17T18:22:00")).getDate()).toBe(1);
  });

  it("keeps the last day of a month in that same month", () => {
    const normalised = startOfLocalMonth(new Date("2026-07-31T23:00:00"));

    expect(normalised.getMonth()).toBe(6); // July
    expect(normalised.getFullYear()).toBe(2026);
  });

  it("strips the time entirely", () => {
    const normalised = startOfLocalMonth(new Date("2026-07-17T18:22:33.444"));

    expect([
      normalised.getHours(),
      normalised.getMinutes(),
      normalised.getSeconds(),
      normalised.getMilliseconds(),
    ]).toEqual([0, 0, 0, 0]);
  });

  it("is idempotent, so a normalised month stays put", () => {
    const once = startOfLocalMonth(new Date("2026-07-17T18:22:00"));

    expect(startOfLocalMonth(once).getTime()).toBe(once.getTime());
  });

  it("does not mutate its argument", () => {
    const input = new Date("2026-07-17T18:22:00");
    const before = input.getTime();

    startOfLocalMonth(input);

    expect(input.getTime()).toBe(before);
  });
});
