"""FinanceIQ — SQLAlchemy + MySQL (PyMySQL) database layer."""

from __future__ import annotations

import os
from typing import Any, Iterator

import bcrypt

from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, Float, Integer, String, UniqueConstraint, create_engine, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set. Add it to a .env file, e.g. "
        "DATABASE_URL=mysql+pymysql://root:root@127.0.0.1:3306/financeiq"
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_category_user_name"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    color = Column(String(7), nullable=False, default="#6366f1")
    created_at = Column(DateTime, nullable=False, server_default=func.now())


DEFAULT_CATEGORIES = [
    ("Income", "#22c55e"),
    ("Groceries", "#f97316"),
    ("Coffee", "#92400e"),
    ("Rent", "#6366f1"),
    ("Transport", "#3b82f6"),
    ("Entertainment", "#ec4899"),
    ("Other", "#888780"),
]


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    date = Column(String(64), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _transaction_from_item(item: Any) -> Transaction:
    if isinstance(item, Transaction):
        return item
    if isinstance(item, dict):
        return Transaction(
            user_id=item["user_id"],
            date=item["date"],
            amount=item["amount"],
            category=item["category"],
            description=item["description"],
        )
    return Transaction(
        user_id=item.user_id,
        date=item.date,
        amount=item.amount,
        category=item.category,
        description=item.description,
    )


def save_transactions(db: Session, transactions: list) -> None:
    for item in transactions:
        db.add(_transaction_from_item(item))
    db.commit()


def get_transactions(db: Session, user_id: str) -> list[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )


def get_all_transactions(db: Session) -> list[Transaction]:
    return db.query(Transaction).order_by(Transaction.created_at.desc()).all()


def delete_transaction(db: Session, transaction_id: int, user_id: str) -> bool:
    row = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == str(user_id))
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def update_transaction(db: Session, transaction_id: int, data: dict) -> Transaction | None:
    row = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not row:
        return None
    for field in ("date", "amount", "category", "description"):
        if field in data and data[field] is not None:
            setattr(row, field, data[field])
    db.commit()
    db.refresh(row)
    return row


def create_user(db: Session, email: str, password: str) -> User:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(email=email, password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── Category helpers ──────────────────────────────────────────────────────────

def get_categories(db: Session, user_id: str) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.user_id == str(user_id))
        .order_by(Category.created_at)
        .all()
    )


def create_category(db: Session, user_id: str, name: str, color: str) -> Category:
    cat = Category(user_id=str(user_id), name=name, color=color)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int, user_id: str) -> bool:
    cat = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == str(user_id))
        .first()
    )
    if not cat:
        return False
    db.delete(cat)
    db.commit()
    return True


def seed_default_categories(db: Session, user_id: str) -> None:
    for name, color in DEFAULT_CATEGORIES:
        exists = (
            db.query(Category)
            .filter(Category.user_id == str(user_id), Category.name == name)
            .first()
        )
        if not exists:
            db.add(Category(user_id=str(user_id), name=name, color=color))
    db.commit()
