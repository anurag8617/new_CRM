# AI-Native CRM Platform

Enterprise-grade, AI-Native CRM Platform built on **React.js + Node.js + MySQL**.

Based on the [CRM-Platform-Specification.md](./CRM-Platform-Specification.md).

---

## 📁 Project Structure

```text
CRM/
├── CRM-Platform-Specification.md   # Architectural & MVP Specification
├── package.json                    # Root scripts for concurrently running services
├── .gitignore                      # Git ignore file
├── backend/                        # Node.js + Express API
│   ├── .env                        # Local backend configuration
│   ├── .env.example                # Example backend environment variables
│   ├── package.json                # Backend dependencies (express, mysql2, etc.)
│   └── src/
│       ├── config/
│       │   ├── env.js              # Environment settings parser
│       │   └── db.js               # MySQL connection pool & auto-init
│       ├── middlewares/
│       │   └── errorHandler.js     # Global error handling
│       ├── app.js                  # Express app & route mounting
│       └── server.js               # Server initialization
└── frontend/                       # React.js + Vite + Tailwind CSS SPA
    ├── .env                        # Local frontend environment variables
    ├── .env.example                # Example frontend environment variables
    ├── package.json                # Frontend dependencies (react, lucide-react, etc.)
    ├── vite.config.js              # Vite bundler configuration & API proxy
    ├── tailwind.config.js          # Tailwind CSS styling configuration
    └── src/
        ├── components/
        │   ├── Navbar.jsx          # Header navigation
        │   └── Sidebar.jsx         # Specification module sidebar
        ├── services/
        │   └── api.js              # Pre-configured Axios client
        ├── App.jsx                 # Dashboard with real-time health indicator
        ├── main.jsx                # React DOM entry
        └── index.css               # Global Tailwind CSS styles
```

---

## 🚀 Quick Start

### 1. Start Both Backend & Frontend Simultaneously
From the root `CRM` directory:
```bash
npm run dev
```

### 2. Start Services Individually
- **Backend API only:**
  ```bash
  npm run server
  # Or: cd backend && npm run dev
  # Runs at http://localhost:5000
  # Health check: http://localhost:5000/api/health
  ```
- **Frontend App only:**
  ```bash
  npm run client
  # Or: cd frontend && npm run dev
  # Runs at http://localhost:5173
  ```

### 3. Database Management (MySQL)
- Run full setup (migrations + seed data):
  ```bash
  npm run db:setup
  ```
- Run migrations only:
  ```bash
  npm run db:migrate
  ```
- Run seed data only:
  ```bash
  npm run db:seed
  ```

---

## 🗄️ MySQL Database Architecture & Seeded Defaults

- **Database:** `crm_db` (MySQL on `localhost:3306`)
- **Total Tables:** 17 InnoDB tables covering Multi-Tenancy (§0), RBAC & Permissions (§1), Contacts & Companies (§6 & §7), Unified Activity Timeline (§10), and Audit Governance (§40).
- **Default Organization Tenant:** `Acme Corp Global` (`slug: acme-corp`)
- **Default Workspace:** `Global Sales & Support` (`slug: global-sales`)
- **Default Administrator Credentials:**
  - **Email:** `admin@crm.local`
  - **Password:** `Admin@123456`
  - **Role:** `Super Admin` (all permissions, full system scope)

---

## 🔐 Authentication & Security (§0, §1, §41)

- `POST /api/v1/auth/login` — Authenticate email/password via bcrypt; issues JWT access token + refresh token stored in `user_sessions`. Logs login event in `audit_logs`.
- `POST /api/v1/auth/refresh` — Issue fresh access token from valid refresh token.
- `GET /api/v1/auth/me` — Protected route returning user profile, tenant organization, workspace, and all 38 resolved permissions.
- `POST /api/v1/auth/logout` — Revokes session from MySQL `user_sessions`.

---

## 👥 Standard CRM Objects & Unified Timeline (§6, §7, §10)

- **Companies (`/api/v1/companies`):**
  - `GET /api/v1/companies` — List with search (name, domain, industry, city), pagination, sorting, and contact counts.
  - `POST /api/v1/companies` — Create company account with tenant isolation and audit logging.
  - `GET /api/v1/companies/:id` — Single company with associated contacts.
  - `PUT /api/v1/companies/:id` — Update company fields.
  - `DELETE /api/v1/companies/:id` — Remove company record.
- **Contacts (`/api/v1/contacts`):**
  - `GET /api/v1/contacts` — List with search (name, email, company), lifecycle stage filters, pagination.
  - `POST /api/v1/contacts` — Create contact record with company association and auto-creation activity.
  - `GET /api/v1/contacts/:id` — Contact details with chronological activity timeline.
  - `PUT /api/v1/contacts/:id` — Update contact; tracks lifecycle stage transitions in timeline feed.
  - `DELETE /api/v1/contacts/:id` — Delete contact record.
- **Unified Timeline Feed (`/api/v1/activities`):**
  - `GET /api/v1/activities?recordType=contact&recordId=:id` — Chronological merged feed of notes, calls, emails, status changes, and creation events.
  - `POST /api/v1/activities` — Log a new note, call summary, or meeting to any record.



