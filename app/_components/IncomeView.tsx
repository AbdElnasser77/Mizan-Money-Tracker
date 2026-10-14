"use client";

import { useState } from "react";
import {
  CURRENCY,
  deleteSource,
  formatMoney,
  markPaid,
  paymentKey,
  saveSource,
  unmarkPaid,
  useStore,
  useToday,
  type IncomeSource,
} from "../_lib/store";
import { Card, CATEGORIES, ICONS, inputCls, monthLabel, shiftMonth } from "./shared";
import { Icon } from "./Sidebar";
import { CategoryBadge } from "./TransactionsView";

/* ---------- Schedule math ---------- */

const DAY = 86_400_000;
const toDays = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
const fromDays = (days: number) => new Date(days * DAY).toISOString().slice(0, 10);
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Due dates (YYYY-MM-DD) of a source that fall inside the given month (YYYY-MM). */
function dueDatesInMonth(src: IncomeSource, month: string): string[] {
  return rawDueDates(src, month).filter((d) => !src.end || d <= src.end);
}

function rawDueDates(src: IncomeSource, month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const [sy, sm, sd] = src.start.split("-").map(Number);
  const every = Math.max(1, src.every);

  if (src.unit === "once") return src.start.startsWith(month) ? [src.start] : [];

  if (src.unit === "month") {
    const diff = y * 12 + m - (sy * 12 + sm);
    if (diff < 0 || diff % every !== 0) return [];
    const day = Math.min(sd, daysInMonth(y, m));
    return [`${month}-${String(day).padStart(2, "0")}`];
  }

  const step = every * (src.unit === "week" ? 7 : 1);
  const start = toDays(src.start);
  const first = toDays(`${month}-01`);
  const last = toDays(`${month}-${daysInMonth(y, m)}`);
  const dates: string[] = [];
  for (let d = start + Math.max(0, Math.ceil((first - start) / step)) * step; d <= last; d += step) dates.push(fromDays(d));
  return dates;
}

