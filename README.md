# AppTrack

A job application email tracker that integrates with Gmail and uses GPT-3.5 to automatically categorize emails.

## Features

- Gmail OAuth 2.0 integration
- AI-powered email categorization into 10 job-related categories
- Keyword-based pre-filtering to reduce API costs
- Batch processing for efficient API usage
- Real-time email notifications via Google Cloud Pub/Sub
- PostgreSQL for persistent storage

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL  
**Frontend:** React, Vite  
**APIs:** Gmail API, OpenAI API, Google Cloud Pub/Sub

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Google Cloud project with Gmail API enabled
- OpenAI API key

### Google Cloud Configuration

1. Create a project in Google Cloud Console
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (Web application)
   - Redirect URI: `http://localhost:3001/auth/google/callback`
4. (Optional) Set up Pub/Sub for real-time notifications:
   - Create a topic and subscription
   - Add `gmail-api-push@system.gserviceaccount.com` as Publisher

### Environment Variables

Create `backend/.env`:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

GOOGLE_CLOUD_PROJECT_ID=your_project_id
PUBSUB_TOPIC_NAME=your_topic
PUBSUB_SUBSCRIPTION_NAME=your_subscription
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

OPENAI_API_KEY=your_openai_key

DATABASE_URL=postgresql://user:password@localhost:5432/apptrack

PORT=3001
SESSION_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
```

### Installation

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
psql -U postgres
CREATE DATABASE apptrack;
```

Tables are created automatically on startup.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/google | Initiate OAuth flow |
| GET | /auth/me | Get current user |
| POST | /auth/logout | Logout |
| GET | /api/emails | List emails |
| GET | /api/emails/:id | Get email details |
| POST | /api/emails/:id/categorize | Categorize single email |
| POST | /api/emails/categorize-batch | Batch categorize (up to 15) |
| POST | /api/emails/:id/toggle-complete | Toggle action complete |

## Categories

- Online Assessment
- Schedule Interview
- Interview Confirmed
- Application Received
- Rejection
- Offer
- Follow Up Needed
- Recruiter Outreach
- Status Update
- Not Job Related
