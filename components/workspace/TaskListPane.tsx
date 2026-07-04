"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import { type TaskRow, type TaskGroup, type SlotKey } from "@/lib/schema";
import { SLOT_LABELS } from "@/lib/labels";
import { formatEstimatedMinutes } from "@/lib/computed/tasks";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { SortableTaskRow } from "@/components/workspace/SortableTaskRow";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoodAndNewSection } from "@/components/workspace/GoodAndNewSection";
import { type DailyReflection } from "@/lib/data/supabase-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter でタスクを持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

const SLOT_HEADER_THEME: Record<
  SlotKey,
  { header: string; title: string; badge: string; addButton: string }
> = {
  morning: {
    header: "bg-chart-3/15 border-chart-3/35",
    title: "text-chart-3",
    badge: "bg-chart-3/20 text-chart-3 border border-chart-3/30",
    addButton: "text-chart-3/80 hover:text-chart-3",
  },
  evening: {
    header: "bg-chart-1/15 border-chart-1/35",
    title: "text-chart-1",
    badge: "bg-chart-1/20 text-chart-1 border border-chart-1/30",
    addButton: "text-chart-1/80 hover:text-chart-1",
  },
  holiday: {
    header: "bg-chart-4/15 border-chart-4/35",
    title: "text-chart-4",
    badge: "bg-chart-4/20 text-chart-4 border border-chart-4/30",
    addButton: "text-chart-4/80 hover:text-chart-4",
  },
  backlog: {
    header: "bg-chart-2/15 border-chart-2/35",
    title: "text-chart-2",
    badge: "bg-chart-2/20 text-chart-2 border border-chart-2/30",
    addButton: "text-chart-2/80 hover:text-chart-2",
  },
  done: {
    header: "bg-income/10 border-income/30",
    title: "text-income",
    badge: "bg-income/20 text-income border border-income/30",
    addButton: "text-income/80 hover:text-income",
  },
};

const ARCHIVED_HEADER_THEME = {
  header: "bg-muted border-border",
  title: "text-muted-foreground",
  badge: "bg-muted-foreground/15 text-muted-foreground border border-muted-foreground/20",
};

type TaskListPaneProps = {
  groups: TaskGroup[];
  selectedTaskId: string;
  reflection: DailyReflection;
  onSelectTask: (id: string) => void;
  onAddTask: (title: string, slot: SlotKey, daysOfWeek?: number[]) => void;
  onArchiveTask: (id: string) => void;
  onRestoreTask: (id: string) => void;
  onMoveTask: (id: string, toSlot: SlotKey, toIndex: number) => void;
  onCheckTask?: (id: string) => void;
  onUpdateReflection: (field: "item1", value: string) => void;
};

