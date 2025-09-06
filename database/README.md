# Splintr Database Setup

This directory contains the database schema, migrations, and utilities for the Splintr MVP.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g @supabase/cli
   ```

2. Install Docker (required for local Supabase)

## Local Development Setup

1. **Initialize Supabase locally:**
   ```bash
   supabase start
   ```

2. **Apply migrations:**
   ```bash
   supabase db reset
   ```

3. **Generate TypeScript types:**
   ```bash
   supabase gen types typescript --local > src/types/database.types.ts
   ```

4. **Seed the database (optional):**
   ```bash
   supabase db reset --with-seed
   ```

## Database Schema Overview

### Core Tables

- **users**: User profiles and authentication data
- **videos**: Video uploads with processing and moderation status
- **stories**: Interactive story structures with branching logic
- **story_playthroughs**: User interaction tracking and analytics
- **content_flags**: Content moderation and reporting system

### Key Features

- **Row Level Security (RLS)**: All tables have appropriate security policies
- **Automatic Triggers**: Updated timestamps and published_at handling
- **Validation Functions**: Story structure validation and integrity checks
- **Analytics Views**: Pre-built views for feed and analytics queries
- **Performance Indexes**: Optimized for common query patterns

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OAuth Configuration (for production)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_client_id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_secret
SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID=your_apple_client_id
SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=your_apple_secret
```

## Common Operations

### Create a new migration

```bash
supabase migration new migration_name
```

### Reset database with fresh schema

```bash
supabase db reset
```

### Apply migrations to remote database

```bash
supabase db push
```

### Generate updated TypeScript types

```bash
supabase gen types typescript > src/types/database.types.ts
```

### View database in Supabase Studio

```bash
supabase start
# Then visit http://localhost:54323
```

## Database Constraints and Validation

### Video Constraints
- Duration: 15-30 seconds
- File size: Maximum 100MB
- Processing status: pending, processing, completed, failed
- Moderation status: pending, approved, flagged, rejected

### Story Constraints
- Title: 1-200 characters
- Must have valid JSON structure in story_data
- Published stories must have published_at timestamp
- View count cannot be negative

### User Constraints
- Email must be valid format
- Name: 1-100 characters
- Provider must be 'google' or 'apple'

## Utility Functions

The database includes several utility functions:

- `validate_story_structure(jsonb)`: Validates story branching logic
- `increment_story_view_count(uuid)`: Safely increments view counts
- `get_story_path_stats(uuid)`: Analytics for story paths
- `get_trending_stories(int, int)`: Trending stories based on recent activity
- `cleanup_old_anonymous_playthroughs(int)`: Maintenance function

## Views

- `published_stories_feed`: Optimized view for the main feed
- `story_analytics`: Creator analytics with completion rates

## Security

- All tables use Row Level Security (RLS)
- Users can only access their own data
- Published content is publicly readable
- Content creators can view analytics for their stories
- Automatic user profile creation from auth triggers

## Performance Considerations

- Indexes on frequently queried columns (creator_id, published_at, etc.)
- Optimized feed queries using materialized views
- Efficient story structure validation
- Cleanup functions for maintenance

## Troubleshooting

### Reset local database
```bash
supabase db reset
```

### Check migration status
```bash
supabase migration list
```

### View logs
```bash
supabase logs
```

### Connect to database directly
```bash
supabase db shell
```