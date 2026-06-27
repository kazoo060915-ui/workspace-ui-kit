"use client";

/**
 * 収支タブのメインペイン。
 * - Hero: 今月の純利益（収入 − 支出）を大きく表示
 * - カテゴリ別内訳（進捗バー）
 * - 月次トレンド（過去3ヶ月）
 * - 明細一覧
 * - 収支追加ダイアログ
 */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp } from "lucide-react";

import { type Transaction, type CategoryGroup } from "@/lib/schema";
import {
  calcMonthSummary,
  calcCategoryBreakdown,
  calcTrend,
  formatMonthJa,
} from "@/lib/computed/finance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type FinancePaneProps = {
  transactions: Transaction[];
  categoryGroups: CategoryGroup[];
  selectedMonth: string;
  currentMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (id: string) => void;
};

export function FinancePane({
  transactions,
  categoryGroups,
  selectedMonth,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onAddTransaction,
  onDeleteTransaction,
}: FinancePaneProps) {
  const summary = useMemo(
    () => calcMonthSummary(transactions, selectedMonth),
    [transactions, selectedMonth],
  );

  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, categoryGroups, selectedMonth),
    [transactions, categoryGroups, selectedMonth],
  );

  const trend = useMemo(
    () => calcTrend(transactions, selectedMonth, currentMonth, 3),
    [transactions, selectedMonth, currentMonth],
  );

  // 今月の明細（新しい順）
  const monthTx = useMemo(
    () =>
      transactions
        .filter((t) => t.month === selectedMonth)
        .slice()
        .reverse(),
    [transactions, selectedMonth],
  );

  const isCurrentMonth = selectedMonth === currentMonth;

  const formatAmount = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      {/* ヘッダー + 月ナビ */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPrevMonth}
            aria-label="前月"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[100px] text-center text-sm font-semibold">
            {formatMonthJa(selectedMonth)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNextMonth}
            disabled={isCurrentMonth}
            aria-label="翌月"
          >
            <ChevronRight />
          </Button>
        </div>
        <AddTransactionDialog
          categoryGroups={categoryGroups}
          selectedMonth={selectedMonth}
          onAdd={onAddTransaction}
        />
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-5">
          {/* === Hero: 純利益 === */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-8">
            <p className="text-xs text-muted-foreground">今月の純利益</p>
            <p
              className={cn(
                "text-5xl font-bold tabular-nums",
                summary.net >= 0 ? "text-income" : "text-expense",
              )}
            >
              {formatAmount(summary.net)}
            </p>
            <div className="mt-3 flex gap-5 text-sm">
              <span className="flex items-center gap-1.5 text-income">
                <span className="size-2 rounded-full bg-income" />
                収入 {formatAmount(summary.income)}
              </span>
              <span className="flex items-center gap-1.5 text-expense">
                <span className="size-2 rounded-full bg-expense" />
                支出 {formatAmount(summary.expense)}
              </span>
            </div>
          </div>

          {/* === 月次トレンド === */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                月次トレンド
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {trend.map((item) => (
                <div
                  key={item.month}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-3",
                    item.isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card",
                  )}
                >
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      item.net >= 0 ? "text-income" : "text-expense",
                    )}
                  >
                    {formatAmount(item.net)}
                  </p>
                  {/* ミニ棒グラフ */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-income transition-all"
                      style={{ width: `${Math.max(item.ratio * 100, 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === カテゴリ別内訳 === */}
          {breakdown.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                カテゴリ別収入
              </p>
              <div className="flex flex-col gap-2">
                {breakdown
                  .filter((b) => b.income > 0)
                  .sort((a, b) => b.income - a.income)
                  .map((item) => (
                    <div key={item.categoryId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground">
                          {item.categoryName}
                        </span>
                        <span className="ml-2 shrink-0 tabular-nums text-income">
                          {formatAmount(item.income)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-income transition-all"
                          style={{
                            width: `${Math.round(item.incomeRatio * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              {breakdown.some((b) => b.expense > 0) && (
                <>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    カテゴリ別支出
                  </p>
                  <div className="flex flex-col gap-2">
                    {breakdown
                      .filter((b) => b.expense > 0)
                      .sort((a, b) => b.expense - a.expense)
                      .map((item) => (
                        <div key={item.categoryId} className="flex items-center justify-between text-xs">
                          <span className="truncate text-foreground">
                            {item.categoryName}
                          </span>
                          <span className="ml-2 shrink-0 tabular-nums text-expense">
                            {formatAmount(item.expense)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          <Separator />

          {/* === 明細一覧 === */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              明細
            </p>
            {monthTx.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                この月の明細はありません。「追加」から記録してください。
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {monthTx.map((tx) => {
                  const cat = categoryGroups
                    .flatMap((g) => g.categories)
                    .find((c) => c.id === tx.categoryId);
                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <Badge
                        variant={tx.type === "income" ? "default" : "destructive"}
                        size="xs"
                        className={cn(
                          "shrink-0",
                          tx.type === "income"
                            ? "bg-income text-income-foreground"
                            : "",
                        )}
                      >
                        {tx.type === "income" ? "収入" : "支出"}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {cat?.name ?? "—"}{tx.memo ? ` · ${tx.memo}` : ""}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-medium tabular-nums",
                          tx.type === "income" ? "text-income" : "text-expense",
                        )}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatAmount(tx.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="この明細を削除"
                        onClick={() => onDeleteTransaction(tx.id)}
                      >
                        <Trash2 />
                      </Button>
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

// ===== 収支追加ダイアログ =====

type AddTransactionDialogProps = {
  categoryGroups: CategoryGroup[];
  selectedMonth: string;
  onAdd: (tx: Omit<Transaction, "id">) => void;
};

function AddTransactionDialog({
  categoryGroups,
  selectedMonth,
  onAdd,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(
    categoryGroups[0]?.categories[0]?.id ?? "",
  );
  const [memo, setMemo] = useState("");
  const [month, setMonth] = useState(selectedMonth);

  const allCategories = categoryGroups.flatMap((g) =>
    g.categories.map((c) => ({ id: c.id, label: `${g.name} / ${c.name}` })),
  );

  const handleAdd = () => {
    const parsed = parseInt(amount, 10);
    if (!parsed || !categoryId) return;
    onAdd({ month, type, amount: parsed, categoryId, memo });
    setAmount("");
    setMemo("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            追加
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>収支を追加</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {/* 種別 */}
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label htmlFor="tx-type">種別</Label>
            <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
              <SelectTrigger id="tx-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">収入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* 金額 */}
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label htmlFor="tx-amount">金額（円）</Label>
            <Input
              id="tx-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 30000"
            />
          </div>
          {/* カテゴリ */}
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label htmlFor="tx-category">カテゴリ</Label>
            <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
              <SelectTrigger id="tx-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 月 */}
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label htmlFor="tx-month">月</Label>
            <Input
              id="tx-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          {/* メモ */}
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label htmlFor="tx-memo">メモ</Label>
            <Input
              id="tx-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="任意"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleAdd}>追加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
