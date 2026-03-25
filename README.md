# Property Management Voice Desk

## Overview
Property Management Voice Desk is a multi-tenant maintenance intake platform for property management teams. It combines a Next.js operations app with a FastAPI voice backend that provisions Vapi assistants, validates units, searches service catalog PDFs, and creates tickets in Supabase.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: FastAPI, Pydantic Settings, asyncpg
- **Database/Auth/Storage**: Supabase
- **Voice/Telephony**: Vapi
- **Catalog processing**: Gemini
- **Package managers**: pnpm and uv
- **Deployment target**: Vercel with two projects

## Repository Layout

```text
.
├── apps/
│   └── web/                  # Next.js operations app
├── services/
│   └── voice-api/            # FastAPI voice backend and Vapi tools
├── supabase/                 # Local Supabase config, migrations, seed data
├── docs/                     # Project notes and architecture docs
├── .env.example              # Shared local development env template
├── apps/web/.env.example     # Frontend project env template
└── services/voice-api/.env.example
                             # Backend project env template
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer
- Python 3.12
- `uv`
- Supabase CLI
- ngrok or another tunnel tool if you want Vapi to call your local backend

### Installation

```bash
git clone <your-repository-url>
cd property-management
pnpm install
cd services/voice-api
uv sync
cd ../..
cp .env.example .env.local
```

Fill in `.env.local` with your local Supabase keys, Postgres URL, Vapi API key, and Gemini API key.

### Run the Project Locally

Start local Supabase:

```bash
pnpm db:start
pnpm db:status
```

Start the voice backend:

```bash
cd services/voice-api
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the web app:

```bash
pnpm dev:web
```

Useful local URLs:

- Web app: `http://127.0.0.1:3000`
- Voice API health: `http://127.0.0.1:8000/health`
- Voice API docs: `http://127.0.0.1:8000/docs`

## Environment Files

### Root Local Env

Use the root file for local development:

- `.env.example`
- `.env.local`

This is the shared source of truth for running the monorepo locally. `apps/web` explicitly loads the root `.env.local`, and `services/voice-api` can also read it.

### Frontend Project Env

Use [`apps/web/.env.example`](apps/web/.env.example) as the reference for the Vercel frontend project.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VOICE_API_BASE_URL`

### Backend Project Env

Use [`services/voice-api/.env.example`](services/voice-api/.env.example) as the reference for the Vercel backend project.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DIRECT_POSTGRES_URL`
- `VAPI_API_KEY`
- `GEMINI_API_KEY`

Optional but recommended:

- `VAPI_PUBLIC_BASE_URL`
  - Set this if you are using a custom backend domain.
  - If omitted, the backend can derive its public URL from Vercel system environment variables.

## Vercel Deployment

This project is designed to be deployed as **two separate Vercel projects**.

### 1. Create the Backend Project

In Vercel:

1. Import the repository.
2. Set the **Root Directory** to `services/voice-api`.
3. Add the backend environment variables from `services/voice-api/.env.example`.
4. Enable Vercel system environment variables.
5. Deploy the backend first.

After deploy, verify:

- `https://<your-backend-domain>/health`

The backend URL becomes the public base for Vapi tool calls.

### 2. Create the Frontend Project

In Vercel:

1. Import the same repository again as a second project.
2. Set the **Root Directory** to `apps/web`.
3. Add the frontend environment variables from `apps/web/.env.example`.
4. Set `VOICE_API_BASE_URL` to your deployed backend URL.
5. Deploy the frontend.

### 3. Re-Provision the Assistant After Deployment

If you previously provisioned Vapi against localhost, ngrok, or an old deployment URL, re-run provisioning after both projects are live. Vapi stores tool URLs in the assistant configuration, so old endpoints will keep being called until the assistant is updated or recreated.

## Git Setup

If this folder is not already a repository, initialize Git:

```bash
git init -b main
git add .
git commit -m "chore: initialize project"
```

Then connect your remote:

```bash
git remote add origin <your-repository-url>
git push -u origin main
```

## Useful Commands

```bash
pnpm dev:web       # Run the Next.js app
pnpm lint          # Lint the frontend
pnpm typecheck     # TypeScript typecheck for the frontend
pnpm db:start      # Start local Supabase
pnpm db:stop       # Stop local Supabase
pnpm db:reset      # Reset local Supabase database
pnpm db:types      # Regenerate Supabase TypeScript types
```

## Deployment Notes

- Do not put secrets in `NEXT_PUBLIC_*` variables.
- Use separate preview and production data if you plan to use preview deployments heavily.
- Deploy the backend before the frontend so the web project can point to the correct `VOICE_API_BASE_URL`.
- Keep `.env.local` out of Git. This repository ignores it by default.
