import * as React from "react";

import { cn } from "@/shared/lib/cn";

const sentiment = {
  neutral: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
} as const;

export function Figure({
  className,
  sentiment: tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { sentiment?: keyof typeof sentiment }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        sentiment[tone],
        className,
      )}
      {...props}
    />
  );
}
