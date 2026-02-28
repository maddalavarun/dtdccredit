import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.models import User
from app.auth import hash_password

# Load environment variables
DATABASE_URL = "postgresql+psycopg://neondb_owner:npg_82unsOLTvAkH@ep-green-sea-a1nmo6q0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Find the user
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        user.username = "vf050"
        user.hashed_password = hash_password("Varun@2004")
        db.commit()
        print("Successfully updated user credentials to vf050 / Varun@2004")
    else:
        # If 'admin' was already renamed or missing, check and create if needed
        existing = db.query(User).filter(User.username == "vf050").first()
        if existing:
            existing.hashed_password = hash_password("Varun@2004")
            db.commit()
            print("User 'vf050' already existed. Password updated.")
        else:
            new_user = User(
                username="vf050",
                full_name="Admin",
                hashed_password=hash_password("Varun@2004"),
                role="admin"
            )
            db.add(new_user)
            db.commit()
            print("Created new user 'vf050' / Varun@2004")
finally:
    db.close()
