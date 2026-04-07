"""FinanceIQ — personal finance API."""

from typing import List

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    Base,
    create_category,
    create_user,
    delete_category,
    delete_transaction,
    engine,
    get_all_transactions,
    get_categories,
    get_db,
    get_transactions,
    get_user_by_email,
    save_transactions,
    seed_default_categories,
    update_transaction,
    verify_password,
)
from embeddings import add_transactions_to_index, reload_user_transactions
from rag_pipeline import run_pipeline

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinanceIQ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def load_existing_transactions():
    db = next(get_db())
    try:
        all_transactions = get_all_transactions(db)
        if all_transactions:
            add_transactions_to_index(all_transactions)
            print(f"[startup] Loaded {len(all_transactions)} transactions into FAISS index.")
        else:
            print("[startup] No existing transactions found in database.")
    finally:
        db.close()


class TransactionItem(BaseModel):
    date: str
    amount: float
    category: str
    description: str
    user_id: str


class UploadTransactionsRequest(BaseModel):
    user_id: str
    transactions: List[TransactionItem]


class AskRequest(BaseModel):
    user_id: str
    question: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateTransactionRequest(BaseModel):
    date: str
    amount: float
    category: str
    description: str


class CreateCategoryRequest(BaseModel):
    user_id: str
    name: str
    color: str = "#6366f1"


@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    print(f"{request.method} {request.url.path}")
    if get_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with that email already exists.",
        )
    user = create_user(db, body.email, body.password)
    return {"success": True, "email": user.email}


@app.post("/login")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    print(f"{request.method} {request.url.path}")
    user = get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return {"success": True, "user_id": user.id, "email": user.email}


@app.post("/upload-transactions")
async def upload_transactions(
    request: Request,
    body: UploadTransactionsRequest,
    db: Session = Depends(get_db),
):
    print(f"{request.method} {request.url.path}")
    save_transactions(db, body.transactions)
    add_transactions_to_index(body.transactions)
    return {"success": True, "count": len(body.transactions)}


@app.post("/ask")
async def ask(request: Request, body: AskRequest):
    print(f"{request.method} {request.url.path}")
    result = run_pipeline(body.question, body.user_id)
    return result


@app.delete("/transactions/{transaction_id}")
async def remove_transaction(
    request: Request,
    transaction_id: int,
    user_id: str,
    db: Session = Depends(get_db),
):
    print(f"{request.method} {request.url.path}")
    deleted = delete_transaction(db, transaction_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found.",
        )
    remaining = get_transactions(db, user_id)
    reload_user_transactions(user_id, remaining)
    return {"success": True}


@app.put("/transactions/{transaction_id}")
async def edit_transaction(
    request: Request,
    transaction_id: int,
    body: UpdateTransactionRequest,
    db: Session = Depends(get_db),
):
    print(f"{request.method} {request.url.path}")
    row = update_transaction(db, transaction_id, body.model_dump())
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found.",
        )

    # Sync FAISS: rebuild this user's vectors from the latest MySQL state.
    updated_transactions = get_transactions(db, row.user_id)
    reload_user_transactions(row.user_id, updated_transactions)

    return {
        "id": row.id,
        "user_id": row.user_id,
        "date": row.date,
        "amount": row.amount,
        "category": row.category,
        "description": row.description,
        "created_at": row.created_at,
    }


@app.get("/categories/{user_id}")
async def list_categories(request: Request, user_id: str, db: Session = Depends(get_db)):
    print(f"{request.method} {request.url.path}")
    cats = get_categories(db, user_id)
    if not cats:
        seed_default_categories(db, user_id)
        cats = get_categories(db, user_id)
    return [{"id": c.id, "user_id": c.user_id, "name": c.name, "color": c.color} for c in cats]


@app.post("/categories", status_code=status.HTTP_201_CREATED)
async def add_category(request: Request, body: CreateCategoryRequest, db: Session = Depends(get_db)):
    print(f"{request.method} {request.url.path}")
    try:
        cat = create_category(db, body.user_id, body.name, body.color)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with that name already exists.",
        )
    return {"id": cat.id, "user_id": cat.user_id, "name": cat.name, "color": cat.color}


@app.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
async def remove_category(
    request: Request,
    category_id: int,
    user_id: str,
    db: Session = Depends(get_db),
):
    print(f"{request.method} {request.url.path}")
    deleted = delete_category(db, category_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )
    return {"success": True}


@app.get("/transactions/{user_id}")
async def fetch_transactions(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db),
):
    print(f"{request.method} {request.url.path}")
    rows = get_transactions(db, user_id)
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "date": row.date,
            "amount": row.amount,
            "category": row.category,
            "description": row.description,
            "created_at": row.created_at,
        }
        for row in rows
    ]
