# Technology Stack

## Frontend
- **Framework**: Next.js with TypeScript for web PWA, React Native for mobile
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query for server state and caching
- **Authentication**: Supabase Auth with Google/Apple OAuth

## Backend
- **API**: Next.js API routes or Express.js with TypeScript
- **Database**: Supabase (PostgreSQL) for user data, stories, and metadata
- **Caching**: Redis for session management and feed performance
- **Background Jobs**: Bull Queue for video processing and moderation

## Video & Storage
- **Video Processing**: Cloudinary or Mux for adaptive streaming
- **File Storage**: AWS S3 or Firebase Storage for thumbnails and assets
- **CDN**: Global content delivery for video streaming

## External Services
- **Content Moderation**: OpenAI Moderation API (text), AWS Rekognition or Hive AI (video)
- **Authentication**: Google OAuth, Apple Sign-In

## Development Standards
- **Language**: TypeScript throughout for type safety
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E)
- **Code Quality**: ESLint, Prettier, strict TypeScript config
- **API Design**: RESTful endpoints with consistent error handling

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Database
```bash
npx supabase start   # Start local Supabase
npx supabase db reset # Reset local database
npx supabase gen types typescript # Generate TypeScript types
```

### Deployment
```bash
npm run build        # Production build
npm run start        # Start production server
```

## File Size Limits
- Video uploads: 100MB maximum
- Video duration: 15-30 seconds required
- Thumbnail generation: Automatic via video processing service