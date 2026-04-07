"""FinanceIQ — RAG pipeline: retrieval via FAISS + generation via Groq."""

from __future__ import annotations

import os

from dotenv import load_dotenv
from groq import Groq

from database import get_db, get_transactions
from embeddings import search_similar

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY is not set. Add it to your .env file as GROQ_API_KEY=<your-key>"
    )

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_MESSAGE = (
    "You are a personal finance assistant. "
    "Answer questions based only on the transaction data provided. "
    "Be specific and mention exact amounts and dates. "
    "If you cannot answer from the data, say so."
)


def retrieve(query: str, user_id: str) -> list[str]:
    """Return transaction strings from the FAISS index relevant to query."""
    return search_similar(query, user_id)


def _fmt_row(t: object) -> str:
    """Format a SQLAlchemy Transaction row as a readable string."""
    return f"{t.date} - {t.category} - {t.description} - ${t.amount}"  # type: ignore[attr-defined]


def generate(
    query: str,
    all_tx: list,
    relevant: list[str],
) -> str:
    """Send full transaction history + semantically relevant subset to Groq."""
    total_count = len(all_tx)

    # Section 1 — header
    header = f"The user has {total_count} transactions in total."

    # Section 2 — complete history
    if all_tx:
        history_lines = "\n".join(
            f"{i + 1}. {_fmt_row(t)}" for i, t in enumerate(all_tx)
        )
        history_block = f"Complete transaction history:\n{history_lines}"
    else:
        history_block = "Complete transaction history:\n(no transactions found)"

    # Section 3 — FAISS top results
    if relevant:
        relevant_lines = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(relevant))
        relevant_block = f"Most relevant to your question:\n{relevant_lines}"
    else:
        relevant_block = "Most relevant to your question:\n(none found)"

    context_block = f"{header}\n\n{history_block}\n\n{relevant_block}"
    user_message = f"{context_block}\n\nQuestion: {query}"

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content


def run_pipeline(query: str, user_id: str) -> dict:
    """Run the full RAG pipeline and return answer + relevant transactions."""
    # Semantic retrieval (FAISS top-k)
    relevant_transactions = retrieve(query, user_id)

    # Full history from MySQL for complete context
    db = next(get_db())
    try:
        all_transactions = get_transactions(db, user_id)
    finally:
        db.close()

    answer = generate(query, all_transactions, relevant_transactions)
    return {
        "answer": answer,
        "relevant_transactions": relevant_transactions,
    }
