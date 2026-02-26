# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim

WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ ./backend/

# Copy the built React app from Stage 1 into the backend's static directory
COPY --from=build /app/frontend/dist ./backend/static

# Expose the port Cloud Run expects
EXPOSE 8080

# Environment variables for Python/FastAPI
ENV PORT=8080
ENV PYTHONPATH=/app/backend

# Navigate to backend to run uvicorn
WORKDIR /app/backend

# Command to run the application using Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
