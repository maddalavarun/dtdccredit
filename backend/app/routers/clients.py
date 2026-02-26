from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client, Invoice, Payment, User
from app.schemas import ClientCreate, ClientUpdate, ClientOut, ClientSummary
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/clients", tags=["Clients"])


def _compute_all_client_summaries(db: Session, clients: list) -> list[ClientSummary]:
    """Compute outstanding / overdue for all clients in a SINGLE query."""
    if not clients:
        return []

    today = date.today()
    client_ids = [c.id for c in clients]

    # Single query to get per-client aggregated data
    invoice_stats = (
        db.query(
            Invoice.client_id,
            func.count(Invoice.id).label("invoice_count"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total_amount"),
        )
        .filter(Invoice.client_id.in_(client_ids))
        .group_by(Invoice.client_id)
        .all()
    )
    invoice_map = {str(row.client_id): row for row in invoice_stats}

    # Single query to get per-invoice payment totals, grouped by client
    paid_by_invoice = (
        db.query(
            Invoice.client_id,
            Invoice.id.label("invoice_id"),
            Invoice.total_amount,
            Invoice.due_date,
            func.coalesce(func.sum(Payment.amount), 0).label("paid_amount"),
        )
        .outerjoin(Payment, Payment.invoice_id == Invoice.id)
        .filter(Invoice.client_id.in_(client_ids))
        .group_by(Invoice.client_id, Invoice.id, Invoice.total_amount, Invoice.due_date)
        .all()
    )

    # Aggregate per client
    client_agg = {}
    for row in paid_by_invoice:
        cid = str(row.client_id)
        if cid not in client_agg:
            client_agg[cid] = {"outstanding": Decimal("0"), "overdue": Decimal("0"), "overdue_count": 0, "invoice_count": 0}
        agg = client_agg[cid]
        agg["invoice_count"] += 1
        outstanding = Decimal(str(row.total_amount)) - Decimal(str(row.paid_amount))
        if outstanding > 0:
            agg["outstanding"] += outstanding
            if row.due_date < today:
                agg["overdue"] += outstanding
                agg["overdue_count"] += 1

    results = []
    for client in clients:
        cid = str(client.id)
        agg = client_agg.get(cid, {"outstanding": Decimal("0"), "overdue": Decimal("0"), "overdue_count": 0, "invoice_count": 0})
        results.append(ClientSummary(
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
    return results


@router.get("", response_model=List[ClientSummary])
def list_clients(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Client)
    if search:
        # Escape SQL wildcard characters to prevent injection
        safe_search = search.replace("%", "\\%").replace("_", "\\_")
        q = q.filter(Client.company_name.ilike(f"%{safe_search}%"))
    clients = q.order_by(Client.company_name).all()
    return _compute_all_client_summaries(db, clients)


@router.get("/{client_id}", response_model=ClientSummary)
def get_client(client_id: UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    summaries = _compute_all_client_summaries(db, [client])
    return summaries[0]


@router.post("", response_model=ClientOut, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    client = Client(**body.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: UUID, body: ClientUpdate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(client, key, val)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: UUID, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()
