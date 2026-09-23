# 🛡️ SentriAI

### Intelligent Digital Security Companion

SentriAI is an AI-powered cybersecurity platform designed to help users **detect, analyze, investigate, and manage digital security threats** from a centralized interface.

It combines a **React + TypeScript frontend**, **FastAPI backend**, database-backed incident management, and **Microsoft Azure AI / Foundry** integration to provide an intelligent security analysis experience.

\---

## ✨ Features

|Feature|Description|
|-|-|
|🔐 **Authentication**|Secure user registration, login, verification and password management|
|🤖 **AI Assistant**|Interactive AI-powered security assistance|
|📧 **Email Analysis**|Analyze suspicious emails for potential security threats|
|💬 **Message Analysis**|Detect suspicious content in messages|
|🔗 **URL Analysis**|Analyze potentially malicious URLs|
|📁 **File Analysis**|Upload and analyze suspicious files|
|🚨 **Incident Management**|Create, track and manage security incidents|
|🕵️ **AI Investigation**|Investigate security incidents using the AI agent|
|📊 **SOC Dashboard**|Centralized security operations dashboard|
|📈 **Threat Trends**|Monitor security activity and threat patterns|
|📚 **Knowledge Base**|Security knowledge retrieval using RAG|
|📝 **Audit Logs**|Track important security-related activities|
|⚠️ **Emergency Compromise**|Report and manage compromised accounts|
|👤 **User Management**|Manage platform users and roles|

\---

## 🧰 Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* Lucide React

### Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* JWT Authentication

### Database

* SQLite — default configuration
* PostgreSQL — supported

### AI \& Security

* Microsoft Azure AI / Foundry
* OpenAI SDK
* AI-powered threat analysis
* RAG-based knowledge retrieval

\---

## 🏗️ Architecture

```text
┌──────────────────────────────┐
│          Frontend            │
│      React + TypeScript      │
│          Vite                │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│           Backend            │
│          FastAPI             │
│                               │
│ ┌────────┐ ┌──────────────┐  │
│ │ Auth   │ │   Analysis   │  │
│ ├────────┤ ├──────────────┤  │
│ │ Agent  │ │  Incidents   │  │
│ ├────────┤ ├──────────────┤  │
│ │ Audit  │ │  Dashboard   │  │
│ └────────┘ └──────────────┘  │
└──────────────┬───────────────┘
               │
        ┌──────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│   Database   │  │   Azure AI   │
│ SQLite / PG  │  │   / Foundry  │
└──────────────┘  └──────────────┘
```

\---

## 📁 Project Structure

```text
azure-project/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent.py
│   │   │   ├── analysis.py
│   │   │   ├── audit.py
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── incidents.py
│   │   │   └── knowledge.py
│   │   │
│   │   ├── core/
│   │   ├── models/
│   │   ├── seed/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── data/
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── .env.example
├── .gitignore
└── README.md
```

\---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed:

* **Python 3.10+**
* **Node.js**
* **npm**
* Git

Check your installations:

```bash
python --version
node --version
npm --version
git --version
```

### 1\. Clone the Repository

```bash
git clone https://github.com/ShubhdeepBH/azure-project.git
cd azure-project
```

\---

## ⚙️ Backend Setup

Open a terminal in the project directory.

### 2\. Create a Virtual Environment

```powershell
cd backend
python -m venv venv
```

### 3\. Activate the Virtual Environment

**Windows PowerShell:**

```powershell
.\\venv\\Scripts\\Activate.ps1
```

If you are using Command Prompt:

```cmd
venv\\Scripts\\activate
```

### 4\. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 🔑 Backend Environment Variables

Create the backend environment file:

```powershell
Copy-Item .env.example .env
```

Your file should be located at:

```text
backend/.env
```

Configure the required values.

**Database**

The default setup uses SQLite, so no external database is required:

```env
DATABASE\_URL="sqlite:///./data/sentri\_ai.db"
```

**Azure AI**

For Microsoft Azure AI / Foundry:

```env
AZURE\_AI\_PROJECT\_ENDPOINT="your-azure-project-endpoint"
AZURE\_AI\_MODEL="gpt-5-mini"
```

The project endpoint follows this format:

```text
https://<resource>.services.ai.azure.com/api/projects/<project-name>
```

> \*\*Note:\*\* Do not append `/openai/v1/responses` to the Azure project endpoint.

**Security**

Set a secure JWT secret:

```env
JWT\_SECRET="your-secure-secret"
```

**Email**

If email verification/OTP functionality is required, configure the SMTP settings in `.env`.

\---

## ▶️ Start the Backend

