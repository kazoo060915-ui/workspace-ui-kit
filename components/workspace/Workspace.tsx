"use client";

/**
 * Workspace: 3タブ（今日・週間・収支）の親コンポーネント（副業ダッシュボード）。
 *
 * - タブ状態・カテゴリ選択・タスク・トランザクション・選択ログ等の state を保持し
 *   各ペインに props として渡す。
 * - タブ切り替えは GlobalHeader の ToggleGroup で行う。
 *
 * レイアウト構造:
 *
 * ```
 * <SidebarProvider> (h-screen)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────────────────┐
 * │ カテゴリ（今日タブ） │ GlobalHeader h-12                             │
 * │ collapsible="icon"  │ ┌─ 今日タブ ────────────────────────────────┐ │
 * │ 240px ↔ 48px        │ │ TaskListPane 280px + TaskLogPane 380px     │ │
 * │                     │ ├─ 週間タブ ─────────────────────────────────┤ │
 * │                     │ │ WeeklyPane 全幅                            │ │
 * │                     │ ├─ 収支タブ ─────────────────────────────────┤ │
 * │                     │ │ FinancePane 全幅                           │ │
 * │                     │ └────────────────────────────────────────────┘ │
 * └─────────────────────┴───────────────────────────────────────────────┘
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from "react";

import {
  type CategoryGroup,
  type Task,
  type SlotKey,
  type Transaction,
} from "@/lib/schema";
import { type DailyReflection } from "@/lib/data/supabase-loader";
import { createMinimalTask } from "@/lib/data/factories";
import {
  dbAddTask,
  dbArchiveTask,
  dbRestoreTask,
  dbMoveTask,
  dbCompleteTask,
  dbDeleteTask,
  dbAddTransaction,
  dbDeleteTransaction,
} from "@/lib/data/supabase-writer";
import { buildTodayTaskGroups } from "@/lib/computed/tasks";
import { getCurrentMonthLocal, shiftMonth } from "@/lib/computed/finance";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { CategoryPane } from "@/components/workspace/CategoryPane";
import { TaskListPane } from "@/components/workspace/TaskListPane";
import { WeeklyPane } from "@/components/workspace/WeeklyPane";
import { FinancePane } from "@/components/workspace/FinancePane";

export type ActiveTab = "today" | "weekly" | "finance";

type WorkspaceProps = {
  initialCategoryGroups: CategoryGroup[];
  initialTasks: Task[];
  initialTransactions: Transaction[];
  initialReflection: DailyReflection;
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialCategoryGroups,
  initialTasks,
  initialTransactions,
  initialReflection,
  workspace,
}: WorkspaceProps) {
  const toLocalDateKey = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("sv-SE");
  }, []);

  const todayDateKey = useMemo(
    () => new Date().toLocaleDateString("sv-SE"),
    [],
  );
  const shouldAutoDeleteTask = useCallback(
    (task: Task) => {
      const timestamp =
        task.archived
          ? task.archivedAt ?? task.completedAt
          : task.slot === "done"
            ? task.completedAt ?? task.archivedAt
            : null;
      if (!timestamp) return false;
      const taskDate = toLocalDateKey(timestamp);
      if (!taskDate) return false;
      return taskDate < todayDateKey;
    },
    [todayDateKey, toLocalDateKey],
  );
  const initialExpiredTaskIds = useMemo(
    () => initialTasks.filter(shouldAutoDeleteTask).map((task) => task.id),
    [initialTasks, shouldAutoDeleteTask],
  );
  const [categoryGroups, setCategoryGroups] =
    useState<CategoryGroup[]>(initialCategoryGroups);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [reflection, setReflection] =
    useState<DailyReflection>(initialReflection);

  const [activeTab, setActiveTab] = useState<ActiveTab>("today");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthLocal);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTasks[0]?.id ?? "",
  );

  // アクティブタスク
  const activeTask =
    tasks.find((t) => t.id === selectedTaskId) ?? tasks[0] ?? null;

  // ===== 今日タブ: TaskGroup 派生計算 =====

  const todayDow = useMemo(() => new Date().getDay(), []);

  const taskGroups = useMemo(
    () => buildTodayTaskGroups(tasks, todayDow, selectedCategoryId),
    [tasks, todayDow, selectedCategoryId],
  );

  useEffect(() => {
    let cancelled = false;
    if (initialExpiredTaskIds.length === 0) return;

    const cleanupExpiredTasks = async () => {
      const deletedTaskIds: string[] = [];

      for (const taskId of initialExpiredTaskIds) {
        const deleted = await dbDeleteTask(taskId);
        if (deleted) deletedTaskIds.push(taskId);
      }

      if (cancelled || deletedTaskIds.length === 0) return;

      const deletedTaskSet = new Set(deletedTaskIds);
      setTasks((prev) => prev.filter((task) => !deletedTaskSet.has(task.id)));
      setSelectedTaskId((prevId) => {
        if (!deletedTaskSet.has(prevId)) return prevId;
        return initialTasks.find((task) => !deletedTaskSet.has(task.id))?.id ?? "";
      });
    };

    void cleanupExpiredTasks();
    return () => {
      cancelled = true;
    };
  }, [initialExpiredTaskIds, initialTasks]);

  // ===== カテゴリ情報（GlobalHeader 用）=====

  let selectedCategory: { group: (typeof categoryGroups)[number]; category: (typeof categoryGroups)[number]["categories"][number] } | null = null;
  if (selectedCategoryId) {
    outer: for (const g of categoryGroups) {
      for (const cat of g.categories) {
        if (cat.id === selectedCategoryId) {
          selectedCategory = { group: g, category: cat };
          break outer;
        }
      }
    }
  }

  // ===== Pane 1: カテゴリ管理 =====

  const addCategoryGroup = useCallback((name: string) => {
    setCategoryGroups((prev) => [
      ...prev,
      { id: `g-${Date.now()}`, name, categories: [] },
    ]);
  }, []);

  const deleteCategoryGroup = useCallback((groupId: string) => {
    setCategoryGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const addCategory = useCallback((groupId: string, categoryName: string) => {
    setCategoryGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              categories: [
                ...g.categories,
                { id: `cat-${Date.now()}`, name: categoryName },
              ],
            }
          : g,
      ),
    );
  }, []);

  const deleteCategory = useCallback((groupId: string, categoryId: string) => {
    setCategoryGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, categories: g.categories.filter((c) => c.id !== categoryId) }
          : g,
      ),
    );
    // 選択中カテゴリが削除された場合は「すべて」に戻す
    setSelectedCategoryId((prev) => (prev === categoryId ? null : prev));
    // transactions の孤児参照を除去
    setTransactions((prev) => prev.filter((tx) => tx.categoryId !== categoryId));
  }, []);

  // ===== 収支トランザクション =====

  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    const newTx: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setTransactions((prev) => [...prev, newTx]);
    dbAddTransaction(newTx);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    dbDeleteTransaction(id);
  }, []);

  // ===== 月ナビ（収支タブ）=====

  const currentMonth = useMemo(() => getCurrentMonthLocal(), []);

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth((m) => shiftMonth(m, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((m) => {
      const next = shiftMonth(m, 1);
      return next > currentMonth ? m : next;
    });
  }, [currentMonth]);

  // ===== タスク操作 =====

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
  }, []);

  const addTask = useCallback(
    (title: string, slot: SlotKey) => {
      const categoryId =
        selectedCategoryId ?? categoryGroups[0]?.categories[0]?.id ?? "";
      const newTask = createMinimalTask(title, categoryId, slot);
      setTasks((prev) => {
        const position = prev.filter((t) => t.slot === slot && !t.archived).length;
        dbAddTask({
          id: newTask.id,
          categoryId,
          slot,
          position,
          title,
          daysOfWeek: newTask.daysOfWeek,
        });
        return [...prev, newTask];
      });
      setSelectedTaskId(newTask.id);
    },
    [selectedCategoryId, categoryGroups],
  );

  const archiveTask = useCallback((id: string) => {
    const archivedAt = new Date().toISOString();
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, archived: true, archivedAt } : t,
      );
      // フォールバック先を最新 prev から探す（stale closure を避ける）
      setSelectedTaskId((prevId) => {
        if (prevId !== id) return prevId;
        const fallback = next.find((t) => t.id !== id && !t.archived);
        return fallback?.id ?? "";
      });
      return next;
    });
    dbArchiveTask(id, archivedAt);
  }, []);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, archived: false, archivedAt: null } : t,
      ),
    );
    dbRestoreTask(id);
  }, []);

  const moveTask = useCallback((id: string, toSlot: SlotKey, toIndex: number) => {
    setTasks((prev) => {
      const subjectIndex = prev.findIndex((t) => t.id === id);
      if (subjectIndex < 0) return prev;
      const subject = prev[subjectIndex];
      if (subject.archived) return prev;

      const without = prev.filter((_, i) => i !== subjectIndex);
      const updated: Task = { ...subject, slot: toSlot };

      let count = 0;
      let absInsertAt = without.length;
      for (let i = 0; i < without.length; i++) {
        const t = without[i];
        if (!t.archived && t.slot === toSlot) {
          if (count === toIndex) {
            absInsertAt = i;
            break;
          }
          count++;
        }
      }
      dbMoveTask(id, toSlot, toIndex);
      return [
        ...without.slice(0, absInsertAt),
        updated,
        ...without.slice(absInsertAt),
      ];
    });
  }, []);

  const completeTask = useCallback((taskId: string) => {
    const completedAt = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, slot: "done" as SlotKey, completedAt } : t,
      ),
    );
    dbCompleteTask(taskId, completedAt);
  }, []);

  const updateReflection = useCallback(
    (field: "item1", value: string) => {
      setReflection((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ===== render =====

  return (
    <SidebarProvider
      defaultOpen={false}
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <CategoryPane
        workspaceName={workspace.name}
        categoryGroups={categoryGroups}
        selectedCategoryId={selectedCategoryId}
        activeTab={activeTab}
        onSelectCategory={setSelectedCategoryId}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        onAddCategoryGroup={addCategoryGroup}
        onDeleteCategoryGroup={deleteCategoryGroup}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          categoryGroupName={selectedCategory?.group.name ?? "すべて"}
          categoryName={selectedCategory?.category.name ?? "すべてのカテゴリ"}
          taskTitle={activeTask?.meta.title ?? ""}
          categoryGroups={categoryGroups}
          onAddCategoryGroup={addCategoryGroup}
          onDeleteCategoryGroup={deleteCategoryGroup}
        />
        <div className="flex min-h-0 flex-1">
          {activeTab === "today" && (
            <TaskListPane
              groups={taskGroups}
              selectedTaskId={selectedTaskId}
              reflection={reflection}
              onSelectTask={selectTask}
              onAddTask={addTask}
              onArchiveTask={archiveTask}
              onRestoreTask={restoreTask}
              onMoveTask={moveTask}
              onCheckTask={completeTask}
              onUpdateReflection={updateReflection}
            />
          )}
          {activeTab === "weekly" && (
            <WeeklyPane
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              selectedCategoryId={selectedCategoryId}
              onSelectTask={selectTask}
            />
          )}
          {activeTab === "finance" && (
            <FinancePane
              transactions={transactions}
              categoryGroups={categoryGroups}
              selectedMonth={selectedMonth}
              currentMonth={currentMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onAddTransaction={addTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
