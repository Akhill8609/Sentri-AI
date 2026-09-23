# SentriAI

**Your Intelligent Digital Security Companion**

An autonomous, agentic AI-powered digital security platform designed specifically for **Students** and **Employees** to investigate, understand, and safely neutralize suspicious digital activities (phishing emails, malicious links, fake scholarship alerts, HR scams, password resets, and account compromises).

---

## 🌟 Core Architecture & Highlights

```
                          ┌───────────────────────────┐
                          │   Frontend (React + TS)   │
                          │ Soft Pastel Design System │
                          │ Student / Employee / SOC  │
                          └─────────────┬─────────────┘
                                        │ REST / JSON
                                        ▼
                          ┌───────────────────────────┐
                          │     FastAPI Backend       │
                          │ Auth & OTP / RBAC / Audit │
                          └──────┬─────────────┬──────┘
                                 │             │
                    ┌────────────▼──┐       ┌──▼────────────┐
                    │ SENTRIAI AGENT│       │  RAG ENGINE   │
                    │  Orchestrator │       │ Document Ingest│
                    │  Tool Calling │◄─────►│ Chunking/Embed│
                    │  State Memory │       │ Vector Search │
                    └──────┬────────┘       └──┬────────────┘
                           │                   │
         ┌─────────────────┼───────────────────┼─────────────────┐
         │                 │                   │                 │
         ▼                 ▼                   ▼                 ▼
   12 Agent Tools    Risk Scorer         LLM Service      Database (SQLite/PG)
   (URL, Email,      (0-100 rubric,      (Gemini/OpenAI/   - Users & OTP Tokens
    Logs, Playbooks)  Explainable)        SentriAI Engine) - Incidents & Events
                                                           - Knowledge Chunks
                                                           - Tool Call Traces
```

1. **Email OTP Registration & Activation**:
   - Backend-controlled email OTP registration and activation (no Firebase dependency).
   - Strict password security validation (8+ characters, uppercase, lowercase, numbers, special characters).
   - Secure 6-digit OTP dispatched via standard SMTP with 5-minute validity, 5-attempt limit, and 60-second resend cooldown.
   - Built-in developer sandbox fallback (`dev_otp`) for frictionless local testing and instant automated evaluation.

2. **Calibrated 4-Tier Explainable Risk Engine**:
   - Standardized non-alarmist assessment bands:
     - **0–24: LOW** (Likely Benign)
     - **25–49: MEDIUM** (Potentially Suspicious / Requires Review)
     - **50–74: HIGH** (Likely Phishing / Possible Social Engineering)
     - **75–100: CRITICAL** (Critical Threat Attack)
   - Every score is backed by granular point breakdowns and actionable **"What Should I Do Now?"** steps.

3. **True Tool-Calling AI Agent**:
   The SentriAI agent orchestrates 12 specialized tools dynamically:
   - `analyze_message()`: Detects psychological urgency, financial lures, credential prompts.
   - `analyze_email()`: Evaluates sender spoofing, SPF/DKIM cues, and domain reputation.
   - `extract_urls()`: Parses links, raw IP addresses, and embedded hostnames.
   - `analyze_url()`: Detects typosquatting, deceptive subdomains, and risky TLDs (.xyz, .tk, .top).
   - `search_incident_history()`: Cross-references prior attack waves across campus/workplace.
   - `search_security_logs()`: SIEM and perimeter telemetry cross-matching.
   - `calculate_risk()`: Transparent explainable rubric (0–100).
   - `retrieve_security_knowledge()`: Semantic vector retrieval over institutional advisories.
   - `retrieve_incident_response_playbook()`: Retrieves emergency step-by-step containment playbooks.
   - `generate_action_plan()`: Builds prominent **"What Should I Do Now?"** steps.
   - `create_incident_report()`: Assembles structured investigation case files.
   - `escalate_incident()`: Priority escalation to human SOC Analyst queue.

