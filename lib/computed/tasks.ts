/**
 * Task / TaskLog の派生計算 SSoT。
 *
 * 複数ペインで同じ意味の値を表示する場合、計算ロジックをここに集約する。
 */

import { type Task, type TaskGroup, type SlotKey, SLOT_ORDER } from "@/lib/schema";
import { SLOT_LABELS, ARCHIVED_GROUP_LABEL } from "@/lib/labels";

/**
 * タスクの最新実行ログを返す。ログがない場合は undefined。
 * Pane 3 の「最終実行日」表示と Pane 4 のドリルダウン起点で共通利用。
 */
export function getLatestLog(task: Task) {
  if (task.logs.length === 0) return undefined;
  return task.logs[task.logs.length - 1];
}

/**
 * 見積時間（分）を「30分」「1時間30分」のような表示文字列に変換する。
 * null の場合は「—」を返す。
 */
export function formatEstimatedMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/**
 * 週間カレンダーの列インデックス（月=0, …, 日=6）を
 * Date.getDay() の曜日番号（日=0, 月=1, …, 土=6）に変換する。
 */
export function colIndexToDow(colIndex: number): number {
  return colIndex === 6 ? 0 : colIndex + 1;
}

/**
 * 今日タブ用の TaskGroup[] を生成する純関数。
 * slot===morning/evening は daysOfWeek に todayDow が含まれるものだけ表示する。
 * backlog は全件表示（常時表示）。holiday/done/archived は別扱い。
 */
export function buildTodayTaskGroups(
  tasks: Task[],
  todayDow: number,
  selectedCategoryId: string | null,
): TaskGroup[] {
  const categoryFilter = (t: Task) =>
    !selectedCategoryId || t.categoryId === selectedCategoryId;

  // 朝/夜は daysOfWeek フィルタあり
  const activeSlots: SlotKey[] = ["morning", "evening"];
  const slotGroups: TaskGroup[] = activeSlots.map((slot) => ({
    kind: "slot" as const,
    slot,
    label: SLOT_LABELS[slot],
    items: tasks
      .filter(
        (t) =>
          !t.archived &&
          t.slot === slot &&
          t.daysOfWeek.includes(todayDow) &&
          categoryFilter(t),
      )
      .map((t) => ({
        id: t.id,
        title: t.meta.title,
        estimatedMinutes: t.meta.estimatedMinutes,
      })),
  }));

  // バックログは曜日フィルタなし（常時表示）
  const backlogItems = tasks
    .filter((t) => !t.archived && t.slot === "backlog" && categoryFilter(t))
    .map((t) => ({
      id: t.id,
      title: t.meta.title,
      estimatedMinutes: t.meta.estimatedMinutes,
    }));
  slotGroups.push({
    kind: "slot" as const,
    slot: "backlog" as SlotKey,
    label: SLOT_LABELS.backlog,
    items: backlogItems,
  });

  // 完了グループは非空のときのみ
  const doneItems = tasks
    .filter((t) => !t.archived && t.slot === "done" && categoryFilter(t))
    .map((t) => ({
      id: t.id,
      title: t.meta.title,
      estimatedMinutes: t.meta.estimatedMinutes,
    }));
  if (doneItems.length > 0) {
    slotGroups.push({
      kind: "slot" as const,
      slot: "done" as SlotKey,
      label: SLOT_LABELS.done,
      items: doneItems,
    });
  }

  // アーカイブグループは非空のときのみ
  const archivedItems = tasks
    .filter((t) => t.archived)
    .map((t) => ({
      id: t.id,
      title: t.meta.title,
      estimatedMinutes: t.meta.estimatedMinutes,
    }));
  if (archivedItems.length > 0) {
    slotGroups.push({
      kind: "archived" as const,
      label: ARCHIVED_GROUP_LABEL,
      items: archivedItems,
    });
  }

  return slotGroups;
}

// SLOT_ORDER を再エクスポート（後方互換）
export { SLOT_ORDER };
