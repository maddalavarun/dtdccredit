import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User

def main():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            db.delete(admin_user)
            db.commit()
            print("Successfully deleted the 'admin' user.")
        else:
            print("The 'admin' user does not exist in the database.")
    except Exception as e:
        print(f"Error deleting user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
