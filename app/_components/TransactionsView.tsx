"use client";

import { useState } from "react";
import {
  addTransaction,
  CURRENCY,
  deleteTransaction,
  formatMoney,
  updateTransaction,
  useStore,
  useToday,
  type Transaction,
  type TransactionType,
} from "../_lib/store";
import { Card, CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, ICONS, monthLabel, position, shiftMonth, StatCard, sum, TYPE_META } from "./shared";
import { Icon } from "./Sidebar";

const TYPES = ["income", "expense", "save"] as const;

export default function TransactionsView() {
  const { transactions } = useStore();
  const today = useToday();
  const [filter, setFilter] = useState<TransactionType | "all">("all");

  if (!today) return <div className="h-96" />;

  const month = today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const now = position(transactions, month);
  const before = position(transactions, prevMonth);
  const expenses = sum(transactions.filter((t) => t.date.startsWith(month)), "expense");
  const prevExpenses = sum(transactions.filter((t) => t.date.startsWith(prevMonth)), "expense");
  const shown = transactions.filter((t) => filter === "all" || t.type === filter);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-[28px] font-medium tracking-tight">Transactions</h1>
        <p className="text-[15px] text-muted">Add money in, money out, and savings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard hero label="Balance" icon={ICONS.wallet} value={now.balance} prev={before.balance} goodWhenUp footer="Available cash" />
        <StatCard label="Expenses" valueClass="text-down" icon={ICONS.expenses} value={expenses} prev={prevExpenses} footer={monthLabel(month)} />
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
      </div>

      <TransactionsTable
        title="All transactions"
        transactions={shown}
        today={today}
        actions={
          <div className="flex gap-1 rounded-xl bg-panel p-1 text-sm">
            {(["all", ...TYPES] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 ${filter === f ? "bg-white font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted hover:text-ink"}`}
              >
                {f === "all" ? "All" : TYPE_META[f].label}
              </button>
            ))}
          </div>
        }
      />

      {/* Composer: always reachable at the bottom; new entries appear at the top of the table. */}
      <div className="sticky bottom-0 z-10 -mx-1 bg-gradient-to-t from-panel via-panel to-transparent px-1 pb-4 pt-6 md:-mb-7 md:pb-6">
        <AddForm today={today} balance={now.balance} />
      </div>
    </div>
  );
}

function AddForm({ today, balance }: { today: string; balance: number }) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [added, setAdded] = useState<string | null>(null);

  const meta = TYPE_META[type];
  const value = Number(amount);
  const valid = value > 0;
  const exceedsBalance = type !== "income" && valid && value > balance;

  return (
    <Card className="shadow-[0_-8px_30px_-12px_rgb(15_60_55/0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px]">Add Transaction</h2>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-panel p-1">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory(CATEGORIES[t][0]);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                type === t ? `bg-white font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)] ${TYPE_META[t].text}` : "text-muted hover:text-ink"
              }`}
            >
              <Icon d={TYPE_META[t].icon} className="h-4 w-4" />
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      <form
        className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          addTransaction({ type, amount: value, category, date: today, note: note.trim() });
          setAdded(`${meta.sign}${formatMoney(value)} ${type === "save" ? "saved" : "added"}`);
          setTimeout(() => setAdded(null), 2500);
          setAmount("");
          setNote("");
        }}
      >
        <div>
          {/* Amount */}
          <div className="flex items-baseline gap-2 border-b border-line pb-2 focus-within:border-brand-500">
            <span className={`text-2xl ${meta.text}`}>{meta.sign}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              placeholder="0.00"
              aria-label="Amount"
              className="w-full min-w-0 bg-transparent text-[36px] leading-tight tracking-tight tabular-nums outline-none placeholder:text-[#c5cfcf] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-muted">{CURRENCY}</span>
          </div>
          {/* Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            type="text"
            placeholder="Add a note"
            aria-label="Note"
            className="mt-2 w-full bg-transparent py-1 text-[15px] outline-none placeholder:text-muted"
          />
          {exceedsBalance && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#b7791f]">
              <Icon d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" className="h-3.5 w-3.5" />
              More than your balance ({formatMoney(balance)})
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex h-12 gap-2">
            <CategoryMenu type={type} value={category} onChange={setCategory} />
            <button
              disabled={!valid}
              className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-[#b9c7c5]"
            >
              <Icon d={ICONS.plus} className="h-4 w-4" />
              {type === "save" ? "Save" : "Add"}
            </button>
          </div>
          <p className={`h-4 text-right text-xs text-brand-800 transition-opacity ${added ? "opacity-100" : "opacity-0"}`}>✓ {added}</p>
        </div>
      </form>
    </Card>
  );
}

function CategoryMenu({ type, value, onChange }: { type: TransactionType; value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-full items-center gap-2 rounded-xl bg-white px-3 text-sm ring-1 ring-line hover:ring-brand-500"
      >
        <CategoryBadge category={value} />
        <span className="max-w-28 truncate">{value}</span>
        <Icon d="M6 9l6 6 6-6" className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="absolute bottom-full right-0 z-20 mb-2 w-52 rounded-xl bg-white p-1.5 shadow-[0_12px_32px_-8px_rgb(15_60_55/0.3)] ring-1 ring-black/5 md:left-0 md:right-auto"
          >
            {CATEGORIES[type].map((c) => {
              const selected = c === value;
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${selected ? "bg-brand-50 font-medium" : "hover:bg-panel"}`}
                  >
                    <CategoryBadge category={c} />
                    <span className="flex-1 text-left">{c}</span>
                    {selected && <Icon d="M5 12l5 5L20 7" className="h-4 w-4 text-brand-800" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function CategoryBadge({ category, size = "h-7 w-7" }: { category: string; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg text-white`} style={{ background: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other }}>
      <Icon d={CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Other} className="h-4 w-4" />
    </span>
  );
}

function dayLabel(date: string, today: string) {
  const d = new Date(date + "T00:00");
  const diff = Math.round((new Date(today + "T00:00").getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() === Number(today.slice(0, 4)) ? undefined : "numeric" });
}

export function TransactionsTable({
  title,
  transactions,
  today,
  actions,
}: {
  title: string;
  transactions: Transaction[];
  today: string;
  actions?: React.ReactNode;
}) {
  const rows = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px]">{title}</h2>
        {actions}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-panel/70 text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Note</th>
              <th className="px-4 py-3 font-normal">Category</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 text-right font-normal">Amount</th>
              <th className="w-24 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const meta = TYPE_META[t.type];
                if (editing === t.id) return <EditRow key={t.id} t={t} onDone={() => setEditing(null)} />;
                return (
                  <tr key={t.id} className="group text-[15px] hover:bg-white">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">{dayLabel(t.date, today)}</td>
                    <td className="max-w-64 truncate px-4 py-3">{t.note || <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <CategoryBadge category={t.category} />
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.text} bg-current/10`}>
                        <Icon d={meta.icon} className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${meta.text}`}>
                      {meta.sign}
                      {formatMoney(t.amount)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <span className="inline-flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <button
                          onClick={() => setEditing(t.id)}
                          className="rounded-lg p-1.5 text-muted hover:bg-panel hover:text-brand-800"
                          aria-label="Edit transaction"
                        >
                          <Icon d={ICONS.edit} className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="rounded-lg p-1.5 text-muted hover:bg-panel hover:text-down"
                          aria-label="Delete transaction"
                        >
                          <Icon d={ICONS.trash} className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
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

function EditRow({ t, onDone }: { t: Transaction; onDone: () => void }) {
  const [type, setType] = useState(t.type);
  const [date, setDate] = useState(t.date);
  const [note, setNote] = useState(t.note);
  const [category, setCategory] = useState(t.category);
  const [amount, setAmount] = useState(String(t.amount));
  const valid = Number(amount) > 0 && date;
  const field = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  const save = () => {
    if (!valid) return;
    updateTransaction(t.id, { type, date, note: note.trim(), category, amount: Number(amount) });
    onDone();
  };

  return (
    <tr
      className="bg-brand-50/60"
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") onDone();
      }}
    >
      <td className="px-3 py-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} w-36`} aria-label="Date" />
      </td>
      <td className="px-3 py-2">
        <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={field} aria-label="Note" />
      </td>
      <td className="px-3 py-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field} aria-label="Category">
          {[...new Set([...CATEGORIES[type], category])].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={type}
          onChange={(e) => {
            const next = e.target.value as TransactionType;
            setType(next);
            if (!CATEGORIES[next].includes(category)) setCategory(CATEGORIES[next][0]);
          }}
          className={field}
          aria-label="Type"
        >
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {TYPE_META[x].label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${field} w-28 text-right tabular-nums`}
          aria-label="Amount"
        />
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right">
        <button onClick={save} disabled={!valid} className="rounded-lg p-1.5 text-brand-800 hover:bg-white disabled:opacity-40" aria-label="Save">
          <Icon d="M5 12l5 5L20 7" className="h-4 w-4" />
        </button>
        <button onClick={onDone} className="rounded-lg p-1.5 text-muted hover:bg-white" aria-label="Cancel">
          <Icon d="M6 6l12 12M18 6L6 18" className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
