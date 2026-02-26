import io
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID


import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client, Invoice, Payment, User
from app.schemas import InvoiceOut
from app.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_invoice_data(db: Session, client_id: Optional[UUID], start_date: Optional[date], end_date: Optional[date]):
    """Shared query logic for reports - uses a SINGLE query with JOIN."""
    q = (
        db.query(
            Client.company_name,
            Invoice.invoice_number,
            Invoice.invoice_date,
            Invoice.due_date,
            Invoice.total_amount,
            func.coalesce(func.sum(Payment.amount), 0).label("paid_amount"),
        )
        .join(Client, Invoice.client_id == Client.id)
        .outerjoin(Payment, Payment.invoice_id == Invoice.id)
    )
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if start_date:
        q = q.filter(Invoice.invoice_date >= start_date)
    if end_date:
        q = q.filter(Invoice.invoice_date <= end_date)

    q = q.group_by(
        Client.company_name, Invoice.invoice_number, Invoice.invoice_date,
        Invoice.due_date, Invoice.total_amount,
    ).order_by(Client.company_name, Invoice.invoice_date.desc())

    rows = []
    today = date.today()
    for row in q.all():
        paid_amount = Decimal(str(row.paid_amount))
        outstanding = Decimal(str(row.total_amount)) - paid_amount
        if outstanding <= 0:
            status = "Paid"
        elif paid_amount > 0:
            status = "Partial"
        else:
            status = "Unpaid"
        is_overdue = row.due_date < today and outstanding > 0

        rows.append({
            "Client": row.company_name,
            "Invoice #": row.invoice_number,
            "Invoice Date": row.invoice_date,
            "Due Date": row.due_date,
            "Amount": float(row.total_amount),
            "Paid": float(paid_amount),
            "Outstanding": float(outstanding),
            "Status": status,
            "Overdue": "Yes" if is_overdue else "No",
        })
    return rows


@router.get("/outstanding")
def outstanding_report(
    client_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = _get_invoice_data(db, client_id, start_date, end_date)
    # Only invoices with outstanding > 0
    return [r for r in rows if r["Outstanding"] > 0]


@router.get("/overdue")
def overdue_report(
    client_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = _get_invoice_data(db, client_id, start_date, end_date)
    return [r for r in rows if r["Overdue"] == "Yes"]


@router.get("/payments")
def payment_report(
    client_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Payment).join(Invoice).join(Client)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if start_date:
        q = q.filter(Payment.payment_date >= start_date)
    if end_date:
        q = q.filter(Payment.payment_date <= end_date)
    payments = q.order_by(Payment.payment_date.desc()).all()

    return [{
        "Client": p.invoice.client.company_name,
        "Invoice #": p.invoice.invoice_number,
        "Payment Date": p.payment_date.isoformat(),
        "Amount": float(p.amount),
        "Mode": p.payment_mode or "",
        "Remarks": p.remarks or "",
    } for p in payments]


@router.get("/export")
def export_report(
    report_type: str = Query("outstanding"),
    client_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if report_type == "outstanding":
        data = outstanding_report(client_id, start_date, end_date, db, _user)
    elif report_type == "overdue":
        data = overdue_report(client_id, start_date, end_date, db, _user)
    elif report_type == "payments":
        data = payment_report(client_id, start_date, end_date, db, _user)
    else:
        data = _get_invoice_data(db, client_id, start_date, end_date)

    df = pd.DataFrame(data)
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name="Report")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"},
    )
