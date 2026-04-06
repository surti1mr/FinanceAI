"""FinanceIQ — FAISS-backed semantic search using sentence-transformers."""

from __future__ import annotations

from typing import Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

EMBEDDING_DIM = 384
MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)
index = faiss.IndexFlatL2(EMBEDDING_DIM)
transaction_store: list[dict] = []  # each entry: {"text": str, "user_id": str}


def generate_embedding(text: str) -> np.ndarray:
    """Return a (1, 384) float32 numpy array for the given text."""
    vector = model.encode(text, convert_to_numpy=True)
    return np.array([vector], dtype=np.float32)


def add_transactions_to_index(transactions: list[Any]) -> None:
    """Embed each transaction and add it to the FAISS index.

    Each item can be a Pydantic model, SQLAlchemy ORM row, or dict —
    as long as it exposes date, category, description, and amount.
    """
    if not transactions:
        return

    texts: list[str] = []
    entries: list[dict] = []
    for t in transactions:
        if isinstance(t, dict):
            date, category, description, amount, uid = (
                t["date"], t["category"], t["description"], t["amount"], t["user_id"]
            )
        else:
            date, category, description, amount, uid = (
                t.date, t.category, t.description, t.amount, t.user_id
            )
        text = f"{date} - {category} - {description} - ${amount}"
        texts.append(text)
        entries.append({"text": text, "user_id": str(uid)})

    vectors = model.encode(texts, convert_to_numpy=True).astype(np.float32)
    index.add(vectors)
    transaction_store.extend(entries)


def reload_user_transactions(user_id: str, transactions: list[Any]) -> None:
    """Replace all FAISS entries for user_id with freshly embedded transactions.

    Strategy: rebuild the entire index from scratch using the entries that
    belong to *other* users (kept as-is) plus the new embeddings for this user.
    This is safe and correct for an IndexFlatL2 which doesn't support deletion.
    """
    global index, transaction_store  # noqa: PLW0603

    # Separate out the entries (and their positions) that belong to other users.
    other_entries = [e for e in transaction_store if e["user_id"] != str(user_id)]

    # Build fresh texts + entries for the updated user transactions.
    new_texts: list[str] = []
    new_entries: list[dict] = []
    for t in transactions:
        if isinstance(t, dict):
            date, category, description, amount, uid = (
                t["date"], t["category"], t["description"], t["amount"], t["user_id"]
            )
        else:
            date, category, description, amount, uid = (
                t.date, t.category, t.description, t.amount, t.user_id
            )
        text = f"{date} - {category} - {description} - ${amount}"
        new_texts.append(text)
        new_entries.append({"text": text, "user_id": str(uid)})

    all_entries = other_entries + new_entries

    # Rebuild the index.
    new_index = faiss.IndexFlatL2(EMBEDDING_DIM)
    if all_entries:
        all_texts = [e["text"] for e in all_entries]
        vectors = model.encode(all_texts, convert_to_numpy=True).astype(np.float32)
        new_index.add(vectors)

    index = new_index
    transaction_store = all_entries


def search_similar(query: str, user_id: str, top_k: int = 5) -> list[str]:
    """Return up to top_k transaction strings most similar to query for user_id."""
    if index.ntotal == 0:
        return []

    # Over-fetch so we still have top_k results after filtering by user.
    k = min(top_k * 10, index.ntotal)
    query_vector = generate_embedding(query)
    _, indices = index.search(query_vector, k)

    results: list[str] = []
    for i in indices[0]:
        if i == -1:
            continue
        entry = transaction_store[i]
        if entry["user_id"] == str(user_id):
            results.append(entry["text"])
        if len(results) == top_k:
            break
    return results
