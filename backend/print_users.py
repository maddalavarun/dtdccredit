import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User

def main():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            print(f"User: {u.username}, Role: {u.role}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
