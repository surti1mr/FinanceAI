"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCurrentUser, logoutUser } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const EMPTY_FORM = {
  date: "",
  amount: "",
  category: "",
  description: "",
};

interface Category {
  id: number;
  user_id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: number;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "indigo";
}) {
  const palette = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };
  return (
    <div
      className={`rounded-2xl border px-6 py-5 flex flex-col gap-1 ${palette[color]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="text-2xl font-bold">{fmt(value)}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchCategories(uid: number) {
    try {
      const res = await fetch(`${API_BASE}/categories/${uid}`);
      if (res.ok) {
        const data: Category[] = await res.json();
        setCategories(data);
        setForm((f) => ({ ...f, category: f.category || (data[0]?.name ?? "") }));
      }
    } catch { /* non-fatal */ }
  }

  async function fetchTransactions(uid: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/transactions/${uid}`);
      if (!res.ok) throw new Error("Failed to load transactions.");
      setTransactions(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setEmail(user.email);
    setUserId(user.user_id);
    fetchTransactions(user.user_id);
    fetchCategories(user.user_id);
  }, [router]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => firstFieldRef.current?.focus(), 50);
  }, [modalOpen]);

  function openModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category: categories[0]?.name ?? "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({ date: t.date, amount: String(t.amount), category: t.category, description: t.description });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setFormError("");
    setSubmitting(true);
    try {
      let res: Response;
      if (editingId !== null) {
        res = await fetch(`${API_BASE}/transactions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            amount: parseFloat(form.amount),
            category: form.category,
            description: form.description,
          }),
        });
      } else {
        res = await fetch(`${API_BASE}/upload-transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: String(userId),
            transactions: [
              {
                date: form.date,
                amount: parseFloat(form.amount),
                category: form.category,
                description: form.description,
                user_id: String(userId),
              },
            ],
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? (editingId ? "Failed to update transaction." : "Failed to add transaction."));
      }
      closeModal();
      await fetchTransactions(userId);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t: Transaction) {
    const uid = getCurrentUser()?.user_id;
    if (!uid) return;
    if (!window.confirm(`Are you sure you want to delete this transaction?\n\n${t.date} · ${t.category} · ${t.description} · $${t.amount}`)) return;
    setDeletingId(t.id);
    try {
      const res = await fetch(`${API_BASE}/transactions/${t.id}?user_id=${uid}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Failed to delete transaction.");
      }
      const updated = await fetch(`${API_BASE}/transactions/${uid}`).then((r) => r.json());
      setTransactions(updated);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logoutUser();
    router.push("/login");
  }

  const income = transactions
    .filter((t) => t.category === "Income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.category !== "Income")
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income - expenses;

  const recent = [...transactions].slice(0, 5);

  // ── Chart data ──────────────────────────────────────────────────────────────

  const PIE_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  ];

  const pieData = Object.values(
    transactions
      .filter((t) => t.category !== "Income")
      .reduce<Record<string, { name: string; value: number }>>((acc, t) => {
        acc[t.category] = acc[t.category] ?? { name: t.category, value: 0 };
        acc[t.category].value += t.amount;
        return acc;
      }, {})
  ).map((d) => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));

  // Build last-6-months bar data
  const barData = (() => {
    const now = new Date();
    const months: { month: string; Income: number; Expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        Income: 0,
        Expenses: 0,
      });
    }
    transactions.forEach((t) => {
      const [year, mon] = t.date.split("-").map(Number);
      const label = new Date(year, mon - 1, 1).toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const slot = months.find((m) => m.month === label);
      if (!slot) return;
      if (t.category === "Income") slot.Income += t.amount;
      else slot.Expenses += t.amount;
    });
    return months.map((m) => ({
      ...m,
      Income: parseFloat(m.Income.toFixed(2)),
      Expenses: parseFloat(m.Expenses.toFixed(2)),
    }));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-indigo-600">FinanceAI</span>
          <span className="hidden sm:block text-gray-300">|</span>
          <span className="hidden sm:block text-sm text-gray-500">{email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="hidden sm:block text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
          >
            Categories
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your personal finance overview
            </p>
          </div>
          <button
            onClick={openModal}
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition"
          >
            + Add Transaction
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-gray-100 animate-pulse h-24"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Total Income" value={income} color="green" />
            <SummaryCard label="Total Expenses" value={expenses} color="red" />
            <SummaryCard label="Net Balance" value={net} color="indigo" />
          </div>
        )}

        {/* Charts */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie — spending by category */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Spending by Category
              </h2>
              {pieData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No expense data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
                      label={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bar — monthly income vs expenses */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Income vs Expenses (Last 6 Months)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="Income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="Expenses"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
            <div className="flex items-center gap-3">
              {!loading && (
                <span className="text-xs text-gray-400">
                  Showing {recent.length} of {transactions.length}
                </span>
              )}
              <Link
                href="/transactions"
                className="rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition"
              >
                View All
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-100">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex gap-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No transactions yet. Upload some to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.category === "Income"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{t.description}</td>
                      <td
                        className={`px-6 py-4 text-right font-medium tabular-nums whitespace-nowrap ${
                          t.category === "Income"
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {t.category === "Income" ? "+" : "-"}
                        {fmt(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={deletingId === t.id}
                          className="text-xs font-medium text-red-600 hover:text-red-500 transition disabled:opacity-50"
                        >
                          {deletingId === t.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId !== null ? "Edit Transaction" : "Add Transaction"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  ref={firstFieldRef}
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {/* Color dot preview */}
                {form.category && (() => {
                  const cat = categories.find((c) => c.name === form.category);
                  return cat ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-gray-400">{cat.name}</span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="e.g. Weekly grocery run"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
