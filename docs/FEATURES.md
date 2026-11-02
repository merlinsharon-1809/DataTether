# DataTether — Platform Features & Engine Capabilities

DataTether provides comprehensive governance over the full data lifecycle. This document outlines the user interface dashboards and backend engines that power the platform.

---

## 1. User Interface Dashboards (Frontend)

The frontend is organized into 9 specialized, intuitive views:

1. **Executive Overview (`/`)**
   - High-level KPIs: Total registered datasets, active governance policies, observed risk flags, and recent investigation outcomes.
   - Real-time status indicators for backend connectivity and AI explainer status.

2. **Dataset Inventory (`/inventory`)**
   - Filterable catalog of all datasets across cloud environments and on-premises stores.
   - Instant search by name, owner, sensitivity tier, and storage provider.

3. **Data Passport Detail (`/passport`)**
   - Cryptographically verifiable passport for individual datasets.
   - Inspects schema types, field classifications (PII, Financial, Demographic), cryptographic hashes, and permitted processing purposes.

4. **Lineage Explorer (`/lineage`)**
   - Visual DAG representing how datasets derive from, combine into, and transform one another.
   - Interactive nodes with metadata inspection and cycle prevention controls.

5. **Compound Risk / Combination Analyzer (`/combination`)**
   - Multi-dataset selector to preview linkage risks before joining tables in production or data lakes.
   - Displays overlapping quasi-identifiers and compound sensitivity escalation.

6. **Policy Studio (`/policies`)**
   - Configurable compliance rules engine.
   - Define hard vs. soft gates, required anonymization transforms, and authorized departmental scopes.

7. **Investigation Lab (`/investigation`)**
   - 4-Quadrant Evidence layout:
     - **Quadrant 1: Observed Facts** (Schema, source, raw attributes).
     - **Quadrant 2: Privacy Risk Assessment** (Linkage metrics, risk scores).
     - **Quadrant 3: Policy Constraints** (Passed/failed compliance checks).
     - **Quadrant 4: AI Explainer & Recommendations** (Synthesized guidance).
   - DPO decision actions (Approve with conditions, reject, or request mitigations).

8. **Audit Trail (`/audit`)**
   - Immutable log of all investigation runs, lineage modifications, and policy updates for regulatory accountability.

9. **Cloud Storage Browser (`/storage`)**
   - Inspects cloud storage buckets (S3, GCS, Azure Blob) and initiates automatic dataset onboarding.

---

## 2. Backend Governance Engines

### Engine 1: Dataset & Passport Registry
- Tracks metadata passports with strict Pydantic schemas.
- Handles automated data profiling and field-level classification.

### Engine 2: Combination & Quasi-Identifier Risk Engine
- Implements set-intersection algorithms to pinpoint quasi-identifiers (e.g., Age + Gender + Zip code).
- Prevents mosaic/linkage attacks prior to ETL execution.

### Engine 3: Policy Compliance Evaluator
- Evaluates dataset passports against business and regulatory policies.
- Generates clear audit findings with rule violation breakdowns.

### Engine 4: Cycle-Safe Lineage Graph Manager
- Manages dataset derivation graph with in-memory cycle detection.
- Guarantees DAG acyclicity for all transformation paths.

### Engine 5: 5-Stage Investigation Orchestrator
- Executes the entire audit sequence in an atomic, predictable pipeline.
- Ensures sound governance status transitions (`BLOCKED`, `PERMITTED`, `PENDING_DPO_APPROVAL`).

### Engine 6: Hybrid AI Policy Explainer
- Integrates Meta Llama models with a resilient deterministic rule fallback.
- Translates machine-readable policy violations into plain-English mitigation plans.
