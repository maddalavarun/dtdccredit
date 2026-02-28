import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

def main():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                full_name="System Administrator",
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print("Successfully created the 'admin' user with password 'admin123'.")
        else:
            print("The 'admin' user already exists.")
    except Exception as e:
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
