# DTDC Credit Client Monitoring System

Internal web application to track DTDC credit clients, invoices, payments, outstanding balances, and send WhatsApp reminders.

## Quick Start

### Backend (FastAPI)

```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] pandas openpyxl python-multipart pydantic[email-validator] pydantic-settings bcrypt==4.0.1

# Start server
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

### Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Default Login**: `admin` / `admin123`

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | FastAPI + SQLAlchemy |
| Database  | SQLite (can upgrade to PostgreSQL) |
| Excel     | Pandas + openpyxl |

## Features

- **Dashboard** — Total outstanding, overdue, payments today, clients over credit limit
- **Client Management** — CRUD with credit limits and outstanding summaries
- **Invoice Import** — Upload Excel/CSV with auto-validation and duplicate detection
- **Payment Tracking** — Partial payments, overpayment protection, payment history
- **WhatsApp Reminders** — Pre-filled WhatsApp message for overdue invoices
- **Reports** — Outstanding, overdue, payment history with Excel export

## Excel Import Format

The import file must have these columns:

| Column | Description |
|--------|-----------|
| Client Name | Company name |
| Invoice Number | Unique invoice identifier |
| Invoice Date | Date of invoice (any standard date format) |
| Due Date | Payment due date |
| Invoice Amount | Positive numeric amount |
