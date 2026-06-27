import { Workspace } from "@/components/workspace/Workspace";
import categoriesData from "@/data/categories.json";
import tasksData from "@/data/tasks.json";
import transactionsData from "@/data/transactions.json";
import workspaceData from "@/data/workspace.json";
import {
  categoryGroupsSchema,
  tasksSchema,
  transactionsSchema,
  workspaceSchema,
} from "@/lib/schema";
import { loadTasks, loadTransactions, loadTodayReflection } from "@/lib/data/supabase-loader";

export default async function Page() {
  const groupsResult = categoryGroupsSchema.safeParse(categoriesData);
  const tasksFallbackResult = tasksSchema.safeParse(tasksData);
  const txFallbackResult = transactionsSchema.safeParse(transactionsData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (
    !groupsResult.success ||
    !tasksFallbackResult.success ||
    !txFallbackResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !groupsResult.success &&
        `categories.json: ${groupsResult.error.issues[0]?.message}`,
      !tasksFallbackResult.success &&
        `tasks.json: ${tasksFallbackResult.error.issues[0]?.message}`,
      !txFallbackResult.success &&
        `transactions.json: ${txFallbackResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

  const [tasksResult, transactionsResult, reflectionResult] = await Promise.allSettled([
    loadTasks(),
    loadTransactions(),
    loadTodayReflection(today),
  ]);

  if (tasksResult.status === "rejected") {
    console.warn("loadTasks failed, fallback to data/tasks.json", tasksResult.reason);
  }
  if (transactionsResult.status === "rejected") {
    console.warn(
      "loadTransactions failed, fallback to data/transactions.json",
      transactionsResult.reason,
    );
  }

  const tasks =
    tasksResult.status === "fulfilled"
      ? tasksResult.value
      : tasksFallbackResult.data;
  const transactions =
    transactionsResult.status === "fulfilled"
      ? transactionsResult.value
      : txFallbackResult.data;
  const reflection =
    reflectionResult.status === "fulfilled"
      ? reflectionResult.value
      : { date: today, item1: "", item2: "", item3: "" };

  return (
    <Workspace
      initialCategoryGroups={groupsResult.data}
      initialTasks={tasks}
      initialTransactions={transactions}
      initialReflection={reflection}
      workspace={wsResult.data}
    />
  );
}
