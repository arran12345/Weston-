const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let formatter = currencyFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    currencyFormatters.set(key, formatter);
  }

  return formatter;
}

export function formatCurrency(
  amount: number,
  { currency = "GBP", fractionDigits = 2 } = {},
) {
  return currencyFormatter(currency, fractionDigits).format(amount);
}

/** Same as formatCurrency but with an explicit +/− for deltas. */
export function formatSignedCurrency(
  amount: number,
  options?: { currency?: string; fractionDigits?: number },
) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(amount), options)}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export function formatShortDate(date: Date) {
  return shortDateFormatter.format(date);
}
