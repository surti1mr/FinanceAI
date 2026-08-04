import { driver } from "driver.js";
import type { Config } from "driver.js";

export const STORAGE_DASHBOARD_TOUR_COMPLETE = "financeai:tour-dashboard-v1";
export const STORAGE_TRANSACTIONS_TOUR_COMPLETE = "financeai:tour-transactions-v1";

const base: Partial<Config> = {
  showProgress: true,
  progressText: "{{current}} of {{total}}",
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Done",
  allowClose: true,
  overlayOpacity: 0.72,
  smoothScroll: true,
};

export function resetDashboardTourProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_DASHBOARD_TOUR_COMPLETE);
}

export function resetTransactionsTourProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_TRANSACTIONS_TOUR_COMPLETE);
}

export function startDashboardTour(options?: { persistComplete?: boolean }) {
  if (typeof window === "undefined") return;
  const persist = options?.persistComplete !== false;

  driver({
    ...base,
    onDestroyed: () => {
      if (persist) {
        localStorage.setItem(STORAGE_DASHBOARD_TOUR_COMPLETE, "1");
      }
    },
    steps: [
      {
        popover: {
          title: "Welcome to FinanceAI",
          description:
            "This quick tour walks through the essentials: adding transactions, reading your totals, and using the assistant. Skip anytime with ✕.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "[data-tour='app-header']",
        popover: {
          title: "Your workspace",
          description:
            "The header shows FinanceAI branding and your account. Links and actions stay here across pages.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='nav-categories']",
        popover: {
          title: "Categories",
          description:
            "Open Categories to rename or customize colors—your Income and spending groups power charts and dropdowns elsewhere.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='dash-add-transaction']",
        popover: {
          title: "Add transactions",
          description:
            "Record income and expenses anytime. Charts and summaries update automatically after each save.",
          side: "left",
          align: "center",
        },
      },
      {
        element: "[data-tour='dash-summary']",
        popover: {
          title: "Totals at a glance",
          description:
            "Income, expenses, and net balance help you judge the month quickly without digging into the ledger.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='dash-recent']",
        popover: {
          title: "Recent activity",
          description:
            "Edit or delete rows here. Use View All when you want the full searchable list and bulk uploads.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "[data-tour='chat-assistant']",
        popover: {
          title: "Ask FinanceAI",
          description:
            "Open the bubble to chat about your data with context from your logged-in account.",
          side: "left",
          align: "center",
        },
      },
    ],
  }).drive();
}

export function startTransactionsTour(options?: { persistComplete?: boolean }) {
  if (typeof window === "undefined") return;
  const persist = options?.persistComplete !== false;

  driver({
    ...base,
    onDestroyed: () => {
      if (persist) {
        localStorage.setItem(STORAGE_TRANSACTIONS_TOUR_COMPLETE, "1");
      }
    },
    steps: [
      {
        popover: {
          title: "Transactions workspace",
          description:
            "This page is where you manage every recorded line—from CSV uploads to edits on individual rows.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "[data-tour='txn-upload']",
        popover: {
          title: "Upload statements",
          description:
            "Import bank CSV exports to ingest many movements at once. You can fine-tune them afterwards.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='txn-add']",
        popover: {
          title: "Manual entries",
          description:
            "Use Add Transaction for one-offs that never hit a CSV or need a correction.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='txn-table']",
        popover: {
          title: "Full ledger controls",
          description:
            "Sort through every entry, tweak categories, then hop back to the dashboard for aggregates.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "[data-tour='nav-back-dashboard']",
        popover: {
          title: "Heading home",
          description:
            "The dashboard link jumps back to summaries and charts when you finish reviewing details.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  }).drive();
}
