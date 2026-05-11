# ⚡ ETHARA AI — TASK NEXUS

> **Cyberpunk-themed Team Task Management Platform**  
> Built with the MERN Stack — MongoDB · Express · React · Node.js

![Version](https://img.shields.io/badge/version-1.0.0-00f5ff?style=flat-square)
![Stack](https://img.shields.io/badge/stack-MERN-ff0090?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-bf00ff?style=flat-square)

---

## 🌐 Overview

**Ethara AI** is a full-featured, production-grade team task management platform with an immersive neon-lit cyberpunk aesthetic inspired by *Blade Runner*, *The Matrix*, and *Cyberpunk 2077*.

It combines the collaborative workflow of Trello and Asana with:
- **Drag-and-drop Kanban boards**
- **Real-time analytics dashboards**
- **Role-based access control**
- **Glassmorphism UI with neon glow effects**
- **Framer Motion animations**

---

## ✨ Features

### 🔐 Authentication
- JWT-based secure authentication
- Password hashing with `bcryptjs` (12 salt rounds)
- Strong password validation (8+ chars, uppercase, number)
- Persistent sessions via localStorage token
- Rate-limited login (20 attempts per 15 minutes)

### 📁 Project Management
- Create and manage projects with custom neon colors
- Project creator auto-assigned as Admin
- Admins can add/remove team members
- Members see only their assigned projects
- Project stats: total tasks, completed, overdue

### ✅ Task Management
- Rich task creation: title, description, due date, priority, assignee
- **Drag-and-drop Kanban board** (To Do → In Progress → Done)
- List view with inline status updates
- Task detail modal with full edit support
- Priority levels: Low · Medium · High · Critical
- Overdue detection with visual alerts

### 📊 Dashboard & Analytics
- Live stats: total tasks, completed, in-progress, overdue, completion rate
- Tasks by Status (Pie Chart)
- Tasks by Priority (Pie Chart)
- Tasks per Operative (Bar Chart)
- Upcoming deadlines (next 7 days)
- Recent activity feed

### 🛡️ Role-Based Access Control
| Feature | Admin | Member |
|---|---|---|
| Create projects | ✅ | ❌ |
| Delete projects | ✅ | ❌ |
| Create tasks | ✅ | ❌ |
| Delete tasks | ✅ | ❌ |
| Update task status | ✅ | ✅ |
| View all projects | ✅ | ❌ |
| View assigned projects | ✅ | ✅ |
| Manage team members | ✅ | ❌ |
| User management | ✅ | ❌ |
| Analytics dashboard | ✅ | ✅ (own data) |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (JSX), React Router DOM v6, Framer Motion |
| **Styling** | Custom CSS Variables, Glassmorphism, Neon Effects |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **HTTP Client** | Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Security** | Helmet, CORS, express-rate-limit, express-validator |
| **Dev Tools** | Nodemon, Concurrently |

---

## 📁 Project Structure

```
ethara-ai/
├── package.json              # Root scripts (concurrently)
│
├── server/                   # Express backend
│   ├── index.js              # Entry point
│   ├── .env.example          # Environment template
│   ├── models/
│   │   ├── User.js           # User schema + password hashing
│   │   ├── Project.js        # Project schema + activity log
│   │   └── Task.js           # Task schema + virtuals
│   ├── routes/
│   │   ├── auth.js           # Register, login, profile
│   │   ├── projects.js       # CRUD + member management
│   │   ├── tasks.js          # CRUD + comments
│   │   ├── users.js          # User listing + deactivation
│   │   └── analytics.js      # Dashboard data aggregation
│   └── middleware/
│       └── auth.js           # JWT protect, adminOnly, projectMember
│
└── client/                   # React frontend
    ├── public/
    │   └── index.html
    ├── package.json
    └── src/
        ├── App.jsx            # Router + protected routes
        ├── index.js           # React entry
        ├── styles/
        │   └── globals.css    # Cyberpunk theme, CSS variables
        ├── context/
        │   └── AuthContext.jsx # Global auth state
        ├── utils/
        │   └── api.js         # Axios instance + interceptors
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.jsx  # App shell
        │   │   └── Sidebar.jsx # Collapsible navigation
        │   ├── tasks/
        │   │   ├── KanbanBoard.jsx     # Drag-and-drop board
        │   │   ├── TaskForm.jsx        # Create/edit form
        │   │   └── TaskDetailModal.jsx # Task detail view
        │   └── ui/
        │       ├── Modal.jsx      # Reusable modal
        │       └── LoadingScreen.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── DashboardPage.jsx
            ├── ProjectsPage.jsx
            ├── ProjectDetailPage.jsx
            ├── TasksPage.jsx
            └── UsersPage.jsx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ethara-ai.git
cd ethara-ai
```

### 2. Install all dependencies

```bash
npm run install:all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ethara-ai
JWT_SECRET=your_super_secret_key_minimum_32_characters_long
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

```bash
# Client
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start development servers

```bash
npm run dev
```

This starts both:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

### 5. Production build

```bash
npm run build
npm start
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List projects (filtered by role) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + tasks |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project + tasks |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (with filters) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task details |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Full dashboard data |

### Users (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id/deactivate` | Deactivate user |

---

## 🎨 Design System

The UI is built on a custom CSS variable system with cyberpunk aesthetics:

```css
--neon-cyan:    #00f5ff   /* Primary accent */
--neon-pink:    #ff0090   /* Danger / Admin */
--neon-purple:  #bf00ff   /* Secondary */
--neon-green:   #00ff41   /* Success / Done */
--neon-yellow:  #ffea00   /* Medium priority */
--neon-orange:  #ff6b00   /* High priority */

--bg-void:      #020408   /* Base background */
--bg-panel:     #0a1628   /* Cards & panels */

--font-display: 'Orbitron'        /* Headings & labels */
--font-body:    'Rajdhani'        /* Body text */
--font-mono:    'Share Tech Mono' /* Code & metadata */
```

### Priority Color System
| Priority | Color |
|---|---|
| Low | `#00ff41` (Neon Green) |
| Medium | `#ffea00` (Neon Yellow) |
| High | `#ff6b00` (Neon Orange) |
| Critical | `#ff0090` (Neon Pink) |

---

## 🔒 Security Features

- **Helmet**: HTTP security headers
- **CORS**: Whitelist only the client URL
- **Rate limiting**: 100 req/15min globally, 20 req/15min on auth
- **JWT secrets**: Never exposed to frontend
- **bcryptjs**: 12 salt rounds for password hashing
- **Input validation**: `express-validator` on all inputs
- **Protected routes**: Middleware guards every API endpoint
- **Role guards**: Admin-only routes enforced server-side

---

## 🚢 Deployment

### MongoDB Atlas
1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Get your connection string
3. Set `MONGODB_URI` in server `.env`

### Backend (Railway / Render / Heroku)
1. Set all `.env` variables in the platform dashboard
2. Set build command: `npm install`
3. Set start command: `node index.js`

### Frontend (Vercel / Netlify)
1. Set `REACT_APP_API_URL` to your deployed backend URL
2. Build command: `npm run build`
3. Output directory: `build`

---

## 📄 License

MIT © 2025 Ethara AI

---

<div align="center">
  <strong>⚡ ETHARA AI — TASK NEXUS ⚡</strong><br/>
  <em>Built for the operatives of tomorrow</em>
</div>
