import { Suspense } from "react";

import { CategoryDetailScreen } from "@/domains/budgeting/components/category-detail-screen";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  return (
    <Suspense fallback={<div className="h-64 w-full bg-foreground/5" />}>
      <CategoryDetailScreen categoryId={categoryId} />
    </Suspense>
  );
}
