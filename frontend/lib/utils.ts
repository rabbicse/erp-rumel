import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string | undefined | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-GB", opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(dateStr)
  );
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatWeight(grams: number): string {
  if (grams == null) return "—";
  return `${grams.toFixed(2)}g`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(capitalize)
    .join(" ");
}

export const STATUS_COLORS: Record<string, string> = {
  active: "badge-active",
  consignment: "badge-consignment",
  repair: "badge-repair",
  review: "badge-review",
  sold: "badge-sold",
  inactive: "badge-inactive",
  due: "badge-due",
  paid: "badge-paid",
  partial: "badge-partial",
  cancelled: "badge-cancelled",
  pending: "badge-pending",
  in_progress: "badge-consignment",
  completed: "badge-paid",
  returned: "badge-inactive",
};

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    consignment: "Consignment",
    repair: "Repair",
    review: "Review",
    sold: "Sold",
    inactive: "Inactive",
    due: "Due",
    paid: "Paid",
    partial: "Partial",
    cancelled: "Cancelled",
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    returned: "Returned",
    trade_order: "Trade Order",
    pre_owned: "Pre-Owned",
    bespoke: "Bespoke",
  };
  return map[status] ?? titleCase(status);
}

export function calculatePnL(cost: number, sold?: number): { value: number; pct: number } | null {
  if (!sold) return null;
  const value = sold - cost;
  const pct = cost > 0 ? (value / cost) * 100 : 0;
  return { value, pct };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
