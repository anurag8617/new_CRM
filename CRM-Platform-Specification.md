# Advanced AI-Native CRM Platform — Full Specification

**Stack:** React.js (frontend) · Node.js (backend) · MySQL (primary datastore)
**Positioning:** HubSpot/Salesforce-class CRM with a no-code custom data layer and an AI operating layer as core differentiators, built for the US SaaS subscription market.

---

## How to Read This Document

Each numbered section below covers **what the feature is**, **why it matters**, and **how to implement it specifically on React + Node.js + MySQL**. Section 51 (Database Architecture) and the MVP roadmap at the end are the most important sections to read first — they determine whether the rest of the system stays maintainable as it grows.

---

## 0. Platform Foundation — Multi-Tenancy & Workspaces

**What it is:** Every customer account is an isolated "Organization." Each org can have multiple internal workspaces, its own branding, currency, timezone, fiscal year, and default configuration.

**Why it matters:** Multi-tenancy is the single biggest architectural decision in a SaaS CRM. Get it wrong and every later feature (permissions, custom tables, billing, reporting) inherits the mistake.

**MySQL implementation approach:**
- Use a **shared database, shared schema** model: every tenant-scoped table carries an `organization_id BIGINT` column, indexed and included in every composite index and every query (never trust the app layer alone — enforce with row-level checks in your service layer, since MySQL has no native RLS like Postgres).
- At scale (thousands of large accounts), consider **database-per-tenant or schema-per-tenant** for your largest enterprise customers, while small/mid customers stay on the shared cluster. Keep this optional and add it later — don't build it on day one.
- `organizations`, `workspaces`, `organization_settings` tables; feature flags in an `organization_features` table (org_id, feature_key, enabled, limit_value) so plan-gating and custom flags are data-driven, not hardcoded.

**Core tables:** `organizations`, `workspaces`, `users`, `user_sessions`, `organization_settings`, `feature_flags`.

---

## 1. Role & Permission System (RBAC + Field-Level + Record-Level)

This should be a **first-class platform service**, not something bolted onto individual modules — every other feature (custom objects, tables, reports, automations) checks against it.

### 1.1 Roles
System roles (Owner, Super Admin, Admin, Manager, Team Lead, Sales Rep, Marketing User, Support Agent, CS User, Read Only) plus **user-defined custom roles**.

### 1.2 Permission layers
| Layer | Example |
|---|---|
| Module permission | Can view/create/edit/delete/export/import/assign Contacts |
| Record-level permission | Owner only / Owner+team / Manager+team / specific users / specific teams |
| Field-level permission | "Annual Revenue" — Admin: edit, Manager: view, Rep: hidden |

### 1.3 MySQL schema pattern
```
roles (id, org_id, name, is_system_role)
permissions (id, module, action)         -- e.g. ('contacts', 'delete')
role_permissions (role_id, permission_id, scope ENUM('none','own','team','all'))
field_permissions (role_id, object_type, field_key, access ENUM('hidden','view','edit'))
teams (id, org_id, parent_team_id, manager_id)
team_members (team_id, user_id)
```
- Resolve permissions server-side in a single **PermissionService** that every API route calls before touching data — never trust the frontend to hide a field as a security boundary.
- Cache resolved permission sets per (user, org) in Redis to avoid recomputation on every request; invalidate on role/permission change.

---

## 2–5. Data Model: Standard Objects, Custom Objects, Custom Tables, Custom Fields

This is your **most important architectural investment** — get this right and Contacts/Companies/Deals/Tickets become "just" objects built on top of the same engine, instead of one-off hardcoded modules.

### 2.1 Standard objects
Contacts, Companies, Deals, Leads, Tickets, Products, Quotes, Tasks, Meetings, Calls, Emails, Notes, Activities, Campaigns, Projects, Subscriptions.

### 2.2 Custom Objects & Custom Table Builder (major differentiator)
Let customers define their own entities (e.g. "Properties," "Students," "Insurance Policies") with custom fields, relationships, views, and full CRUD — essentially a lightweight Airtable/Notion database embedded inside the CRM.

### 2.3 The MySQL data-modeling decision (critical)
You have three real options for storing dynamic, user-defined fields in MySQL. Pick deliberately:

