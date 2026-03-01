"""
Set up fresh tables on Neon PostgreSQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

NEON_URL = "postgresql+psycopg://neondb_owner:npg_82unsOLTvAkH@ep-green-sea-a1nmo6q0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

print("Connecting to Neon...")
neon_engine = create_engine(NEON_URL, connect_args={"prepare_threshold": 0})

# Import models to create tables
from app.database import Base
from app.models import User, Client, Invoice, Payment

print("Creating tables on Neon...")
Base.metadata.create_all(bind=neon_engine)
print("✅ Tables created on Neon!")

        admin_user = db.query(User).filter(User.username == admin_username).first()
        if not admin_user:
            admin_user = User(
                username=admin_username,
                hashed_password=hash_password(admin_password),
                full_name="Administrator",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print(f"Created main admin user: {admin_username}")
        else:
            print(f"Admin user {admin_username} already exists.")

# Verify connection
with neon_engine.connect() as conn:
    from sqlalchemy import text
    result = conn.execute(text("SELECT version()"))
    version = result.scalar()
    print(f"✅ Connected to: {version}")
    
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
    tables = [row[0] for row in result]
    print(f"✅ Tables found: {tables}")

print("\n🎉 Neon setup complete!")