const ordinal = (n: number) => n + (["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th");
const weekday = (date: string) => new Date(date + "T00:00").toLocaleDateString("en-US", { weekday: "long" });
const shortDate = (date: string) => new Date(date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

function scheduleText(src: IncomeSource) {
  const base = baseSchedule(src);
  return src.end && src.unit !== "once" ? `${base} until ${shortDate(src.end)}` : base;
}

function baseSchedule(src: IncomeSource) {
  const n = Math.max(1, src.every);
  switch (src.unit) {
    case "once":
      return `Once on ${shortDate(src.start)}`;
    case "month":
      return `${n === 1 ? "Monthly" : `Every ${n} months`} on the ${ordinal(Number(src.start.slice(8)))}`;
    case "week":
      return `${n === 1 ? "Weekly" : `Every ${n} weeks`} on ${weekday(src.start)}`;
    case "day":
      return n === 1 ? "Daily" : `Every ${n} days`;
  }
}

/* ---------- Page ---------- */

type Occurrence = { src: IncomeSource; due: string; paidAmount: number | null };

export default function IncomeView() {
  const { sources, paid, transactions } = useStore();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState<IncomeSource | "new" | null>(null);

  if (!today) return <div className="h-96" />;

  const month = picked ?? today.slice(0, 7);
  const txById = new Map(transactions.map((t) => [t.id, t]));

  const occurrences: Occurrence[] = sources
    .flatMap((src) =>
      dueDatesInMonth(src, month).map((due) => {
        const tx = txById.get(paid[paymentKey(src.id, due)] ?? "");
        return { src, due, paidAmount: tx ? tx.amount : null };
      }),
    )
    .sort((a, b) => a.due.localeCompare(b.due));

  const received = occurrences.reduce((s, o) => s + (o.paidAmount ?? 0), 0);
  const pendingList = occurrences.filter((o) => o.paidAmount === null);
  const pending = pendingList.reduce((s, o) => s + o.src.amount, 0);
  const unknown = pendingList.filter((o) => o.src.amount === 0).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">Salaries & Income</h1>
          <p className="text-[15px] text-muted">Track expected income and mark it paid when it arrives</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-card p-1 ring-1 ring-black/[0.03]">
            <button onClick={() => setPicked(shiftMonth(month, -1))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label="Previous month">
              <Icon d="M15 6l-6 6 6 6" className="h-4 w-4" />
            </button>
            <span className="flex min-w-36 items-center justify-center gap-2 text-sm font-medium">
              <Icon d={ICONS.calendar} className="h-4 w-4 text-muted" />
              {monthLabel(month)}
            </span>
            <button onClick={() => setPicked(shiftMonth(month, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label="Next month">
              <Icon d="M9 6l6 6-6 6" className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.12)] hover:bg-brand-900"
          >
            <Icon d={ICONS.plus} className="h-4 w-4" />
            Add Income
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Expected" value={received + pending} note={`${occurrences.length} payment${occurrences.length === 1 ? "" : "s"} this month`} />
        <Summary label="Received" value={received} note={`${occurrences.length - pendingList.length} paid`} tone="text-up" hero />
        <Summary
          label="Pending"
          value={pending}
          note={unknown ? `+ ${unknown} with varying amount` : `${pendingList.length} waiting`}
          tone={pendingList.length ? "text-[#b7791f]" : undefined}
        />
      </div>

      {/* This month's payments */}
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-[17px]">Payments · {monthLabel(month)}</h2>
          {occurrences.length > 0 && (
            <span className="text-sm text-muted">
              {occurrences.length - pendingList.length}/{occurrences.length} paid
            </span>
          )}
        </div>
        {occurrences.length === 0 ? (
          <Empty onAdd={() => setEditing("new")} hasSources={sources.length > 0} />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {occurrences.map((o) => (
              <PaymentRow key={paymentKey(o.src.id, o.due)} occ={o} today={today} />
            ))}
          </ul>
        )}
      </Card>

      {/* Sources */}
      {sources.length > 0 && (
        <Card>
          <h2 className="text-[17px]">Income Sources</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((src) => (
              <div key={src.id} className="rounded-xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-start gap-3">
                  <CategoryBadge category={src.category} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{src.name}</p>
                    <p className="text-xs text-muted">{scheduleText(src)}</p>
                  </div>
                  <KindPill kind={src.kind} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg tabular-nums">
                    {src.kind === "varies" ? (src.amount ? `~${formatMoney(src.amount)}` : <span className="text-sm text-muted">Amount varies</span>) : formatMoney(src.amount)}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(src)} className="rounded-lg px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50">
                      Edit
                    </button>
                    <button
                      onClick={() => confirm(`Delete "${src.name}"? Income already recorded stays in your transactions.`) && deleteSource(src.id)}
                      className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-[#fdecea] hover:text-down"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {editing && <SourceDialog source={editing === "new" ? null : editing} today={today} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Summary({ label, value, note, tone, hero }: { label: string; value: number; note: string; tone?: string; hero?: boolean }) {
  return (
    <section
      className={`rounded-2xl p-5 ${hero ? "bg-brand-800 text-white shadow-[0_12px_30px_-12px_rgb(12_95_85/0.6)]" : "bg-card ring-1 ring-black/[0.03]"}`}
    >
      <p className={`text-[17px] ${hero ? "" : ""}`}>{label}</p>
      <p className={`mt-3 text-[28px] leading-none tracking-tight tabular-nums ${hero ? "" : tone ?? ""}`}>{formatMoney(value)}</p>
      <p className={`mt-3 text-sm ${hero ? "text-white/70" : "text-muted"}`}>{note}</p>
    </section>
  );
}

function KindPill({ kind }: { kind: IncomeSource["kind"] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${kind === "fixed" ? "bg-brand-50 text-brand-800" : "bg-[#fdf3e3] text-[#b7791f]"}`}
    >
      {kind === "fixed" ? "Fixed" : "Varies"}
    </span>
  );
}

function Empty({ onAdd, hasSources }: { onAdd: () => void; hasSources: boolean }) {
  return (
    <div className="mx-5 mb-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
      {hasSources ? "No payments expected this month." : "Add your salary or any regular income to start tracking it."}
      {!hasSources && (
        <button onClick={onAdd} className="rounded-xl bg-brand-800 px-4 py-2 font-medium text-white hover:bg-brand-900">
          Add your first income
        </button>
      )}
    </div>
  );
}

function PaymentRow({ occ, today }: { occ: Occurrence; today: string }) {
  const { src, due, paidAmount } = occ;
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState(src.amount ? String(src.amount) : "");

  const isPaid = paidAmount !== null;
  const status = isPaid ? "paid" : due < today ? "overdue" : due === today ? "today" : "upcoming";
  const statusStyle = {
    paid: "bg-brand-50 text-brand-800",
    overdue: "bg-[#fdecea] text-down",
    today: "bg-[#fdf3e3] text-[#b7791f]",
    upcoming: "bg-panel text-muted",
  }[status];
  const statusText = { paid: "Paid", overdue: "Overdue", today: "Due today", upcoming: "Upcoming" }[status];

  // Income paid for an earlier month is dated on its due date; otherwise it lands today.
  const recordDate = due.slice(0, 7) < today.slice(0, 7) ? due : today;

  const pay = (value: number) => {
    if (!(value > 0)) return;
    markPaid(src, due, value, recordDate);
    setConfirming(false);
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <div className="w-14 shrink-0 text-center">
        <p className="text-xs uppercase text-muted">{new Date(due + "T00:00").toLocaleDateString("en-US", { month: "short" })}</p>
        <p className="text-xl leading-tight">{Number(due.slice(8))}</p>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryBadge category={src.category} size="h-9 w-9" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-[15px] font-medium">
            {src.name}
            <KindPill kind={src.kind} />
          </p>
          <p className="truncate text-xs text-muted">{scheduleText(src)}</p>
        </div>
      </div>

      <p className={`w-36 text-right text-[15px] tabular-nums ${isPaid ? "font-medium text-up" : ""}`}>
        {isPaid ? `+${formatMoney(paidAmount)}` : src.amount ? `${src.kind === "varies" ? "~" : ""}${formatMoney(src.amount)}` : <span className="text-muted">Varies</span>}
      </p>

      <span className={`w-24 rounded-full px-2.5 py-1 text-center text-xs font-medium ${statusStyle}`}>{statusText}</span>

      <div className="flex w-full justify-end sm:w-auto">
        {isPaid ? (
          <button onClick={() => unmarkPaid(src.id, due)} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-panel hover:text-ink">
            <Icon d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" className="h-4 w-4" />
            Undo
          </button>
        ) : confirming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              pay(Number(amount));
            }}
          >
            <div className="relative">
              <input
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount received"
                className={`${inputCls} h-9 w-40 py-1 pr-11`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{CURRENCY}</span>
            </div>
            <button className="h-9 rounded-xl bg-brand-800 px-3 text-sm font-medium text-white hover:bg-brand-900">Save</button>
            <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-xl px-2 text-sm text-muted hover:bg-panel" aria-label="Cancel">
              <Icon d="M6 6l12 12M18 6L6 18" className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => (src.kind === "fixed" ? pay(src.amount) : setConfirming(true))}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-800 px-4 text-sm font-medium text-white hover:bg-brand-900"
          >
            <Icon d="M5 12l5 5L20 7" className="h-4 w-4" />
            Mark paid
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------- Add / edit dialog ---------- */

type Frequency = "monthly" | "weekly" | "biweekly" | "once";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "once", label: "One time" },
];

function frequencyOf(src: IncomeSource | null): Frequency {
  if (!src || src.unit === "month") return "monthly";
  if (src.unit === "once") return "once";
  if (src.unit === "week") return src.every === 2 ? "biweekly" : "weekly";
  return "monthly";
}

function SourceDialog({ source, today, onClose }: { source: IncomeSource | null; today: string; onClose: () => void }) {
  const [name, setName] = useState(source?.name ?? "");
  const [category, setCategory] = useState(source?.category ?? "Salary");
  const [kind, setKind] = useState<IncomeSource["kind"]>(source?.kind ?? "fixed");
  const [amount, setAmount] = useState(source?.amount ? String(source.amount) : "");
  const [freq, setFreq] = useState<Frequency>(frequencyOf(source));
  const [payDay, setPayDay] = useState(source?.unit === "month" ? Number(source.start.slice(8)) : Number(today.slice(8)));
  const [date, setDate] = useState(source && source.unit !== "month" ? source.start : today);
  const [end, setEnd] = useState(source?.end ?? "");

  const value = Number(amount);
  const valid = name.trim() !== "" && (kind === "varies" || value > 0) && (freq === "monthly" || date !== "");

  const build = (): Omit<IncomeSource, "id"> & { id?: string } => {
    // Monthly sources start in the month they were created (or keep their original month when edited).
    const anchor = source?.unit === "month" ? source.start.slice(0, 7) : today.slice(0, 7);
    return {
      id: source?.id,
      name: name.trim(),
      category,
      kind,
      amount: value > 0 ? value : 0,
      unit: freq === "monthly" ? "month" : freq === "once" ? "once" : "week",
      every: freq === "biweekly" ? 2 : 1,
      start: freq === "monthly" ? `${anchor}-${String(payDay).padStart(2, "0")}` : date,
      end: freq !== "once" && end ? end : undefined,
      active: true,
    };
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/30 p-4" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          saveSource(build());
          onClose();
        }}
        className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-[0_24px_60px_-20px_rgb(15_60_55/0.45)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">{source ? "Edit income" : "New income"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-panel" aria-label="Close">
            <Icon d="M6 6l12 12M18 6L6 18" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Name + category */}
          <div>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Company salary" className={inputCls} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.income.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2.5 text-xs transition-all ${
                    category === c ? "bg-white ring-2 ring-brand-500" : "text-muted ring-1 ring-line hover:bg-white"
                  }`}
                >
                  <CategoryBadge category={c} size="h-5 w-5" />
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <span className="mb-1.5 block text-xs text-muted">Amount</span>
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: "fixed", label: "Fixed", hint: "Same amount every time" },
                { value: "varies", label: "Varies", hint: "Different each time" },
              ]}
            />
            {kind === "fixed" ? (
              <div className="relative mt-2">
                <input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${inputCls} pr-12 text-lg`} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{CURRENCY}</span>
              </div>
            ) : (
              <div className="mt-2 rounded-xl bg-[#fdf3e3] p-3">
                <p className="flex items-start gap-2 text-sm text-[#8a5a14]">
                  <Icon d="M12 8v4M12 16h.01M12 21a9 9 0 100-18 9 9 0 000 18z" className="mt-0.5 h-4 w-4 shrink-0" />
                  No fixed amount. When you mark it paid, you type how much you actually got.
                </p>
                <div className="relative mt-2">
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Usually about… (optional)" className={`${inputCls} pr-12`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{CURRENCY}</span>
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <span className="mb-1.5 block text-xs text-muted">When do you get it?</span>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-panel p-1">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFreq(f.value)}
                  className={`rounded-lg px-1 py-2 text-xs transition-all sm:text-sm ${
                    freq === f.value ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {freq === "monthly" ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Pay day</span>
                  <select value={payDay} onChange={(e) => setPayDay(Number(e.target.value))} className={inputCls}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {ordinal(d)} of the month
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">{freq === "once" ? "Date" : "Next pay date"}</span>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </label>
              )}
              {freq !== "once" && (
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-xs text-muted">
                    Ends <span>(optional)</span>
                  </span>
                  <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-brand-800">→ {scheduleText({ ...build(), id: "" })}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:bg-panel">
            Cancel
          </button>
          <button
            disabled={!valid}
            className="rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-[#b9c7c5]"
          >
            {source ? "Save changes" : "Add income"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-left transition-all ${value === o.value ? "bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "hover:bg-white/50"}`}
        >
          <span className={`block text-sm ${value === o.value ? "font-medium text-ink" : "text-muted"}`}>{o.label}</span>
          <span className="block text-[11px] text-muted">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}
