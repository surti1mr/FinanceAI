"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, logoutUser } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PROTECTED = ["Income", "Other"];

interface Category {
  id: number;
  user_id: string;
  name: string;
  color: string;
}

const EMPTY_FORM = { name: "", color: "#6366f1" };

export default function CategoriesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteWarning, setDeleteWarning] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  async function fetchCategories(uid: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/categories/${uid}`);
      if (!res.ok) throw new Error("Failed to load categories.");
      setCategories(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    setEmail(user.email);
    setUserId(user.user_id);
    fetchCategories(user.user_id);
  }, [router]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => nameRef.current?.focus(), 50);
  }, [modalOpen]);

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: String(userId), name: form.name.trim(), color: form.color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Failed to create category.");
      }
      closeModal();
      await fetchCategories(userId);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (PROTECTED.includes(cat.name)) {
      setDeleteWarning(`"${cat.name}" is a default category and cannot be deleted.`);
      setTimeout(() => setDeleteWarning(""), 3500);
      return;
    }
    if (!userId) return;
    try {
      const res = await fetch(
        `${API_BASE}/categories/${cat.id}?user_id=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete category.");
      await fetchCategories(userId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleLogout() { logoutUser(); router.push("/login"); }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-indigo-600">FinanceAI</span>
          <span className="hidden sm:block text-gray-300">|</span>
          <span className="hidden sm:block text-sm text-gray-500">{email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition"
        >
          Log out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your transaction categories</p>
          </div>
          <button
            onClick={openModal}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
          >
            + Add Category
          </button>
        </div>

        {/* Banners */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {deleteWarning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">{deleteWarning}</div>
        )}

        {/* Category grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[0,1,2,3,4,5,6].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-gray-100 animate-pulse h-24" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No categories found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center gap-3 group relative"
              >
                {/* Color circle */}
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-medium text-gray-800 text-center leading-tight">
                  {cat.name}
                </span>

                {/* Delete button — hidden for protected, shown on hover for others */}
                {PROTECTED.includes(cat.name) ? (
                  <span className="text-xs text-gray-300">default</span>
                ) : (
                  <button
                    onClick={() => handleDelete(cat)}
                    className="text-xs text-red-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Category</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition text-xl leading-none" aria-label="Close">×</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="e.g. Fitness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-gray-500 font-mono">{form.color}</span>
                </div>
              </div>

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
