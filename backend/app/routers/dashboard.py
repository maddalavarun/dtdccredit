from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client, Invoice, Payment, User
from app.schemas import DashboardData, ClientSummary
from app.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    today = date.today()

    # Count totals in single queries
    total_clients = db.query(func.count(Client.id)).scalar()
    total_invoices = db.query(func.count(Invoice.id)).scalar()

    # Get all invoice data with payment sums in ONE query
    invoice_data = (
        db.query(
            Invoice.client_id,
            Invoice.id.label("invoice_id"),
            Invoice.total_amount,
            Invoice.due_date,
            func.coalesce(func.sum(Payment.amount), 0).label("paid_amount"),
        )
        .outerjoin(Payment, Payment.invoice_id == Invoice.id)
        .group_by(Invoice.client_id, Invoice.id, Invoice.total_amount, Invoice.due_date)
        .all()
    )

    # Aggregate per client in Python (fast, no more DB calls)
    total_outstanding = Decimal("0")
    total_overdue = Decimal("0")
    client_agg = {}

    for row in invoice_data:
        cid = str(row.client_id)
        if cid not in client_agg:
            client_agg[cid] = {"outstanding": Decimal("0"), "overdue": Decimal("0"), "overdue_count": 0, "invoice_count": 0}
        
        agg = client_agg[cid]
        agg["invoice_count"] += 1

        outstanding = Decimal(str(row.total_amount)) - Decimal(str(row.paid_amount))
        
        if outstanding > 0:
            total_outstanding += outstanding
            agg["outstanding"] += outstanding
            if row.due_date < today:
                total_overdue += outstanding
                agg["overdue"] += outstanding
                agg["overdue_count"] += 1

    # Get client details only for clients with data
    client_ids_with_data = list(client_agg.keys())
    clients_map = {}
    if client_ids_with_data:
        clients = db.query(Client).filter(Client.id.in_(client_ids_with_data)).all()
        clients_map = {str(c.id): c for c in clients}

    # Build top 5 outstanding clients
    top_client_ids = sorted(client_agg.keys(), key=lambda cid: client_agg[cid]["outstanding"], reverse=True)[:5]
    top_5 = []
    for cid in top_client_ids:
        client = clients_map.get(cid)
        if not client:
            continue
        agg = client_agg[cid]
        top_5.append(ClientSummary(
            id=client.id,
            company_name=client.company_name,
            contact_person=client.contact_person,
            phone=client.phone,
            email=client.email,
            credit_limit=client.credit_limit,
            created_at=client.created_at,
            total_outstanding=agg["outstanding"],
            total_overdue=agg["overdue"],
            overdue_count=agg["overdue_count"],
            invoice_count=agg["invoice_count"],
        ))

    # Payments received today - single query
    payments_today = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_date == today
    ).scalar()

    return DashboardData(
        total_outstanding=total_outstanding,
        total_overdue=total_overdue,
        payments_today=Decimal(str(payments_today)),
        total_clients=total_clients,
        total_invoices=total_invoices,
        top_outstanding_clients=top_5,
    )
