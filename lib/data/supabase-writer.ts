/**
 * Supabase への書き込み関数群。
 *
 * Workspace.tsx の各コールバックから fire-and-forget で呼ぶ。
 * ローカル state を楽観的に更新してから非同期で DB に反映する設計。
 * エラーは console.error に留め、UI はブロックしない。
 */

import { supabase } from "@/lib/supabase";
import { type TaskMeta, type TaskLog, type SlotKey, type Transaction } from "@/lib/schema";

// ===== タスク =====

export async function dbAddTask(task: {
  id: string;
  categoryId: string;
  slot: SlotKey;
  position: number;
  title: string;
  daysOfWeek: number[];
}): Promise<void> {
  const { error } = await supabase.from("tasks").insert({
    id: task.id,
    category_id: task.categoryId,
    slot: task.slot,
    position: task.position,
    days_of_week: task.daysOfWeek,
    title: task.title,
    notes: "",
    estimated_minutes: null,
    is_recurring: false,
    archived: false,
  });
  if (error) console.error("dbAddTask:", error.message);
}

export async function dbArchiveTask(id: string, archivedAt: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ archived: true, archived_at: archivedAt })
    .eq("id", id);
  if (error) console.error("dbArchiveTask:", error.message);
}

export async function dbRestoreTask(id: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ archived: false, archived_at: null })
    .eq("id", id);
  if (error) console.error("dbRestoreTask:", error.message);
}

export async function dbMoveTask(
  id: string,
  toSlot: SlotKey,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ slot: toSlot, position })
    .eq("id", id);
  if (error) console.error("dbMoveTask:", error.message);
}

const taskMetaToDbKey: Record<keyof TaskMeta, string> = {
  title: "title",
  notes: "notes",
  estimatedMinutes: "estimated_minutes",
  isRecurring: "is_recurring",
};

export async function dbUpdateTaskMeta<K extends keyof TaskMeta>(
  taskId: string,
  key: K,
  value: TaskMeta[K],
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ [taskMetaToDbKey[key]]: value })
    .eq("id", taskId);
  if (error) console.error("dbUpdateTaskMeta:", error.message);
}

export async function dbUpdateTaskCategoryId(
  taskId: string,
  categoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ category_id: categoryId })
    .eq("id", taskId);
  if (error) console.error("dbUpdateTaskCategoryId:", error.message);
}

export async function dbUpdateTaskSlot(
  taskId: string,
  slot: SlotKey,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ slot })
    .eq("id", taskId);
  if (error) console.error("dbUpdateTaskSlot:", error.message);
}

export async function dbUpdateTaskDaysOfWeek(
  taskId: string,
  daysOfWeek: number[],
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ days_of_week: daysOfWeek })
    .eq("id", taskId);
  if (error) console.error("dbUpdateTaskDaysOfWeek:", error.message);
}

export async function dbCompleteTask(taskId: string, completedAt: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ slot: "done", completed_at: completedAt })
    .eq("id", taskId);
  if (error) console.error("dbCompleteTask:", error.message);
}

export async function dbDeleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.error("dbDeleteTask:", error.message);
    return false;
  }
  return true;
}

// ===== タスクログ =====

export async function dbAddTaskLog(
  taskId: string,
  log: TaskLog,
): Promise<void> {
  const { error } = await supabase.from("task_logs").insert({
    id: log.id,
    task_id: taskId,
    date: log.date,
    actual_minutes: log.actualMinutes,
    memo: log.memo ?? "",
    reflection: log.reflection ?? "",
  });
  if (error) console.error("dbAddTaskLog:", error.message);
}

const taskLogToDbKey: Partial<Record<keyof TaskLog, string>> = {
  date: "date",
  actualMinutes: "actual_minutes",
  memo: "memo",
  reflection: "reflection",
};

export async function dbUpdateTaskLog<K extends keyof TaskLog>(
  logId: string,
  key: K,
  value: TaskLog[K],
): Promise<void> {
  const dbKey = taskLogToDbKey[key];
  if (!dbKey) return;
  const { error } = await supabase
    .from("task_logs")
    .update({ [dbKey]: value })
    .eq("id", logId);
  if (error) console.error("dbUpdateTaskLog:", error.message);
}

// ===== 日次振り返り（Good & New）=====

export async function dbSaveReflection(
  date: string,
  field: "item1" | "item2" | "item3",
  value: string,
): Promise<void> {
  const { error } = await supabase
    .from("daily_reflections")
    .upsert({ date, [field]: value }, { onConflict: "date" });
  if (error) console.error("dbSaveReflection:", error.message);
}

// ===== 収支 =====

export async function dbAddTransaction(
  tx: Transaction,
): Promise<void> {
  const { error } = await supabase.from("transactions").insert({
    id: tx.id,
    category_id: tx.categoryId,
    month: tx.month,
    type: tx.type,
    amount: tx.amount,
    memo: tx.memo ?? "",
  });
  if (error) console.error("dbAddTransaction:", error.message);
}

export async function dbDeleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) console.error("dbDeleteTransaction:", error.message);
}
