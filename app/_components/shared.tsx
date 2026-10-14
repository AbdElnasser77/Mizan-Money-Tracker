import { formatMoney, type Transaction, type TransactionType } from "../_lib/store";
import { Icon } from "./Sidebar";

export const CATEGORIES: Record<TransactionType, string[]> = {
  expense: ["Food", "Transport", "Housing", "Bills", "Shopping", "Health", "Entertainment", "Other"],
  income: ["Salary", "Freelance", "Gift", "Investment", "Other"],
  save: ["Emergency", "Goal", "Investment", "Other"],
};

export const TYPE_META: Record<TransactionType, { label: string; sign: string; text: string; icon: string; hint: string }> = {
  income: { label: "Income", sign: "+", text: "text-up", icon: "M12 19V5M6 11l6-6 6 6", hint: "Adds to your balance and net worth." },
  expense: { label: "Expense", sign: "−", text: "text-down", icon: "M12 5v14M6 13l6 6 6-6", hint: "Takes from your balance and net worth." },
  save: {
    label: "Save",
    sign: "→",
    text: "text-save",
    icon: "M19 9.5a6 6 0 00-6-4.5H9a6 6 0 00-5 9.3V19h3v-2h5v2h3v-2.6A6 6 0 0019 14h2v-4h-2zM15 10h.01",
    hint: "Moves money from your balance into savings, which counts in your net worth.",
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#3cb878",
  Transport: "#6f8fb8",
  Housing: "#7c6a9a",
  Bills: "#b5cc2e",
  Shopping: "#6fb1c0",
  Health: "#e0a84a",
  Entertainment: "#7b74b8",
  Other: "#8c9a9a",
  Salary: "#2fae74",
  Freelance: "#4a9fb3",
  Gift: "#d9963a",
  Investment: "#7b74b8",
  Emergency: "#4a7fb3",
  Goal: "#3aa58f",
};

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "M5 3v7a3 3 0 006 0V3M8 3v18M18 21V3c-2.5 1-4 4-4 8h4",
  Transport: "M5 16h14M3 16v-4l2.5-5h13L21 12v4M3 12h18M7 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  Housing: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5",
  Bills: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  Shopping: "M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2",
  Health: "M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z",
  Entertainment: "M4 5h16v14H4zM10 9l5 3-5 3z",
  Other: "M6 12h.01M12 12h.01M18 12h.01",
  Salary: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  Freelance: "M5 5h14v10H5zM3 19h18",
  Gift: "M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8C10 4 6 4.5 7 7.5M12 8c2-4 6-3.5 5-.5",
  Investment: "M3 17l6-6 4 4 8-8M15 7h6v6",
  Emergency: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  Goal: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
};

export const ICONS = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  plus: "M12 5v14M5 12h14",
  wallet: "M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zM16 14.5h.01",
  incomes: "M4 7h16v12H4zM8 7V5h8v2M12 11v5M9.5 13.5L12 11l2.5 2.5",
  expenses: "M4 7h16v12H4zM8 7V5h8v2M12 11v5M9.5 13.5L12 16l2.5-2.5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  networth: "M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M12 3l9 5H3z",
};

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string, style: "long" | "short" = "long") {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: style, year: "numeric" });
}

export const sum = (txs: Transaction[], type: TransactionType) =>
  txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

/** All-time position at the end of a month: balance = income − expenses − savings; net worth = balance + savings. */
export function position(txs: Transaction[], month: string) {
  const upTo = txs.filter((t) => t.date.slice(0, 7) <= month);
  const saved = sum(upTo, "save");
  const balance = sum(upTo, "income") - sum(upTo, "expense") - saved;
  return { balance, saved, netWorth: balance + saved };
}

export const compact =(n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl bg-card p-5 ring-1 ring-black/[0.03] ${className}`}>{children}</section>;
}

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function StatCard({
  label,
  icon,
  value,
  prev,
  goodWhenUp = false,
  hero = false,
  footer,
  valueClass,
}: {
  label: string;
  icon: string;
  value: number;
  prev: number;
  goodWhenUp?: boolean;
  hero?: boolean;
  footer?: React.ReactNode;
  valueClass?: string;
}) {
  const diff = value - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : null;
  const up = diff >= 0;
  const good = up === goodWhenUp;
  const tone = diff === 0 ? "" : hero ? (good ? "text-brand-100" : "text-[#ffc9c4]") : good ? "text-up" : "text-down";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-5 ${
        hero ? "bg-brand-800 text-white shadow-[0_12px_30px_-12px_rgb(12_95_85/0.6)]" : "bg-card ring-1 ring-black/[0.03]"
      }`}
    >
      {hero && <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-500/25 blur-2xl" />}
      <h2 className="relative flex items-center gap-2.5 text-[17px]">
        <Icon d={icon} className={`h-5 w-5 ${hero ? "text-brand-100" : "text-ink"}`} />
        {label}
      </h2>
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <p className={`text-[28px] leading-none tracking-tight tabular-nums ${valueClass ?? (value < 0 && !hero ? "text-down" : "")}`}>{formatMoney(value)}</p>
        {pct !== null && diff !== 0 && (
          <span className={`flex items-center text-xs font-medium ${tone}`}>
            <Icon d={up ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} className="h-3.5 w-3.5" />
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>
      <p className={`relative mt-3 text-sm ${hero ? "text-white/70" : "text-muted"}`}>
        <span className={tone}>
          {up ? "+" : "−"}
          {formatMoney(Math.abs(diff))}
        </span>{" "}
        from last month
      </p>
      {footer && <p className={`relative mt-1 text-xs ${hero ? "text-white/60" : "text-muted"}`}>{footer}</p>}
    </section>
  );
}
