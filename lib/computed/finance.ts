/**
 * 収支（Transaction）の派生計算 SSoT。
 * CategoryPane の IncomeSummary と FinancePane の両方で共有する。
 */

import { type Transaction, type CategoryGroup } from "@/lib/schema";

// ===== 月文字列ユーティリティ =====

/**
 * ローカルタイムゾーンで今月の "YYYY-MM" 文字列を返す。
 * toISOString() の UTC ずれを避ける。
 */
export function getCurrentMonthLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * "YYYY-MM" の月を N ヶ月進める（負なら戻す）。
 */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * "YYYY-MM" を "YYYY年MM月" に変換する。
 */
export function formatMonthJa(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月`;
}

// ===== 集計型 =====

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
};

export type CategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  income: number;
  expense: number;
  net: number;
  incomeRatio: number; /** 収入合計に対する比率（0〜1） */
};

export type MonthTrendItem = {
  month: string;
  label: string;
  net: number;
  ratio: number; /** 最大 net に対する比率（0〜1）。最大値は 1 */
  isCurrent: boolean;
};

// ===== 計算関数 =====

/**
 * 指定月の収支サマリーを返す。
 */
export function calcMonthSummary(
  transactions: Transaction[],
  month: string,
): MonthSummary {
  const monthTx = transactions.filter((t) => t.month === month);
  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense };
}

/**
 * 指定月のカテゴリ別収支内訳を返す（収入がゼロのカテゴリは除外）。
 * incomeRatio は収入合計に対する比率。
 */
export function calcCategoryBreakdown(
  transactions: Transaction[],
  categoryGroups: CategoryGroup[],
  month: string,
): CategoryBreakdownItem[] {
  const monthTx = transactions.filter((t) => t.month === month);
  const allCategories = categoryGroups.flatMap((g) => g.categories);

  const items = allCategories
    .map((cat) => {
      const catTx = monthTx.filter((t) => t.categoryId === cat.id);
      const income = catTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expense = catTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        income,
        expense,
        net: income - expense,
        incomeRatio: 0,
      };
    })
    .filter((item) => item.income > 0 || item.expense > 0);

  const totalIncome = items.reduce((s, i) => s + i.income, 0);
  return items.map((item) => ({
    ...item,
    incomeRatio: totalIncome > 0 ? item.income / totalIncome : 0,
  }));
}

/**
 * selectedMonth を基準に過去 count ヶ月のトレンドを返す。
 * ratio は各月の net / 最大 net（最大値は 1）。
 * net が全ゼロのときは ratio=0 で返す。
 */
export function calcTrend(
  transactions: Transaction[],
  selectedMonth: string,
  currentMonth: string,
  count = 3,
): MonthTrendItem[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(shiftMonth(selectedMonth, -i));
  }

  const items = months.map((month) => {
    const { net } = calcMonthSummary(transactions, month);
    return {
      month,
      label: formatMonthJa(month),
      net,
      ratio: 0,
      isCurrent: month === currentMonth,
    };
  });

  const maxNet = Math.max(...items.map((i) => i.net), 0);
  return items.map((item) => ({
    ...item,
    ratio: maxNet > 0 ? item.net / maxNet : 0,
  }));
}