**Option A — EAV (Entity-Attribute-Value):**
```
custom_objects (id, org_id, name, slug, icon, color)
custom_fields (id, custom_object_id, field_key, type, config_json, required, order)
custom_field_values (id, record_id, custom_field_id, value_text, value_number, value_date, value_json)
```
- Pros: fully flexible, no schema migrations per tenant.
- Cons: slow for filtering/sorting/reporting at scale; needs careful indexing (`(custom_field_id, value_text)`, etc.) and often a read-optimized projection.

**Option B — JSON column per record:**
```
custom_records (id, org_id, custom_object_id, data JSON, created_at, updated_at)
```
- Use MySQL 8's **generated (virtual) columns + secondary indexes** on hot JSON paths for filtering/sorting:
  `budget DECIMAL(12,2) GENERATED ALWAYS AS (data->>'$.budget') VIRTUAL, INDEX(budget)`
- Pros: simpler queries, good performance with virtual-column indexing, easy to add fields without migrations.
- Cons: MySQL JSON indexing is less mature than Postgres GIN/JSONB; complex cross-field queries need care.

**Option C — Hybrid (recommended):** Store the canonical value in JSON (source of truth + flexibility), but **materialize commonly filtered/sorted fields into real indexed columns via generated columns**, chosen per-field when a customer marks a field as "used in views/reports." This gives flexibility by default and performance where it's actually needed, without a full EAV cost everywhere.

### 2.4 Relationships
```
object_relationships (id, org_id, from_object, to_object, relationship_type ENUM('one_to_one','one_to_many','many_to_many'))
relationship_links (id, relationship_id, from_record_id, to_record_id)
```
Support standard→standard (Contact↔Company), standard→custom, and custom↔custom relationships through the same table.

### 2.5 Custom Fields on standard objects
Same `custom_fields` + generated-column pattern applied to Contacts/Deals/etc., so standard objects and custom objects share one field-definition engine.

### 2.6 Views
`saved_views (id, org_id, object_type, owner_id, filters_json, sort_json, columns_json, visibility ENUM('private','team','org'))` — powers Grid/Kanban/Calendar/Gallery/Timeline view types by reusing the same filter/sort engine against either real columns or generated columns.

---

## 6–9. Contacts, Companies, Leads, Deals/Pipelines

Standard sales objects, each built on the object/field engine above.

- **Contacts:** profile fields, lifecycle stage, lead status, source, relationships to Company/Deals/Tickets/Activities.
- **Companies:** parent/child hierarchy (`parent_company_id` self-referencing FK) for account hierarchies and subsidiaries.
- **Leads:** capture → qualification → **conversion** (creates linked Contact + Company + Deal in one transaction — wrap in a DB transaction so partial conversions never happen).
- **Deals/Pipelines:** multiple pipelines per org, custom stages, probability, value, line items, currency, deal teams.
  ```
  pipelines (id, org_id, name)
  pipeline_stages (id, pipeline_id, name, order, probability)
  deals (id, org_id, pipeline_id, stage_id, owner_id, value, currency, close_date, ...)
  deal_line_items (id, deal_id, product_id, quantity, unit_price, discount, tax)
  ```

---

## 10–14. Activity Timeline, Tasks, Calendar/Meetings, Email, Sales Sequences

**Unified activity timeline** is the backbone UX of the whole CRM — every record (standard or custom) should render one merged, chronological feed.

```
activities (id, org_id, record_type, record_id, activity_type ENUM('email','call','meeting','note','task','sms','whatsapp','status_change','field_change','automation','ai_action'), payload_json, actor_id, created_at)
INDEX (record_type, record_id, created_at)
```
Store type-specific data in `payload_json` rather than one column per activity type — keeps the timeline table generic and fast to query.

- **Tasks:** due dates, priority, recurrence, dependencies, subtasks, reminders (via a scheduled job — see §53).
- **Calendar:** Google/Outlook OAuth sync, booking pages, round-robin assignment.
- **Email:** Gmail/Outlook API integration, open/click tracking via tracking pixel + redirect service, templates, scheduled send (queued job).
- **Sequences:** a small state machine per enrollment — `sequence_enrollments (contact_id, sequence_id, current_step, next_run_at, status)`, advanced by a scheduled worker; branching/conditions evaluated against the Automation Engine's condition evaluator (reuse it — don't build a second one).

