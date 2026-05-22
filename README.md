# TCGMentor

AI-powered tutor for Trading Card Games (TCG). Built to help complete beginners learn games like Pokémon TCG, Magic: The Gathering, Yu-Gi-Oh!, Disney Lorcana, and One Piece Card Game — from zero knowledge to confident player.

---

## Features

- **Contextual AI tutor** — game-specific system prompts tailored to each TCG (Pokémon, Magic, Yu-Gi-Oh!, Lorcana, One Piece)
- **Real-time streaming** — server-sent events (SSE) for smooth token-by-token responses
- **Conversation history** — persistent chat sessions stored per user with full message history
- **TCG context selector** — pre-built question suggestions per game to guide beginners
- **Authentication** — JWT-based register/login with 7-day token expiry
- **Dark / Light mode** — theme persisted across sessions
- **Responsive layout** — conversation sidebar + chat area in a Claude-inspired interface

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| State | Zustand (persisted) |
| Backend | FastAPI (Python 3.12), async SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI | HuggingFace Inference API (OpenAI-compatible) |
| Auth | JWT (python-jose) + bcrypt |
| Container | Docker + Docker Compose |

---

## Architecture

```
Browser
  │
  ├── GET /chat         → Next.js App Router (SSR + client)
  │
  └── POST /api/chat/stream  → Next.js proxy route (avoids CORS)
                                    │
                                    └── POST /api/v1/chat/stream  → FastAPI backend
                                                                         │
                                                                         ├── PostgreSQL (conversations + messages)
                                                                         └── HuggingFace Inference API (streaming)
```

**Backend structure (DDD-inspired):**
```
backend/app/
├── api/v1/routes/    # HTTP layer — auth.py, chat.py
├── core/             # Config, database, security
├── models/           # SQLAlchemy ORM models
├── repositories/     # Data access layer
├── schemas/          # Pydantic request/response models
└── services/ai/      # HuggingFace client + prompt builder
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- [HuggingFace account](https://huggingface.co/) with an API token

### 1. Clone the repository

```bash
git clone https://github.com/GuigohC0D3/TCGMentor.git
cd TCGMentor
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Auth — generate with: openssl rand -hex 32
SECRET_KEY=your-secret-key-here

# HuggingFace — get at https://huggingface.co/settings/tokens
HF_TOKEN=hf_your_token_here
HF_MODEL=Qwen/Qwen2.5-72B-Instruct
```

### 3. Start the application

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs *(development only)* |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key (min 32 chars) | — |
| `HF_TOKEN` | HuggingFace API token | — |
| `HF_MODEL` | Model ID on HuggingFace | `Qwen/Qwen2.5-72B-Instruct` |
| `HF_BASE_URL` | HuggingFace OpenAI-compatible endpoint | `https://api-inference.huggingface.co/v1` |
| `DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `DEBUG` | Enables `/docs`, verbose SQL logs | `false` |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Authenticate and get token |
| `GET` | `/api/v1/auth/me` | Get current user |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/chat/stream` | Send message — SSE streaming response |
| `POST` | `/api/v1/chat/` | Send message — full response |
| `GET` | `/api/v1/chat/conversations` | List user conversations |
| `GET` | `/api/v1/chat/conversations/{id}` | Get conversation with messages |
| `DELETE` | `/api/v1/chat/conversations/{id}` | Delete conversation |

---

## Supported Games

| Key | Game |
|-----|------|
| `pokemon` | Pokémon TCG |
| `magic` | Magic: The Gathering |
| `yugioh` | Yu-Gi-Oh! |
| `lorcana` | Disney Lorcana |
| `onepiece` | One Piece Card Game |

---

## Development Roadmap

- [x] Week 1 — Project architecture, stack setup, Docker, auth, base chat
- [x] Week 2 — AI chat system, TCG context, streaming, conversation history
- [ ] Week 3 — Card search system with API integrations
- [ ] Week 4 — Learning paths, progress tracking, gamification
- [ ] Week 5 — Image upload + OCR for card recognition
- [ ] Week 6 — Deck builder with AI suggestions

---

## License

MIT
