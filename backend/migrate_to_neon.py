"""
Migrate data from Supabase PostgreSQL to Neon PostgreSQL.
This script:
1. Connects to Supabase, reads all data
2. Creates tables on Neon
3. Inserts all data into Neon
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# --- Connection strings ---
SUPABASE_URL = "postgresql+psycopg://postgres.sqhpbivsznparvkulvjb:RtTjYytIkNskO5Nj@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
NEON_URL = "postgresql+psycopg://neondb_owner:npg_82unsOLTvAkH@ep-green-sea-a1nmo6q0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# ⚠️  IMPORTANT: Replace YOUR-PASSWORD-HERE in SUPABASE_URL with your actual Supabase password!

# --- Setup engines ---
print("Connecting to Supabase...")
supabase_engine = create_engine(SUPABASE_URL, connect_args={"prepare_threshold": 0})

print("Connecting to Neon...")
neon_engine = create_engine(NEON_URL, connect_args={"prepare_threshold": 0})

# --- Import models to create tables ---
from app.database import Base
from app.models import User, Client, Invoice, Payment

# --- Create tables on Neon ---
print("Creating tables on Neon...")
Base.metadata.create_all(bind=neon_engine)
print("✅ Tables created on Neon!")

# --- Migrate data ---
SupabaseSession = sessionmaker(bind=supabase_engine)
NeonSession = sessionmaker(bind=neon_engine)

tables_to_migrate = [
    ("users", User),
    ("clients", Client),
    ("invoices", Invoice),
    ("payments", Payment),
]

supabase_db = SupabaseSession()
neon_db = NeonSession()

try:
    for table_name, Model in tables_to_migrate:
        print(f"\nMigrating '{table_name}'...")
        rows = supabase_db.query(Model).all()
        print(f"  Found {len(rows)} rows in Supabase")

        if rows:
            for row in rows:
                # Detach from supabase session and merge into neon session
                supabase_db.expunge(row)
                neon_db.merge(row)

            neon_db.commit()
            print(f"  ✅ Migrated {len(rows)} rows to Neon!")
        else:
            print(f"  ⚠️  No data to migrate")

    print("\n🎉 Migration complete!")

except Exception as e:
    neon_db.rollback()
    print(f"\n❌ Migration failed: {e}")
    raise
finally:
    supabase_db.close()
    neon_db.close()
