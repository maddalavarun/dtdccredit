from decimal import Decimal
from typing import List, Optional
from uuid import UUID


from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment, Invoice, Client, User
from app.schemas import PaymentCreate, PaymentOut
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=List[PaymentOut])
def list_payments(
    invoice_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Payment).join(Invoice)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    payments = q.order_by(Payment.payment_date.desc()).all()
    result = []
    for p in payments:
        inv = p.invoice
        result.append(PaymentOut(
            id=p.id,
            invoice_id=p.invoice_id,
            amount=p.amount,
            payment_date=p.payment_date,
            payment_mode=p.payment_mode,
            remarks=p.remarks,
            created_at=p.created_at,
            invoice_number=inv.invoice_number if inv else None,
            client_name=inv.client.company_name if inv and inv.client else None,
        ))
    return result


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(body: PaymentCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == body.invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Check if payment exceeds outstanding
    paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.invoice_id == inv.id
    ).scalar()
    outstanding = inv.total_amount - Decimal(str(paid))
    if body.amount > outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ₹{body.amount} exceeds outstanding ₹{outstanding}"
        )

    payment = Payment(**body.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut(
        id=payment.id,
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        payment_mode=payment.payment_mode,
        remarks=payment.remarks,
        created_at=payment.created_at,
        invoice_number=inv.invoice_number,
        client_name=inv.client.company_name if inv.client else None,
    )


@router.delete("/{payment_id}", status_code=204)
def delete_payment(payment_id: UUID, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(payment)
    db.commit()
