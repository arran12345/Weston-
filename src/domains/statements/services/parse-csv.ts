/**
 * Minimal RFC-4180 CSV reader. Bank exports are small and plain, so a
 * dependency isn't warranted — but quoted fields containing commas, escaped
 * quotes and CRLF line endings all occur in real exports and are handled.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  // A leading BOM would otherwise become part of the first header name.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      // Treat CRLF as one break, not two.
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  // Whatever is buffered when input runs out is the final field.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop trailing blank lines, which most exports end with.
  return rows.filter(
    (candidate) => !(candidate.length === 1 && candidate[0].trim() === ""),
  );
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export function readCsv(input: string): ParsedCsv {
  const rows = parseCsv(input);
  if (rows.length === 0) return { headers: [], rows: [] };

  return {
    headers: rows[0].map((header) => header.trim()),
    rows: rows.slice(1),
  };
}
