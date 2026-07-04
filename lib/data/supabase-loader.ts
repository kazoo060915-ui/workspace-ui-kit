/**
 * Supabase からデータを取得し、アプリの TypeScript 型に変換するローダー。
 *
 * DB は snake_case、アプリ型は camelCase のため、ここで橋渡しする。
 * tasks は task_logs をネストして取得（1クエリで完結）。
 */

import { supabase } from "@/lib/supabase";
import { type Task, type Transaction } from "@/lib/schema";

// ===== tasks =====

export async function loadTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_logs(*)")
    .order("position", { ascending: true });

  if (error) throw new Error(`tasks の取得に失敗: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    slot: row.slot,
    daysOfWeek: row.days_of_week ?? [],
    archived: row.archived,
    completedAt: row.completed_at ?? null,
    archivedAt: row.archived_at ?? null,
    meta: {
      title: row.title,
      notes: row.notes ?? "",
      estimatedMinutes: row.estimated_minutes ?? null,
      isRecurring: row.is_recurring,
    },
    logs: (row.task_logs ?? []).map(
      (log: {
        id: string;
        date: string;
        actual_minutes: number | null;
        memo: string | null;
        reflection: string | null;
      }) => ({
        id: log.id,
        date: log.date,
        actualMinutes: log.actual_minutes ?? null,
        memo: log.memo ?? "",
        reflection: log.reflection ?? "",
      }),
    ),
  }));
}

// ===== daily reflections =====

export type DailyReflection = {
  date: string;
  item1: string;
  item2: string;
  item3: string;
};

export async function loadTodayReflection(
  date: string,
): Promise<DailyReflection> {
  const { data, error } = await supabase
    .from("daily_reflections")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  // テーブルが未作成の場合は空で返す（エラーにしない）
  if (error) {
    console.warn("daily_reflections:", error.message);
    return { date, item1: "", item2: "", item3: "" };
  }

  return data ?? { date, item1: "", item2: "", item3: "" };
}

// ===== transactions =====

export async function loadTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("month", { ascending: false });

  if (error) throw new Error(`transactions の取得に失敗: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    month: row.month,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    memo: row.memo ?? "",
  }));
}
