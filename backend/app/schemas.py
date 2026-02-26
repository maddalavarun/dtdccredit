from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: Literal["staff", "admin"] = "staff"


class UserOut(BaseModel):
    id: UUID
    username: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Clients ───────────────────────────────────────────────────────────
class ClientCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    credit_limit: Decimal = Field(default=Decimal("0"), ge=0)


class ClientUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    credit_limit: Optional[Decimal] = Field(None, ge=0)


class ClientOut(BaseModel):
    id: UUID
    company_name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    credit_limit: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class ClientSummary(ClientOut):
    total_outstanding: Decimal = Decimal("0")
    total_overdue: Decimal = Decimal("0")
    overdue_count: int = 0
    invoice_count: int = 0


# ── Invoices ──────────────────────────────────────────────────────────
class InvoiceCreate(BaseModel):
    client_id: UUID
    invoice_number: str = Field(..., min_length=1, max_length=50)
    invoice_date: date
    due_date: date
    total_amount: Decimal = Field(..., gt=0)


class InvoiceOut(BaseModel):
    id: UUID
    client_id: UUID
    invoice_number: str
    invoice_date: date
    due_date: date
    total_amount: Decimal
    created_at: datetime
    # computed
    paid_amount: Decimal = Decimal("0")
    outstanding: Decimal = Decimal("0")
    status: str = "Unpaid"  # Paid | Partial | Unpaid
    is_overdue: bool = False
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    total_rows: int = 0
    imported: int = 0
    duplicates: int = 0
    errors: List[str] = []
    new_clients_created: int = 0


# ── Payments ──────────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., gt=0)
    payment_date: date
    payment_mode: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = Field(None, max_length=500)


class PaymentOut(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: Decimal
    payment_date: date
    payment_mode: Optional[str]
    remarks: Optional[str]
    created_at: datetime
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────
class DashboardData(BaseModel):
    total_outstanding: Decimal = Decimal("0")
    total_overdue: Decimal = Decimal("0")
    payments_today: Decimal = Decimal("0")
    total_clients: int = 0
    total_invoices: int = 0
    top_outstanding_clients: List[ClientSummary] = []


# ── Reports ───────────────────────────────────────────────────────────
class ReportFilters(BaseModel):
    client_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

