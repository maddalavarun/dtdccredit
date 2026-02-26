import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Client, Invoice, Payment, User

def main():
    db = SessionLocal()
    try:
        users = db.query(User).count()
        clients = db.query(Client).count()
        invoices = db.query(Invoice).count()
        payments = db.query(Payment).count()
        print(f"Users: {users}")
        print(f"Clients: {clients}")
        print(f"Invoices: {invoices}")
        print(f"Payments: {payments}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
