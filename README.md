# Team Task Manager

A full-stack SaaS-style team task management application with role-based access control, project management, and real-time task tracking.

## Features

- **Authentication** — Signup, login, JWT sessions
- **Role-based access** — Admin and Member roles with different permissions
- **Project Management** — Create, edit, delete projects; manage team members per project
- **Task Management** — Kanban-style view (To Do / In Progress / Completed), assign tasks, set due dates
- **Dashboard** — Task statistics, charts, overdue alerts, activity log
- **Responsive UI** — Works on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd team-task-manager

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# backend/.env
cp backend/.env.example backend/.env
# Edit JWT_SECRET to a strong random value in production
```

### 3. Seed Demo Data (optional)

```bash
cd backend && node src/seed.js
```

### 4. Start Development Servers

In two terminals:

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | admin123 | Admin |
| member@demo.com | member123 | Member |
| carol@demo.com | member123 | Member |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `5000` |
| `JWT_SECRET` | Secret key for JWT signing | — (required) |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | CORS allowed origin | `*` |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Register user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/projects` | ✓ | List projects |
| POST | `/api/projects` | Admin | Create project |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |
| GET | `/api/tasks` | ✓ | List tasks |
| POST | `/api/tasks` | Admin | Create task |
| PUT | `/api/tasks/:id` | ✓ | Update task |
| DELETE | `/api/tasks/:id` | Admin | Delete task |
| GET | `/api/dashboard` | ✓ | Dashboard data |
| GET | `/api/users` | Admin | List users |

## Deployment (Railway)

### Backend

1. Create a new Railway project
2. Add a service from GitHub — point to `/backend`
3. Set environment variables:
   - `JWT_SECRET` — generate with `openssl rand -hex 32`
   - `NODE_ENV=production`
   - `FRONTEND_URL` — your frontend Railway URL
4. Railway detects Node.js automatically; start command: `node src/index.js`

### Frontend

1. Add another service in the same Railway project — point to `/frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variable:
   - `VITE_API_URL` — your backend Railway URL

> **Note:** For production, update `frontend/src/utils/api.js` to use `VITE_API_URL` from env if the Vite proxy isn't available (Railway serves frontend statically).

### One-command local start (root level)

```bash
# From repo root
npm run dev
```

This requires the root `package.json` (see below).

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry
│   │   ├── database.js       # SQLite setup & schema
│   │   ├── seed.js           # Demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT + RBAC middleware
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── projects.js
│   │       ├── tasks.js
│   │       ├── users.js
│   │       └── dashboard.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── utils/api.js
│   │   ├── components/Layout.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Signup.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Projects.jsx
│   │       ├── ProjectDetail.jsx
│   │       ├── Tasks.jsx
│   │       └── Team.jsx
│   └── vite.config.js
└── README.md
```
