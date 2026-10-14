"use client";

import { useSyncExternalStore } from "react";

export type TransactionType = "income" | "expense" | "save";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
};

export type RepeatUnit = "once" | "day" | "week" | "month";

export type IncomeSource = {
  id: string;
  name: string;
  category: string;
  kind: "fixed" | "varies";
  amount: number; // fixed amount, or expected amount (0 = unknown) when it varies
  every: number; // repeat interval, ignored when unit is "once"
  unit: RepeatUnit;
  start: string; // first pay date, YYYY-MM-DD
  end?: string; // last possible pay date, YYYY-MM-DD
  active: boolean; // legacy; no longer used
};

type State = {
  transactions: Transaction[];
  budgets: Record<string, number>; // keyed by YYYY-MM
  sources: IncomeSource[];
  paid: Record<string, string>; // `${sourceId}:${dueDate}` → income transaction id
};

const KEY = "mizan:v1";
const EMPTY: State = { transactions: [], budgets: {}, sources: [], paid: {} };

let cache: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function write(next: State) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addTransaction(t: Omit<Transaction, "id">) {
  const s = read();
  write({ ...s, transactions: [{ ...t, id: crypto.randomUUID() }, ...s.transactions] });
}

export function updateTransaction(id: string, patch: Partial<Omit<Transaction, "id">>) {
  const s = read();
  write({ ...s, transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

export function deleteTransaction(id: string) {
  const s = read();
  write({ ...s, transactions: s.transactions.filter((t) => t.id !== id) });
}

export function setBudget(month: string, amount: number) {
  const s = read();
  write({ ...s, budgets: { ...s.budgets, [month]: amount } });
}

export function saveSource(source: Omit<IncomeSource, "id"> & { id?: string }) {
  const s = read();
  const next = { ...source, id: source.id ?? crypto.randomUUID() };
  const exists = s.sources.some((x) => x.id === next.id);
  write({ ...s, sources: exists ? s.sources.map((x) => (x.id === next.id ? next : x)) : [...s.sources, next] });
}

/** Removes the source; income already recorded from it stays in transactions. */
export function deleteSource(id: string) {
  const s = read();
  const paid = Object.fromEntries(Object.entries(s.paid).filter(([k]) => !k.startsWith(`${id}:`)));
  write({ ...s, sources: s.sources.filter((x) => x.id !== id), paid });
}

export const paymentKey = (sourceId: string, dueDate: string) => `${sourceId}:${dueDate}`;

/** Records a payment as an income transaction and links it to the occurrence. */
export function markPaid(source: IncomeSource, dueDate: string, amount: number, date: string) {
  const s = read();
  const id = crypto.randomUUID();
  const tx: Transaction = { id, type: "income", amount, category: source.category, note: source.name, date };
  write({
    ...s,
    transactions: [tx, ...s.transactions],
    paid: { ...s.paid, [paymentKey(source.id, dueDate)]: id },
  });
}

export function unmarkPaid(sourceId: string, dueDate: string) {
  const s = read();
  const key = paymentKey(sourceId, dueDate);
  const txId = s.paid[key];
  const paid = { ...s.paid };
  delete paid[key];
  write({ ...s, transactions: s.transactions.filter((t) => t.id !== txId), paid });
}

const noopSubscribe = () => () => {};

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Today's date (YYYY-MM-DD) on the client, null during prerender. */
export function useToday() {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const d = new Date();
      return `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
    },
    () => null,
  );
}

export const CURRENCY = "EGP";

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(n);
}
