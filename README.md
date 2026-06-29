# ConvHub

[![CI/CD Pipeline](https://github.com/wardix/convhub/actions/workflows/ci.yml/badge.svg)](https://github.com/wardix/convhub/actions/workflows/ci.yml)
**A community platform for sharing Antigravity conversation experiences.**

ConvHub lets users upload their [Antigravity](https://deepmind.google/) conversation transcripts (JSONL files) and share them with the community. Browse, search, like, comment, and discover how others use AI coding assistants.

## ✨ Features

- 📤 **Upload Conversations** — Upload JSONL transcript files with title, description, and tags
- 💬 **Chat-Style Viewer** — Beautiful conversation viewer with markdown rendering and syntax-highlighted code blocks
- 🔍 **Browse & Search** — Discover conversations by keyword, tag, or popularity
- ❤️ **Likes** — Upvote conversations you find helpful or interesting
- 💭 **Comments** — Discuss and share feedback on shared conversations
- 👥 **Follow Users** — Stay updated on your favorite contributors
- 🏷️ **Tags** — Categorize conversations (web dev, debugging, automation, etc.)
- 🔥 **Trending** — Discover the most popular conversations
- 👤 **User Profiles** — View a user's shared conversations and activity
- 🌙 **Dark Mode** — Dark mode by default with light mode toggle

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Hono + Bun + TypeScript |
| Database | PostgreSQL (raw SQL via Bun) |
| Styling | CSS Modules |
| Auth | JWT (httpOnly cookies) + Google OAuth |
| Markdown | react-markdown + remark-gfm |
| Syntax Highlighting | highlight.js |

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (Recommended)
- Alternatively, for local manual setup:
  - [Bun](https://bun.sh/) v1.1+
  - [Node.js](https://nodejs.org/) v20+
  - [PostgreSQL](https://www.postgresql.org/) v15+

### Setup using Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/wardix/convhub.git
cd convhub

# Start the entire stack with Docker Compose
docker compose up
```

Visit `http://localhost:5173` to see the app. Hot reload is enabled for both frontend and backend. Data is persisted between restarts via a Docker volume.

### Local Manual Setup

```bash
# Clone the repo
git clone https://github.com/wardix/convhub.git
cd convhub

# Set up the backend
cd backend
cp .env.example .env    # Edit with your credentials
bun install
bun run db:migrate
bun run dev

# In another terminal, set up the frontend
cd frontend
bun install
bun run dev
```

Visit `http://localhost:5173` to see the app. The frontend dev server is configured to proxy all `/api` requests to the backend at `http://localhost:3000`.

## 📁 Project Structure

```
convhub/
├── frontend/           # React + Vite SPA
│   └── src/
│       ├── api/        # API client
│       ├── components/ # Reusable UI components
│       ├── pages/      # Route pages
│       ├── hooks/      # Custom React hooks
│       ├── context/    # Auth & Theme contexts
│       ├── types/      # TypeScript types
│       └── utils/      # Utilities
├── backend/            # Hono + Bun API server
│   └── src/
│       ├── db/         # Database connection & migrations
│       ├── routes/     # API route handlers
│       ├── middleware/  # Auth & CORS middleware
│       └── utils/      # JWT, hashing, validation
├── .agents/            # AI agent rules
├── CONTRIBUTING.md     # Contributor guide
└── README.md           # This file
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## 📄 License

[MIT](LICENSE) © ConvHub Contributors
