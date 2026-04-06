"""FinanceIQ — RAG pipeline: retrieval via FAISS + generation via Groq."""

from __future__ import annotations

import os

from dotenv import load_dotenv
from groq import Groq

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


def generate(query: str, context: list[str]) -> str:
    """Send query + context to Groq and return the assistant's answer."""
    if context:
        numbered = "\n".join(f"{i + 1}. {item}" for i, item in enumerate(context))
        context_block = f"Here are the relevant transactions:\n{numbered}"
    else:
        context_block = "No relevant transactions were found."

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
    relevant_transactions = retrieve(query, user_id)
    answer = generate(query, relevant_transactions)
    return {
        "answer": answer,
        "relevant_transactions": relevant_transactions,
    }
