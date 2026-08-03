"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { Field, Select } from "@/shared/ui/input";
import { formatCurrency, formatDate } from "@/shared/lib/format";

type Step = "upload" | "map" | "confirm" | "done";

const NONE = "";

export function ImportScreen() {
  const utils = trpc.useUtils();
  const accounts = trpc.accounts.list.useQuery();
  const categories = trpc.budgeting.categories.useQuery();

  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sample, setSample] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [dateCol, setDateCol] = useState<string>(NONE);
  const [descCol, setDescCol] = useState<string>(NONE);
  const [amountMode, setAmountMode] = useState<"single" | "split">("single");
  const [amountCol, setAmountCol] = useState<string>(NONE);
  const [debitCol, setDebitCol] = useState<string>(NONE);
  const [creditCol, setCreditCol] = useState<string>(NONE);

  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const inspect = trpc.statements.inspect.useMutation({
    onSuccess: (data) => {
      setHeaders(data.headers);
      setSample(data.sample);
      setTotalRows(data.totalRows);
      // Pre-select obvious columns, still shown for confirmation (Section 11).
      setDateCol(String(guessColumn(data.headers, ["date"]) ?? NONE));
      setDescCol(
        String(
          guessColumn(data.headers, ["description", "details", "narrative", "reference", "merchant"]) ??
            NONE,
        ),
      );
      const amount = guessColumn(data.headers, ["amount", "value"]);
      const debit = guessColumn(data.headers, ["debit", "money out", "paid out"]);
      const credit = guessColumn(data.headers, ["credit", "money in", "paid in"]);
      if (amount !== null) {
        setAmountMode("single");
        setAmountCol(String(amount));
      } else if (debit !== null || credit !== null) {
        setAmountMode("split");
        setDebitCol(debit === null ? NONE : String(debit));
        setCreditCol(credit === null ? NONE : String(credit));
      }
      setStep("map");
    },
  });

  const preview = trpc.statements.preview.useMutation({
    onSuccess: () => setStep("confirm"),
  });

  const commit = trpc.statements.commit.useMutation({
    onSuccess: async () => {
      await utils.budgeting.invalidate();
      setStep("done");
    },
  });

  const mapping = {
    date: Number(dateCol),
    description: Number(descCol),
    ...(amountMode === "single"
      ? { amount: Number(amountCol) }
      : {
          ...(debitCol !== NONE ? { debit: Number(debitCol) } : {}),
          ...(creditCol !== NONE ? { credit: Number(creditCol) } : {}),
        }),
  };

  const mappingReady =
    dateCol !== NONE &&
    descCol !== NONE &&
    (amountMode === "single"
      ? amountCol !== NONE
      : debitCol !== NONE || creditCol !== NONE);

  const reset = () => {
    setStep("upload");
    setCsv("");
    setFileName("");
    setHeaders([]);
    setSample([]);
    setOverrides({});
    preview.reset();
    commit.reset();
  };

  if (accounts.data && accounts.data.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Header />
        <EmptyState
          title="No accounts yet"
          description="Imported transactions belong to an account, so add one first."
          action={{ label: "Go to accounts", href: "/accounts" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Header />
      <Steps current={step} />

      {step === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle>1 — Choose a file</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="max-w-prose text-sm text-foreground/60">
              Export a CSV from your bank or investment platform and upload it
              here. Nothing is saved until you confirm what will be imported.
            </p>

            <Field label="Account">
              <Select
                className="max-w-sm"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">Select an account…</option>
                {(accounts.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="CSV file">
              <input
                type="file"
                accept=".csv,text/csv"
                className="block w-full max-w-sm border border-border bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-background"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  setCsv(await file.text());
                }}
              />
            </Field>

            {fileName ? (
              <p className="text-xs text-foreground/50">{fileName}</p>
            ) : null}

            <Button
              className="w-fit"
              disabled={!csv || !accountId || inspect.isPending}
              onClick={() => inspect.mutate({ csv })}
            >
              {inspect.isPending ? "Reading…" : "Read file"}
            </Button>

            {inspect.isError ? (
              <p className="text-sm text-negative">{inspect.error.message}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "map" ? (
        <Card>
          <CardHeader>
            <CardTitle>2 — Map the columns</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="max-w-prose text-sm text-foreground/60">
              {totalRows} row{totalRows === 1 ? "" : "s"} found. Formats differ
              by provider, so confirm which column is which — a guess is
              pre-filled where the header was recognisable.
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Date column">
                <ColumnSelect
                  headers={headers}
                  value={dateCol}
                  onChange={setDateCol}
                />
              </Field>
              <Field label="Description column">
                <ColumnSelect
                  headers={headers}
                  value={descCol}
                  onChange={setDescCol}
                />
              </Field>
            </div>

            <Field label="Amount format">
              <Select
                className="max-w-sm"
                value={amountMode}
                onChange={(event) =>
                  setAmountMode(event.target.value as "single" | "split")
                }
              >
                <option value="single">One signed amount column</option>
                <option value="split">Separate money in / money out</option>
              </Select>
            </Field>

            {amountMode === "single" ? (
              <Field label="Amount column">
                <ColumnSelect
                  headers={headers}
                  value={amountCol}
                  onChange={setAmountCol}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Money out column">
                  <ColumnSelect
                    headers={headers}
                    value={debitCol}
                    onChange={setDebitCol}
                  />
                </Field>
                <Field label="Money in column">
                  <ColumnSelect
                    headers={headers}
                    value={creditCol}
                    onChange={setCreditCol}
                  />
                </Field>
              </div>
            )}

            {sample.length > 0 ? (
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-foreground/50">
                      {headers.map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border last:border-b-0">
                        {headers.map((_, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-foreground/70">
                            {row[cellIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button
                disabled={!mappingReady || preview.isPending}
                onClick={() =>
                  preview.mutate({ accountId, csv, mapping })
                }
              >
                {preview.isPending ? "Checking…" : "Preview import"}
              </Button>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </div>

            {preview.isError ? (
              <p className="text-sm text-negative">{preview.error.message}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "confirm" && preview.data ? (
        <ConfirmStep
          data={preview.data}
          categories={categories.data ?? []}
          overrides={overrides}
          setOverrides={setOverrides}
          isSubmitting={commit.isPending}
          onBack={() => setStep("map")}
          onConfirm={() =>
            commit.mutate({
              accountId,
              rows: preview.data.rows.map((row, index) => ({
                date: row.date,
                description: row.description,
                amount: row.amount,
                categoryId:
                  overrides[index] !== undefined
                    ? overrides[index] || null
                    : row.suggestedCategoryId,
              })),
            })
          }
        />
      ) : null}

      {step === "done" && commit.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Imported</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">
              <Figure className="text-foreground">{commit.data.imported}</Figure>{" "}
              transaction{commit.data.imported === 1 ? "" : "s"} imported
              {commit.data.skippedAsDuplicate > 0 ? (
                <>
                  {", "}
                  <Figure className="text-foreground">
                    {commit.data.skippedAsDuplicate}
                  </Figure>{" "}
                  skipped as duplicates
                </>
              ) : null}
              .
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/budget">Go to Budget</Link>
              </Button>
              <Button variant="outline" onClick={reset}>
                Import another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/budget"
        className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
      >
        ← Budget
      </Link>
      <h1 className="text-2xl font-semibold">Import statement</h1>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "upload", label: "File" },
    { id: "map", label: "Columns" },
    { id: "confirm", label: "Confirm" },
    { id: "done", label: "Done" },
  ];
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <ol className="flex border border-border text-xs uppercase tracking-widest">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`flex-1 border-r border-border px-4 py-2 last:border-r-0 ${
            index === currentIndex
              ? "bg-foreground text-background"
              : index < currentIndex
                ? "text-foreground/60"
                : "text-foreground/30"
          }`}
        >
          {index + 1}. {step.label}
        </li>
      ))}
    </ol>
  );
}

function ColumnSelect({
  headers,
  value,
  onChange,
}: {
  headers: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value={NONE}>Not mapped</option>
      {headers.map((header, index) => (
        <option key={index} value={String(index)}>
          {header || `Column ${index + 1}`}
        </option>
      ))}
    </Select>
  );
}

type PreviewData = {
  errors: Array<{ rowIndex: number; reason: string; raw: string[] }>;
  duplicateCount: number;
  rows: Array<{
    date: Date;
    description: string;
    amount: number;
    suggestedCategoryId: string | null;
  }>;
};

function ConfirmStep({
  data,
  categories,
  overrides,
  setOverrides,
  isSubmitting,
  onBack,
  onConfirm,
}: {
  data: PreviewData;
  categories: Array<{ id: string; name: string }>;
  overrides: Record<number, string>;
  setOverrides: (value: Record<number, string>) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat label="To import" value={data.rows.length} />
        <Stat label="Already present" value={data.duplicateCount} />
        <Stat
          label="Couldn't read"
          value={data.errors.length}
          tone={data.errors.length > 0 ? "negative" : "neutral"}
        />
      </div>

      {data.errors.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rows that couldn&rsquo;t be read</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <table className="w-full text-xs">
              <tbody>
                {data.errors.slice(0, 10).map((error) => (
                  <tr
                    key={error.rowIndex}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-6 py-2 text-foreground/50">
                      Row {error.rowIndex + 2}
                    </td>
                    <td className="px-6 py-2 text-negative">{error.reason}</td>
                    <td className="px-6 py-2 text-foreground/40">
                      {error.raw.join(" · ").slice(0, 80)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>3 — Confirm what will be imported</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {data.rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-foreground/60">
              Nothing new to import — every readable row is already in this
              account.
            </p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-6 py-2 text-foreground/60">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-2">{row.description}</td>
                      <td className="px-6 py-2 text-right">
                        <Figure
                          sentiment={row.amount > 0 ? "positive" : "neutral"}
                        >
                          {formatCurrency(row.amount)}
                        </Figure>
                      </td>
                      <td className="px-6 py-2">
                        <Select
                          className="h-8 w-48"
                          aria-label={`Category for ${row.description}`}
                          value={
                            overrides[index] !== undefined
                              ? overrides[index]
                              : (row.suggestedCategoryId ?? "")
                          }
                          onChange={(event) =>
                            setOverrides({
                              ...overrides,
                              [index]: event.target.value,
                            })
                          }
                        >
                          <option value="">Uncategorised</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          disabled={data.rows.length === 0 || isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting
            ? "Importing…"
            : `Import ${data.rows.length} transaction${data.rows.length === 1 ? "" : "s"}`}
        </Button>
        <Button variant="outline" onClick={onBack}>
          Back to columns
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "negative";
}) {
  return (
    <div className="border border-border px-6 py-5">
      <span className="text-xs uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <Figure
        sentiment={tone === "negative" ? "negative" : "neutral"}
        className="mt-2 block text-3xl"
      >
        {value}
      </Figure>
    </div>
  );
}

/** Best-effort header guess; always shown for confirmation, never trusted. */
function guessColumn(headers: string[], candidates: string[]): number | null {
  const normalised = headers.map((header) => header.trim().toLowerCase());

  for (const candidate of candidates) {
    const index = normalised.findIndex((header) => header === candidate);
    if (index !== -1) return index;
  }

  for (const candidate of candidates) {
    const index = normalised.findIndex((header) => header.includes(candidate));
    if (index !== -1) return index;
  }

  return null;
}
