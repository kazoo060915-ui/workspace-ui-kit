"use client";

import { useEffect, useRef } from "react";
import { Plus, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Task,
  type TaskMeta,
  type TaskLog,
  type SelectedLog,
  type CategoryGroup,
  type SlotKey,
} from "@/lib/schema";
import { SLOT_LABELS } from "@/lib/labels";
import { formatEstimatedMinutes } from "@/lib/computed/tasks";
import { InlineTextField } from "@/components/primitives/InlineTextField";
import { InlineTextareaField } from "@/components/primitives/InlineTextareaField";
import { InlineSelectField } from "@/components/primitives/InlineSelectField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type TaskLogPaneProps = {
  task: Task | null;
  categoryGroups: CategoryGroup[];
  selectedLog: SelectedLog;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onUpdateTaskMeta: <K extends keyof TaskMeta>(
    taskId: string,
    key: K,
    value: TaskMeta[K],
  ) => void;
  onUpdateTaskCategoryId: (taskId: string, categoryId: string) => void;
  onUpdateTaskSlot: (taskId: string, slot: SlotKey) => void;
  onUpdateTaskDaysOfWeek: (taskId: string, daysOfWeek: number[]) => void;
  onUpdateTaskLog: <K extends keyof TaskLog>(
    taskId: string,
    logId: string,
    key: K,
    value: TaskLog[K],
  ) => void;
  onAddLog: (taskId: string) => void;
  onOpenLog: (log: SelectedLog, anchor?: string) => void;
  onCompleteTask: (taskId: string) => void;
};

