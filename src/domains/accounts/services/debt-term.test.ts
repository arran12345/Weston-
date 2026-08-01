import { describe, expect, it } from "vitest";

import {
  TERM_WARNING_DAYS,
  daysUntil,
  debtTermStatus,
} from "@/domains/accounts/services/debt-term";

// Fixed "now" with a wall-clock time, so any accidental time-of-day
// sensitivity in the day maths shows up as a failure.
const now = new Date("2026-07-31T09:15:00");
const on = (iso: string) => new Date(`${iso}T00:00:00`);

describe("debtTermStatus", () => {
  it("reports nothing when no term date is set", () => {
    expect(debtTermStatus(null, now).status).toBe("NONE");
  });

  it("is active while the term is far away", () => {
    expect(debtTermStatus(on("2027-06-30"), now).status).toBe("ACTIVE");
  });

  it("warns inside the warning window", () => {
    expect(debtTermStatus(on("2026-08-30"), now).status).toBe("ENDING_SOON");
  });

  it("warns exactly on the warning boundary", () => {
    const boundary = new Date(now);
    boundary.setDate(boundary.getDate() + TERM_WARNING_DAYS);

    expect(debtTermStatus(boundary, now).status).toBe("ENDING_SOON");
  });

  it("is still active one day outside the window", () => {
    const justOutside = new Date(now);
    justOutside.setDate(justOutside.getDate() + TERM_WARNING_DAYS + 1);

    expect(debtTermStatus(justOutside, now).status).toBe("ACTIVE");
  });

  it("treats a term ending today as ending soon, not ended", () => {
    expect(debtTermStatus(on("2026-07-31"), now).status).toBe("ENDING_SOON");
  });

  it("treats yesterday's term as ended", () => {
    expect(debtTermStatus(on("2026-07-30"), now).status).toBe("ENDED");
  });
});

describe("daysUntil", () => {
  it("ignores the time of day on both sides", () => {
    expect(daysUntil(new Date("2026-08-30T23:59:00"), now)).toBe(30);
    expect(daysUntil(new Date("2026-08-30T00:00:01"), now)).toBe(30);
  });

  it("is negative for dates in the past", () => {
    expect(daysUntil(on("2026-07-29"), now)).toBe(-2);
  });
});