4. **Real RAG Pipeline**:
   - Institutional knowledge documents chunked into overlapping token windows.
   - Vector embeddings calculated and stored with semantic cosine similarity retrieval.
   - Admin upload portal allows instant indexing of new policies and guides.
   - Shows transparent source citations, categories, and relevance rationales.

5. **Soft Pastel Design System**:
   - Approachable, calm, and trustworthy for students and employees.
   - Gentle mint, lavender, peach, and sky blue accents on soft white cards.
   - Completely avoids dark hacker terminal aggression or neon green clichés.

6. **Dual Role & Human-in-the-Loop Operations**:
   - **Student Mode**: Fake scholarships, bogus internships, exam notice scams, student portal spoofing.
   - **Employee Mode**: HR benefits scams, IT support password resets, invoice fraud, MFA push bombing.
   - **SOC Analyst & Admin Center**: Triage queue, tool call execution traces, threat trends, and human-in-the-loop containment simulations (domain block, session revocation, forced password reset).

---

## 🚀 Quick Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
# Run full automated test suite:
python -m pytest tests/test_backend.py -v

# Start backend server (starts on http://127.0.0.1:8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Note: The database automatically initializes and primes seed users, realistic incidents, and knowledge base documents on startup.*

### 2. Frontend Setup
```bash
cd frontend
npm install
# Start development server (starts on http://127.0.0.1:5173)
npm run dev
```

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Persona |
| :--- | :--- | :--- | :--- |
| **Student** | `student@university.edu` | `Password123!` | Alex Rivera (Undergraduate Student) |
| **Employee** | `employee@company.com` | `Password123!` | Michael Scott (Operations Lead) |
| **SOC Analyst** | `analyst@sentriai.io` | `Password123!` | Sarah Chen (Tier 2 SOC Analyst) |
| **Admin** | `admin@sentriai.io` | `Password123!` | Chief Security Administrator |

*(Quick-switch demo buttons are accessible directly in the top navbar and login page for 1-click evaluation).*

---

## 🎯 Three End-to-End Demo Scenarios

### Scenario 1: ₹50,000 Scholarship Lure (Student Mode)
- **Input**: *"Congratulations! You have been selected for a ₹50,000 scholarship. Claim your scholarship by logging into this link: http://scholarship-portal.xyz/login within 24 hours."*
- **Agent Execution**:
  1. Extracts financial reward lure (+20) and urgency cue (+20).
  2. Extracts URL `http://scholarship-portal.xyz/login`.
  3. Inspects domain: detects high-risk `.xyz` TLD and `/login` credential path (+25).
  4. Retrieves Student Cybersecurity Handbook via RAG.
  5. Computes transparent risk: **92/100 (CRITICAL)**.
  6. Generates prominent **"What Should I Do Now?"** action plan.
  7. Registers case and displays in SOC Analyst Triage Queue.

### Scenario 2: Urgent Company Account Disabled Notice (Employee Mode)
- **Input**: *"From: IT Support <it-support@freemail-alerts.com> | Subject: Action Required: Your company account will be disabled today. Verify your password immediately at https://login-company-portal.top/auth"*
- **Agent Execution**:
  1. Detects sender spoofing (freemail posing as corporate IT).
  2. Evaluates credential solicitation and urgent deactivation threat.
  3. Retrieves Employee Defense & Playbook guidance.
  4. Assigns Risk score **88/100 (CRITICAL)**.
  5. Places incident in SOC Analyst queue for human review.

### Scenario 3: Agentic Emergency Response (Compromise Triage)
- **Input**: User reports clicking a link and submitting their password.
- **Agent Execution**:
  1. Evaluates confirmed credential submission (+35).
  2. Retrieves Emergency Account Compromise Playbook via RAG.
  3. Instantly prescribes immediate actions: reset password via official site, revoke active sessions, and check MFA devices.
  4. Automatically escalates incident to SOC queue.
  5. Allows SOC Analyst to simulate defensive gateway block and IdP token revocation with one click.
