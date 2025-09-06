# Requirements Document

## Introduction

Splintr is an MVP social storytelling app that enables creators to upload short video clips and connect them with interactive choices, allowing viewers to play through branching stories. The platform targets Gen Z and Millennial content creators who are already active on TikTok, Instagram, and YouTube Shorts, while providing viewers with a new interactive content experience beyond traditional linear video consumption.

## Requirements

### Requirement 1: User Authentication and Profiles

**User Story:** As a user, I want to sign in with my Google or Apple account and create a simple profile, so that I can access the platform and be identified as a creator or viewer.

#### Acceptance Criteria

1. WHEN a user visits the app THEN the system SHALL provide Google and Apple login options
2. WHEN a user successfully authenticates THEN the system SHALL create a user profile with name and avatar
3. WHEN a user completes profile setup THEN the system SHALL redirect them to the main feed
4. IF a user is already authenticated THEN the system SHALL automatically log them in on app launch

### Requirement 2: Video Upload and Storage

**User Story:** As a creator, I want to upload short video clips (15-30 seconds) with automatic processing and storage, so that I can create content for interactive stories.

#### Acceptance Criteria

1. WHEN a creator uploads a video THEN the system SHALL accept clips between 15-30 seconds in duration
2. WHEN a video is uploaded THEN the system SHALL store it using Cloudinary or Mux for adaptive streaming
3. WHEN video processing completes THEN the system SHALL generate and store thumbnails in Firebase Storage or S3
4. IF a video exceeds 100MB THEN the system SHALL reject the upload with an appropriate error message
5. WHEN video upload fails THEN the system SHALL provide clear error messaging to the creator

### Requirement 3: Content Moderation

**User Story:** As a platform administrator, I want automated content moderation and user reporting capabilities, so that inappropriate content is identified and removed to maintain platform safety.

#### Acceptance Criteria

1. WHEN a video is uploaded THEN the system SHALL scan it using AI moderation (Hive/AWS Rekognition)
2. WHEN text content is submitted THEN the system SHALL scan it using OpenAI moderation API
3. WHEN inappropriate content is detected THEN the system SHALL flag it for admin review
4. WHEN a user flags content THEN the system SHALL add it to the moderation queue
5. WHEN an admin reviews flagged content THEN the system SHALL provide options to approve, reject, or remove content

### Requirement 4: Branching Story Editor

**User Story:** As a creator, I want to create branching stories by connecting video clips with choice options, so that viewers can experience interactive narratives with multiple paths.

#### Acceptance Criteria

1. WHEN a creator accesses the editor THEN the system SHALL provide a JSON-based branching tree interface
2. WHEN a creator adds a video node THEN the system SHALL allow them to create exactly 2 choice options
3. WHEN a creator creates choices THEN the system SHALL allow linking each choice to the next video clip
4. WHEN a creator saves their story THEN the system SHALL validate the branching structure for completeness
5. IF a story has incomplete branches THEN the system SHALL prevent publishing and show validation errors

### Requirement 5: Interactive Viewer Experience

**User Story:** As a viewer, I want to watch interactive stories by making choices that determine the narrative path, so that I can experience personalized storytelling with replay value.

#### Acceptance Criteria

1. WHEN a viewer starts a story THEN the system SHALL autoplay the first video clip
2. WHEN a video clip ends THEN the system SHALL display available choice options
3. WHEN a viewer selects a choice THEN the system SHALL navigate to the corresponding next clip
4. WHEN a viewer completes a story path THEN the system SHALL track their playthrough for analytics
5. WHEN a viewer wants to replay THEN the system SHALL allow them to start over and explore different paths

### Requirement 6: Social Feed

**User Story:** As a user, I want to browse a chronological feed of published interactive stories, so that I can discover and engage with new content from creators.

#### Acceptance Criteria

1. WHEN a user opens the app THEN the system SHALL display a chronological feed of published stories
2. WHEN stories are displayed in the feed THEN the system SHALL show thumbnails and creator information
3. WHEN a user taps a story in the feed THEN the system SHALL launch the interactive viewer experience
4. WHEN new stories are published THEN the system SHALL add them to the top of the chronological feed
5. WHEN the feed loads THEN the system SHALL efficiently query story indexes for optimal performance

### Requirement 7: Data Storage and Infrastructure

**User Story:** As a system administrator, I want robust data storage and infrastructure that can handle video streaming, user data, and story structures, so that the platform performs reliably at scale.

#### Acceptance Criteria

1. WHEN the system stores user data THEN it SHALL use Supabase (Postgres) for user profiles, story trees, and comments
2. WHEN the system handles video streaming THEN it SHALL use Cloudinary or Mux for adaptive streaming delivery
3. WHEN the system processes uploads THEN it SHALL use background jobs for upload processing and moderation scans
4. WHEN the system queries stories THEN it SHALL use lightweight indexes for efficient feed queries
5. WHEN files are stored THEN the system SHALL use Firebase Storage or S3 for thumbnails and static assets

### Requirement 8: Security and Compliance

**User Story:** As a user, I want my data to be secure and my privacy protected, so that I can use the platform with confidence in data handling practices.

#### Acceptance Criteria

1. WHEN any API call is made THEN the system SHALL use HTTPS encryption
2. WHEN a user authenticates THEN the system SHALL use JWT tokens for session management
3. WHEN a user requests data deletion THEN the system SHALL comply with GDPR/CCPA requirements
4. WHEN files are uploaded THEN the system SHALL enforce size limits (100MB maximum per upload)
5. WHEN user data is collected THEN the system SHALL provide clear privacy policy information