# DataTether

> **Data protection that follows the data, not the cloud.**

Built for the **Meta Global AI Developer Hackathon**.

DataTether is an intelligent data usage governance and privacy intelligence platform. As cloud ecosystems become decentralized and AI agents consume multi-source data, perimeter-only defenses fail. DataTether anchors cryptographically verifiable **Data Passports** and compound privacy risk evaluations to datasets wherever they travel.

---

## 🌟 Key Features

1. **Dataset Registry & Data Passports**
   - Discovers and registers enterprise and multi-cloud datasets.
   - Generates persistent, tamper-evident metadata passports (field schemas, classification tiers, source origin, allowed purposes).

2. **Compound Privacy Risk Engine**
   - Detects hidden privacy exposure created when seemingly benign datasets are joined together (e.g., quasi-identifier linkage attacks).
   - Calculates re-identification risks and privacy tier escalations.

3. **Governance Policy Evaluation Engine**
   - Configurable compliance rulebooks (GDPR, HIPAA, AI Training restrictions, cross-border transfers).
   - Real-time hard vs. soft rule evaluations with fine-grained conditional approvals.

4. **Lineage & Dependency Graph**
   - Interactive DAG tracking data lineage, transformations, derivations, and downstream sinks.
   - Strict cycle detection prevents circular lineage loops.

5. **5-Stage Investigation Orchestration**
   - End-to-end audit workflow: Observed Facts → Privacy Risk Assessment → Policy Constraints → AI Explainer → Audit Disposition.
   - Distinct separation of automated checks from Data Protection Officer (DPO) human review workflows.

6. **Llama-Powered AI Policy Explainer**
   - Translates complex compliance violations and compound risks into plain-English mitigation steps with deterministic fallback resilience.

---

## 🏛️ System Architecture

```text
                  ┌──────────────────────────────────────────────┐
                  │          React 19 + TypeScript + Vite         │
                  │   Modern Dark Glassmorphism Governance UI    │
                  └──────────────────────┬───────────────────────┘
                                         │ REST API
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            FastAPI Backend Engine             │
                  ├──────────────────────────────────────────────┤
                  │  • Datasets & Passport Manager               │
                  │  • Combination & Linkage Risk Analyzer       │
                  │  • Rule-Based Policy Compliance Engine       │
                  │  • Cycle-Safe Lineage Graph Manager          │
                  │  • 5-Stage Investigation Orchestrator        │
                  │  • Llama-Powered AI Explanation Engine       │
                  └──────────────────────┬───────────────────────┘
                                         │ SQLAlchemy
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          SQLite Local Governance Store        │
                  │           (Persistent Data Tether DB)        │
                  └──────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
DataTether/
├── backend/                  # Python 3.12+ FastAPI backend
│   ├── app/
│   │   ├── api/              # REST API route handlers
│   │   ├── core/             # Configuration and database engine
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Core governance & investigation engines
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Vite + React 19 + TypeScript SPA
│   ├── src/
│   │   ├── components/       # UI layout, graphs, and modals
│   │   ├── pages/            # 9 governance dashboards & views
│   │   └── services/         # API clients
├── docs/                     # Submission documentation & guides
│   ├── ARCHITECTURE.md       # Technical design and orchestrator details
│   ├── FEATURES.md           # Deep dive into all platform capabilities
│   ├── SETUP.md              # Local setup & quick-start manual
│   └── DEMO_SCRIPT.md        # Step-by-step hackathon demo walk-through
├── tests/                    # Automated testing suites
│   └── test_smoke.py         # End-to-end smoke verification script
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (with virtual environment support)
- **Node.js 18+** and **npm**

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend API server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Visit **http://localhost:5173** to launch the DataTether Governance Portal.

---

## 🧪 Smoke Test Verification

You can verify the backend health and API connectivity with the included smoke test:
```bash
python tests/test_smoke.py
```

---

## 📊 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health and service status |
| `GET` / `POST` | `/api/datasets` | Dataset registration and passport listing |
| `POST` | `/api/combination/analyze` | Compound privacy and quasi-identifier linkage analysis |
| `POST` | `/api/policies/evaluate` | Evaluates proposed data usage against policies |
| `GET` / `POST` | `/api/lineage` | Lineage node and edge graph querying |
| `POST` | `/api/investigations/run` | Executes 5-stage automated governance investigation |
| `GET` | `/api/investigations/{id}` | Fetches investigation audit report and evidence quadrants |

---

## 🛡️ License

This project is licensed under the MIT License — see the LICENSE file for details.
