"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, logoutUser } from "@/lib/api";

const API_BASE = "http://127.0.0.1:8000";

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

const EMPTY_FORM = {
  date: "",
  amount: "",
  category: "",
  description: "",
};

export default function TransactionsPage() {
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
    fetch(`${API_BASE}/categories/${user.user_id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Category[]) => {
        setCategories(data);
        setForm((f) => ({ ...f, category: f.category || (data[0]?.name ?? "") }));
      })
      .catch(() => {});
  }, [router]);

  // Focus first field when modal opens
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
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

  async function handleSubmit(e: React.FormEvent) {
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
    if (!userId) return;
    if (!window.confirm(`Are you sure you want to delete this transaction?\n\n${t.date} · ${t.category} · ${t.description} · $${t.amount}`)) return;
    setDeletingId(t.id);
    try {
      const res = await fetch(`${API_BASE}/transactions/${t.id}?user_id=${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Failed to delete transaction.");
      }
      await fetchTransactions(userId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logoutUser();
    router.push("/login");
  }

  function field(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="mt-1 text-sm text-gray-500">
              All your recorded transactions
            </p>
          </div>
          <button
            onClick={openModal}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
          >
            + Add Transaction
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Transactions table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">All Transactions</h2>
            {!loading && (
              <span className="text-xs text-gray-400">
                {transactions.length} total
              </span>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-gray-100">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-400">No transactions yet.</p>
              <button
                onClick={openModal}
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Add your first transaction →
              </button>
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
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                      <td className="px-6 py-4 text-gray-700">
                        {t.description}
                      </td>
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => field("date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
                  onChange={(e) => field("category", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
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
                  onChange={(e) => field("amount", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
                  onChange={(e) => field("description", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
