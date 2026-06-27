/**
 * 副業タスク管理ドメインの表示文言（labels）。
 *
 * 業種を変える受講生は、このファイルの値を用途に合わせて書き換える。
 * 例: フリーランス案件管理なら SLOT_LABELS を
 *     「企画 / 制作 / 入稿 / 保留 / 完了」に変更する。
 */

import { type SlotKey } from "@/lib/schema";

// ===== 時間枠ラベル =====

/** Pane 2 グループ見出しに出すスロット表示名（日本語）。 */
export const SLOT_LABELS: Record<SlotKey, string> = {
  morning: "朝枠",
  evening: "夜枠",
  holiday: "休日",
  backlog: "バックログ",
  done: "完了",
};

/** Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。 */
export const ARCHIVED_GROUP_LABEL = "アーカイブ済み";

// ===== Pane 3 ダッシュボードのセクション見出し =====

export const PANE3_SECTION = {
  taskInfo: "タスク情報",
  executionLogs: "実行ログ",
  executionLogsDescription: "過去の実行記録",
} as const;

// ===== Pane 4 セクション id =====

export const PANE4_SECTION_IDS = {
  log: {
    info: "pane4-log-info",
    memo: "pane4-log-memo",
    reflection: "pane4-log-reflection",
  },
} as const;