---

## 15. Workflow Automation Engine (core platform service)

**Architecture:** trigger → condition evaluation → action execution, fully event-driven so every module can publish events without knowing who's listening.

```
Node.js API → domain event (e.g. "deal.stage_changed") → Event Bus (Redis pub/sub or a queue)
   → Workflow Engine picks matching workflows → evaluates conditions → dispatches actions to Workers
```

**Schema:**
```
workflows (id, org_id, object_type, trigger_type, trigger_config_json, status ENUM('draft','published','paused'))
workflow_conditions (id, workflow_id, group, field, operator, value, logic ENUM('AND','OR'))
workflow_actions (id, workflow_id, order, action_type, config_json)
workflow_executions (id, workflow_id, record_id, status, started_at, finished_at, error)
workflow_execution_steps (id, execution_id, action_id, status, output_json, duration_ms)
```
- Triggers: record created/updated, field changed, stage changed, form submitted, email received, task completed, date reached, webhook received, scheduled/cron.
- Actions: create/update/delete record, assign owner, create task, send email/SMS, notify, tag, change stage, call webhook, run AI action, execute custom code (sandboxed).
- Always persist **execution history + error logs + retry counts** — "why didn't my automation run?" is the #1 support ticket in every workflow product; §55 depends on this table.
- Implement with **BullMQ (Redis-backed)** for reliable, retryable, delayed job execution in Node.js.

---

## 16–22. AI System (your primary differentiator)

Build this as an **AI Agent Framework**, not five hardcoded features — new agents should be composable from the same primitives (tools, memory, CRM read/write access).

### 16. AI CRM Assistant / Copilot
Natural-language querying ("Show me deals over $50K with no activity in 14 days") — implemented as an LLM function-calling layer where the model translates intent into calls against your internal query builder (§29.2), never raw SQL generated by the LLM directly (SQL injection / data-leak risk — always go through a permission-checked query service).

### 17. AI Record Enrichment
Pull company/contact data from third-party providers (Clearbit-style APIs) or public web data. **Track provenance** — a `data_source` + `confidence` + `enriched_at` column per enriched field so users can distinguish AI-inferred data from user-entered data, and always let users review/reject enrichment rather than silently overwriting their data.

### 18–19. Sales & Meeting Intelligence
Conversation intelligence pipeline: call/meeting recording → transcription (Whisper API or similar) → LLM summarization → structured extraction (buying signals, objections, competitors, next steps) → written back to the activity timeline and to structured CRM fields via the same Automation Engine actions.

### 20. AI Agents (framework, not hardcoded features)
```
agents (id, org_id, type, config_json, status)
agent_runs (id, agent_id, trigger, status, steps_json, started_at, finished_at)
```
Ship four to start: **Prospecting Agent** (research + enrich + score + draft outreach), **Data Agent** (reads email/calls, updates CRM, creates tasks), **Support Agent** (knowledge-base-grounded ticket resolution with escalation), **CS/Churn Agent** (monitors accounts, flags risk, recommends actions).
Each agent = an LLM loop with a defined toolset (CRM read/write functions, web search, knowledge base retrieval) and a hard cap on autonomous actions per run — always log every tool call it makes for auditability.

### 21. AI Content Generation
Emails, proposals, summaries, case studies, KB articles — all generated against a per-org **Brand Voice config** (tone, vocabulary, forbidden words, approved examples) injected into every generation prompt.

### 22. Lead Scoring (rule-based + predictive)
- Rule-based: simple additive scoring engine, evaluated by the Automation Engine's condition evaluator.
- AI/predictive: a lightweight model (can start as logistic regression on historical conversion data, upgrade to a hosted ML service later) scoring conversion/churn/expansion likelihood — store as a versioned score history, not just a single mutable number, so reps can see score trend over time.

---

## 23–27. Marketing, Support, Knowledge Base, Feedback, CPQ

Standard HubSpot-parity modules — each is a set of objects + the same field/automation/reporting engines applied to a new domain, so implementation cost drops sharply once §1–15 exist.

