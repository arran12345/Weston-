import { GoalDetailScreen } from "@/domains/goals/components/goal-detail-screen";

export default async function GoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoalDetailScreen goalId={id} />;
}
