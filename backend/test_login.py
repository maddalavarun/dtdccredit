import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.auth import verify_password
from app.database import SessionLocal
from app.models import User

def test_login():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            print("Admin user not found in DB!")
            return
        print(f"User found, hashed_password: {user.hashed_password}")
        
        result = verify_password("admin123", user.hashed_password)
        print(f"Password verification result: {result}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
