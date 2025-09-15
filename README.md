# Splintr

Splintr is an MVP social storytelling platform that enables creators to build interactive, branching video narratives. The app targets Gen Z and Millennial content creators who want to move beyond linear video content into interactive storytelling.

## Agent Guide

For task lists, specs, and steering docs, see `AGENTS.md` at the repo root. Key planning docs live under `.kiro/` (e.g., `.kiro/specs/splintr-mvp/tasks.md`).

## Features

- **Interactive Storytelling**: Create branching video narratives with choice points
- **Short-form Content**: 15-30 second video clips optimized for mobile viewing
- **Social Discovery**: Chronological feed for discovering new interactive stories
- **Content Moderation**: Automated AI-powered content safety and user reporting
- **Creator Tools**: Intuitive story editor with drag-and-drop functionality

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google/Apple OAuth
- **Video Processing**: Cloudinary or Mux for adaptive streaming
- **State Management**: React Query for server state and caching
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Cloudinary or Mux account (for video processing)
- Google/Apple OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd splintr
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:
- Supabase project URL and keys
- OAuth provider credentials
- Video processing service credentials
- Content moderation API keys

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment

- Environment matrix: see `docs/env-matrix.md`
- Vercel deployment guide: `docs/deploy-vercel.md`
- Docker deployment guide: `docs/deploy-docker.md`
- Sale-readiness audit: `docs/sale-readiness-audit.md`
- Ops Runbook: `docs/ops-runbook.md`
- Observability: `docs/observability.md` (OpenTelemetry tracing + logs)
 - Admin roles: `docs/admin-roles.md`
 - Legal: `docs/legal/EULA.md`, `docs/legal/SLA.md`, `docs/legal/Support.md`

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run type-check   # TypeScript type checking
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── create/         # Story creation pages
│   ├── story/          # Story viewing pages
│   └── profile/        # User profile pages
├── components/         # React components
│   ├── auth/          # Authentication components
│   ├── video/         # Video upload/player components
│   ├── story/         # Story editor/viewer components
│   ├── feed/          # Social feed components
│   └── ui/            # Base UI components
├── services/          # Business logic services
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
└── lib/               # External service configurations
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Releases

- Follow Conventional Commits (feat, fix, docs, chore, refactor, perf, test) to enable changelog generation.
- Maintain `CHANGELOG.md` with notable changes per release.
- CI enforces commit message style via commitlint on PRs.
- Release automation: Release Please opens release PRs and publishes GitHub Releases with changelog on merge.
- Security scans: npm audit (high/critical) and Trivy FS scan; CodeQL weekly.
 - Labels: repo labels are synced from `.github/labels.yml` (release and conventional types).
