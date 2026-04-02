# Property Management Voice Desk 🏠📞

**Multi-Tenant Voice-First Maintenance Intake Platform**

A sophisticated property management solution that combines a Next.js operations dashboard with a FastAPI voice backend powered by Vapi AI assistants for efficient maintenance ticket intake and resolution.

---

## 🌟 Features

- 🎤 **Voice-First Intake** - AI-powered voice calls for maintenance requests
- 🤖 **Vapi Integration** - Intelligent assistant provisioning and management
- 📋 **Smart Validation** - Unit validation and service catalog search
- 🎯 **Ticket Management** - Real-time ticket creation and tracking
- 📄 **PDF Processing** - Gemini AI-powered service catalog analysis
- 🗂️ **Multi-Tenant** - Separate operations for property management agencies
- 📊 **Dashboard** - Live ticket monitoring and resolution interface
- 🔐 **Enterprise Auth** - Supabase with role-based access control

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 with React 19
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Query for data fetching
- Vercel deployment

**Backend:**
- FastAPI (Python 3.12+)
- Async PostgreSQL (asyncpg)
- Pydantic for validation
- Gemini AI for document processing
- Vapi for voice agents

**Database & Storage:**
- Supabase (PostgreSQL)
- PDF document storage
- Service catalog knowledge base

**Infrastructure:**
- Vercel (frontend & serverless)
- Docker containerization
- ngrok for local webhook tunneling

---

## 📊 Language Composition

```
TypeScript: 71.9%
Python: 16.2%
CSS: 7.3%
PLpgSQL: 4.6%
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- pnpm 10+ (or npm/yarn)
- `uv` package manager for Python
- Supabase account with PostgreSQL
- Vapi API credentials
- Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/saumaykilla/property-management-voice-agent.git
cd property-management-voice-agent

# Install dependencies
pnpm install
cd services/voice-api
uv sync
cd ../..

# Setup environment
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp services/voice-api/.env.example services/voice-api/.env.local
```

### Environment Configuration

**Root `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DIRECT_POSTGRES_URL=your_postgres_url
VAPI_API_KEY=your_vapi_api_key
GEMINI_API_KEY=your_gemini_api_key
VOICE_API_BASE_URL=http://localhost:8000
```

### Run Locally

**Database:**
```bash
pnpm db:start
pnpm db:status
```

**Voice API Backend:**
```bash
cd services/voice-api
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Web Application:**
```bash
pnpm dev:web
```

**Access Points:**
- Web App: `http://127.0.0.1:3000`
- Voice API Health: `http://127.0.0.1:8000/health`
- Swagger Docs: `http://127.0.0.1:8000/docs`

---

## 📁 Repository Structure

```
property-management-voice-agent/
├── apps/
│   └── web/                    # Next.js operations app
│       ├── src/
│       │   ├── app/           # App router
│       │   ├── components/    # React components
│       │   ├── lib/           # Utilities
│       │   └── pages/         # Pages
│       └── .env.example
├── services/
│   └── voice-api/             # FastAPI backend
│       ├── app/
│       │   ├── main.py        # FastAPI app
│       │   ├── models.py      # Pydantic models
│       │   └── tools/         # Vapi tools
│       ├── index.py           # Vercel handler
│       └── requirements.txt
├── supabase/
│   ├── migrations/            # Database migrations
│   └── seed.sql              # Sample data
├── docs/                      # Architecture docs
├── design/                    # UI/UX designs
└── .env.example              # Environment template
```

---

## 🔧 Key Components

### Frontend Routes
- `/` - Landing page
- `/sign-in` - Staff authentication
- `/onboarding` - Agency setup flow
- `/dashboard` - Main operations workspace
- `/units` - Property and unit management
- `/catalog` - Service catalog management
- `/settings` - Agency configuration

### Backend Endpoints
```
POST   /api/vapi/provision     - Create Vapi assistant
POST   /api/vapi/call          - Initiate voice call
POST   /api/catalog/process    - Process PDF catalog
POST   /api/units/validate     - Validate unit
POST   /api/tickets/create     - Create maintenance ticket
GET    /api/tickets            - List tickets
```

### Voice Agent Capabilities
- Unit validation and lookup
- Service catalog search
- Ticket creation from voice
- Callback scheduling
- Multi-language support

---

## 💾 Database Schema

```sql
-- Agencies (tenants)
CREATE TABLE agencies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT,
  business_hours JSONB,
  vapi_org_id TEXT,
  created_at TIMESTAMPTZ
);

-- Units
CREATE TABLE units (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  unit_number TEXT,
  address TEXT,
  tenant_name TEXT,
  phone TEXT
);

-- Service Catalog
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  content TEXT,
  embeddings VECTOR(1536),
  updated_at TIMESTAMPTZ
);

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  unit_id UUID REFERENCES units(id),
  title TEXT,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
);
```

---

## 🎤 Voice Flow

1. Tenant calls Vapi phone number
2. Vapi assistant answers and validates unit
3. Assistant searches service catalog for issue type
4. Ticket created in Supabase via API tool
5. Operations team receives notification
6. Manual follow-up if needed

---

## 🚀 Deployment

### Frontend to Vercel
```bash
vercel deploy apps/web --prod
```

### Backend to Vercel
```bash
cd services/voice-api
vercel deploy --prod
```

### Docker Build
```bash
docker build -t property-mgmt-voice-agent .
docker run -p 8000:8000 property-mgmt-voice-agent
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────┐
│         Tenant Voice Call                        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │  Vapi AI Assistant       │
        │  - Unit Validation       │
        │  - Catalog Search        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │  FastAPI Backend         │
        │  - Process Requests      │
        │  - Call Tools            │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │  Supabase PostgreSQL     │
        │  - Tickets               │
        │  - Units                 │
        │  - Catalog               │
        └──────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │  Next.js Dashboard       │
        │  - Operations Team       │
        │  - Ticket Management     │
        └──────────────────────────┘
```

---

## 🤝 Contributing

Contributions welcome! Process:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/Enhancement`)
3. Commit changes (`git commit -m 'Add Enhancement'`)
4. Push to branch (`git push origin feature/Enhancement`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 📞 Support & Contact

- Issues: [GitHub Issues](https://github.com/saumaykilla/property-management-voice-agent/issues)
- Email: [saumay.killa@gmail.com](mailto:saumay.killa@gmail.com)

---

## 🔗 Links

- **Live Demo**: [Demo](https://property-management-voice-agent-web-beryl.vercel.app)
- **Design Docs**: See `design/` folder
- **API Documentation**: `services/voice-api` Swagger docs

---

<div align="center">

**Revolutionizing Property Management with Voice AI**

Made with ❤️ by Saumay Killa

[⬆ back to top](#property-management-voice-desk-)

</div>
