# 🚀 AI-Native CRM Platform — Progress Report & API Testing Guide

**Date:** September 23, 2026  
**Stack:** React.js (Frontend) · Node.js/Express (Backend API) · MySQL 8.0+ (Datastore)  
**Specification Reference:** [CRM-Platform-Specification.md](./CRM-Platform-Specification.md)  
**Database:** `crm_db` on `localhost:3306`

---

## 📋 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Milestones Completed (Steps 1–12)](#2-milestones-completed-steps-112)
3. [MySQL Database Schema (53 Tables)](#3-mysql-database-schema-53-tables)
4. [Default Seeded Credentials & Data](#4-default-seeded-credentials--data)
5. [Complete API Catalog & Testing Guide](#5-complete-api-catalog--testing-guide)
   - [System & Health APIs](#51-system--health-apis)
   - [Authentication & Identity APIs](#52-authentication--identity-apis)
   - [Companies APIs (§7)](#53-companies-apis-7)
   - [Contacts APIs (§6)](#54-contacts-apis-6)
   - [Unified Activity Timeline APIs (§10)](#55-unified-activity-timeline-apis-10)
   - [Deals & Sales Pipeline APIs (§9)](#56-deals--sales-pipeline-apis-9)
   - [Custom Objects & Hybrid Datastore APIs (§2)](#57-custom-objects--hybrid-datastore-apis-2)
   - [Workflow Automation Engine APIs (§15)](#58-workflow-automation-engine-apis-15)
   - [Communication, Tasks & Telephony APIs (§10, §12, §13, §23)](#59-communication-tasks--telephony-apis-10-12-13-23)
   - [AI Copilot & Autonomous Agents APIs (§16, §20, §47, §56)](#510-ai-copilot-smart-summaries--autonomous-agents-16-20-47-56)
   - [Products, Pricebooks & CPQ APIs (§24, §25)](#511-products-pricebooks-quotes--cpq-engine-24-25)
   - [Support, Ticketing & SLA Engine APIs (§23, §26)](#512-omnichannel-support-ticketing--sla-engine-23-26)
6. [One-Click Automated Test Scripts](#6-one-click-automated-test-scripts)
7. [Next Roadmap Step (Step 13)](#7-next-roadmap-step-step-13)

---

## 1. Executive Summary

Today, we built the foundational architecture for the enterprise-grade AI-Native CRM platform. The system operates on a **shared-database, shared-schema multi-tenant model** where all entity records are strictly isolated by `organization_id`. 

The core permission and identity engine enforces a 3-layer authorization model (Module, Record, and Field level), while the unified activity timeline ensures every interaction (notes, calls, meetings, stage updates) is recorded chronologically across standard and custom objects.

---

## 2. Milestones Completed (Steps 1–13)

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
│     STEPS 1-4    │     │      STEPS 5-7       │     │      STEPS 8-10      │     │      STEPS 11-13       │
│ Core Multi-Tenant│────▶│ Deals, Pipelines,    │────▶│ Tasks, Comms, AI     │────▶│ CPQ & Tickets/SLAs +   │
│  Auth & Entities │     │ Workflows & Custom Obj│    │ Copilot & Agents     │     │ Sequences & Campaigns  │
└──────────────────┘     └──────────────────────┘     └──────────────────────┘     └────────────────────────┘
```

### ✅ Step 1: Full-Stack Project Setup
- **Frontend SPA:** Initialized with React 18, Vite 6, Tailwind CSS 3, Lucide React icons, and Axios.
- **Backend API:** Modular Node.js 22 + Express 4 architecture with Helmet security headers, CORS origin protection, Morgan logging, and centralized error handling.
- **Root Concurrently Runner:** One-command startup via `npm run dev` to boot both services.
- **Health Verification:** Live health check endpoint at `/api/health`.

### ✅ Step 2: MySQL Multi-Tenancy Architecture (§0, §1, §40, §51)
- Implemented **17 core InnoDB tables** in `crm_db` with foreign keys and composite indexing.
- Created idempotent migration engine (`npm run db:migrate`) and automated seeder (`npm run db:seed`).
- Configured default tenant organization (`Acme Corp Global`) and workspace (`Global Sales & Support`).
- Seeded **6 system roles** with **38 granular permissions** covering all CRM actions.

### ✅ Step 3: Authentication, JWT Sessions & Tenant Security (§0, §1, §41)
- Password encryption using **bcrypt** (salt cost 10).
- Stateless **JWT access tokens** (7-day expiration) + cryptographic **refresh tokens** stored in `user_sessions`.
- Built authentication middleware (`authenticate`) that verifies tokens, checks account status, and injects tenant context into `req.user`.
- Built RBAC authorization guard (`requirePermission`).
- Immutable security audit logging for login actions in `audit_logs`.
- Frontend Auth Context + login modal with one-click demo credentials autofill.

### ✅ Step 4: Standard Objects Layer — Contacts, Companies & Timeline (§6, §7, §10)
- **Companies Module:** Full CRUD with parent-child account hierarchies (`parent_company_id` for subsidiaries), annual revenues, employee counts, and location.
- **Contacts Module:** Full CRUD with lifecycle stage tracking (`lead`, `mql`, `sql`, `opportunity`, `customer`), lead status, and company links.
- **Unified Activity Timeline Feed:** Chronological activity stream storing creation events, notes, calls, and status updates.
- **Automated Stage Change Detection:** Updating a contact's lifecycle stage or lead status automatically appends a `status_change` entry to the timeline!
- **Frontend UI:** Interactive Contacts Directory, Companies Directory, and Contact Detail Drawer with live timeline feed and note logging.

### ✅ Step 5: Deals & Sales Pipelines Engine (§9)
- **Pipelines & Stages Schema:** Added `pipelines`, `pipeline_stages`, `deals`, and `deal_line_items`.
- **Automated Stage Forecasting:** Weighted pipeline revenue calculations (`value * probability / 100`) dynamically computed per stage.
- **Automated Timeline Integration:** Dragging or advancing a deal through stages automatically records a `status_change` activity with probability details.
- **Frontend Interactive Kanban Board:** Drag-and-drop / single-click stage transitions, pipeline switcher, metrics KPI bar, deal quick drawer, and new opportunity modal.

### ✅ Step 6: Custom Objects & Dynamic Table Builder (§2 Core Differentiator)
- **Dynamic Entity Engine:** Added `custom_objects`, `custom_fields`, `custom_records`, `object_relationships`, and `relationship_links` (total 26 tables in `crm_db`).
- **Hybrid JSON Datastore:** JSON data storage with instant zero-migration field expansion across text, number, currency, date, select, and boolean data types.
- **Cross-Object Relationships:** Established relational links connecting standard CRM entities (e.g. Companies) to custom entities (e.g. Commercial Properties).
- **Frontend No-Code Studio:** Dynamic data table view with custom attributes, live schema designer to add/remove fields on the fly, and modal for creating new custom entity tables in seconds.

### ✅ Step 7: Workflow Automation Engine (§15 Core Platform Service)
- **Event-Driven Dispatcher (`eventBus.js`):** Central domain event bus emitting domain events (`deal.created`, `deal.stage_changed`, `contact.created`, `contact.updated`, `custom_record.created`, `custom_record.updated`).
- **Automation Engine (`workflow.engine.js`):** Multi-step trigger execution with visual rule condition evaluator (supporting `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty` with `AND`/`OR` logic) and template variable interpolation (e.g. `{{title}}`, `{{value}}`, `{{first_name}}`).
- **Action Execution Workers:** Action pipeline supporting `create_note` (appends directly to §10 unified timeline), `update_field` (updates standard or JSON custom fields), `send_notification`, and `webhook`.
- **Execution & Audit History (§15 requirement):** Complete audit trail in `workflow_executions` and `workflow_execution_steps` recording duration in milliseconds, inputs, outputs, error messages, and skipped reasons ("why didn't my workflow run?").
- **Frontend Studio UI (`WorkflowsView.jsx`):** Interactive automation studio with workflow status toggles (published/paused), visual rule builder modal, live test run / simulator against real records, and execution history drilldown drawer.

### ✅ Step 8: Communication Center, Email & Notifications (Spec §10, §12, §13, §23)
- **Tasks Engine (§12):** Full task management with status transitions (`pending`, `in_progress`, `completed`, `cancelled`), priority bands (`urgent`, `high`, `medium`, `low`), due dates, assignee user references, and associations with CRM records.
- **In-App Notification Center (§23):** Real-time user alert drawer integrated directly into the top navbar with live unread badge, category icons, timestamping, and one-click mark-as-read.
- **Bi-directional Email & Template Hub (§13):** Direct email dispatch, HTML & plain-text previews, and reusable email templates library with category organization (`sales`, `onboarding`, `support`).
- **Telephony & Call Logger (§23):** Call tracking supporting inbound/outbound directions, duration recording in seconds, status, and rich rep notes.
- **Unified Timeline Normalization Rule (§10, §23):** Every outbound email, logged call, and completed task automatically writes an activity row into the `activities` timeline table, establishing a single chronological audit trail across contacts, companies, deals, and custom records.
- **Workflow Automation Integration (§15):** Workflows can now dispatch automated `create_task` and `send_notification` actions when triggers fire.
- **Frontend Activities & Tasks View (`ActivitiesTasksView.jsx`):** Comprehensive interface featuring Kanban board & tabular task list, unified communication feed, template management, and interactive create modals.

### ✅ Step 9: Analytics, Reports & Operational Dashboards (Spec §26, §27, §28, §29, §30)
- **Executive Sales & Revenue Command Center (§26, §28):** High-level operational ribbon displaying total pipeline value, probability-weighted revenue forecast, win rates, average deal sizes, task completion velocities, and customer touchpoints.
- **Pipeline Stage Conversion Funnel (§27):** Stage-by-stage deal volume, conversion rates, and drop-off counts from initial discovery through closed won.
- **Dynamic Report Query Builder & Compiler (§29):** Parameterized SQL engine compiling multi-dimensional aggregations (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) across Deals, Contacts, Companies, Tasks, and Activities with tenant security isolation.
- **Saved Reports & Operational Dashboards (§30):** Persistent report templates and multi-widget dashboards (`reports`, `dashboards`, `dashboard_widgets`).
- **Frontend Analytics Studio (`AnalyticsReportsView.jsx`):** Interactive dashboard with funnel charts, stage value distributions, 30-day outreach breakdown, live query runner modal, and reports directory.

### ✅ Step 10: AI Copilot, Smart Summaries & Autonomous Agents (Spec §16, §20, §47, §56)
- **Conversational Copilot Engine (`ai.service.js`):** Multi-turn conversational AI engine with persistent conversational memory in `ai_conversations` and `ai_messages`.
- **Natural Language Tool Orchestrator:** Automatically identifies user intent (e.g. deals filtering, contacts lookup, company search, system health metrics) and invokes CRM internal tools.
- **Smart Record Summarizer (§3, §16):** Generates structured 3-bullet executive digests, extracts buying signals, flags deal stall/objection risks, and formulates actionable next steps.
- **Context-Aware AI Email Drafter (§13, §16):** Generates personalized outreach emails synthesizing recipient context, sales intent, and custom tone (Professional, Consultative, Urgent, Casual).
- **Autonomous Sales Sentinel Agent (§20, §56):** Automated deal audit engine computing pipeline health scores (0-100) and velocity tracking, persisting audit runs in `agent_runs`.
- **Frontend AI Copilot & Agent Command Center (`AiCopilotView.jsx`):** Integrated chat interface, quick suggestion pills, deal audit runner, and email generator.

### ✅ Step 11: Products, Pricebooks, Quotes & CPQ Engine (Spec §24, §25)
- **Product Catalog Management (§24):** Multi-product catalog supporting SKUs, product categories, pricing models (one-time vs recurring subscription), unit costs, list prices, and margin calculations.
- **Price Books & Pricing Matrices (§24):** Standard and custom partner/distributor price books with tiered unit pricing and minimum quantity requirements.
- **Quotes & CPQ Engine (§25):** Full quote lifecycle (`draft` ➔ `in_review` ➔ `approved` ➔ `presented` ➔ `accepted` / `rejected`), auto-calculating line item subtotals, tiered line discounts, global quote discounts, and jurisdiction tax amounts.
- **DocuSign E-Signature Simulation (§25):** Embedded digital signing workflow with simulated DocuSign envelope generation, status tracking, automatic deal value synchronization upon acceptance, and unified timeline audit events.
- **Printable PDF Quote Generator (§25):** Clean, professional HTML printable quote invoice with line item breakdown, payment terms, and signature blocks.
- **Frontend CPQ Studio (`CpqView.jsx`):** Full CPQ management view with quotes list, interactive quote builder modal, product catalog grid, price book manager, printable PDF preview modal, and one-click e-signature execution.

### ✅ Step 12: Omnichannel Support, Ticketing & SLA Engine (Spec §23, §26)
- **Support Tickets Object & Lifecycle (§23):** Standard support entity with status progression (`new`, `open`, `pending_customer`, `on_hold`, `resolved`, `closed`), priorities (`urgent`, `high`, `medium`, `low`), channels (`email`, `web_portal`, `chat`, `phone`), and associations with Contacts, Companies, and Deals.
- **SLA Policies & Countdown Timers (§23):** Priority-based SLA schedules configuring first response and resolution targets (e.g. 15m/2h for Urgent, 4h/24h for Standard) with automated breach warning detection (`within_sla`, `approaching_breach`, `breached`).
- **Omnichannel Conversation Thread (§23):** Multi-channel message stream supporting **Public Customer Replies** (customer-facing) and **Private Internal Agent Notes** (lock-guarded team-only audit logs).
- **Canned Responses & Quick Replies (§23):** Shortcut snippet library (`!greeting`, `!investigating`, `!billing`, `!resolved`) enabling one-click response composition.
- **Knowledge Base & Self-Service Grounding (§23):** Published technical guides and setup manuals with view counts and customer helpfulness voting.
- **Customer Satisfaction (CSAT) Engine (§23, §26):** 1-to-5 star rating and feedback capture on resolved tickets, driving executive CSAT scoring and support analytics.
- **Frontend Support Workspace (`TicketsView.jsx`):** Interactive ticketing console with real-time KPI ribbon, multi-parameter filters, drawer conversation stream, SLA countdown clocks, and KB browser.

### ✅ Step 13: Customer Sequences, Multi-Channel Outreach & Email Campaigns (Spec §14, §23)
- **Sales Sequences & Cadences Engine (§14):** Multi-step cadence builder supporting diverse touchpoint types (`email`, `call_reminder`, `linkedin_touch`, `task`, `delay`) with custom delay intervals (`delay_days`, `delay_hours`).
- **Anti-Collision Reply Auto-Pause (§14):** Automated response detector that immediately transitions prospect enrollment to `replied_unenrolled` when a customer replies, halting automated touches and logging a timeline audit event.
- **Dynamic Template Personalization (§13, §14):** Automated tag interpolation replacing `{{first_name}}`, `{{last_name}}`, `{{company_name}}`, and `{{sender_name}}` with entity data.
- **Contact Enrollment & Progression Simulator (§14):** Contact state machine (`active`, `paused`, `completed`, `replied_unenrolled`, `bounced`) with an interactive step execution simulator that dispatches emails, creates CRM tasks, and advances step orders.
- **Broadcast Email Campaigns & Segment Engine (§23):** Segment-targeted broadcast campaigns (`all_contacts`, `leads_only`, `customers_only`, `enterprise_mql`, `deal_contacts`) with live dynamic audience calculation.
- **Recipient Engagement & Event Tracking (§23):** Individual recipient tracking with delivery simulation, open tracking, link click tracking, and live aggregate open rate and CTR analytics.
- **Frontend Outreach & Campaigns Studio (`SequencesCampaignsView.jsx`):** Multi-tab console with executive KPI ribbon, sequence cadence builder, contact enrollment simulator, reply simulator, broadcast campaign manager, and delivery analytics.

---

## 3. MySQL Database Schema (58 Tables)

All tables use InnoDB engine, `utf8mb4_unicode_ci` collation, and enforce multi-tenant isolation via indexed `organization_id`:

| # | Table Name | Spec Reference | Description |
|---|---|---|---|
| 1 | `organizations` | §0 Platform Foundation | Root tenant entity storing currency, timezone, status, and fiscal settings. |
| 2 | `workspaces` | §0 Workspaces | Sub-tenant workspaces for departmental or regional partitioning. |
| 3 | `organization_settings` | §0 Settings | Per-tenant JSON configurations (brand voice, locale, security policies). |
| 4 | `organization_features` | §0 Feature Flags | Data-driven feature gating and subscription limits per tenant. |
| 5 | `teams` | §1 Identity & Teams | Hierarchical organizational teams with parent-team links and manager references. |
| 6 | `team_members` | §1 Identity & Teams | Many-to-many relationship linking users to organizational teams. |
| 7 | `users` | §0 User Accounts | User identity, email, bcrypt password hash, profile details, and status. |
| 8 | `user_sessions` | §0 / §41 Security | Active refresh token hashes, client user-agents, IP addresses, and expiry. |
| 9 | `roles` | §1 Role System | System roles (Super Admin, Manager, Rep) and tenant custom roles. |
| 10 | `permissions` | §1 Permissions | Catalog of all possible module actions (`contacts:create`, `deals:edit`, etc.). |
| 11 | `role_permissions` | §1 RBAC Mapping | Role-to-permission mapping with scopes (`all`, `team`, `own`). |
| 12 | `field_permissions` | §1 Field-Level Security | Field-level visibility rules (`hidden`, `view`, `edit`) per role. |
| 13 | `user_roles` | §1 User Assignment | Links users to their assigned roles. |
| 14 | `audit_logs` | §40 Governance | Immutable audit trail tracking before/after JSON diffs, actor, and IP address. |
| 15 | `companies` | §7 Companies | Company accounts, subsidiaries, annual revenues, employee counts. |
| 16 | `contacts` | §6 Contacts | Contact directory, lifecycle stages, lead status, company association. |
| 17 | `activities` | §10 Unified Timeline | Chronological feed storing notes, calls, emails, status changes, and creation events. |
| 18 | `pipelines` | §9 Sales Pipelines | Sales pipelines per tenant organization (`Direct Sales`, `Partner`, etc.). |
| 19 | `pipeline_stages` | §9 Pipeline Stages | Ordered progression stages with win probabilities (10% to 100%) and color tags. |
| 20 | `deals` | §9 Deals & Opportunities | Opportunity tracking with monetary values, expected close dates, and company/contact links. |
| 21 | `deal_line_items` | §9 Deal Products | Line-item catalog for product quantities, unit prices, and discounts. |
| 22 | `custom_objects` | §2 Custom Objects | Tenant-defined custom entity definitions (Properties, Vehicles, Subscriptions, Policies). |
| 23 | `custom_fields` | §2 Custom Fields | Dynamic schema attributes across standard and custom entities. |
| 24 | `custom_records` | §2 Hybrid Datastore | Entity records stored with flexible JSON payloads and primary name indexing. |
| 25 | `object_relationships` | §2 Graph Relations | Definitions for one-to-one, one-to-many, and many-to-many cross-object links. |
| 26 | `relationship_links` | §2 Graph Links | Relational junctions connecting individual records across standard and custom objects. |
| 27 | `workflows` | §15 Automation Core | Workflow automation rules with triggers, status (draft/published/paused), and tenant isolation. |
| 28 | `workflow_conditions` | §15 Rule Engine | Condition groups with AND/OR evaluation across comparison operators (>, <, ==, !=, contains). |
| 29 | `workflow_actions` | §15 Action Dispatcher | Sequenced automated action chain (timeline notes, field updates, notifications, webhooks). |
| 30 | `workflow_executions` | §15 Execution History | Audit log tracking each workflow run, duration, status (completed, skipped, failed), and error messages. |
| 31 | `workflow_execution_steps` | §15 Step Analytics | Granular step-by-step execution metrics recording input/output payloads and execution durations in ms. |
| 32 | `tasks` | §12 Task Management | Actionable tasks with priorities, due dates, assignees, record links, and completion tracking. |
| 33 | `notifications` | §23 Notifications | In-app user notification stream with unread counters, types, and deep-link URLs. |
| 34 | `email_messages` | §13 / §23 Email Center | Bi-directional email communication log, statuses (sent, queued, failed), and rich HTML content. |
| 35 | `email_templates` | §13 Email Templates | Reusable marketing and sales email templates organized by category with placeholders. |
| 36 | `calls_log` | §23 Telephony Log | Phone call records tracking duration, direction (inbound/outbound), outcome status, and rep notes. |
| 37 | `reports` | §29 Custom Reports | Saved parameterized SQL report specifications with entity types, metrics, and grouping dimensions. |
| 38 | `dashboards` | §30 Dashboards | Configurable operational executive dashboards with default tenant flags. |
| 39 | `dashboard_widgets` | §30 Dashboard Widgets | Grid layout widgets linking saved reports to executive visual dashboards. |
| 40 | `agents` | §20 Autonomous Agents | Autonomous sales agents with model provider, system prompts, configuration, and status. |
| 41 | `agent_runs` | §20 Agent Execution Log | Agent execution evaluation history with health scores, recommended next actions, and step audits. |
| 42 | `ai_conversations` | §16 Conversational Memory | Multi-turn conversational sessions linked to users, tenant context, and entity records. |
| 43 | `ai_messages` | §16 Message History | User and AI assistant conversational messages with tool invocation execution logs. |
| 44 | `products` | §24 Products Catalog | Product items, SKUs, recurring billing frequencies, cost, list price, and active status. |
| 45 | `price_books` | §24 Price Books | Standard and custom/partner pricing catalogs with active windows and tenant isolation. |
| 46 | `price_book_entries` | §24 Pricing Matrix | Custom unit pricing and minimum quantity requirements mapped to price books. |
| 47 | `quotes` | §25 Quotes & CPQ | Formal sales proposals, subtotals, tiered discounts, tax, status lifecycles, and DocuSign e-sign. |
| 48 | `quote_line_items` | §25 Line Items | Dynamic quote items linking products, quantities, custom pricing, and item subtotals. |
| 49 | `sla_policies` | §23 SLA Policies | Service Level Agreements defining first response and resolution targets per priority. |
| 50 | `tickets` | §23 Support Tickets | Standard support object with priorities, statuses, channels, requester, and SLA timers. |
| 51 | `ticket_messages` | §23 Omnichannel Thread | Multi-channel message thread distinguishing public client replies from internal notes. |
| 52 | `canned_responses` | §23 Canned Replies | Pre-written response templates with quick shortcuts for fast agent resolution. |
| 53 | `kb_articles` | §23 Knowledge Base | Documentation articles with category tagging, view metrics, and helpful votes. |
| 54 | `sequences` | §14 Sales Sequences | Multi-step automated cadence definitions with anti-collision pause-on-reply flags. |
| 55 | `sequence_steps` | §14 Cadence Steps | Sequential progression rules (email, call reminder, LinkedIn touch, delay, task). |
| 56 | `sequence_enrollments` | §14 Enrollments | Contact enrollment state machine (active, paused, completed, replied_unenrolled). |
| 57 | `email_campaigns` | §23 Campaigns | Broadcast email campaigns with audience segment targeting and delivery tracking. |
| 58 | `campaign_recipients` | §23 Recipients | Granular campaign recipient engagement tracking (sent, delivered, opened, clicked). |

---

## 4. Default Seeded Credentials & Data

### Starting the Project
From the repository root `D:\project\CRM`:
```bash
# Run both backend and frontend:
npm run dev

# Or run database setup anytime:
npm run db:setup
```

### Seeded Credentials
- **Email:** `admin@crm.local`
- **Password:** `Admin@123456`
- **Role:** `Super Admin` (all permissions, full system scope)
- **Tenant Org:** `Acme Corp Global` (`id: 1`, `slug: acme-corp`)
- **Workspace:** `Global Sales & Support` (`id: 1`, `slug: global-sales`)

### Seeded Records
- **Companies (3):**
  1. `Apex Technologies Inc.` (domain: `apextech.io`, industry: Enterprise Software)
  2. `Apex Cloud Services` (subsidiary of Apex Technologies)
  3. `Nexus Global Logistics` (domain: `nexuslogistics.com`, industry: Supply Chain)
- **Contacts (4):**
  1. `Sarah Connor` — CTO at Apex Technologies Inc. (Stage: `customer`)
  2. `Elena Rostova` — VP of Engineering at Apex Technologies Inc. (Stage: `opportunity`)
  3. `David Miller` — VP of Global Operations at Nexus Global Logistics (Stage: `sales_qualified_lead`)
  4. `Marcus Brody` — Managing Partner (Stage: `lead`, Unassigned)
- **Timeline Activities:**
  - Initial creation event, quarterly solution review call, and discovery note attached to Sarah Connor.

---

## 5. Complete API Catalog & Testing Guide

### 5.1 System & Health APIs

#### 1. System Health Check
- **Endpoint:** `GET /api/health`
- **Auth:** Public
- **Description:** Verifies Express server and MySQL connection pool health.
- **cURL Command:**
  ```bash
  curl -X GET http://localhost:5000/api/health
  ```
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "CRM Backend API",
    "uptime": 142.3,
    "database": {
      "connected": true,
      "database": "crm_db"
    }
  }
  ```

#### 2. Database Status & Schema Metrics
- **Endpoint:** `GET /api/v1/system/db-status`
- **Auth:** Public
- **Description:** Returns total tables count, row counts across all modules, and tenant metadata.
- **cURL Command:**
  ```bash
  curl -X GET http://localhost:5000/api/v1/system/db-status
  ```

---

### 5.2 Authentication & Identity APIs

#### 3. User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth:** Public
- **Description:** Authenticates with email and password, creates refresh token session, logs to `audit_logs`, and returns JWT access token + all 38 granted permissions.
- **cURL Command:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@crm.local\",\"password\":\"Admin@123456\"}"
  ```
- **Response Structure:**
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "4a7f...",
      "user": {
        "id": 1,
        "email": "admin@crm.local",
        "fullName": "Alex Vance",
        "role": "Super Admin"
      },
      "organization": {
        "id": 1,
        "name": "Acme Corp Global",
        "slug": "acme-corp"
      },
      "permissions": [
        { "module": "contacts", "action": "view", "scope": "all" },
        { "module": "contacts", "action": "create", "scope": "all" }
      ]
    }
  }
  ```

#### 4. Current User Profile Context
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer Token
- **cURL Command:**
  ```bash
  curl -X GET http://localhost:5000/api/v1/auth/me \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 5. Refresh Access Token
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Auth:** Public
- **cURL Command:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
  ```

#### 6. User Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Bearer Token
- **cURL Command:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/logout \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
  ```

---

### 5.3 Companies APIs (§7)

#### 7. List Companies (with Search & Pagination)
- **Endpoint:** `GET /api/v1/companies`
- **Auth:** Bearer Token (requires `companies:view`)
- **Query Params:** `search`, `page`, `limit`, `sortBy`, `sortOrder`
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/v1/companies?search=apex" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 8. Create Company Account
- **Endpoint:** `POST /api/v1/companies`
- **Auth:** Bearer Token (requires `companies:create`)
- **cURL Command:**
  ```bash
  curl -X POST "http://localhost:5000/api/v1/companies" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Starlight Robotics Corp",
      "domain": "starlightrobotics.com",
      "industry": "Artificial Intelligence",
      "annualRevenue": 18500000,
      "employeeCount": 140,
      "phone": "+1 (617) 555-0199",
      "city": "Boston",
      "state": "MA",
      "country": "United States",
      "description": "Autonomous warehouse robotic systems."
    }'
  ```

#### 9. Get Company by ID (with Associated Contacts)
- **Endpoint:** `GET /api/v1/companies/:id`
- **Auth:** Bearer Token (requires `companies:view`)
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/v1/companies/1" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 10. Update Company
- **Endpoint:** `PUT /api/v1/companies/:id`
- **Auth:** Bearer Token (requires `companies:edit`)
- **cURL Command:**
  ```bash
  curl -X PUT "http://localhost:5000/api/v1/companies/1" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"annualRevenue": 35000000, "employeeCount": 420}'
  ```

#### 11. Delete Company
- **Endpoint:** `DELETE /api/v1/companies/:id`
- **Auth:** Bearer Token (requires `companies:delete`)
- **cURL Command:**
  ```bash
  curl -X DELETE "http://localhost:5000/api/v1/companies/4" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

---

### 5.4 Contacts APIs (§6)

#### 12. List Contacts (with Stage & Status Filters)
- **Endpoint:** `GET /api/v1/contacts`
- **Auth:** Bearer Token (requires `contacts:view`)
- **Query Params:** `stage`, `status`, `companyId`, `search`, `page`, `limit`
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/v1/contacts?stage=customer" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 13. Create Contact
- **Endpoint:** `POST /api/v1/contacts`
- **Auth:** Bearer Token (requires `contacts:create`)
- **cURL Command:**
  ```bash
  curl -X POST "http://localhost:5000/api/v1/contacts" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "firstName": "Jonathan",
      "lastName": "Reed",
      "email": "jonathan.reed@starlight.com",
      "phone": "+1 (617) 555-0177",
      "jobTitle": "Head of Automation",
      "companyId": 1,
      "lifecycleStage": "sales_qualified_lead",
      "leadStatus": "in_progress",
      "source": "Outbound Campaign"
    }'
  ```

#### 14. Get Contact by ID (with Full Timeline)
- **Endpoint:** `GET /api/v1/contacts/:id`
- **Auth:** Bearer Token (requires `contacts:view`)
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/v1/contacts/1" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 15. Update Contact (Automatic Stage Transition Logging)
- **Endpoint:** `PUT /api/v1/contacts/:id`
- **Auth:** Bearer Token (requires `contacts:edit`)
- **Description:** Automatically detects if `lifecycleStage` changed and logs a `status_change` timeline event.
- **cURL Command:**
  ```bash
  curl -X PUT "http://localhost:5000/api/v1/contacts/1" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"lifecycleStage": "evangelist", "jobTitle": "Senior CTO & Co-Founder"}'
  ```

#### 16. Delete Contact
- **Endpoint:** `DELETE /api/v1/contacts/:id`
- **Auth:** Bearer Token (requires `contacts:delete`)
- **cURL Command:**
  ```bash
  curl -X DELETE "http://localhost:5000/api/v1/contacts/4" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

---

### 5.5 Unified Activity Timeline APIs (§10)

#### 17. Get Activity Feed for Record
- **Endpoint:** `GET /api/v1/activities`
- **Auth:** Bearer Token
- **Query Params:** `recordType` (e.g. `contact` or `company`), `recordId`
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/v1/activities?recordType=contact&recordId=1" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

#### 18. Post New Timeline Activity (Note / Call / Meeting)
- **Endpoint:** `POST /api/v1/activities`
- **Auth:** Bearer Token
- **cURL Command:**
  ```bash
  curl -X POST "http://localhost:5000/api/v1/activities" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "recordType": "contact",
      "recordId": 1,
      "activityType": "note",
      "payload": {
        "content": "Follow-up meeting completed. Client approved expansion for 50 additional user seats."
      }
    }'
  ```

---

### 5.6 Communication Center, Tasks & Notifications APIs (Spec §10, §12, §13, §23)

#### 19. Tasks API (§12)
- **List Tasks:** `GET /api/v1/tasks` (Supports query filters: `status`, `priority`, `recordType`, `recordId`, `assignedTo`, `search`)
- **Create Task:** `POST /api/v1/tasks`
  ```json
  {
    "title": "Prepare Annual Renewal Quote",
    "description": "Review current SaaS usage with Sarah Connor before dispatching quotation",
    "priority": "high",
    "dueDate": "2026-09-30",
    "recordType": "contact",
    "recordId": 1
  }
  ```
- **Update Task Status:** `PATCH /api/v1/tasks/:id/status` (`status: "completed"`) — Automatically normalizes an activity record into `activities`!

#### 20. In-App Notifications API (§23)
- **Get User Notifications:** `GET /api/v1/notifications` (Returns unread count + notification list)
- **Mark Notification Read:** `PATCH /api/v1/notifications/:id/read`
- **Mark All Read:** `PATCH /api/v1/notifications/read-all`

#### 21. Communications: Email Hub (§13)
- **Send Outreach Email:** `POST /api/v1/communications/emails`
  ```json
  {
    "toEmail": "sarah.jenkins@acmecorp.com",
    "subject": "Platform Architecture Demo Follow-Up",
    "bodyHtml": "<p>Hi Sarah, thanks for your time earlier today!</p>",
    "recordType": "contact",
    "recordId": 1
  }
  ```
  *Rule:* Dispatched email writes directly into `email_messages` and generates a normalized `'email'` event in the unified `activities` timeline.
- **List Email History:** `GET /api/v1/communications/emails?recordType=contact&recordId=1`

#### 22. Communications: Email Templates Library (§13)
- **List Templates:** `GET /api/v1/communications/templates` (Filter by `category=sales|onboarding|support`)
- **Create Template:** `POST /api/v1/communications/templates`

#### 23. Communications: Telephony & Call Logging (§23)
- **Log Phone Call:** `POST /api/v1/communications/calls`
  ```json
  {
    "toNumber": "+1 (555) 019-9234",
    "direction": "outbound",
    "durationSeconds": 320,
    "status": "completed",
    "notes": "Discussed expansion to 50 enterprise seats.",
    "recordType": "contact",
    "recordId": 1
  }
  ```
  *Rule:* Dispatched call writes directly into `calls_log` and generates a normalized `'call'` event in the unified `activities` timeline.

---

### 5.7 Analytics, Reports & Dashboards APIs (Spec §26, §27, §28, §29, §30)

#### 24. Executive Overview & KPIs (§26, §28)
- **Endpoint:** `GET /api/v1/analytics/overview`
- **Query Params:** `dateRange=7d|30d|90d|ytd|all`
- **Response:** Total pipeline value, probability-weighted forecast, win rate %, average deal size, task velocity, customer touchpoints, contact lifecycle distribution, and stage-by-stage value.

#### 25. Pipeline Conversion Funnel (§27)
- **Endpoint:** `GET /api/v1/analytics/funnel`
- **Query Params:** `pipelineId` (optional, defaults to active tenant pipeline)
- **Response:** Ordered stages, deal counts, stage dollar totals, percentage conversion from total, step transition rates, drop-off counts, and overall end-to-end conversion rate.

#### 26. Dynamic Query Builder & Compiler (§29)
- **Endpoint:** `POST /api/v1/analytics/query`
- **Payload:**
  ```json
  {
    "entityType": "deals",
    "chartType": "bar",
    "metricType": "sum",
    "metricField": "value",
    "groupBy": "stage_name",
    "dateRange": "all"
  }
  ```
- **Response:** Compiled data points with labels, values, row counts, percentage shares, formatted values, and total metric sum.

#### 27. Saved Reports Library (§29)
- **List Reports:** `GET /api/v1/analytics/reports`
- **Get Report by ID:** `GET /api/v1/analytics/reports/:id`
- **Run Saved Report:** `GET /api/v1/analytics/reports/:id/run`
- **Create Saved Report:** `POST /api/v1/analytics/reports`
- **Update Saved Report:** `PUT /api/v1/analytics/reports/:id`
- **Delete Saved Report:** `DELETE /api/v1/analytics/reports/:id`

#### 28. Operational Dashboards (§30)
- **List Dashboards:** `GET /api/v1/analytics/dashboards`
- **Get Dashboard with Widgets:** `GET /api/v1/analytics/dashboards/:id`
- **Create Dashboard:** `POST /api/v1/analytics/dashboards`
- **Add Widget to Dashboard:** `POST /api/v1/analytics/dashboards/:id/widgets`

---

### 5.10 AI Copilot, Smart Summaries & Autonomous Agents (§16, §20, §47, §56)

#### 29. Conversational AI Copilot (§16, §47)
- **Ask CRM Copilot:** `POST /api/v1/ai/copilot`
  - Body: `{"prompt": "Show deals over $50k", "conversationId": 1}`
  - Automatically queries CRM entities, detects intent, executes internal tools, and returns conversational markdown response.
- **List User Conversations:** `GET /api/v1/ai/conversations`
- **Get Conversation Messages:** `GET /api/v1/ai/conversations/:conversationId/messages`

#### 30. Smart Record Summarizer (§3, §16)
- **Generate Executive Summary:** `POST /api/v1/ai/summarize`
  - Body: `{"recordType": "deal", "recordId": 1}`
  - Returns 3-bullet executive digest, buying signals identified, risk/blocker evaluation, and recommended next action.

#### 31. Context-Aware AI Email Drafter (§13, §16)
- **Draft Tailored Outreach Email:** `POST /api/v1/ai/draft-email`
  - Body: `{"recipientName": "Sarah Jenkins", "recipientEmail": "s.jenkins@techcorp.com", "intent": "Follow-up on product demonstration", "tone": "Professional & Consultative"}`
  - Synthesizes personalized email subject line, plain text body, and HTML version.

#### 32. Autonomous Sales Agents & Deal Sentinel (§20, §56)
- **List Active Agents:** `GET /api/v1/ai/agents`
- **Trigger Agent Evaluation Audit:** `POST /api/v1/ai/agents/:id/run`
  - Body: `{"recordType": "deal", "recordId": 1}`
  - Evaluates deal velocity, task risks, and stakeholder engagement. Generates Deal Health score (0–100) and persists run in `agent_runs`.
- **View Agent Run History:** `GET /api/v1/ai/agents/runs`

---

### 5.11 Products, Pricebooks, Quotes & CPQ Engine (§24, §25)

#### 33. Product Catalog Management (§24)
- **List Products:** `GET /api/v1/cpq/products`
  - Query params: `?search=crm&category=Software&isActive=true`
- **Get Product Details:** `GET /api/v1/cpq/products/:id`
- **Create Product:** `POST /api/v1/cpq/products`
  - Body: `{"name":"CRM Analytics Pro","sku":"SW-ANL-001","category":"Software","pricingModel":"flat_fee","billingFrequency":"monthly","unitCost":25,"listPrice":79,"currency":"USD"}`
- **Update Product:** `PUT /api/v1/cpq/products/:id`
- **Deactivate/Delete Product:** `DELETE /api/v1/cpq/products/:id`

#### 34. Price Books & Pricing Matrices (§24)
- **List Price Books:** `GET /api/v1/cpq/price-books`
- **Get Price Book with Entries:** `GET /api/v1/cpq/price-books/:id`
- **Create Price Book:** `POST /api/v1/cpq/price-books`
  - Body: `{"name":"Tier-1 Enterprise Partners","description":"Volume partner discount schedule","isStandard":false,"currency":"USD"}`
- **Add Product to Price Book:** `POST /api/v1/cpq/price-books/:id/entries`
  - Body: `{"productId":1,"unitPrice":65.00,"minQuantity":5}`
- **Remove Price Book Entry:** `DELETE /api/v1/cpq/price-books/:id/entries/:entryId`

#### 35. Quotes & CPQ Engine (§25)
- **List Quotes:** `GET /api/v1/cpq/quotes`
  - Query params: `?search=Q-2026&status=draft&dealId=1`
- **Get Quote by ID:** `GET /api/v1/cpq/quotes/:id` (returns header, line items, and product details)
- **Create Quote with Automatic Line-Item Pricing:** `POST /api/v1/cpq/quotes`
  - Body:
    ```json
    {
      "dealId": 1,
      "companyId": 1,
      "contactId": 1,
      "priceBookId": 1,
      "title": "Enterprise Cloud Migration Proposal",
      "currency": "USD",
      "discountPercent": 5,
      "taxPercent": 8.25,
      "validUntil": "2026-12-31",
      "items": [
        { "productId": 1, "quantity": 10, "unitPrice": 120, "discountPercent": 10 },
        { "productId": 2, "quantity": 1, "unitPrice": 5000, "discountPercent": 0 }
      ]
    }
    ```
  - *Engine calculates line subtotals, applies tiered line discounts, computes net total, applies global discount, and calculates final sales tax.*
- **Update Quote:** `PUT /api/v1/cpq/quotes/:id`
- **Update Quote Lifecycle Status:** `PATCH /api/v1/cpq/quotes/:id/status`
  - Body: `{"status": "approved"}`
  - Supports: `draft`, `in_review`, `approved`, `presented`, `accepted`, `rejected`.
  - When status transitions to `accepted`, automatically synchronizes linked Deal monetary `value` and logs timeline event.

#### 36. DocuSign E-Signature Simulation & PDF Invoices (§25)
- **Process Digital Signature (DocuSign API simulation):** `POST /api/v1/cpq/quotes/:id/sign`
  - Body: `{"signerName": "Sarah Connor", "signerEmail": "sconnor@apextech.io"}`
  - Simulates DocuSign envelope generation, transitions quote to `accepted`, updates Deal value, and records unified timeline audit event.
- **Generate Printable PDF Invoice HTML:** `GET /api/v1/cpq/quotes/:id/pdf`
  - Returns clean, enterprise-formatted HTML document with line item breakdowns, discounts, subtotal, taxes, and signature verification block.

---

### 5.12 Omnichannel Support, Ticketing & SLA Engine (§23, §26)

#### 37. Support Operations & SLA Performance Metrics (§26)
- **Get Executive Support Metrics:** `GET /api/v1/support/metrics`
  - Returns: `openTickets`, `urgentBacklog`, `slaCompliancePercent`, `avgResolutionHours`, `avgCsatScore`, `csatResponses`, and breakdowns by channel, priority, and category.

#### 38. Support Tickets Lifecycle Management (§23)
- **List Tickets with Multi-Parameter Filtering:** `GET /api/v1/support/tickets`
  - Query params: `?status=open_all&priority=urgent&channel=email&search=SSO`
- **Get Ticket with Conversation Thread:** `GET /api/v1/support/tickets/:id`
  - Returns full ticket metadata, matched SLA policy, and chronological conversation stream.
- **Create Support Ticket with Automated SLA Policy Matching:** `POST /api/v1/support/tickets`
  - Body:
    ```json
    {
      "subject": "SSO SAML Assertion Failure",
      "description": "Users receiving 401 Unauthorized during SAML assertion handshakes.",
      "priority": "urgent",
      "channel": "email",
      "category": "Security & Identity",
      "companyId": 1,
      "contactId": 1,
      "tags": ["okta", "saml", "urgent-outage"]
    }
    ```
  - *Engine matches priority to SLA policy, auto-computes `first_response_due_at` and `resolution_due_at`, inserts initial message, and logs timeline creation activity.*
- **Update Ticket Details:** `PUT /api/v1/support/tickets/:id`
- **Transition Ticket Lifecycle Status:** `PATCH /api/v1/support/tickets/:id/status`
  - Body: `{"status": "resolved"}`
  - Automatically records `resolved_at` / `closed_at` and posts `status_change` timeline activity.
- **Delete Support Ticket:** `DELETE /api/v1/support/tickets/:id`

#### 39. Omnichannel Conversation Thread & CSAT Feedback (§23)
- **Dispatch Public Customer Reply:** `POST /api/v1/support/tickets/:id/messages`
  - Body: `{"bodyText": "We updated your IdP cert fingerprint.", "messageType": "public_reply", "newStatus": "pending_customer"}`
  - Automatically records `first_responded_at` if first reply, updates status, and logs timeline email activity.
- **Save Private Internal Agent Note:** `POST /api/v1/support/tickets/:id/messages`
  - Body: `{"bodyText": "INTERNAL NOTE: Re-synced XML metadata manually.", "messageType": "internal_note"}`
  - Persisted with lock protection visible only to internal support and engineering teams.
- **Submit Customer Satisfaction (CSAT) Rating:** `POST /api/v1/support/tickets/:id/csat`
  - Body: `{"csatScore": 5, "csatComment": "Super fast turnaround on our SAML bug! 5 stars."}`
  - Records star rating, closes ticket, and publishes feedback to timeline.

#### 40. SLA Policies Configuration (§23)
- **List SLA Policies:** `GET /api/v1/support/sla-policies`
- **Create SLA Policy:** `POST /api/v1/support/sla-policies`
  - Body: `{"name": "Urgent Response SLA", "priority": "urgent", "firstResponseTimeMinutes": 15, "resolutionTimeMinutes": 120}`
- **Update SLA Policy:** `PUT /api/v1/support/sla-policies/:id`

#### 41. Canned Responses & Quick Replies (§23)
- **List Canned Responses:** `GET /api/v1/support/canned-responses`
- **Create Canned Response:** `POST /api/v1/support/canned-responses`
  - Body: `{"title": "Bug Escalation", "shortcut": "!escalate", "category": "Technical", "bodyText": "We have escalated this bug to engineering."}`
- **Delete Canned Response:** `DELETE /api/v1/support/canned-responses/:id`

#### 42. Knowledge Base & Grounding (§23)
- **List Published Articles:** `GET /api/v1/support/kb/articles`
- **Get Article Details & Increment View:** `GET /api/v1/support/kb/articles/:id`
- **Publish New Article:** `POST /api/v1/support/kb/articles`
  - Body: `{"title": "Configuring SAML 2.0 SSO", "category": "Security & Identity", "content": "Markdown setup guide..."}`
- **Vote Article as Helpful:** `POST /api/v1/support/kb/articles/:id/helpful`

---

### 5.10 Customer Sequences, Multi-Channel Outreach & Email Campaigns APIs (Spec §14, §23)

#### 43. Marketing & Outreach Operational KPIs (§14, §23)
- **Endpoint:** `GET /api/v1/marketing/metrics`
- **Response:**
  - Sequences: Total sequences, active sequences, total enrolled contacts, completed enrollments, total replies, reply rate %, and active enrollments.
  - Broadcast Campaigns: Total campaigns, sent count, recipients, delivered, opens, clicks, bounces, open rate %, and click-through rate (CTR %).

#### 44. Sales Cadences & Sequences Engine (§14)
- **List Sequences:** `GET /api/v1/marketing/sequences` (includes step counts, enrolled counts, replies received)
- **Get Sequence Details with Steps & Enrollments:** `GET /api/v1/marketing/sequences/:id`
- **Create Cadence Sequence:** `POST /api/v1/marketing/sequences`
  - Body: `{"name": "Enterprise Cold Outbound Cadence", "description": "4-touchpoint cadence", "pause_on_reply": true}`
- **Update Sequence:** `PUT /api/v1/marketing/sequences/:id`
- **Delete Sequence:** `DELETE /api/v1/marketing/sequences/:id`
- **Add Cadence Step:** `POST /api/v1/marketing/sequences/:id/steps`
  - Body: `{"step_type": "email", "delay_days": 2, "delay_hours": 0, "subject": "Next steps for {{company_name}}", "body_template": "Hi {{first_name}}..."}`
- **Update Cadence Step:** `PUT /api/v1/marketing/sequences/:id/steps/:stepId`
- **Delete Cadence Step:** `DELETE /api/v1/marketing/sequences/:id/steps/:stepId`

#### 45. Contact Enrollments & Cadence Progression Simulator (§14)
- **List Enrollments:** `GET /api/v1/marketing/enrollments` (Filters: `sequence_id`, `status`, `contact_id`)
- **Enroll Contact(s):** `POST /api/v1/marketing/sequences/:id/enroll`
  - Body: `{"contact_ids": [1, 2, 4]}`
- **Update Enrollment Status:** `PATCH /api/v1/marketing/enrollments/:id/status` (`status: "active" | "paused" | "completed"`)
- **Execute Cadence Step Simulator:** `POST /api/v1/marketing/enrollments/:id/execute-step`
  - Dispatches email, task, or call touchpoint; evaluates merge tags `{{first_name}}`, `{{company_name}}`; writes to timeline; and advances cadence order.
- **Simulate Prospect Reply:** `POST /api/v1/marketing/enrollments/:id/reply`
  - Body: `{"reply_text": "Interested in a demo! When can we talk?"}`
  - Auto-pauses and transitions status to `replied_unenrolled` to prevent automated follow-up collision.

#### 46. Broadcast Email Campaigns & Audience Segments (§23)
- **List Broadcast Campaigns:** `GET /api/v1/marketing/campaigns`
- **Get Campaign Details & Recipient Tracking:** `GET /api/v1/marketing/campaigns/:id`
- **Dynamic Audience Segment Preview:** `GET /api/v1/marketing/campaigns/audience-preview?segment=all_contacts|leads_only|customers_only|enterprise_mql|deal_contacts`
- **Create Broadcast Campaign:** `POST /api/v1/marketing/campaigns`
  - Body: `{"name": "Q4 Release", "subject": "V2 Launch", "target_segment": "all_contacts", "html_content": "<h2>Hello {{first_name}}</h2>..."}`
- **Dispatch Campaign Simulator:** `POST /api/v1/marketing/campaigns/:id/send`
- **Track Recipient Engagement Event:** `POST /api/v1/marketing/recipients/:recipientId/track`
  - Body: `{"eventType": "open" | "click" | "bounce"}`

---

## 6. One-Click Automated Test Scripts

### Windows PowerShell Test Script
Copy and paste this into PowerShell to test Sequences, Outreach, Campaigns, Support, and core 58-table endpoints end-to-end:

```powershell
Write-Host "`n🚀 Testing CRM Step 13 Sequences, Outreach & Email Campaign APIs..." -ForegroundColor Yellow

# 1. Health check & DB Status (58 Tables Verification)
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
Write-Host "✅ Health Check OK: Database $($health.database.database) connected." -ForegroundColor Green

$dbStatus = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/system/db-status"
Write-Host "✅ Database Status: $($dbStatus.totalTables) InnoDB tables verified in crm_db." -ForegroundColor Green
Write-Host "   Counts: Sequences: $($dbStatus.counts.sequences), Cadence Steps: $($dbStatus.counts.sequenceSteps), Enrollments: $($dbStatus.counts.sequenceEnrollments), Campaigns: $($dbStatus.counts.campaigns)" -ForegroundColor DarkGray

# 2. Login
$loginBody = '{"email":"admin@crm.local","password":"Admin@123456"}'
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $login.data.accessToken
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "✅ Login OK: User $($login.data.user.fullName) (Role: $($login.data.user.role))" -ForegroundColor Green

# 3. Outreach & Marketing Operational KPIs
$metrics = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/metrics" -Headers $headers
Write-Host "✅ Marketing KPIs OK: Active Cadences: $($metrics.data.sequences.active), Enrolled: $($metrics.data.sequences.totalEnrolled), Reply Rate: $($metrics.data.sequences.replyRatePct)%" -ForegroundColor Cyan
Write-Host "   Campaigns: Sent: $($metrics.data.campaigns.sent), Open Rate: $($metrics.data.campaigns.openRatePct)%, CTR: $($metrics.data.campaigns.clickRatePct)%" -ForegroundColor DarkGray

# 4. List Sequences
$seqs = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/sequences" -Headers $headers
Write-Host "✅ List Sequences OK: Found $($seqs.data.Count) cadences in tenant org." -ForegroundColor Cyan

$seqId = $seqs.data[0].id
$seqDetail = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/sequences/$seqId" -Headers $headers
Write-Host "   Sequence 1: $($seqDetail.data.name) ($($seqDetail.data.steps.Count) Steps Configured)" -ForegroundColor DarkGray

# 5. List Contact Enrollments & Advance Cadence Step Simulator
$enrollments = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/enrollments" -Headers $headers
Write-Host "✅ Enrollments OK: Found $($enrollments.data.Count) contacts enrolled." -ForegroundColor Cyan

$activeEn = $enrollments.data | Where-Object { $_.status -eq 'active' } | Select-Object -First 1
if ($activeEn) {
    $stepRes = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/enrollments/$($activeEn.id)/execute-step" -Method Post -Headers $headers
    Write-Host "✅ Cadence Touchpoint Executed OK: $($stepRes.data.detail) (Next Step: $($stepRes.data.next_step_order))" -ForegroundColor Green

    # 6. Simulate Prospect Reply with Anti-Collision Auto-Pause (§14)
    $replyBody = '{"reply_text":"Thanks Alex, let us book a 15-minute introductory call."}'
    $replyRes = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/enrollments/$($activeEn.id)/reply" -Method Post -Headers $headers -Body $replyBody
    Write-Host "✅ Prospect Reply Simulation OK: $($replyRes.data.message)" -ForegroundColor Green
}

# 7. Dynamic Audience Segment Preview (§23)
$audience = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/campaigns/audience-preview?segment=all_contacts" -Headers $headers
Write-Host "✅ Audience Calculator OK: $($audience.data.count) eligible contacts found in segment 'all_contacts'." -ForegroundColor Cyan

# 8. Broadcast Email Campaigns & Recipient Engagement
$campaigns = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/marketing/campaigns" -Headers $headers
Write-Host "✅ Broadcast Campaigns OK: $($campaigns.data.Count) campaign(s) retrieved. Open Rate: $($campaigns.data[0].open_rate)%" -ForegroundColor Green

Write-Host "`n🎉 ALL STEP 13 SEQUENCES, OUTREACH & EMAIL CAMPAIGN TESTS COMPLETED SUCCESSFULLY!`n" -ForegroundColor Green
```

---

## 7. Next Roadmap Step (Step 14)

With **Step 13 (Customer Sequences, Multi-Channel Outreach & Email Campaigns)** completed, the next milestone is **Step 14: Webhooks, REST API Integrations & External Data Sync Engine (Spec §31, §32, §41)**:
1. **Event-Driven Webhook Dispatch Engine (§31):** Trigger outgoing HTTP POST payloads upon record creations, updates, and deal stage progressions with HMAC SHA-256 signatures (`X-CRM-Signature`).
2. **Third-Party Integration Connectors (§32):** Slack, HubSpot, Stripe, Google Calendar, and Zapier inbound/outbound sync bridges.
3. **Idempotency & Retry Backoff System (§31, §41):** Idempotency headers (`X-Idempotency-Key`), exponential retry schedulers, and delivery attempt logging in `webhook_deliveries`.
4. **Interactive Webhook Simulation Studio (§31):** Test payload generator, signature verification tester, and live webhook endpoint listener.

---

*Report generated and committed to project repository.*