import type { ComplianceReport, ReportHistoryItem } from "./halaliq-api";

const ACTIVE_GUEST_KEY = "halal-intelligence.active-guest";
const GUEST_HISTORY_KEY = "halal-intelligence.guest-history";
const MAX_GUEST_HISTORY_ITEMS = 24;
const GUEST_ALIASES = new Set(["guest", "abcd.gmail", "abcd.email"]);

type GuestHistoryStore = Record<string, ReportHistoryItem[]>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeGuestEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  return GUEST_ALIASES.has(normalized) ? "guest" : normalized;
}

function readHistoryStore(): GuestHistoryStore {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(GUEST_HISTORY_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as GuestHistoryStore;
  } catch (_error) {
    return {};
  }
}

function writeHistoryStore(store: GuestHistoryStore): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(store));
}

function createStoredReport(report: ComplianceReport): ComplianceReport {
  return {
    ...report,
    history: undefined,
  };
}

export function isGuestEmailValid(value: string): boolean {
  const normalized = normalizeGuestEmail(value);
  return normalized.length >= 3;
}

export function getActiveGuestEmail(): string | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const value = window.sessionStorage.getItem(ACTIVE_GUEST_KEY);

  if (!value && canUseStorage()) {
    window.localStorage.removeItem(ACTIVE_GUEST_KEY);
  }

  return value ? normalizeGuestEmail(value) : null;
}

export function setActiveGuestEmail(value: string): string {
  const normalized = normalizeGuestEmail(value);

  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(ACTIVE_GUEST_KEY, normalized);
  }

  if (canUseStorage()) {
    window.localStorage.removeItem(ACTIVE_GUEST_KEY);
  }

  return normalized;
}

export function clearActiveGuestEmail(): void {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(ACTIVE_GUEST_KEY);
  }

  if (canUseStorage()) {
    window.localStorage.removeItem(ACTIVE_GUEST_KEY);
  }
}

export function getGuestHistory(email: string | null | undefined): ReportHistoryItem[] {
  if (!email) {
    return [];
  }

  const store = readHistoryStore();
  const normalizedEmail = normalizeGuestEmail(email);

  if (normalizedEmail !== "guest") {
    return store[normalizedEmail] ?? [];
  }

  const mergedHistory = ["guest", "abcd.gmail", "abcd.email"]
    .flatMap((key) => store[key] ?? [])
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, MAX_GUEST_HISTORY_ITEMS);

  if (mergedHistory.length > 0) {
    store.guest = mergedHistory;
    delete store["abcd.gmail"];
    delete store["abcd.email"];
    writeHistoryStore(store);
  }

  return mergedHistory;
}

export function saveGuestReport(email: string, report: ComplianceReport): ReportHistoryItem[] {
  const normalizedEmail = normalizeGuestEmail(email);
  const store = readHistoryStore();
  const currentHistory = store[normalizedEmail] ?? [];

  const nextItem: ReportHistoryItem = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    created_at: new Date().toISOString(),
    reports: [
      {
        created_at: new Date().toISOString(),
        result: createStoredReport(report),
      },
    ],
  };

  const nextHistory = [nextItem, ...currentHistory].slice(0, MAX_GUEST_HISTORY_ITEMS);
  store[normalizedEmail] = nextHistory;
  writeHistoryStore(store);

  return nextHistory;
}
