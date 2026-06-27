"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { type TaskRow, type SlotKey } from "@/lib/schema";
import { formatEstimatedMinutes } from "@/lib/computed/tasks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Pane 2 のスロットグループ用、ドラッグ可能なタスク行。
 *
 * - 左端のチェックボックス: isRecurring=true→ログ追加、false→slot を done に移動
 * - 行全体クリック = タスクを選択（onSelect 経由）
 * - グリップだけが drag listener を持つ
 * - DragOverlay 描画中は `isDragging` で半透明 + pointer-events 抑止
 */
export function SortableTaskRow({
  task,
  slot,
  selected,
  onSelect,
  actions,
  isRecurring,
  onCheck,
}: {
  task: TaskRow;
  slot: SlotKey;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
  isRecurring?: boolean;
  onCheck?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { containerId: slot, title: task.title },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/task relative",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        {/* チェックボックス */}
        <Checkbox
          aria-label={`${task.title} を完了`}
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onCheck?.(task.id);
          }}
        />
        {/* ドラッググリップ */}
        <span
          {...attributes}
          {...listeners}
          aria-label={`${task.title} の並び替え`}
          className={cn(
            "flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
            "opacity-0 transition-opacity group-focus-within/task:opacity-100 group-hover/task:opacity-100",
            "hover:text-foreground active:cursor-grabbing",
            "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </span>
        {/* タスク本文（クリックで選択） */}
        <button
          type="button"
          onClick={() => onSelect(task.id)}
          className="min-w-0 flex-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <p className="truncate text-sm">{task.title}</p>
        </button>
        <span className="transition-opacity group-focus-within/task:opacity-0 group-hover/task:opacity-0 flex shrink-0 items-center gap-1.5">
          {isRecurring && (
            <RefreshCw
              aria-label="定期タスク"
              className={cn(
                "size-3",
                selected ? "text-accent-foreground/60" : "text-muted-foreground",
              )}
            />
          )}
          <span
            className={cn(
              "text-xs tabular-nums",
              selected ? "text-accent-foreground/80" : "text-muted-foreground",
            )}
          >
            {formatEstimatedMinutes(task.estimatedMinutes)}
          </span>
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-1/2 right-1 -translate-y-1/2",
                "opacity-0 group-focus-within/task:opacity-100 group-hover/task:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${task.title} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
