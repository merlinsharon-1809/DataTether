# DataTether — System Architecture & Design

## 1. Executive Summary

DataTether solves the critical governance challenge of modern distributed computing: **perimeter defenses end at cloud boundaries, but data journeys continue.**

By embedding metadata passports, mathematical quasi-identifier linkage models, policy engines, and lineage verification directly into data lifecycle operations, DataTether guarantees verifiable governance across multi-tenant architectures and AI pipelines.

---

## 2. Architectural Diagram

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         Presentation Tier (Frontend)                        │
 │  • React 19 + TypeScript + Vite SPA                                         │
 │  • Modern Dark Glassmorphic Design System                                    │
 │  • Interactive Lineage Graphs & 4-Quadrant Evidence Auditing               │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ REST / JSON (HTTP)
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         Application Tier (FastAPI)                          │
 │                                                                             │
 │   ┌───────────────────────┐  ┌──────────────────────────────────────────┐   │
 │   │ Dataset & Passport    │  │ Combination & Linkage Analyzer           │   │
 │   │ Engine                │  │  - Jaccard similarity                    │   │
 │   │  - Schema profiling   │  │  - Quasi-identifier intersection        │   │
 │   │  - Classification     │  │  - Risk level scoring                    │   │
 │   └───────────┬───────────┘  └────────────────────┬─────────────────────┘   │
 │               │                                   │                         │
 │   ┌───────────▼───────────┐  ┌────────────────────▼─────────────────────┐   │
 │   │ Policy Evaluation     │  │ Directed Lineage Graph Engine            │   │
 │   │ Engine                │  │  - DFS / Kahn's Cycle Prevention         │   │
 │   │  - Rule resolution    │  │  - Upstream/downstream traversal         │   │
 │   │  - Hard vs Soft gates │  │  - Transformation logging                │   │
 │   └───────────┬───────────┘  └────────────────────┬─────────────────────┘   │
 │               │                                   │                         │
 │               └─────────────────┬─────────────────┘                         │
 │                                 │                                           │
 │               ┌─────────────────▼─────────────────┐                         │
 │               │ 5-Stage Orchestrator Pipeline     │                         │
 │               │  1. Observed Facts Capture        │                         │
 │               │  2. Privacy Risk Evaluation       │                         │
 │               │  3. Governance Policy Check       │                         │
 │               │  4. Llama Explainer / Fallback    │                         │
 │               │  5. Status & Approval Finalizer   │                         │
 │               └─────────────────┬─────────────────┘                         │
 └─────────────────────────────────┼───────────────────────────────────────────┘
                                   │ SQLAlchemy ORM
                                   ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         Persistence Tier (SQLite)                           │
 │  • datasets                 • lineage_relationships                         │
 │  • policies                 • investigations                                │
 │  • audit_records            • combination_cache                             │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Engine Deep Dive

### 3.1. Combination & Compound Risk Engine
When multiple datasets are joined (e.g., combining ZIP code and DOB from Dataset A with medical or transaction records in Dataset B), individual privacy guarantees can collapse.
- Computes pairwise Quasi-Identifier overlaps.
- Evaluates re-identification exposure.
- Dynamically escalates privacy levels (e.g., Tier 2 + Tier 2 → Tier 4).

### 3.2. Governance Policy Engine
- Decouples policy definitions from source code.
- Evaluates proposed purposes (e.g., `AI_TRAINING`, `ANALYTICS`, `THIRD_PARTY_SHARING`).
- Distinguishes **HARD_RESTRICTION** (violates data sovereignty/consent) from **SOFT_RESTRICTION** (requires DPO approval or tokenization conditions).

### 3.3. Cycle-Safe Lineage Graph
- Enforces strict Directed Acyclic Graph (DAG) invariants.
- Uses `would_create_cycle()` prior to inserting any transformation edge, preventing self-loops and complex cyclic dependencies.

### 3.4. 5-Stage Investigation Orchestration
The central coordinator for automated audits:
1. **Observed Facts**: Gathers registered metadata passports, classifications, and storage locations.
2. **Compound Risk Analysis**: Runs combination analysis across all selected inputs.
3. **Policy Evaluation**: Verifies all applicable policies for the proposed usage purpose.
4. **AI Policy Explanation**: Synthesizes the evidence via Meta Llama (or deterministic rule-based explainer when offline) into human-readable rationale and suggested remediations.
5. **Investigation Status Disposition**:
   - `overall_status`: Set to `BLOCKED` if any hard restriction or critical compound risk is present; otherwise `PERMITTED` or `REQUIRES_CONDITIONS`.
   - `human_review_status`: Marked as `PENDING_DPO_APPROVAL` whenever manual compliance sign-off is required, accurately distinguishing automated evaluation from human action.
