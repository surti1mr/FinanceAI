# FinanceAI

An AI-powered personal finance manager with a RAG pipeline, semantic search, and LLaMA 3.3 70B chatbot.

## Live Demo
Coming soon

## Screenshots
Add screenshots here

## Features
- Dashboard with income, expenses, and net balance summary cards
- Spending breakdown pie chart and monthly income vs expenses bar chart
- Add, edit, and delete transactions
- Upload bank statement CSV — AI auto-categorizes every transaction using LLaMA 3.3 70B
- Custom category management — create, color-code, and delete your own categories
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
| POST | /upload-statement | Upload a CSV bank statement with AI auto-categorization |
| GET | /transactions/{user_id} | Get all transactions for a user |
| PUT | /transactions/{transaction_id} | Edit a transaction |
| DELETE | /transactions/{transaction_id} | Delete a transaction |
| GET | /categories/{user_id} | Get all categories for a user (seeds defaults if none) |
| POST | /categories | Create a custom category |
| DELETE | /categories/{category_id} | Delete a category |
| POST | /ask | Ask the AI a question about your finances |

## How the RAG Pipeline Works

1. When transactions are uploaded they are converted to embeddings using Sentence Transformers
2. Embeddings are stored in a FAISS in-memory vector index
3. When a user asks a question it is converted to an embedding
4. FAISS finds the top 5 most similar transactions
5. The full transaction history is also fetched from MySQL for complete context
6. Both the full history and the FAISS top results are injected into the LLaMA 3.3 70B prompt
7. Groq returns an AI-generated answer based only on the user's real data

## How CSV Upload Works

1. User uploads a CSV file with `date`, `description`, and `amount` columns (comma or semicolon delimited)
2. The backend parses each row and sends the description to Groq LLaMA 3.3 70B
3. The LLM picks the best matching category from the user's own category list
4. All parsed transactions are saved to MySQL and indexed in FAISS
5. A preview table shows the imported transactions with their AI-assigned categories
6. A sample file `sample_statement.csv` is included in the project root for testing

## Project Structure
```
/Fin
  main.py               — FastAPI routes
  database.py           — SQLAlchemy models and DB functions
  embeddings.py         — FAISS vector store and semantic search
  rag_pipeline.py       — RAG pipeline + AI auto-categorization with Groq LLM
  schema.sql            — MySQL database schema
  requirements.txt      — Python dependencies
  sample_statement.csv  — Sample CSV for testing the bank statement upload
  /frontend
    app/
      page.tsx              — Dashboard
      transactions/         — Transactions list page
      categories/           — Category management page
      login/                — Login page
      register/             — Register page
    components/
      ChatWidget.tsx         — Floating AI chatbot
      ChatWidgetWrapper.tsx  — Client wrapper for per-user chat isolation
      UploadStatement.tsx    — Drag-and-drop CSV upload with AI categorization
    lib/
      api.ts                 — API client (auth helpers)
```
