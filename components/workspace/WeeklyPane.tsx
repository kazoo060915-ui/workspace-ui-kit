"use client";

/**
 * 週間テンプレートを表示する読み取り専用グリッド（Phase 1）。
 *
 * レイアウト: 7列（月〜日）× 3行（朝枠 / 夜枠 / 休日）
 * タスクをクリックすると選択状態になり、今日タブで詳細が表示される。
 * 曜日の割り当て（daysOfWeek）は TaskLogPane のボタンで変更できる。
 *
 * Phase 2: ドラッグ&ドロップによる割り当て変更
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { type Task } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatEstimatedMinutes } from "@/lib/computed/tasks";

const DOW_COLS = [
  { dow: 1, label: "月" },
  { dow: 2, label: "火" },
  { dow: 3, label: "水" },
  { dow: 4, label: "木" },
  { dow: 5, label: "金" },
  { dow: 6, label: "土" },
  { dow: 0, label: "日" },
] as const;

const SLOT_ROWS = [
  { slot: "morning" as const, label: "朝枠" },
  { slot: "evening" as const, label: "夜枠" },
  { slot: "holiday" as const, label: "休日" },
  { slot: "backlog" as const, label: "未割り当て" },
] as const;

type WeeklyPaneProps = {
  tasks: Task[];
  selectedTaskId: string;
  selectedCategoryId: string | null;
  onSelectTask: (id: string) => void;
  onUpdateTaskDaysOfWeek: (taskId: string, daysOfWeek: number[]) => void;
};

export function WeeklyPane({
  tasks,
  selectedTaskId,
  selectedCategoryId,
  onSelectTask,
  onUpdateTaskDaysOfWeek,
}: WeeklyPaneProps) {
  const todayDow = useMemo(() => new Date().getDay(), []);
  const [mobileDow, setMobileDow] = useState(todayDow);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const editableTask =
    selectedTask && !selectedTask.archived && selectedTask.slot !== "done"
      ? selectedTask
      : null;

  // slot × dow のマップを事前計算（カテゴリフィルタを含む）
  const grid = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (const row of SLOT_ROWS) {
      for (const col of DOW_COLS) {
        const key = `${row.slot}:${col.dow}`;
        result[key] = tasks.filter(
          (t) =>
            !t.archived &&
            t.slot === row.slot &&
            t.daysOfWeek.includes(col.dow) &&
            (!selectedCategoryId || t.categoryId === selectedCategoryId),
        );
      }
    }
    return result;
  }, [tasks, selectedCategoryId]);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      {/* ヘッダー */}
      <header className="flex h-12 shrink-0 items-center border-b border-border px-5">
        <h2 className="text-sm font-semibold">週間スケジュール</h2>
      </header>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          選択中タスクの曜日割り当て
        </p>
        {editableTask ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {DOW_COLS.map((col) => {
              const active = editableTask.daysOfWeek.includes(col.dow);
              return (
                <button
                  key={col.dow}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? editableTask.daysOfWeek.filter((d) => d !== col.dow)
                      : [...editableTask.daysOfWeek, col.dow].sort((a, b) => a - b);
                    onUpdateTaskDaysOfWeek(editableTask.id, next);
                  }}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  aria-pressed={active}
                  aria-label={`${col.label}曜日を${active ? "解除" : "追加"}`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            週間に表示されるタスク（未完了・未アーカイブ）を選ぶと、ここで曜日を変更できます。
          </p>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 md:p-4">
          {/* モバイル: 1日表示 */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {DOW_COLS.map((col) => {
                const selected = col.dow === mobileDow;
                const isToday = col.dow === todayDow;
                return (
                  <button
                    key={col.dow}
                    type="button"
                    onClick={() => setMobileDow(col.dow)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {col.label}
                    {isToday && <span className="size-1.5 rounded-full bg-current" />}
                  </button>
                );
              })}
            </div>

            {SLOT_ROWS.map((row) => {
              const key = `${row.slot}:${mobileDow}`;
              const cellTasks = grid[key] ?? [];
              return (
                <div key={row.slot} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{row.label}</span>
                    <Badge variant="secondary" size="xs">
                      {cellTasks.length}
                    </Badge>
                  </div>
                  <div className="flex min-h-[72px] flex-col gap-1 rounded-lg border border-border bg-card p-2">
                    {cellTasks.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center text-[10px] text-muted-foreground/60">
                        —
                      </div>
                    ) : (
                      cellTasks.map((task) => (
                        <WeeklyTaskChip
                          key={task.id}
                          task={task}
                          selected={task.id === selectedTaskId}
                          onSelect={onSelectTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* デスクトップ: 7列表示 */}
          <div className="hidden min-w-[760px] flex-col gap-2 md:flex">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 pb-1">
              <div />
              {DOW_COLS.map((col) => {
                const isToday = col.dow === todayDow;
                return (
                  <div
                    key={col.dow}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-center text-xs font-semibold",
                      isToday ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                  >
                    {col.label}
                    {isToday && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>

            {SLOT_ROWS.map((row) => (
              <div key={row.slot} className="grid grid-cols-[80px_repeat(7,1fr)] gap-2">
                <div className="flex items-start pt-2">
                  <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
                </div>
                {DOW_COLS.map((col) => {
                  const key = `${row.slot}:${col.dow}`;
                  const cellTasks = grid[key] ?? [];
                  const isToday = col.dow === todayDow;
                  return (
                    <div
                      key={col.dow}
                      className={cn(
                        "flex min-h-[80px] flex-col gap-1 rounded-lg border p-2",
                        isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card",
                      )}
                    >
                      {cellTasks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        </div>
                      ) : (
                        cellTasks.map((task) => (
                          <WeeklyTaskChip
                            key={task.id}
                            task={task}
                            selected={task.id === selectedTaskId}
                            onSelect={onSelectTask}
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

function WeeklyTaskChip({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground hover:bg-muted",
      )}
    >
      <span className="line-clamp-2 leading-tight">{task.meta.title}</span>
      {task.meta.estimatedMinutes != null && (
        <Badge
          variant="secondary"
          size="xs"
          className={cn(selected && "bg-primary-foreground/20 text-primary-foreground")}
        >
          {formatEstimatedMinutes(task.meta.estimatedMinutes)}
        </Badge>
      )}
    </button>
  );
}