From the `backend` directory:

```powershell
uvicorn app.main:app --reload
```

Or:

```powershell
python -m uvicorn app.main:app --reload
```

The API will be available at:

**http://127.0.0.1:8000**

### 📖 API Documentation

Once the backend is running:

* **Swagger UI:** http://127.0.0.1:8000/docs
* **ReDoc:** http://127.0.0.1:8000/redoc
* **Health Check:** http://127.0.0.1:8000/health

Expected response:

```json
{
  "status": "healthy",
  "service": "SentriAI API"
}
```

\---

## 💻 Frontend Setup

Open a **new terminal** while keeping the backend running.

From the project root:

```powershell
cd frontend
```

### Install Dependencies

```powershell
npm install
```

### 🔑 Frontend Environment Variables

Create the frontend `.env`:

```powershell
Copy-Item .env.example .env
```

The default configuration is:

```env
VITE\_API\_BASE\_URL=/api/v1
```

\---

## ▶️ Start the Frontend

```powershell
npm run dev
```

Vite will display the development URL.

Usually:

**http://localhost:5173**

Open the URL in your browser.

\---

## 🔄 Running the Full Application

You need **two terminals**.

**Terminal 1 — Backend**

```powershell
cd azure-project\\backend
.\\venv\\Scripts\\Activate.ps1
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend**

```powershell
cd azure-project\\frontend
npm install
npm run dev
```

Then open:

**http://localhost:5173**

\---

## 🗄️ Database

SentriAI uses SQLite by default.

```text
backend/data/sentri\_ai.db
```

The backend automatically initializes the database when it starts and runs the seed process.

No PostgreSQL installation is required for the default local setup. PostgreSQL can be configured through `DATABASE\_URL` if required.

\---

## 🔌 API Overview

The backend exposes REST APIs under:

```text
/api/v1
```

**Authentication**

```text
/api/v1/auth
```

**Security Analysis**

```text
/api/analyze/email
/api/analyze/message
/api/analyze/url
/api/analyze/file
/api/analyze/compromise
```

**AI**

```text
/api/ai/chat
/api/ai/investigate
```

**SOC**

```text
/api/soc/dashboard
/api/soc/incidents
/api/soc/analytics
```

**Other**

```text
/api/v1/incidents
/api/v1/dashboard
/api/v1/knowledge
/api/v1/audit
```

For the complete list of available endpoints, use the Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

\---

## 🧪 Testing

Backend tests are located in:

```text
backend/tests/
```

Run all tests:

```powershell
cd backend
pytest
```

Run a specific test:

```powershell
pytest tests/test\_backend.py
```

\---

## 🐛 Troubleshooting

### `ModuleNotFoundError`

Make sure the virtual environment is activated:

```powershell
.\\venv\\Scripts\\Activate.ps1
```

Then reinstall dependencies:

```powershell
pip install -r requirements.txt
```

### `uvicorn is not recognized`

Use:

```powershell
python -m uvicorn app.main:app --reload
```

### Frontend cannot connect to backend

Make sure:

* Backend is running on port `8000`
* Frontend is running on port `5173`
* `VITE\_API\_BASE\_URL=/api/v1`
* Backend CORS settings allow the frontend origin

### Azure AI errors

Check your:

```env
AZURE\_AI\_PROJECT\_ENDPOINT
AZURE\_AI\_MODEL
```

Also verify that your Azure deployment/project is active and accessible.

\---

## 🔐 Security

**Never commit secrets to GitHub.**

The following files must remain local:

```text
.env
```

Never commit:

* Azure API keys
* Access tokens
* JWT secrets
* SMTP passwords
* Database credentials
* Other private credentials

Use the provided `.env.example` files as templates.

\---

## 👥 Team Development

Before starting work:

```bash
git pull
```

After making changes:

```bash
git status
git add .
git commit -m "Describe your changes"
git push
```

**Recommended Commit Examples**

```text
feat: add URL analysis
fix: resolve authentication issue
feat: improve SOC dashboard
fix: correct Azure AI integration
docs: update README
```

\---

## 👨‍💻 Team

### SentriAI Development Team

* **Shubhdeep**
* **Akhil**
* **Arsh**
* **Mitali Gupta**
* **Harshita** 

\---

## 📚 Project Purpose

SentriAI was developed as an academic project to demonstrate the integration of:

* Modern web development
* REST APIs
* Authentication
* Database management
* AI-powered security analysis
* Microsoft Azure AI services
* Threat and incident management
* Security operations workflows

\---

\---

<p align="center">
  Built with ❤️ by the SentriAI team
</p>

