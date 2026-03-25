# Voice API

FastAPI backend for catalog processing, Vapi provisioning, and public tool endpoints.

## Local run

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The service loads environment variables from either:

- `services/voice-api/.env.local`
- `services/voice-api/.env`
- the repo-root `.env.local`
- the repo-root `.env`

## Deploy on Vercel

This directory can be deployed as its own Vercel project.

1. Import the repo into Vercel and set the project's Root Directory to `services/voice-api`.
2. Add these environment variables to the backend project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DIRECT_POSTGRES_URL`
   - `VAPI_API_KEY`
   - `GEMINI_API_KEY`
3. Optional but recommended:
   - enable Vercel system environment variables so the service can auto-detect its public URL
   - or set `VAPI_PUBLIC_BASE_URL` explicitly if you are using a custom domain
4. Deploy.

Vercel uses [index.py](/Users/saumay/Desktop/property-management/services/voice-api/index.py) as the FastAPI entrypoint.
