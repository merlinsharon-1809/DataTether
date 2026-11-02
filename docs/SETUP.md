# DataTether — Local Environment Setup Guide

Follow this guide to set up, run, and test DataTether on your local development machine.

---

## System Requirements

- **Operating System:** Windows 10/11, macOS (Monterey+), or Linux (Ubuntu 20.04+)
- **Python:** Version 3.10, 3.11, or 3.12
- **Node.js:** Version 18.x or higher
- **Package Managers:** `pip` and `npm`

---

## 1. Backend Setup (FastAPI)

### Step 1: Open Terminal & Navigate to Backend
```bash
cd D:/DataTether/backend
```

### Step 2: Create a Virtual Environment
```bash
# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# On Linux or macOS:
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Environment Variables (Optional)
DataTether includes defaults for local development. To configure optional AI keys or custom database paths:
```bash
cp .env.example .env
```
*(If no Meta AI / Llama key is supplied, DataTether seamlessly uses its built-in deterministic fallback explainer).*

### Step 5: Start the Backend Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

## 2. Frontend Setup (React + Vite)

### Step 1: Open a Second Terminal & Navigate to Frontend
```bash
cd D:/DataTether/frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Start the Vite Dev Server
```bash
npm run dev
```
The application will launch at **`http://localhost:5173`**.

---

## 3. Verifying the Setup

Run the automated smoke test from the root directory:
```bash
python tests/test_smoke.py
```
If both tests return `PASS`, your DataTether stack is completely operational!
