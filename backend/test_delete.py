import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Client, Invoice, Payment
import uuid

def test_delete():
    db = SessionLocal()
    try:
        # Create a dummy client
        client_id = uuid.uuid4()
        client = Client(id=client_id, company_name="Test Delete Client")
        db.add(client)
        
        # Create a dummy invoice
        inv_id = uuid.uuid4()
        inv = Invoice(id=inv_id, client_id=client_id, invoice_number="TESTDEL-01", invoice_date="2026-01-01", due_date="2026-02-01", total_amount=100)
        db.add(inv)
        
        # Create a payment
        pay = Payment(invoice_id=inv_id, amount=50, payment_date="2026-01-15")
        db.add(pay)
        
        db.commit()
        print("Created dummy data.")
        
        # Now try to delete the invoice
        db.delete(inv)
        db.commit()
        print("Successfully deleted invoice (and cascaded payment).")
        
        # Now try to delete the client
        db.delete(client)
        db.commit()
        print("Successfully deleted client.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_delete()
