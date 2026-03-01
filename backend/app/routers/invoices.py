import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from uuid import UUID


import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Invoice, Payment, Client, User
from app.schemas import InvoiceCreate, InvoiceOut, ImportResult
from app.deps import get_current_user, require_admin
from app.config import settings

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def _enrich_invoices_batch(db: Session, invoices: list) -> list[InvoiceOut]:
    """Enrich multiple invoices with payment data in a SINGLE query."""
    if not invoices:
        return []

    invoice_ids = [inv.id for inv in invoices]

    # Single query to get paid amounts for all invoices
    payment_sums = (
        db.query(
            Payment.invoice_id,
            func.coalesce(func.sum(Payment.amount), 0).label("paid_amount"),
        )
        .filter(Payment.invoice_id.in_(invoice_ids))
        .group_by(Payment.invoice_id)
        .all()
    )
    paid_map = {str(row.invoice_id): Decimal(str(row.paid_amount)) for row in payment_sums}

    today = date.today()
    results = []
    for inv in invoices:
        paid_amount = paid_map.get(str(inv.id), Decimal("0"))
        outstanding = inv.total_amount - paid_amount
        if outstanding <= 0:
            status = "Paid"
        elif paid_amount > 0:
            status = "Partial"
        else:
            status = "Unpaid"
        is_overdue = inv.due_date < today and outstanding > 0
        client_name = inv.client.company_name if inv.client else None
        results.append(InvoiceOut(
            id=inv.id,
            client_id=inv.client_id,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            total_amount=inv.total_amount,
            created_at=inv.created_at,
            paid_amount=paid_amount,
            outstanding=outstanding,
            status=status,
            is_overdue=is_overdue,
            client_name=client_name,
        ))
    return results


def _enrich_invoice(db: Session, inv: Invoice) -> InvoiceOut:
    """Enrich a single invoice (uses batch internally)."""
    return _enrich_invoices_batch(db, [inv])[0]


@router.get("", response_model=List[InvoiceOut])
def list_invoices(
    client_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Invoice)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    invoices = q.order_by(Invoice.invoice_date.desc()).all()
    results = _enrich_invoices_batch(db, invoices)
    if status_filter:
        results = [r for r in results if r.status.lower() == status_filter.lower()]
    return results


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _enrich_invoice(db, inv)


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(body: InvoiceCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    # check duplicate
    exists = db.query(Invoice).filter(Invoice.invoice_number == body.invoice_number).first()
    if exists:
        raise HTTPException(status_code=400, detail=f"Invoice {body.invoice_number} already exists")
    # check client exists
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    inv = Invoice(**body.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _enrich_invoice(db, inv)


@router.post("/import", response_model=ImportResult)
async def import_invoices(
    file: UploadFile = File(...),
    auto_create_clients: bool = Query(False),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Import invoices from Excel/CSV file."""
    result = ImportResult()
    content = await file.read()

    # Check file size limit
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_MB} MB.")

    # Parse file
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or XLSX.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Normalize column names for robust parsing
    df.columns = df.columns.str.strip().str.lower()

    # Create mapping of expected normalized column names
    col_map = {
        "client name": ["client name", "client", "company name", "clientname"],
        "invoice number": ["invoice number", "invoice no", "invoiceno", "invoice #", "invoice"],
        "invoice date": ["invoice date", "date", "invoicedate"],
        "due date": ["due date", "duedate"],
        "invoice amount": ["invoice amount", "amount", "total", "total amount", "invoiceamount"]
    }

    # Find matching columns
    matched_cols = {}
    for canonical, variations in col_map.items():
        for col in df.columns:
            if col in variations:
                matched_cols[canonical] = col
                break
    
    missing = set(col_map.keys()) - set(matched_cols.keys())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns. Looked for: {', '.join(missing)}")

    result.total_rows = len(df)

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header row
        errors_in_row = []

        # Validate fields
        client_col = matched_cols["client name"]
        inv_num_col = matched_cols["invoice number"]
        inv_date_col = matched_cols["invoice date"]
        due_date_col = matched_cols["due date"]
        amount_col = matched_cols["invoice amount"]

        client_name = str(row.get(client_col, "")).strip()
        invoice_number = str(row.get(inv_num_col, "")).strip()
        if not client_name or client_name == "nan":
            errors_in_row.append(f"Row {row_num}: Missing Client Name")
            client_name = ""
        if not invoice_number or invoice_number == "nan":
            errors_in_row.append(f"Row {row_num}: Missing Invoice Number")
            invoice_number = ""

        # Parse dates
        try:
            invoice_date = pd.to_datetime(row[inv_date_col]).date()
        except Exception:
            errors_in_row.append(f"Row {row_num}: Invalid Invoice Date")
            invoice_date = None

        try:
            due_date = pd.to_datetime(row[due_date_col]).date()
        except Exception:
            errors_in_row.append(f"Row {row_num}: Invalid Due Date")
            due_date = None

        # Parse amount
        try:
            amount_val = str(row[amount_col]).replace(",", "").strip() # Remove commas if present
            amount = Decimal(amount_val)
            if amount <= 0:
                errors_in_row.append(f"Row {row_num}: Invoice Amount must be positive")
                amount = None
        except (InvalidOperation, ValueError, TypeError):
            errors_in_row.append(f"Row {row_num}: Invalid Invoice Amount")
            amount = None

        if errors_in_row:
            result.errors.extend(errors_in_row)
            continue

        # Check duplicate
        exists = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
        if exists:
            result.duplicates += 1
            continue

        # Find or create client
        client = db.query(Client).filter(Client.company_name.ilike(client_name)).first()
        if not client:
            if auto_create_clients:
                client = Client(company_name=client_name)
                db.add(client)
                db.flush()
                result.new_clients_created += 1
            else:
                result.errors.append(f"Row {row_num}: Client '{client_name}' not found")
                continue

        inv = Invoice(
            client_id=client.id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            total_amount=amount,
        )
        db.add(inv)
        result.imported += 1

    db.commit()
    return result


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: UUID, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(inv)
    db.commit()
