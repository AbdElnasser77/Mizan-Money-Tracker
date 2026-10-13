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

type State = {
  transactions: Transaction[];
  budgets: Record<string, number>; // keyed by YYYY-MM
};

const KEY = "mizan:v1";
const EMPTY: State = { transactions: [], budgets: {} };

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

export function deleteTransaction(id: string) {
  const s = read();
  write({ ...s, transactions: s.transactions.filter((t) => t.id !== id) });
}

export function setBudget(month: string, amount: number) {
  const s = read();
  write({ ...s, budgets: { ...s.budgets, [month]: amount } });
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
