"use client";

import { Button } from "@/shared/ui/button";

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function addMonths(month: Date, delta: number) {
  const next = new Date(month);
  next.setMonth(next.getMonth() + delta);
  return next;
}

export function MonthSelector({
  month,
  onChange,
}: {
  month: Date;
  onChange: (month: Date) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        aria-label="Previous month"
        onClick={() => onChange(addMonths(month, -1))}
      >
        ←
      </Button>
      <span className="min-w-40 text-center text-sm font-medium uppercase tracking-widest">
        {monthLabel.format(month)}
      </span>
      <Button
        size="sm"
        variant="outline"
        aria-label="Next month"
        onClick={() => onChange(addMonths(month, 1))}
      >
        →
      </Button>
    </div>
  );
}
