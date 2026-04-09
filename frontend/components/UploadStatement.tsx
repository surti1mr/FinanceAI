"use client";

import { useRef, useState } from "react";
import { getCurrentUser } from "@/lib/api";

const API_BASE = "http://127.0.0.1:8000";

interface ParsedTransaction {
  date: string;
  description: string;
  category: string;
  amount: number;
}

interface UploadStatementProps {
  onSuccess?: () => void;
}

export default function UploadStatement({ onSuccess }: UploadStatementProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ count: number; transactions: ParsedTransaction[] } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    setFile(f);
    setResult(null);
    setError("");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    const user = getCurrentUser();
    if (!user) {
      setError("You must be logged in to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", String(user.user_id));

    try {
      const res = await fetch(`${API_BASE}/upload-statement`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail ?? "Upload failed.");
      }
      setResult({ count: data.count, transactions: data.transactions });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  function fmtAmt(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition
            ${dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onInputChange}
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {file ? (
              <div>
                <p className="text-sm font-semibold text-indigo-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drag &amp; drop your CSV here, or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Supported columns: date, description, amount</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-4">
          <svg className="animate-spin h-5 w-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-indigo-800">AI is categorizing your transactions…</p>
            <p className="text-xs text-indigo-500 mt-0.5">This may take a few seconds per transaction</p>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && !uploading && !result && (
        <button
          onClick={handleUpload}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
        >
          Upload &amp; Auto-Categorize
        </button>
      )}

      {/* Success preview */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm font-medium text-emerald-800">
              Successfully imported <span className="font-bold">{result.count}</span> transaction{result.count !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Preview table */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preview</p>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-gray-100">
                  <tr className="text-left text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate">{t.description}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.category === "Income"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-gray-800">
                        {fmtAmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload another */}
          <button
            onClick={() => { setResult(null); setFile(null); setError(""); }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
