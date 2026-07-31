import * as React from "react";

import { Button } from "@/shared/ui/button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-4 border border-border px-6 py-8">
      <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
      <p className="max-w-prose text-sm text-foreground/70">{description}</p>
      {action ? (
        <Button asChild className="w-fit">
          <a href={action.href}>{action.label}</a>
        </Button>
      ) : null}
    </div>
  );
}