export function TaskListPane({
  groups,
  selectedTaskId,
  reflection,
  onSelectTask,
  onAddTask,
  onArchiveTask,
  onRestoreTask,
  onMoveTask,
  onCheckTask,
  onUpdateReflection,
}: TaskListPaneProps) {
  const todayDow = new Date().getDay();
  const [addDialogSlot, setAddDialogSlot] = useState<{
    slot: SlotKey;
    label: string;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const slotGroups = groups.filter(
    (g): g is Extract<TaskGroup, { kind: "slot" }> =>
      g.kind === "slot" && g.slot !== "done",
  );
  const doneGroup = groups.find(
    (g): g is Extract<TaskGroup, { kind: "slot" }> =>
      g.kind === "slot" && g.slot === "done",
  );
  const archivedGroup = groups.find(
    (g): g is Extract<TaskGroup, { kind: "archived" }> =>
      g.kind === "archived",
  );

  const activeDragRow: TaskRow | null = (() => {
    if (!activeDragId) return null;
    for (const g of slotGroups) {
      const row = g.items.find((r) => r.id === activeDragId);
      if (row) return row;
    }
    if (doneGroup) {
      const row = doneGroup.items.find((r) => r.id === activeDragId);
      if (row) return row;
    }
    return null;
  })();

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const title =
        (active.data.current?.title as string | undefined) ?? "タスク";
      return `${title}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const title =
        (active.data.current?.title as string | undefined) ?? "タスク";
      if (!over) return `${title}を移動中です。`;
      const overContainer = over.data.current?.containerId as
        | SlotKey
        | undefined;
      if (overContainer)
        return `${title}を「${SLOT_LABELS[overContainer]}」の上に移動しました。`;
      return `${title}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const title =
        (active.data.current?.title as string | undefined) ?? "タスク";
      if (!over) return `${title}の移動をキャンセルしました。`;
      const allSlotGroups = doneGroup ? [...slotGroups, doneGroup] : slotGroups;
      const overContainer =
        (over.data.current?.containerId as SlotKey | undefined) ??
        (typeof over.id === "string" &&
        allSlotGroups.some((g) => g.slot === over.id)
          ? (over.id as SlotKey)
          : undefined);
      if (!overContainer) return `${title}を確定しました。`;
      return `${title}を「${SLOT_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const title =
        (active.data.current?.title as string | undefined) ?? "タスク";
      return `${title}の移動をキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeContainer = active.data.current?.containerId as
      | SlotKey
      | undefined;
    const allSlotGroups = doneGroup ? [...slotGroups, doneGroup] : slotGroups;
    const overContainer =
      (over.data.current?.containerId as SlotKey | undefined) ??
      (typeof over.id === "string" &&
      allSlotGroups.some((g) => g.slot === over.id)
        ? (over.id as SlotKey)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = allSlotGroups.find((g) => g.slot === overContainer);
    if (!targetGroup) return;

    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex(
      (r) => r.id === over.id,
    );
    const toIndex =
      overIndexInTarget >= 0 ? overIndexInTarget : targetGroup.items.length;

    onMoveTask(String(active.id), overContainer, toIndex);
  };

  // 今日の日付を「6月11日（木）」形式で表示（クライアントサイド計算）
  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <section className="flex min-w-[420px] flex-1 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 flex-col items-start justify-center border-b border-border px-3">
        <h2 className="text-sm font-semibold text-foreground">今日やること</h2>
        <p className="text-[11px] text-muted-foreground">{todayLabel}</p>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          id="pane2-task-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex flex-col gap-3 px-2.5 py-3">
            {slotGroups.map((group) => (
              <SlotGroup
                key={`slot:${group.slot}`}
                slot={group.slot}
                label={group.label}
                items={group.items}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onAddRequest={() =>
                  setAddDialogSlot({ slot: group.slot, label: group.label })
                }
                onArchiveRequest={(id, title) =>
                  setArchiveTarget({ id, title })
                }
                onCheckTask={onCheckTask}
              />
            ))}
            {doneGroup && doneGroup.items.length > 0 && (
              <CollapsibleGroup
                key={`done:${doneGroup.items.length}`}
                label={doneGroup.label}
                items={doneGroup.items}
                open={doneOpen}
                onOpenChange={setDoneOpen}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                slot={doneGroup.slot}
                onArchiveRequest={(id, title) =>
                  setArchiveTarget({ id, title })
                }
              />
            )}
            {archivedGroup && (
              <ArchivedGroup
                key={`archived:${archivedGroup.items.length}`}
                label={archivedGroup.label}
                items={archivedGroup.items}
                open={archivedOpen}
                onOpenChange={setArchivedOpen}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onRestore={onRestoreTask}
              />
            )}
          </div>
          <DragOverlay>
            {activeDragRow && (
              <div className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-2 text-accent-foreground shadow-lg">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{activeDragRow.title}</p>
                </div>
                <span className="shrink-0 text-xs text-accent-foreground/70 tabular-nums">
                  {formatEstimatedMinutes(activeDragRow.estimatedMinutes)}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <div className="px-3 pb-4">
          <GoodAndNewSection
            reflection={reflection}
            onUpdate={onUpdateReflection}
          />
        </div>
      </ScrollArea>

      {addDialogSlot && (
        <AddItemDialog
          open={addDialogSlot !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogSlot(null);
          }}
          title="タスクを追加"
          description={`「${addDialogSlot.label}」にタスクを追加します`}
          fieldLabel="タスク名"
          fieldId="task-title"
          placeholder="例: AI Driven School の課題を進める"
          enableDaysOfWeekPicker={
            addDialogSlot.slot === "morning" || addDialogSlot.slot === "evening"
          }
          defaultDaysOfWeek={
            addDialogSlot.slot === "morning" || addDialogSlot.slot === "evening"
              ? [todayDow]
              : []
          }
          onAddWithDaysOfWeek={(title, daysOfWeek) => {
            onAddTask(title, addDialogSlot.slot, daysOfWeek);
            setAddDialogSlot(null);
          }}
          onAdd={(title) => {
            onAddTask(title, addDialogSlot.slot);
            setAddDialogSlot(null);
          }}
        />
      )}

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="タスクをアーカイブしますか？"
        itemName={archiveTarget?.title ?? ""}
        description={`「${archiveTarget?.title ?? ""}」をアーカイブします。後で「アーカイブ済み」から復元できます。`}
        actionLabel="アーカイブ"
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveTask(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </section>
  );
}

// ===== スロットグループ（ドラッグ対応）=====

function SlotGroup({
  slot,
  label,
  items,
  selectedTaskId,
  onSelectTask,
  onAddRequest,
  onArchiveRequest,
  onCheckTask,
}: {
  slot: SlotKey;
  label: string;
  items: TaskRow[];
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, title: string) => void;
  onCheckTask?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${slot}`,
    data: { containerId: slot },
  });
  const theme = SLOT_HEADER_THEME[slot];

  return (
    <div>
      <div
        className={cn(
          "sticky top-0 z-10 -mx-0.5 mb-1 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1 backdrop-blur-sm",
          theme.header,
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className={cn("truncate text-xs font-semibold", theme.title)}>
            {label}
          </h3>
          <Badge variant="secondary" size="xs" className={theme.badge}>
            {items.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onAddRequest}
          aria-label={`${label} にタスクを追加`}
          className={theme.addButton}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <SortableContext
        id={slot}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          data-slot={slot}
          className={cn(
            "flex flex-col gap-0.5",
            items.length === 0 &&
              "min-h-10 rounded-md border border-dashed border-border/70 p-1.5",
            items.length === 0 && isOver && "border-primary/60 bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <li
              className={cn(
                "pointer-events-none flex h-7 items-center justify-center text-xs",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              ここへドラッグ
            </li>
          ) : (
            items.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                slot={slot}
                selected={task.id === selectedTaskId}
                onSelect={onSelectTask}
                onCheck={onCheckTask}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchiveRequest(task.id, task.title)}
                  >
                    <Archive />
                    アーカイブ
                  </DropdownMenuItem>
                }
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

// ===== 完了グループ（折りたたみ可能、ドラッグ対応）=====

function CollapsibleGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedTaskId,
  onSelectTask,
  slot,
  onArchiveRequest,
}: {
  label: string;
  items: TaskRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  slot: SlotKey;
  onArchiveRequest: (id: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${slot}`,
    data: { containerId: slot },
  });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/done-trigger sticky top-0 z-10 -mx-0.5 mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1 backdrop-blur-sm",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              SLOT_HEADER_THEME.done.header,
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className={cn("truncate text-xs font-semibold", SLOT_HEADER_THEME.done.title)}>
            {label}
          </h3>
          <Badge variant="secondary" size="xs" className={SLOT_HEADER_THEME.done.badge}>
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-income transition-[color,transform] group-hover/done-trigger:text-income in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SortableContext
          id={slot}
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            ref={setNodeRef}
            data-slot={slot}
            className={cn(
              "flex flex-col gap-0.5",
              items.length === 0 &&
                "min-h-10 rounded-md border border-dashed border-border/70 p-1.5",
              items.length === 0 && isOver && "border-primary/60 bg-primary/5",
            )}
          >
            {items.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                slot={slot}
                selected={task.id === selectedTaskId}
                onSelect={onSelectTask}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchiveRequest(task.id, task.title)}
                  >
                    <Archive />
                    アーカイブ
                  </DropdownMenuItem>
                }
              />
            ))}
          </ul>
        </SortableContext>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ===== アーカイブ済みグループ（折りたたみ可能）=====

function ArchivedGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedTaskId,
  onSelectTask,
  onRestore,
}: {
  label: string;
  items: TaskRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/archived-trigger sticky top-0 z-10 -mx-0.5 mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1 backdrop-blur-sm",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              ARCHIVED_HEADER_THEME.header,
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className={cn("truncate text-xs font-semibold", ARCHIVED_HEADER_THEME.title)}>
            {label}
          </h3>
          <Badge variant="secondary" size="xs" className={ARCHIVED_HEADER_THEME.badge}>
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,transform] group-hover/archived-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5" data-slot="archived">
          {items.map((task) => (
            <ArchivedTaskItem
              key={task.id}
              task={task}
              selected={task.id === selectedTaskId}
              onSelect={onSelectTask}
              onRestore={onRestore}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArchivedTaskItem({
  task,
  selected,
  onSelect,
  onRestore,
}: {
  task: TaskRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <li className="group/task relative">
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{task.title}</p>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums transition-opacity group-focus-within/task:opacity-0 group-hover/task:opacity-0 [@media(pointer:coarse)]:opacity-0",
            selected ? "text-accent-foreground/80" : "text-muted-foreground",
          )}
        >
          {formatEstimatedMinutes(task.estimatedMinutes)}
        </span>
      </button>
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
                "[@media(pointer:coarse)]:opacity-100",
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
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onRestore(task.id)}>
              <ArchiveRestore />
              復元
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
