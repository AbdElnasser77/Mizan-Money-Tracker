"use client";

import Link from "next/link";
import { useState } from "react";
import { CURRENCY, formatMoney, setBudget, useStore, useToday, type Transaction } from "../_lib/store";
import { Card, CATEGORY_COLORS, compact, ICONS, inputCls, monthLabel, position, shiftMonth, StatCard, sum } from "./shared";
import { Icon } from "./Sidebar";
import { TransactionsTable } from "./TransactionsView";

export default function Dashboard() {
  const { transactions, budgets } = useStore();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);

  if (!today) return <div className="h-96" />;

  const month = picked ?? today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const selectMonth = (m: string) => {
    setPicked(m);
    setEditingBudget(false);
  };

  const monthTx = transactions.filter((t) => t.date.startsWith(month));
  const prevTx = transactions.filter((t) => t.date.startsWith(prevMonth));
  const income = sum(monthTx, "income");
  const expenses = sum(monthTx, "expense");
  const now = position(transactions, month);
  const before = position(transactions, prevMonth);

  const byCategory = Object.entries(
    monthTx
      .filter((t) => t.type === "expense")
      .reduce<Record<string, { spent: number; count: number }>>((acc, t) => {
        acc[t.category] ??= { spent: 0, count: 0 };
        acc[t.category].spent += t.amount;
        acc[t.category].count += 1;
        return acc;
      }, {}),
  ).sort((a, b) => b[1].spent - a[1].spent);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">Overview</h1>
          <p className="text-[15px] text-muted">Track and optimize your spending</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-card p-1 ring-1 ring-black/[0.03]">
            <button onClick={() => selectMonth(shiftMonth(month, -1))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label="Previous month">
              <Icon d="M15 6l-6 6 6 6" className="h-4 w-4" />
            </button>
            <span className="flex min-w-36 items-center justify-center gap-2 text-sm font-medium">
              <Icon d={ICONS.calendar} className="h-4 w-4 text-muted" />
              {monthLabel(month)}
            </span>
            <button onClick={() => selectMonth(shiftMonth(month, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label="Next month">
              <Icon d="M9 6l6 6-6 6" className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/transactions"
            className="flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.12)] hover:bg-brand-900"
          >
            <Icon d={ICONS.plus} className="h-4 w-4" />
            Add Money
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hero
          label="Balance"
          icon={ICONS.wallet}
          value={now.balance}
          prev={before.balance}
          goodWhenUp
          footer={<>Available cash at end of {monthLabel(month, "short")}</>}
        />
        <StatCard
          label="Net Worth"
          icon={ICONS.networth}
          value={now.netWorth}
          prev={before.netWorth}
          goodWhenUp
          footer={
            <>
              <span className="text-save">{formatMoney(now.saved)}</span> saved · {formatMoney(now.balance)} cash
            </>
          }
        />
        <StatCard label="Income" icon={ICONS.incomes} value={income} prev={sum(prevTx, "income")} goodWhenUp />
        <StatCard label="Expenses" icon={ICONS.expenses} value={expenses} prev={sum(prevTx, "expense")} />
      </div>

      <SpendingFlow month={month} transactions={transactions} budgets={budgets} onSelect={selectMonth} />

      <div className="grid gap-5 lg:grid-cols-3">
        <BudgetCard
          month={month}
          budget={budgets[month] ?? 0}
          spent={expenses}
          categories={byCategory}
          editing={editingBudget}
          setEditing={setEditingBudget}
        />
        <div className="lg:col-span-2">
          <Breakdown month={month} categories={byCategory} total={expenses} />
        </div>
      </div>

      <TransactionsTable
        title={`Transactions · ${monthLabel(month)}`}
        transactions={monthTx}
        today={today}
        actions={
          <Link href="/transactions" className="flex items-center gap-1 text-sm font-medium text-brand-800 hover:underline">
            Add / view all
            <Icon d="M9 6l6 6-6 6" className="h-4 w-4" />
          </Link>
        }
      />
    </div>
  );
}


function BudgetCard({
  month,
  budget,
  spent,
  categories,
  editing,
  setEditing,
}: {
  month: string;
  budget: number;
  spent: number;
  categories: [string, { spent: number }][];
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const scale = Math.max(budget, spent) || 1;
  const remaining = budget - spent;
  const over = budget > 0 && remaining < 0;
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px]">Monthly Budget</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-ink ring-1 ring-black/5 hover:bg-brand-50">
            {budget > 0 ? "Edit" : "Set budget"}
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(new FormData(e.currentTarget).get("budget"));
            if (value >= 0) setBudget(month, value);
            setEditing(false);
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">{CURRENCY}</span>
            <input name="budget" type="number" min="0" step="0.01" defaultValue={budget || ""} autoFocus placeholder="0.00" className={`${inputCls} pl-12`} />
          </div>
          <button className="rounded-xl bg-brand-800 px-4 text-sm font-medium text-white hover:bg-brand-900">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-3 text-sm text-muted hover:bg-white">
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-[32px] font-normal leading-none tracking-tight tabular-nums">{formatMoney(spent)}</p>
            <p className="mt-2 text-sm text-muted">
              {budget > 0 ? (
                <>
                  used from {formatMoney(budget)} ·{" "}
                  <span className={over ? "text-down" : "text-up"}>
                    {over ? `${formatMoney(-remaining)} over` : `${formatMoney(remaining)} left`}
                  </span>
                </>
              ) : (
                "No budget set for this month"
              )}
            </p>
          </div>
          <div>
            <div className="flex h-4 gap-1">
              {categories.map(([cat, { spent: s }]) => (
                <div
                  key={cat}
                  title={`${cat}: ${formatMoney(s)}`}
                  className="h-full min-w-1.5 rounded-md"
                  style={{ width: `${(s / scale) * 100}%`, background: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other }}
                />
              ))}
              {budget > spent && <div className="h-full flex-1 rounded-md bg-[#dfe6e6]" />}
            </div>
            {budget > 0 && <p className={`mt-2 text-right text-xs ${over ? "text-down" : "text-muted"}`}>{pct}% used</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

function SpendingFlow({
  month,
  transactions,
  budgets,
  onSelect,
}: {
  month: string;
  transactions: Transaction[];
  budgets: Record<string, number>;
  onSelect: (m: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const year = month.slice(0, 4);

  const data = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Date(Number(year), i, 1).toLocaleDateString("en-US", { month: "short" }),
      budget: budgets[key] ?? 0,
      spent: sum(
        transactions.filter((t) => t.date.startsWith(key)),
        "expense",
      ),
    };
  });

  const peak = Math.max(...data.flatMap((d) => [d.budget, d.spent])) || 1000;
  const raw = peak / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.ceil(raw / pow) * pow;
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);
  const focus = hovered ?? month;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px]">Budget Spending Flow</h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-800" /> Spent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#d9706a]" /> Over budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 border-t-2 border-dashed border-ink/60" /> Budget
          </span>
          <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-black/5">
            <Icon d={ICONS.calendar} className="h-4 w-4" />
            {year}
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-[640px] gap-3">
          {/* Y axis */}
          <div className="flex h-64 flex-col justify-between pb-0 text-right text-xs text-muted">
            {ticks.map((t) => (
              <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {compact(t)}
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            {/* Grid lines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-64 flex-col justify-between">
              {ticks.map((t) => (
                <div key={t} className="border-t border-line" />
              ))}
            </div>

            <div className="relative flex h-64 items-end">
              {data.map((d, i) => {
                const selected = d.key === month;
                const active = selected || d.key === hovered;
                const over = d.budget > 0 && d.spent > d.budget;
                const showTip = d.key === focus && (d.budget > 0 || d.spent > 0);
                const tallest = (Math.max(d.budget, d.spent) / top) * 100;
                const barColor = over
                  ? active ? "bg-[#d9706a]" : "hatch bg-[#efcdc9]"
                  : active ? (selected ? "bg-brand-800" : "bg-brand-700/80") : "hatch bg-[#cfdcda]";
                return (
                  <button
                    key={d.key}
                    onClick={() => onSelect(d.key)}
                    onMouseEnter={() => setHovered(d.key)}
                    onMouseLeave={() => setHovered(null)}
                    className="relative flex h-full flex-1 items-end justify-center px-1.5"
                    aria-label={`${d.label}: budget ${formatMoney(d.budget)}, spent ${formatMoney(d.spent)}`}
                  >
                    <span
                      className={`relative w-full max-w-11 rounded-t-lg transition-all ${barColor}`}
                      style={{ height: `${(d.spent / top) * 100}%` }}
                    />
                    {d.budget > 0 && (
                      <span
                        className={`pointer-events-none absolute left-1/2 w-[calc(100%-4px)] max-w-14 -translate-x-1/2 border-t-2 border-dashed ${
                          selected ? "border-ink/70" : "border-ink/25"
                        }`}
                        style={{ bottom: `${(d.budget / top) * 100}%` }}
                      />
                    )}
                    {showTip && (
                      <span
                        className={`pointer-events-none absolute z-10 block w-44 rounded-xl bg-white p-3 text-left shadow-[0_8px_24px_-8px_rgb(15_60_55/0.25)] ring-1 ring-black/5 ${
                          i > 8 ? "right-1/2" : i < 2 ? "left-1/2" : "left-1/2 -translate-x-1/2"
                        }`}
                        style={{ bottom: `calc(${Math.min(tallest, 70)}% + 10px)` }}
                      >
                        <span className="block text-sm font-medium">{monthLabel(d.key)}</span>
                        <span className="mt-2 block space-y-1 text-xs">
                          <span className="flex items-center justify-between gap-2 text-muted">
                            <span className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${over ? "bg-[#d9706a]" : "bg-brand-800"}`} /> Spent
                            </span>
                            <span className="font-medium text-ink tabular-nums">{formatMoney(d.spent)}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2 text-muted">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 border-t-2 border-dashed border-ink/60" /> Budget
                            </span>
                            <span className="font-medium text-ink tabular-nums">{d.budget > 0 ? formatMoney(d.budget) : "—"}</span>
                          </span>
                          {d.budget > 0 && (
                            <span className={`block pt-1 text-right ${over ? "text-down" : "text-up"}`}>
                              {over ? `${formatMoney(d.spent - d.budget)} over` : `${formatMoney(d.budget - d.spent)} left`}
                            </span>
                          )}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex">
              {data.map((d) => (
                <span key={d.key} className={`flex-1 text-center text-sm ${d.key === month ? "font-semibold text-ink" : "text-muted"}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Breakdown({ month, categories, total }: { month: string; categories: [string, { spent: number; count: number }][]; total: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px]">Spending Breakdown</h2>
        <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-black/5">
          <Icon d={ICONS.calendar} className="h-4 w-4" />
          {monthLabel(month, "short")}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-panel/70 text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">Category</th>
              <th className="px-4 py-3 font-normal">Transactions</th>
              <th className="px-4 py-3 font-normal">Spent</th>
              <th className="w-2/5 px-4 py-3 font-normal">Share of spending</th>
              <th className="px-4 py-3 text-right font-normal">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No expenses this month.
                </td>
              </tr>
            ) : (
              categories.map(([cat, { spent, count }]) => {
                const pct = total > 0 ? (spent / total) * 100 : 0;
                return (
                  <tr key={cat} className="text-[15px]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="h-5 w-5 rounded-md" style={{ background: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other }} />
                        {cat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{count}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatMoney(spent)}</td>
                    <td className="px-4 py-3">
                      <div className="h-2.5 rounded-full bg-[#e3eaea]">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-800 to-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-brand-800 tabular-nums">{Math.round(pct)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
