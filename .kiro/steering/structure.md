# Project Structure

## Core Architecture
Splintr follows a modular Next.js architecture with clear separation between frontend components, API services, and data layers.

## Directory Organization

```
/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── video/          # Video upload/player components
│   │   ├── story/          # Story editor/viewer components
│   │   ├── feed/           # Social feed components
│   │   └── ui/             # Base UI components (buttons, inputs)
│   ├── pages/              # Next.js pages and API routes
│   │   ├── api/            # Backend API endpoints
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── videos/     # Video management endpoints
│   │   │   ├── stories/    # Story CRUD endpoints
│   │   │   ├── feed/       # Feed and discovery endpoints
│   │   │   └── moderation/ # Content moderation endpoints
│   │   ├── auth/           # Authentication pages
│   │   ├── create/         # Story creation pages
│   │   ├── story/          # Story viewing pages
│   │   └── profile/        # User profile pages
│   ├── services/           # Business logic services
│   │   ├── auth.service.ts
│   │   ├── video.service.ts
│   │   ├── story.service.ts
│   │   ├── moderation.service.ts
│   │   └── feed.service.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   ├── video.types.ts
│   │   ├── story.types.ts
│   │   └── api.types.ts
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions and helpers
│   └── lib/                # External service configurations
│       ├── supabase.ts
│       ├── cloudinary.ts
│       └── redis.ts
├── public/                 # Static assets
├── database/               # Database migrations and schemas
└── tests/                  # Test files organized by type
    ├── unit/
    ├── integration/
    └── e2e/
```

## Key Conventions

### Component Organization
- Components grouped by feature domain (auth, video, story, feed)
- Each component folder contains index.ts for clean imports
- Shared UI components in `/ui` directory
- Component files use PascalCase naming

### API Structure
- RESTful endpoints organized by resource type
- Consistent error handling across all endpoints
- Authentication middleware applied to protected routes
- Request/response validation using TypeScript interfaces

### Service Layer
- Business logic separated from API routes
- Each service handles one domain (auth, video, story, etc.)
- Services return consistent result objects with error handling
- External API integrations isolated in service layer

### Type Definitions
- Comprehensive TypeScript interfaces for all data models
- API request/response types defined separately
- Database schema types generated from Supabase
- Shared types exported from centralized index files

### Database Schema
- User profiles, stories, videos, and moderation data
- Optimized indexes for feed queries and story lookups
- Foreign key relationships maintain data integrity
- JSONB fields for flexible story structure storage

### Testing Structure
- Unit tests for services and utility functions
- Integration tests for API endpoints
- E2E tests for complete user workflows
- Test files mirror source code structure