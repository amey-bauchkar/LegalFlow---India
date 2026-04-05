# LegalFlow India – Law Firm Case Management System

## Project Overview
- **Name**: LegalFlow India
- **Goal**: Premium SaaS dashboard for Indian law firms to manage cases, hearings, billing, documents, and team workflows
- **Stack**: Express.js + MongoDB (backend), React 18 + Framer Motion + Tailwind CSS via CDN (frontend)
- **Architecture**: Monorepo with separate `/backend` and `/frontend` directories

## URLs
- **Live Demo**: https://3000-icow0m6ltqiqowprpa84b-de59bda9.sandbox.novita.ai
- **GitHub**: https://github.com/amey-bauchkar/LegalFlow---India

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@legalflow.in | admin123 |
| Lawyer | priya@legalflow.in | lawyer123 |

## Features

### Completed
- **Authentication**: JWT-based login/signup with session persistence (localStorage)
- **Dashboard**: AI-powered insights, metric cards, real-data charts (status/revenue), upcoming hearings, cause list, court groups
- **Case Management**: Full CRUD, Add Case modal, matter stage stepper, filtering/sorting/search, CSV export, PDF export
- **Client Management**: List/filter/search clients, CSV export
- **Document Management**: Upload, list, filter, search across title/type/category, e-signature simulation
- **Billing/Invoices**: Metric cards, collection progress, search/filter, PDF invoice export
- **Calendar**: Monthly grid with events, event sidebar, hearings & deadlines
- **Time Tracking**: Timer UI, billable/unbilled metrics, time entries table
- **Expense Tracking**: Expense ledger, category icons, billable filters
- **Team Collaboration**: API-driven team list (from DB), role badges, case counts, search/filter
- **Reports & Analytics**: Revenue trajectory, practice area distribution, saved reports
- **Role-Based Access**: Admin (full), Lawyer (assigned only), Client (own cases only) – enforced backend + frontend
- **Dark Mode**: Toggle with localStorage persistence, full light/dark theme CSS
- **AI Assistant**: Floating chat button with context-aware responses about cases, hearings, invoices, tasks, team
- **Messaging System**: Per-case threaded messages with sender/timestamp, real-time display
- **Notification Center**: Real unread count, mark single/all read, dropdown with outside-click & Escape close, categorized icons
- **Workflow Automation**: Rule-based alerts for upcoming hearings (3 days), overdue invoices, overdue tasks, filing deadlines
- **Audit Log**: Append-only tracking of create, update, sign, delete actions (admin view)
- **E-Signature**: Simulated signing of documents with timestamp and signer name
- **Document Request Workflow**: Status tracking (Requested → Uploaded → Reviewed), requester/responder
- **Advanced Analytics**: Computed from real data – revenue, case stages, overdue tasks, invoice aging, hearings this week
- **Export**: CSV (cases, clients) via PapaParse; PDF (invoices, case summaries) via jsPDF
- **Responsive Design**: Mobile hamburger menu, sidebar toggle, adaptive layouts
- **Global Search**: Real-time search across cases, clients, documents from header
- **Client Portal**: Separate sidebar navigation for client role users
- **Validation**: Required fields enforced on forms, inline error messages
- **Loading Indicators**: Spinner on login, loading screen with progress bar

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET/POST | /api/cases | List/Create cases |
| GET/PUT/DELETE | /api/cases/:id | Case CRUD |
| GET/POST | /api/clients | List/Create clients |
| GET/PUT/DELETE | /api/clients/:id | Client CRUD |
| GET | /api/documents | List documents |
| POST | /api/documents/upload | Upload document |
| PUT | /api/documents/:id/sign | E-sign document |
| GET/POST | /api/invoices | List/Create invoices |
| GET/PUT/DELETE | /api/invoices/:id | Invoice CRUD |
| GET/POST | /api/tasks | List/Create tasks |
| GET/PUT/DELETE | /api/tasks/:id | Task CRUD |
| GET/POST | /api/calendar | List/Create events |
| GET/PUT/DELETE | /api/calendar/:id | Event CRUD |
| GET | /api/dashboard/stats | Dashboard stats |
| GET | /api/users | List users (with case counts) |
| GET/PUT | /api/users/:id | User detail/update |
| GET/POST | /api/messages | List/Send messages |
| GET | /api/notifications | List notifications |
| PUT | /api/notifications/:id/read | Mark notification read |
| PUT | /api/notifications/read-all | Mark all read |
| GET | /api/notifications/unread-count | Unread count |
| GET | /api/audit-logs | Audit logs (admin only) |
| GET/POST | /api/document-requests | Document request workflow |
| PUT | /api/document-requests/:id | Update request status |
| GET | /api/workflow/alerts | Workflow automation alerts |
| POST | /api/workflow/generate-notifications | Generate notifications |

### Data Architecture
- **Database**: MongoDB with Mongoose ODM
- **Models**: User, Case, Client, Document, Invoice, Task, CalendarEvent, Message, AuditLog, Notification, DocumentRequest
- **Auth**: JWT tokens (7-day expiry), bcrypt password hashing
- **Roles**: admin, lawyer, client – enforced via middleware

## Setup

```bash
# Clone
git clone https://github.com/amey-bauchkar/LegalFlow---India.git
cd LegalFlow---India

# Backend
cd backend
npm install
cp .env.example .env  # Configure MONGODB_URI, JWT_SECRET
node seed/seed.js      # Seed demo data
npm start              # Starts on port 4000

# Frontend is served statically from /frontend via Express
```

## Deployment
- **Platform**: Node.js + MongoDB
- **Status**: ✅ Active
- **Last Updated**: 2026-04-05
