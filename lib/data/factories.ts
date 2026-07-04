import { type Task, type TaskLog, type SlotKey } from "@/lib/schema";

/**
 * 新規タスクの最小構成を生成するヘルパー。
 * `addTask`（Workspace 本体）から参照する。
 * すべてのフィールドは空・null 初期値で、Pane 3 の inline edit で埋める。
 */
export function createMinimalTask(
  title: string,
  categoryId: string,
  slot: SlotKey,
): Task {
  return {
    id: `t-${Date.now()}`,
    categoryId,
    slot,
    daysOfWeek: [],
    meta: {
      title,
      notes: "",
      estimatedMinutes: null,
      isRecurring: false,
    },
    logs: [],
    archived: false,
    completedAt: null,
    archivedAt: null,
  };
}

/**
 * タスクログ（実行記録）の最小構成を生成するヘルパー。
 * `addTaskLog`（Workspace 本体）から参照する。
 * 日付は今日の ISO 文字列（YYYY-MM-DD）を自動セット。
 */
export function createMinimalTaskLog(date?: string): TaskLog {
  const today = date ?? new Date().toISOString().slice(0, 10);
  return {
    id: `log-${Date.now()}`,
    date: today,
    actualMinutes: null,
    memo: "",
    reflection: "",
  };
}