export function TaskLogPane({
  task,
  categoryGroups,
  selectedLog,
  scrollAnchor,
  onScrollAnchorConsumed,
  onUpdateTaskMeta,
  onUpdateTaskCategoryId,
  onUpdateTaskSlot,
  onUpdateTaskDaysOfWeek,
  onUpdateTaskLog,
  onAddLog,
  onOpenLog,
  onCompleteTask,
}: TaskLogPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollAnchor) return;
    const el = document.getElementById(scrollAnchor);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
    onScrollAnchorConsumed();
  }, [scrollAnchor, onScrollAnchorConsumed]);

  if (!task) {
    return (
      <section className="flex w-[380px] shrink-0 flex-col border-l border-border bg-background">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          タスクを選択してください
        </div>
      </section>
    );
  }

  const activeLog =
    selectedLog?.type === "log"
      ? task.logs.find((l) => l.id === selectedLog.logId) ?? null
      : null;

  // カテゴリ選択肢
  const categoryOptions = categoryGroups.flatMap((g) =>
    g.categories.map((c) => `${g.name} / ${c.name}`),
  );
  const categoryIdByLabel: Record<string, string> = {};
  const categoryLabelById: Record<string, string> = {};
  for (const g of categoryGroups) {
    for (const c of g.categories) {
      const label = `${g.name} / ${c.name}`;
      categoryIdByLabel[label] = c.id;
      categoryLabelById[c.id] = label;
    }
  }
  const currentCategoryLabel = categoryLabelById[task.categoryId] ?? "";

  const slotOptions = (Object.keys(SLOT_LABELS) as SlotKey[]).map((key) => ({
    value: key,
    label: SLOT_LABELS[key],
  }));

  return (
    <section className="flex w-[380px] shrink-0 flex-col border-l border-border bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="truncate text-sm font-semibold">{task.meta.title}</h2>
        {task.slot !== "done" && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onCompleteTask(task.id)}
          >
            完了にする
          </Button>
        )}
      </header>

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 px-4 py-5">
          {/* === タスク情報 === */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              タスク情報
            </p>
            <div className="flex flex-col gap-2">
              <FieldRow label="タスク名">
                <InlineTextField
                  value={task.meta.title}
                  placeholder="タスク名"
                  ariaLabel="タスク名"
                  onSave={(v) => onUpdateTaskMeta(task.id, "title", v)}
                />
              </FieldRow>
              <FieldRow label="カテゴリ">
                <InlineSelectField
                  value={currentCategoryLabel}
                  options={categoryOptions}
                  ariaLabel="カテゴリ"
                  placeholder="カテゴリを選択"
                  onSave={(v) => {
                    const id = categoryIdByLabel[v];
                    if (id) onUpdateTaskCategoryId(task.id, id);
                  }}
                />
              </FieldRow>
              <FieldRow label="スロット">
                <InlineSelectField
                  value={task.slot}
                  options={slotOptions}
                  ariaLabel="スロット"
                  placeholder="スロットを選択"
                  onSave={(v) => onUpdateTaskSlot(task.id, v as SlotKey)}
                />
              </FieldRow>
              <FieldRow label="見積時間(分)">
                <InlineTextField
                  value={task.meta.estimatedMinutes?.toString() ?? ""}
                  placeholder="分"
                  ariaLabel="見積時間（分）"
                  inputType="number"
                  onSave={(v) =>
                    onUpdateTaskMeta(
                      task.id,
                      "estimatedMinutes",
                      v === "" ? null : Number(v),
                    )
                  }
                />
              </FieldRow>
              <FieldRow label="定期タスク">
                <div className="flex items-center gap-2 pt-0.5">
                  <Switch
                    id={`recurring-${task.id}`}
                    checked={task.meta.isRecurring}
                    onCheckedChange={(v) =>
                      onUpdateTaskMeta(task.id, "isRecurring", v)
                    }
                    aria-label="定期タスク"
                  />
                  <Label
                    htmlFor={`recurring-${task.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {task.meta.isRecurring ? "有効" : "無効"}
                  </Label>
                </div>
              </FieldRow>
              <FieldRow label="メモ">
                <InlineTextareaField
                  value={task.meta.notes}
                  placeholder="メモを入力"
                  ariaLabel="メモ"
                  onSave={(v) => onUpdateTaskMeta(task.id, "notes", v)}
                />
              </FieldRow>
            </div>

            {/* 週間スケジュール（曜日ボタン） */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">週間スケジュール</p>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <CalendarDays className="size-3" />
                  週間タブで確認
                </span>
              </div>
              <div className="flex gap-1">
                {DOW_LABELS.map((label, dow) => {
                  const active = task.daysOfWeek.includes(dow);
                  return (
                    <button
                      key={dow}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? task.daysOfWeek.filter((d) => d !== dow)
                          : [...task.daysOfWeek, dow].sort((a, b) => a - b);
                        onUpdateTaskDaysOfWeek(task.id, next);
                      }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70",
                      )}
                      aria-pressed={active}
                      aria-label={`${label}曜日`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* === 実行ログ === */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                実行ログ
              </p>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onAddLog(task.id)}
                aria-label="ログを追加"
              >
                <Plus />
              </Button>
            </div>

            {task.logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                ログがありません。「+」ボタンで追加してください。
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...task.logs].reverse().map((log) => {
                  const isActive = activeLog?.id === log.id;
                  return (
                    <div key={log.id} className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLog({ type: "log", logId: log.id })
                        }
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <span className="text-xs font-medium">{log.date}</span>
                        <Badge variant="secondary" size="xs">
                          {log.actualMinutes != null
                            ? formatEstimatedMinutes(log.actualMinutes)
                            : "—"}
                        </Badge>
                      </button>

                      {isActive && (
                        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                          <LogFieldRow label="実施日">
                            <InlineTextField
                              value={log.date}
                              placeholder="YYYY-MM-DD"
                              ariaLabel="実施日"
                              onSave={(v) =>
                                onUpdateTaskLog(task.id, log.id, "date", v)
                              }
                            />
                          </LogFieldRow>
                          <LogFieldRow label="実施時間（分）">
                            <InlineTextField
                              value={log.actualMinutes?.toString() ?? ""}
                              placeholder="分"
                              ariaLabel="実施時間（分）"
                              inputType="number"
                              onSave={(v) =>
                                onUpdateTaskLog(
                                  task.id,
                                  log.id,
                                  "actualMinutes",
                                  v === "" ? null : Number(v),
                                )
                              }
                            />
                          </LogFieldRow>
                          <LogFieldRow label="メモ">
                            <InlineTextareaField
                              value={log.memo ?? ""}
                              placeholder="実施メモ"
                              ariaLabel="実施メモ"
                              onSave={(v) =>
                                onUpdateTaskLog(task.id, log.id, "memo", v)
                              }
                            />
                          </LogFieldRow>
                          <LogFieldRow label="振り返り">
                            <InlineTextareaField
                              value={log.reflection ?? ""}
                              placeholder="振り返り"
                              ariaLabel="振り返り"
                              onSave={(v) =>
                                onUpdateTaskLog(
                                  task.id,
                                  log.id,
                                  "reflection",
                                  v,
                                )
                              }
                            />
                          </LogFieldRow>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-2">
      <span className="pt-1.5 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function LogFieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-2">
      <span className="pt-1.5 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
