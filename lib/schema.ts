/**
 * 副業タスク管理ドメインの Zod スキーマと派生型。
 * UI コンポーネントはここから型をインポートする。
 */

import { z } from "zod";

// ===== Pane 1: カテゴリグループ → カテゴリ 階層 =====

/** カテゴリ（胃トレクラブ / 個別相談 / 中医整体 / YouTube / 読書 等）。Pane 1 の選択単位。 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

/** カテゴリグループ（副業 / 自己投資）。Pane 1 の最上位単位。 */
export const categoryGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(categorySchema),
});
export type CategoryGroup = z.infer<typeof categoryGroupSchema>;

// ===== 時間枠（スロット）=====

/**
 * タスクの時間枠キー。
 * morning = 朝枠 / evening = 夜枠 / holiday = 休日 / backlog = バックログ / done = 完了
 */
export const slotKeySchema = z.enum([
  "morning",
  "evening",
  "holiday",
  "backlog",
  "done",
]);
export type SlotKey = z.infer<typeof slotKeySchema>;

/** Pane 2 のグループ表示順（スロット順）。 */
export const SLOT_ORDER = slotKeySchema.options;

// ===== タスクログ（実行記録）=====

/**
 * タスクの 1 回分の実行記録。Pane 4 で編集する。
 * `actualMinutes` は実際にかかった時間（null = 未記録）。
 */
export const taskLogSchema = z.object({
  id: z.string(),
  date: z.string(),
  actualMinutes: z.number().nullable().default(null),
  memo: z.string().optional(),
  reflection: z.string().optional(),
});
export type TaskLog = z.infer<typeof taskLogSchema>;

// ===== タスク本体 =====

/**
 * タスクのメタ情報。Pane 3 で編集する。
 * `isRecurring` は定期タスクフラグ（毎日・毎週系）。
 */
export const taskMetaSchema = z.object({
  title: z.string(),
  notes: z.string().default(""),
  estimatedMinutes: z.number().nullable().default(null),
  isRecurring: z.boolean().default(false),
});
export type TaskMeta = z.infer<typeof taskMetaSchema>;

/**
 * タスク本体。Pane 2 の所属グループは `slot` で決まる。
 * `archived` は論理削除フラグ。archived === true のタスクは
 * 通常のスロットグループから外れ、Pane 2 末尾の「アーカイブ済み」グループに表示される。
 *
 * `daysOfWeek` は週間テンプレートの割り当て曜日（0=日, 1=月, …, 6=土）。
 * 空配列 = 今日タブの朝/夜には出さない（バックログ・未割当は slot で判別）。
 */
export const taskSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  slot: slotKeySchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  meta: taskMetaSchema,
  logs: z.array(taskLogSchema).default([]),
  archived: z.boolean().default(false),
  completedAt: z.string().nullable().default(null),
  archivedAt: z.string().nullable().default(null),
});
export type Task = z.infer<typeof taskSchema>;

// ===== 収支トランザクション =====

/**
 * 1 件の収支記録。副業カテゴリに紐づく月次の収入または支出。
 * `month` は "YYYY-MM" 形式。`amount` は正の数（負号は `type` で表現）。
 */
export const transactionTypeSchema = z.enum(["income", "expense"]);
/** "income" | "expense" — 収支種別。スキーマ変更時の二重定義を防ぐため、ここから import する。 */
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  /** "YYYY-MM" 形式。不正フォーマットは Zod が弾く。 */
  month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 形式で指定してください"),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  categoryId: z.string(),
  memo: z.string().default(""),
});
export type Transaction = z.infer<typeof transactionSchema>;

// ===== JSON 全体用スキーマ =====

export const categoryGroupsSchema = z.array(categoryGroupSchema);
export const tasksSchema = z.array(taskSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});
export const transactionsSchema = z.array(transactionSchema);

// ===== Pane 4 の表示状態（SelectedLog）=====

/**
 * Pane 4 に「何を開いているか」を表す型。
 * - `{ type: "log"; logId }`: 実行ログを表示中
 * - `null`: 未選択（Pane 4 は畳み状態）
 */
export type SelectedLog = { type: "log"; logId: string } | null;

// ===== Pane 2 の派生計算用 UI 表示型 =====

/** Pane 2 の 1 行分の表示単位。 */
export type TaskRow = {
  id: string;
  title: string;
  estimatedMinutes: number | null;
};

/**
 * Pane 2 のグループ表示単位（スロット or アーカイブ済み）。
 * `kind: "slot"` は通常のスロットグループ（朝枠 / 夜枠 / 休日 / バックログ / 完了）。
 * `kind: "archived"` は archived === true のタスクを集めた末尾の仮想グループ。
 */
export type TaskGroup =
  | { kind: "slot"; slot: SlotKey; label: string; items: TaskRow[] }
  | { kind: "archived"; label: string; items: TaskRow[] };
