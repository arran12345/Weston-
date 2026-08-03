/**
 * Turning a bank's CSV row into a Transaction. The formats vary by provider,
 * which is exactly why Section 11 makes column mapping an explicit,
 * user-confirmed step rather than blind auto-detection — a format change
 * should mean re-confirming a mapping, not a silent wrong import.
 */

export type ColumnMapping = {
  date: number;
  description: number;
  /** Single signed amount column. */
  amount?: number;
  /** Or separate columns, as many UK exports use. */
  debit?: number;
  credit?: number;
};

export type NormalisedRow = {
  rowIndex: number;
  date: Date;
  description: string;
  /** Negative is money out, per docs/decisions/0002. */
  amount: number;
};

export type RowError = {
  rowIndex: number;
  reason: string;
  raw: string[];
};

/**
 * Parses an amount, tolerating what banks actually emit: currency symbols,
 * thousands separators, spaces, a trailing CR/DR marker, and parenthesised
 * negatives.
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const parenthesised = /^\((.*)\)$/.exec(trimmed);
  const body = parenthesised ? parenthesised[1] : trimmed;

  const upper = body.toUpperCase();
  const isCreditMarker = /\bCR\b/.test(upper);
  const isDebitMarker = /\bDR\b/.test(upper);

  const cleaned = body
    .replace(/[£$€]/g, "")
    .replace(/\b(CR|DR)\b/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");

  if (cleaned === "" || cleaned === "-") return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  // Parentheses and a DR marker both mean money out.
  if (parenthesised || isDebitMarker) return -Math.abs(value);
  if (isCreditMarker) return Math.abs(value);

  return value;
}

/**
 * Parses a date. Day-first is assumed for slash/dot formats because this is
 * a UK tool — 03/04/2026 is 3 April, not 4 March. ISO (yyyy-mm-dd) is
 * detected by shape and read unambiguously.
 */
export function parseStatementDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return makeDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dayFirst = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(trimmed);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    let year = Number(dayFirst[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    return makeDate(year, month, day);
  }

  // "12 Mar 2026" and similar.
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return makeDate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }

  return null;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  // Rejects 31/02 rolling over into March.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

export function normaliseRows(
  rows: string[][],
  mapping: ColumnMapping,
): { rows: NormalisedRow[]; errors: RowError[] } {
  const normalised: NormalisedRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, rowIndex) => {
    // Blank lines mid-file are skipped rather than reported as errors.
    if (raw.every((cell) => cell.trim() === "")) return;

    const date = parseStatementDate(raw[mapping.date] ?? "");
    if (!date) {
      errors.push({
        rowIndex,
        reason: `Could not read a date from "${raw[mapping.date] ?? ""}"`,
        raw,
      });
      return;
    }

    const description = (raw[mapping.description] ?? "").trim();
    if (description === "") {
      errors.push({ rowIndex, reason: "Description is empty", raw });
      return;
    }

    const amount = resolveAmount(raw, mapping);
    if (amount === null) {
      errors.push({ rowIndex, reason: "Could not read an amount", raw });
      return;
    }

    normalised.push({ rowIndex, date, description, amount });
  });

  return { rows: normalised, errors };
}

function resolveAmount(raw: string[], mapping: ColumnMapping): number | null {
  if (mapping.amount !== undefined) {
    return parseAmount(raw[mapping.amount] ?? "");
  }

  const debit =
    mapping.debit === undefined ? null : parseAmount(raw[mapping.debit] ?? "");
  const credit =
    mapping.credit === undefined ? null : parseAmount(raw[mapping.credit] ?? "");

  // Debit and credit columns hold unsigned values; the column carries the sign.
  if (debit !== null && debit !== 0) return -Math.abs(debit);
  if (credit !== null && credit !== 0) return Math.abs(credit);

  // Both present but zero is a legitimate zero-value row.
  if (debit === 0 || credit === 0) return 0;

  return null;
}

/**
 * Duplicate key per Section 11: date + amount + description. Description is
 * normalised for case and whitespace so trivial formatting differences
 * between two exports of the same transaction still match.
 */
export function duplicateKey(
  accountId: string,
  date: Date,
  amount: number,
  description: string,
): string {
  const day = date.toISOString().slice(0, 10);
  const normalisedDescription = description.trim().toLowerCase().replace(/\s+/g, " ");
  return `${accountId}|${day}|${amount.toFixed(2)}|${normalisedDescription}`;
}

/**
 * Splits rows into those to import and those already present. Duplicates
 * within the file itself count too — re-uploading an overlapping range
 * shouldn't create doubles, and neither should one file listing a row twice.
 */
export function partitionDuplicates(
  rows: NormalisedRow[],
  accountId: string,
  existingKeys: Set<string>,
): { toImport: NormalisedRow[]; duplicates: NormalisedRow[] } {
  const seen = new Set(existingKeys);
  const toImport: NormalisedRow[] = [];
  const duplicates: NormalisedRow[] = [];

  for (const row of rows) {
    const key = duplicateKey(accountId, row.date, row.amount, row.description);

    if (seen.has(key)) {
      duplicates.push(row);
      continue;
    }

    seen.add(key);
    toImport.push(row);
  }

  return { toImport, duplicates };
}