- **Marketing:** email campaigns, forms, landing pages, ad tracking/attribution, social scheduling.
- **Support/Ticketing:** tickets as a standard object with SLA timers (scheduled jobs checking `sla_due_at`), shared inbox with collision detection (Redis lock on "who's viewing this thread"), omnichannel (email/chat/SMS/WhatsApp) normalized into the same `activities` table.
- **Knowledge Base:** articles with versioning, internal/external visibility, and full-text indexing for both user search and AI agent grounding (retrieval-augmented generation).
- **CPQ:** product catalog, price books, quote builder → PDF generation → e-signature (DocuSign API) → approval workflow (reuse the Automation Engine).

---

## 28. Subscription Management (for CRM customers who sell subscriptions themselves)

`subscriptions`, `subscription_plans`, `billing_cycles`, with MRR/ARR/churn/expansion computed via scheduled aggregation jobs into a reporting table (don't compute MRR live from raw transaction data on every dashboard load — pre-aggregate nightly, refresh incrementally on events).

---

## 29–31. Reporting, Dashboards, Global Search

### 29. Custom Reports + Query Builder
This needs to be a real query builder, not fixed report templates:
```
Deals JOIN Companies JOIN Contacts JOIN Activities
  WHERE ... GROUP BY ... aggregate(SUM/AVG/COUNT) ... date range
```
- Build an internal **QueryBuilderService** that compiles a JSON query spec into parameterized SQL, respecting record-level and field-level permissions automatically (never let a report bypass RBAC).
- For heavy cross-object aggregate reporting at scale, consider a **read replica** or a periodically refreshed **reporting schema (star-schema-ish denormalized tables)** rather than hitting the OLTP tables directly.

### 30. Dashboards
Drag-and-drop widgets backed by the same report definitions; scheduled PDF/CSV export via a worker + email delivery.

### 31. Global Search
- Start with **MySQL FULLTEXT indexes** on key tables (contacts, companies, deals, notes) — sufficient for small/mid customers.
- Move to **OpenSearch/Elasticsearch**, fed by a change-data-capture pipeline (Debezium reading MySQL binlog, or dual-write from the app layer) once you need instant cross-object semantic/AI search at scale.

---

## 32–35. Files, Notifications, Communication Center, Telephony

- **Files:** store in S3-compatible object storage (never in MySQL) — store only metadata (`files` table: id, org_id, record_type, record_id, s3_key, size, mime_type, uploaded_by).
- **Notifications:** in-app (WebSocket via Socket.io) + external (email/Slack/SMS/push) — one `notifications` table + a fan-out worker per delivery channel.
- **Communication Center:** every channel (email, phone, SMS, WhatsApp, chat, social) normalizes into `activities` — this is what makes the timeline in §10 actually unified.
- **Telephony:** Twilio/Aircall webhook receivers → call metadata + recording URL → transcription job → activity record.

---

## 36–38. Integrations, API Platform, Import/Export/Migration

- **Native integrations:** Gmail, Outlook, Slack, Teams, WhatsApp, Stripe, PayPal, QuickBooks, Xero, Shopify, Calendly, Zapier, Make — each as an OAuth connection + a sync worker.
- **API Platform:** versioned REST API (`/v1/...`) covering every standard and custom object; OAuth2 app registration, scoped API keys, per-key rate limiting (Redis token bucket), webhook subscriptions with signed payloads and retry/backoff, full request logging for the developer dashboard.
- **Import/Export/Migration:** CSV/Excel/JSON import with field mapping UI, preview, validation, duplicate detection, and a **rollback log** (`import_batches` table tracking every record created/updated by a batch, so a bad import can be reversed). Purpose-built migration mappers for HubSpot/Salesforce/Zoho/Pipedrive exports.

---

## 39–42. Duplicate Management, Data Governance, Security, Compliance

- **Duplicates:** exact + fuzzy matching (email/domain/phone, Levenshtein/trigram similarity) with a merge-suggestion queue and configurable auto-merge rules.
- **Governance:** full audit log (`audit_logs`: actor, action, object_type, record_id, before_json, after_json, ip, timestamp) on every write; data retention policies; GDPR/CCPA-style deletion workflows that cascade correctly across the relationship graph.
- **Security:** password + Google/Microsoft OAuth + SAML SSO for enterprise; MFA/2FA (TOTP); encryption at rest (MySQL TDE or disk-level) and in transit (TLS everywhere); secrets in a vault (AWS Secrets Manager/HashiCorp Vault), never in env files in production; IP allowlisting for enterprise accounts; API rate limiting and brute-force lockouts.
- **Compliance:** design for SOC 2 and CCPA/CPRA from day one (audit logging, access controls, encryption are prerequisites for the eventual audit) — but **only claim a certification once you've actually completed the third-party audit**; don't market "SOC 2 compliant" based on technical controls alone.

---

## 43–46. Admin Center, Billing System, Mobile, UX Shell

- **Admin Center:** one settings area covering org, users, teams, roles/permissions, custom objects/tables/fields, pipelines, automations, integrations, API/webhooks, billing, security, audit logs.
- **Billing:** Stripe Billing for subscription management — per-seat and usage-based (AI credits, email sends, API calls) pricing tiers, self-serve checkout, proration, dunning/payment-failure handling, coupon codes, usage metering written to a `usage_events` table and aggregated hourly.
- **Mobile:** ship a strong responsive web app first; native iOS/Android later once core workflows (contacts, deals, tasks, calls, voice-to-CRM) are proven.
- **UX shell:** global command palette (⌘K) for search/create/navigate, quick-create shortcuts, and a **consistent record-page layout** (header + tabs + unified timeline) applied to every object, standard or custom — this consistency is what makes a CRM with 50+ object types still feel simple.

---

## 47–50. Application Architecture (React + Node.js)

```
React.js (SPA)
     │  REST/GraphQL + WebSocket
Node.js API layer (Express or NestJS)
     │
     ├── Auth Service        (JWT + refresh tokens, OAuth, SAML)
     ├── CRM Services        (contacts, deals, custom objects, etc.)
     ├── Permission Service  (RBAC/field/record-level checks — called by every service)
     ├── AI Services         (LLM orchestration, agents, enrichment)
     └── Integration Services
     │
Domain Event Bus (Redis pub/sub or a lightweight message broker)
     │
     ├── Workflow/Automation Engine
     ├── Background Workers (BullMQ): email, AI processing, enrichment,
     │     imports/exports, report generation, notifications, webhooks,
     │     transcription, document processing
     │
MySQL (primary OLTP)  +  Redis (cache, queues, pub/sub)  +  S3 (files)
  +  OpenSearch (optional, search at scale)  +  Read replica (reporting)
```

**Recommended Node.js building blocks:**
- Framework: **NestJS** (recommended for a system this modular — built-in DI, module boundaries, guards for permission checks) or Express + a disciplined folder structure if you prefer something lighter.
- ORM: **Prisma** (best-in-class MySQL support, type-safe, good migration tooling) or Sequelize/TypeORM if the team already knows them.
- Queue: **BullMQ** on Redis for all async/background work.
- Realtime: **Socket.io** for live notifications and collaborative record editing.
- AI orchestration: a thin internal SDK wrapping your LLM provider(s) with function-calling/tool definitions shared across the Copilot and Agent framework — don't duplicate prompt/tool logic per feature.

**Suggested backend module boundaries** (avoid one giant monolith folder):
```
/auth /users /organizations /teams /roles /permissions
/contacts /companies /leads /deals /activities /tasks /meetings
/custom-objects /custom-fields /custom-tables
/workflows /automation /notifications
/email /calendar /telephony
/tickets /knowledge-base
/products /quotes /subscriptions
/reports /dashboards
/ai /agents /enrichment
/integrations /api /webhooks
/billing /audit /files /search
```
Each module owns its own MySQL tables, service layer, and controller — cross-module access goes through service interfaces or domain events, not direct table access, so modules stay independently testable and (later) independently deployable if you split to microservices.

---

## 51. Database Architecture (MySQL specifics)

- **Engine:** InnoDB everywhere (transactions, row-level locking, foreign keys).
- **Multi-tenancy column:** `organization_id` on every tenant table, as the leading column in composite indexes used for list/filter queries.
- **Custom data:** hybrid JSON + generated-column pattern from §2.3 — this is the one part of a MySQL CRM that genuinely needs more care than the equivalent Postgres/JSONB design, so budget real engineering time here.
- **Indexing discipline:** every foreign key indexed; every `(organization_id, <common filter column>)` pair indexed; review slow query log weekly once you have real traffic.
- **Scaling path:** start with a single primary + one read replica (route reports/dashboards to the replica). Add read replicas as reporting load grows. Consider **Vitess** (MySQL horizontal sharding, built for exactly this kind of multi-tenant SaaS scale-out) if/when a single primary becomes the bottleneck — don't build sharding logic yourself from day one.
- **Migrations:** use Prisma Migrate (or your ORM's migration tool) with a strict review process — schema changes in a multi-tenant system are high-risk; test against a production-like dataset size before deploying.

---

## 52. Search Architecture

MySQL FULLTEXT (InnoDB supports it since 5.6) is sufficient for early-stage global search across contacts/companies/deals/notes. Once you need cross-object relevance ranking, typo tolerance, or AI semantic search, stream changes out via CDC (Debezium on the MySQL binlog is the standard approach) into OpenSearch/Elasticsearch rather than dual-writing from the application (dual-write drifts out of sync over time).

---

## 53. Background Job System

Every async operation (email send/tracking, AI processing, enrichment, import/export, workflow execution, report generation, notifications, webhook delivery, call transcription, document processing) runs through **BullMQ on Redis**: retryable, has delayed/scheduled jobs (for reminders, SLA timers, sequence steps), dead-letter handling, and a dashboard (Bull Board) for operational visibility.

---

## 54–55. Observability & Diagnostics

- **Observability:** structured application logs, error tracking (Sentry), APM (latency/throughput per endpoint), DB slow-query monitoring, queue depth/failure monitoring, AI token-usage monitoring, uptime monitoring.
- **Customer-facing diagnostics** (critical for trust in an automation-heavy product): expose **System Logs**, **Automation Logs** (workflow/trigger/condition/action/status/error/duration), and **API Logs** (endpoint/method/user/status/latency/request ID) inside the Admin Center — this directly answers the #1 automation support question: *"why didn't my automation run?"*

---

## 56. Product Architecture Summary — The Three Pillars

```
                    CRM PLATFORM
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
   DATA MODEL        PERMISSION          AUTOMATION
   (Objects,         (Roles, Teams,      (Triggers,
    Tables,           Records,            Conditions,
    Fields,           Fields)             Actions, Events)
    Relations,
    Views)
                         │
                         ↓
                    AI LAYER
                         │
              ┌──────────┼──────────┐
              │          │          │
           Copilot    Agents    Intelligence
        (NL query)  (autonomous  (enrichment,
                     workflows)   scoring, summarization)
```
Get **Data Model + RBAC + Automation + AI** right, and Contacts/Companies/Deals/Tickets/Marketing/Support become modules built *on top of* the platform — not isolated, hand-built features. This is the architectural bet that makes an AI-native, custom-object-first CRM meaningfully different from "another HubSpot clone."

---

## 57. Recommended MVP Roadmap

Do **not** build all of the above before launch — sequence it so you have a sellable product as early as possible.

| Phase | Scope |
|---|---|
| **1 — Foundation** | Auth, Organizations, Users, Teams, Roles, Permissions, Contacts, Companies, Deals, Activities, Tasks, custom fields (basic), custom views, search, audit logs |
| **2 — Differentiator** | Custom Objects, Custom Tables + full CRUD, Relationships, Dynamic Views, custom permissions, Workflow/Automation Engine |
| **3 — AI** | AI CRM assistant, record summarization, AI email drafting, AI enrichment, lead/deal scoring, meeting summaries, next-best-action |
| **4 — Sales** | Gmail/Outlook sync, calendar, email tracking, sequences, meeting scheduler, quotes/CPQ |
| **5 — Support** | Tickets, shared inbox, live chat, knowledge base, AI support agent |
| **6 — Marketing** | Forms, landing pages, email campaigns, marketing automation, ad tracking/attribution |
| **7 — Enterprise** | SSO/SAML, advanced RBAC, field-level security, full audit trail, data retention, advanced analytics, SOC 2 audit process, data residency options |

**Build order priority within Phase 1–2:** Data Model → RBAC → Automation Engine, in that order, before building Contacts/Deals/etc. as "just" objects on top of them. This is the single highest-leverage sequencing decision for the whole project.

---

*End of specification.*
