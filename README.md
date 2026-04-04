# LegalFlow India - Full-Stack Law Firm Case Management System

> A cinematic, premium SaaS dashboard for Indian law firms. Full-stack application with Node.js/Express backend, MongoDB database, JWT authentication, and React frontend with Framer Motion animations.

---

## Project Overview

- **Name**: LegalFlow India
- **Goal**: Complete SaaS case management platform for Indian law firms
- **Tech Stack**: Node.js + Express + MongoDB + React + Framer Motion + Tailwind CSS
- **Status**: Production-Ready Full-Stack Application

---

## URLs

- **Live App**: https://3000-icow0m6ltqiqowprpa84b-de59bda9.sandbox.novita.ai
- **API Base**: https://3000-icow0m6ltqiqowprpa84b-de59bda9.sandbox.novita.ai/api
- **Health Check**: /api/health

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** (full access) | `admin@legalflow.in` | `admin123` |
| **Lawyer** (Priya Nair) | `priya@legalflow.in` | `lawyer123` |
| **Lawyer** (Suresh Iyer) | `suresh@legalflow.in` | `lawyer123` |
| **Lawyer** (Meera Desai) | `meera@legalflow.in` | `lawyer123` |
| **Lawyer** (Amit Sharma) | `amit@legalflow.in` | `lawyer123` |
| **Lawyer** (Kavita Reddy) | `kavita@legalflow.in` | `lawyer123` |

---

## Completed Features

### Authentication System
- JWT-based signup/login/logout
- Password hashing with bcryptjs (12 rounds)
- Token validation via GET /api/auth/me
- Role-based access control (admin / lawyer)
- Auto-redirect on 401 / token expiry
- Persistent session via localStorage
- Premium login/signup screens with cinematic UI

### Backend API (Node.js + Express + MongoDB)
- RESTful API with standard response format: `{ success, message, data, pagination }`
- Full CRUD for: Cases, Clients, Documents, Invoices, Tasks, Calendar Events
- Server-side pagination, search, filter, sort on all endpoints
- Role-based authorization middleware
- File upload with multer (PDF, DOC, JPG, PNG, max 10MB)
- Centralized error handling with async wrapper
- Input validation with express-validator
- CORS configured for frontend origin

### Frontend (React + Framer Motion)
- **Unchanged premium UI** - all animations, styling, glassmorphism preserved
- API client module with centralized request handling
- JWT token injection on all requests
- Global 401 handling with redirect to login
- Loading states during data fetch
- Auth-gated dashboard access
- Logout functionality in sidebar

### Database Models (MongoDB/Mongoose)
- **User**: name, email, password (hashed), role, phone, designation
- **Case**: caseNumber, diaryNumber, title, client (ref), courtName, bench, advocate (ref), stage, priority, status, timeline[], adjournmentHistory[]
- **Client**: name, contact, phone (+91), email, PAN, GST, type (Corporate/Individual), address
- **Document**: title, type, category, caseId (ref), fileUrl, fileSize, status, uploadedBy
- **Invoice**: invoiceNumber, clientId (ref), caseId (ref), amount, GST (18% auto), total, type, status, dueDate
- **Task**: caseId (ref), title, assignee, dueDate, status, priority
- **CalendarEvent**: caseId (ref), title, date, time, court, type, priority

### Authorization Rules
- **Admin**: Full access to all data
- **Lawyer**: Can only access assigned cases, related documents, clients, invoices

### Indian Legal Context
- Indian courts (Supreme Court, High Courts, District Courts)
- INR formatting with 18% GST
- Indian document types: Vakalatnama, Affidavit, Aadhaar, PAN, Sale Deed
- Indian phone format (+91)
- 8-stage matter workflow: Filing > Admission > Written Statement > Evidence > Arguments > Final Hearing > Order Reserved > Disposed

---

## API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Validate token, get current user |

### Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List all cases (paginated, searchable, filterable) |
| GET | `/api/cases/:id` | Get single case with populated refs |
| POST | `/api/cases` | Create new case |
| PUT | `/api/cases/:id` | Update case |
| DELETE | `/api/cases/:id` | Delete case (admin only) |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients with enriched data |
| GET | `/api/clients/:id` | Get single client |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client (admin only) |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload document (multipart/form-data) |
| GET | `/api/documents/:id` | Get document |
| DELETE | `/api/documents/:id` | Delete document |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices with stats |
| GET | `/api/invoices/:id` | Get invoice |
| POST | `/api/invoices` | Create invoice |
| PUT | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Delete invoice (admin only) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/:id` | Get task |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar` | List events (filterable by month/year) |
| POST | `/api/calendar` | Create event |
| PUT | `/api/calendar/:id` | Update event |
| DELETE | `/api/calendar/:id` | Delete event |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated dashboard statistics |

### Query Parameters (all list endpoints)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `search` - Text search across relevant fields
- `sort` - Sort field:direction (e.g., `title:asc`, `date:desc`)
- `status` - Filter by status
- `priority` - Filter by priority
- `type` - Filter by type

---

## Project Structure

```
webapp/
  backend/
    config/
    controllers/
      authController.js     # signup, login, getMe
      caseController.js     # CRUD with search/filter/sort/pagination
      clientController.js   # CRUD with enrichment
      documentController.js # upload + CRUD
      invoiceController.js  # CRUD with stats
      taskController.js     # CRUD
      calendarController.js # events + dashboard stats
    middleware/
      auth.js              # protect + authorize middleware
      errorHandler.js      # centralized error handler + asyncHandler
      upload.js            # multer file upload config
    models/
      User.js              # bcrypt hashing, toJSON
      Case.js              # timeline, adjournmentHistory subdocs
      Client.js            # PAN/GST validation
      Document.js
      Invoice.js           # auto GST calculation
      Task.js
      CalendarEvent.js
    routes/
      auth.js, cases.js, clients.js, documents.js,
      invoices.js, tasks.js, calendar.js, dashboard.js
    seed/
      seed.js              # Complete demo data seeder
    uploads/               # File uploads directory
    server.js              # Express app entry point
    package.json
    .env                   # Environment variables
    .env.example
  frontend/
    index.html             # Main HTML with CDN imports
    js/
      api.js               # Centralized API client module
      app.js               # React app (2000+ lines, 15 sections)
    package.json
  ecosystem.config.cjs     # PM2 configuration
  .gitignore
  README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB 7.0+

### 1. Install Dependencies
```bash
cd webapp/backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Start MongoDB
```bash
mongod --dbpath ./data --bind_ip 127.0.0.1 --port 27017
```

### 4. Seed Database
```bash
cd backend
npm run seed
```

### 5. Start Application
```bash
# Development
cd webapp
pm2 start ecosystem.config.cjs

# Or directly
cd backend
npm run dev
```

### 6. Access
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

---

## Data Summary
- **6 users** (1 admin + 5 lawyers)
- **8 clients** (6 Corporate + 2 Individual)
- **13 cases** across Supreme Court, High Courts, District Courts
- **23 documents** (Indian legal document types)
- **12 invoices** (5 billing types, INR with 18% GST)
- **10 tasks** with priority and status tracking
- **14 calendar events** for April 2026

---

## Deployment

- **Platform**: Sandbox (PM2 + MongoDB local)
- **Status**: Active
- **Last Updated**: 2026-04-04
