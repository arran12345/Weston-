import { describe, expect, it } from "vitest";

import { parseCsv, readCsv } from "@/domains/statements/services/parse-csv";
import {
  duplicateKey,
  normaliseRows,
  parseAmount,
  parseStatementDate,
  partitionDuplicates,
} from "@/domains/statements/services/normalise";
import { suggestCategory } from "@/domains/statements/services/categorise";

describe("parseCsv", () => {
  it("reads plain rows", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('date,desc\n2026-01-01,"TESCO, LONDON"')).toEqual([
      ["date", "desc"],
      ["2026-01-01", "TESCO, LONDON"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([["a"], ['say "hi"']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsv('a\n"line1\nline2"')).toEqual([["a"], ["line1\nline2"]]);
  });

  it("strips a byte order mark from the first header", () => {
    expect(readCsv("﻿Date,Amount\n").headers).toEqual(["Date", "Amount"]);
  });

  it("is empty for empty input", () => {
    expect(readCsv("")).toEqual({ headers: [], rows: [] });
  });
});

describe("parseAmount", () => {
  it("reads a plain number", () => {
    expect(parseAmount("12.34")).toBe(12.34);
  });

  it("keeps an explicit negative", () => {
    expect(parseAmount("-12.34")).toBe(-12.34);
  });

  it("strips currency symbols and thousands separators", () => {
    expect(parseAmount("£1,234.56")).toBe(1234.56);
  });

  it("reads parentheses as negative", () => {
    expect(parseAmount("(45.00)")).toBe(-45);
  });

  it("reads DR and CR markers", () => {
    expect(parseAmount("45.00 DR")).toBe(-45);
    expect(parseAmount("45.00 CR")).toBe(45);
  });

  it("is null for blanks and nonsense", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it("reads ISO dates", () => {
    const date = parseStatementDate("2026-03-04")!;

    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([
      2026, 3, 4,
    ]);
  });

  it("reads slash dates day-first, as UK exports use", () => {
    const date = parseStatementDate("03/04/2026")!;

    expect([date.getMonth() + 1, date.getDate()]).toEqual([4, 3]);
  });

  it("accepts dot and dash separators", () => {
    expect(parseStatementDate("03.04.2026")?.getMonth()).toBe(3);
    expect(parseStatementDate("03-04-2026")?.getMonth()).toBe(3);
  });

  it("expands two-digit years", () => {
    expect(parseStatementDate("03/04/26")?.getFullYear()).toBe(2026);
  });

  it("reads written month names", () => {
    const date = parseStatementDate("12 Mar 2026")!;

    expect([date.getMonth() + 1, date.getDate()]).toEqual([3, 12]);
  });

  it("rejects impossible dates rather than rolling them over", () => {
    expect(parseStatementDate("31/02/2026")).toBeNull();
  });

  it("is null for unparseable input", () => {
    expect(parseStatementDate("not a date")).toBeNull();
    expect(parseStatementDate("")).toBeNull();
  });

  it("strips the time so rows land on a clean day", () => {
    const date = parseStatementDate("2026-03-04")!;

    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([
      0, 0, 0,
    ]);
  });
});

describe("normaliseRows", () => {
  const mapping = { date: 0, description: 1, amount: 2 };

  it("normalises valid rows", () => {
    const { rows, errors } = normaliseRows(
      [["2026-03-04", "TESCO", "-42.50"]],
      mapping,
    );

    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ description: "TESCO", amount: -42.5 });
  });

  it("collects a reason per bad row instead of failing the whole import", () => {
    const { rows, errors } = normaliseRows(
      [
        ["2026-03-04", "GOOD", "-10.00"],
        ["nonsense", "BAD DATE", "-10.00"],
        ["2026-03-05", "", "-10.00"],
        ["2026-03-06", "BAD AMOUNT", "abc"],
      ],
      mapping,
    );

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors.map((error) => error.rowIndex)).toEqual([1, 2, 3]);
  });

  it("skips blank lines silently", () => {
    const { rows, errors } = normaliseRows(
      [["2026-03-04", "TESCO", "-42.50"], ["", "", ""]],
      mapping,
    );

    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  describe("separate debit and credit columns", () => {
    const split = { date: 0, description: 1, debit: 2, credit: 3 };

    it("reads a debit as money out", () => {
      const { rows } = normaliseRows(
        [["2026-03-04", "TESCO", "42.50", ""]],
        split,
      );

      expect(rows[0].amount).toBe(-42.5);
    });

    it("reads a credit as money in", () => {
      const { rows } = normaliseRows(
        [["2026-03-04", "SALARY", "", "2000.00"]],
        split,
      );

      expect(rows[0].amount).toBe(2000);
    });

    it("ignores the sign already in an unsigned debit column", () => {
      const { rows } = normaliseRows(
        [["2026-03-04", "TESCO", "-42.50", ""]],
        split,
      );

      expect(rows[0].amount).toBe(-42.5);
    });
  });
});

describe("partitionDuplicates", () => {
  const row = (date: string, amount: number, description: string) => ({
    rowIndex: 0,
    date: new Date(`${date}T00:00:00`),
    amount,
    description,
  });

  it("keeps rows that aren't already present", () => {
    const { toImport, duplicates } = partitionDuplicates(
      [row("2026-03-04", -42.5, "TESCO")],
      "acct",
      new Set(),
    );

    expect(toImport).toHaveLength(1);
    expect(duplicates).toHaveLength(0);
  });

  it("filters rows already in the account", () => {
    const existing = new Set([
      duplicateKey("acct", new Date("2026-03-04T00:00:00"), -42.5, "TESCO"),
    ]);

    const { toImport, duplicates } = partitionDuplicates(
      [row("2026-03-04", -42.5, "TESCO")],
      "acct",
      existing,
    );

    expect(toImport).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
  });

  it("catches a row duplicated within the same file", () => {
    const { toImport, duplicates } = partitionDuplicates(
      [row("2026-03-04", -42.5, "TESCO"), row("2026-03-04", -42.5, "TESCO")],
      "acct",
      new Set(),
    );

    expect(toImport).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it("does not confuse same-day, same-description rows of different amounts", () => {
    const { toImport } = partitionDuplicates(
      [row("2026-03-04", -42.5, "TESCO"), row("2026-03-04", -10, "TESCO")],
      "acct",
      new Set(),
    );

    expect(toImport).toHaveLength(2);
  });

  it("treats the same transaction in a different account as distinct", () => {
    const existing = new Set([
      duplicateKey("other", new Date("2026-03-04T00:00:00"), -42.5, "TESCO"),
    ]);

    const { toImport } = partitionDuplicates(
      [row("2026-03-04", -42.5, "TESCO")],
      "acct",
      existing,
    );

    expect(toImport).toHaveLength(1);
  });
});

describe("duplicateKey", () => {
  it("ignores case and whitespace differences in the description", () => {
    const a = duplicateKey("acct", new Date("2026-03-04T00:00:00"), -42.5, "TESCO  STORES");
    const b = duplicateKey("acct", new Date("2026-03-04T00:00:00"), -42.5, "tesco stores");

    expect(a).toBe(b);
  });
});

describe("suggestCategory", () => {
  const categories = [
    { id: "groc", name: "Groceries" },
    { id: "take", name: "Takeaway" },
    { id: "sal", name: "Salary" },
    { id: "gym", name: "Gym" },
  ];

  it("matches a known merchant to its category", () => {
    expect(suggestCategory("TESCO STORES 3456", categories)).toBe("groc");
    expect(suggestCategory("DELIVEROO", categories)).toBe("take");
  });

  it("is case insensitive", () => {
    expect(suggestCategory("tesco stores", categories)).toBe("groc");
  });

  it("matches a user-created category by its own name", () => {
    expect(suggestCategory("GYM MEMBERSHIP", categories)).toBe("gym");
  });

  // Deliberate: word boundaries mean "PUREGYM" doesn't match "Gym". A missed
  // suggestion leaves the row uncategorised, which is visible and easy to
  // fix; a wrong suggestion hides.
  it("prefers leaving a row uncategorised over matching mid-word", () => {
    expect(suggestCategory("PUREGYM MEMBERSHIP", categories)).toBeNull();
  });

  // Regression: "tfl" is a substring of "ne(tfl)ix", so a bare `includes`
  // filed NETFLIX.COM under Public Transport.
  it("does not match a keyword buried inside another word", () => {
    const withBoth = [
      { id: "subs", name: "Subscriptions" },
      { id: "pt", name: "Public Transport" },
    ];

    expect(suggestCategory("NETFLIX.COM", withBoth)).toBe("subs");
  });

  it("matches a short keyword only on a word boundary", () => {
    const fuel = [{ id: "fuel", name: "Fuel" }];

    expect(suggestCategory("BP GARAGE 221", fuel)).toBe("fuel");
    expect(suggestCategory("ABPQ HOLDINGS", fuel)).toBeNull();
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(suggestCategory("SOMETHING UNKNOWN", categories)).toBeNull();
  });

  it("does not suggest a category the user does not have", () => {
    // "Fuel" has a built-in rule but no matching category here.
    expect(suggestCategory("SHELL PETROL", categories)).toBeNull();
  });
});
