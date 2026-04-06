# FinanceAI

An AI-powered personal finance manager with a RAG pipeline, semantic search, and LLaMA 3.3 70B chatbot.

## Live Demo
Coming soon

## Screenshots
Add screenshots here

## Features
- Dashboard with income, expenses, and net balance summary cards
- Spending breakdown pie chart and monthly income vs expenses bar chart
- Add and edit transactions
- AI chatbot powered by RAG pipeline — ask anything about your finances
- Semantic search using FAISS vector database
- User authentication with bcrypt password hashing
- Per-user data isolation — each user only sees their own transactions

## Tech Stack
### Backend
- FastAPI (Python)
- MySQL with SQLAlchemy ORM
- FAISS vector database (in-memory semantic search)
- Sentence Transformers (all-MiniLM-L6-v2)
- Groq API with LLaMA 3.3 70B
- bcrypt password hashing

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- Recharts (pie chart + bar chart)

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL
- Groq API key (free at groq.com)

### Backend Setup
```bash
cd Fin
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Create a `.env` file in `/Fin`:
```
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/financeai
GROQ_API_KEY=your_groq_api_key
```

Set up the database:
```bash
# Option 1 — run the schema file in MySQL Workbench
# Open schema.sql and run it

# Option 2 — let SQLAlchemy create tables automatically
# Just start the server and tables are created on first run
```

Start the backend:
```bash
python -m uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in `/frontend`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:
```bash
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Register a new user |
| POST | /login | Login and get user info |
| POST | /upload-transactions | Save transactions to MySQL + FAISS |
| GET | /transactions/{user_id} | Get all transactions for a user |
| PUT | /transactions/{transaction_id} | Edit a transaction |
| POST | /ask | Ask the AI a question about your finances |

## How the RAG Pipeline Works

1. When transactions are uploaded they are converted to embeddings using Sentence Transformers
2. Embeddings are stored in a FAISS in-memory vector index
3. When a user asks a question it is converted to an embedding
4. FAISS finds the top 5 most similar transactions
5. Those transactions are injected into the LLaMA 3.3 70B prompt as context
6. Groq returns an AI-generated answer based only on the user's real data

## Project Structure
```
/Fin
  main.py          — FastAPI routes
  database.py      — SQLAlchemy models and DB functions
  embeddings.py    — FAISS vector store and semantic search
  rag_pipeline.py  — RAG pipeline with Groq LLM
  schema.sql       — MySQL database schema
  requirements.txt — Python dependencies
  /frontend        — Next.js frontend app
```
