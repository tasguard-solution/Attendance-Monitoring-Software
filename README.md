# 📋 Attendance Monitoring Software

A full-stack attendance monitoring system built with **React + Vite** on the frontend and **Supabase Edge Functions (Deno/Hono)** on the backend. Organizations can register, generate QR codes, and track employee attendance in real-time via QR code scanning.

> **Figma Design**: [View Original Design](https://www.figma.com/design/If3LVAYDATTr3V3rEwm6Ue/Attendance-Monitoring-Software)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Organization Signup/Login** | Organizations register and receive a unique QR code |
| **Employee Signup/Login** | Employees register under an organization using its ID |
| **QR Code Attendance** | Employees scan the org's QR code to clock in |
| **Live Dashboard** | Organizations see total employees, attendance records, and stats |
| **Geolocation Tracking** | Clock-in records include latitude/longitude |

---

## 🏗️ Architecture

```
┌──────────────────────┐       ┌────────────────────────────────┐
│   React Frontend     │       │   Supabase Edge Function       │
│   (Vite + TS)        │──────▶│   (Deno + Hono framework)      │
│                      │       │                                │
│  • LandingPage       │       │  POST /org/signup              │
│  • OrgLogin          │       │  POST /employee/signup         │
│  • OrgDashboard      │       │  GET  /org/qrcode              │
│  • EmployeeLogin     │       │  GET  /org/employees           │
│  • EmployeeScanner   │       │  POST /attendance/clockin      │
│                      │       │  GET  /attendance/records      │
└──────────────────────┘       └────────────────────────────────┘
                                         │
                                         ▼
                               ┌─────────────────────┐
                               │   Supabase Auth      │
                               │   + KV Store (Deno)  │
                               └─────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (recommended v20+)
- **npm** v9+
- A **Supabase** project (for auth and hosting the Edge Function)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd "Attendance Monitoring Software"

# Install dependencies
npm i

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173/`.

### Stopping the Server

Press `Ctrl + C` in the terminal to stop the dev server.

---

## ⚙️ Configuration

### Supabase Credentials

The Supabase project ID and public anon key are stored in:

```
utils/supabase/info.tsx
```

If you fork or move this project to a different Supabase instance, update the values there.

### Environment Variables (Edge Function)

The Supabase Edge Function uses the following environment variables (auto-provided by Supabase):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key with admin privileges |

---

## 📦 Project Structure

```
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx        # Home page with role selection
│   │   │   ├── OrgLogin.tsx           # Organization signup & login
│   │   │   ├── OrgDashboard.tsx       # Dashboard with QR code, employees, records
│   │   │   ├── EmployeeLogin.tsx      # Employee signup & login
│   │   │   ├── EmployeeScanner.tsx    # QR code scanner for clock-in
│   │   │   └── ui/                    # Reusable UI components (Radix-based)
│   │   └── lib/
│   │       └── supabase.ts            # Supabase client initialization
│   └── styles/
│       └── index.css                  # Global styles (Tailwind)
├── utils/
│   └── supabase/
│       └── info.tsx                   # Supabase project ID & anon key
├── supabase/
│   └── functions/
│       └── make-server-f3cc8027/      # Edge Function (deployed to Supabase)
│           ├── index.ts               # All API routes (Hono)
│           └── kv_store.tsx           # Deno KV storage helper
├── package.json
├── .npmrc                             # Dependency resolution config
├── vite.config.ts
└── tsconfig.json
```

---

## 🔌 API Endpoints

All endpoints are served under:
```
https://<project-id>.supabase.co/functions/v1/make-server-f3cc8027/
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/org/signup` | Anon key | Register a new organization |
| `POST` | `/employee/signup` | Anon key | Register a new employee |
| `GET` | `/org/qrcode` | User JWT | Get the organization's QR code |
| `GET` | `/org/employees` | User JWT | List employees in the organization |
| `POST` | `/attendance/clockin` | User JWT | Record employee attendance |
| `GET` | `/attendance/records` | User JWT | Get attendance records |
| `GET` | `/health` | None | Health check |

### Authentication Headers

For **authenticated endpoints**, send both headers:

```
Authorization: Bearer <SUPABASE_ANON_KEY>
X-Authorization: Bearer <USER_JWT_TOKEN>
```

- `Authorization` satisfies the Supabase API Gateway (Kong)
- `X-Authorization` carries the actual user session token to the Edge Function

---

## 🔧 Deploying the Edge Function

If you make changes to the backend code in `supabase/functions/make-server-f3cc8027/`:

```bash
# Login to Supabase CLI (first time only)
npx supabase login

# Deploy the Edge Function
npx supabase functions deploy make-server-f3cc8027
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS 4, Radix UI, Lucide Icons |
| **Backend** | Supabase Edge Functions (Deno runtime) |
| **API Framework** | Hono (lightweight web framework) |
| **Authentication** | Supabase Auth |
| **Data Storage** | Deno KV (key-value store) |
| **QR Code** | `qrcode` (generation), `html5-qrcode` (scanning) |

---

## 📝 Known Issues & Notes

- The `react-qr-reader` package has a peer dependency conflict with React 18. This is resolved via `.npmrc` (`legacy-peer-deps=true`).
- The dual-header authentication pattern (`Authorization` + `X-Authorization`) is required because Supabase's Kong gateway validates the `Authorization` header before it reaches the Edge Function.

---

## 📄 License

This project is private and not licensed for public distribution.