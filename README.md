# Bulk Email Backend API

A Node.js/Express backend for sending bulk emails with email validation.

## Features

- 📧 Bulk email sending with batch processing
- ✅ Email validation (format, disposable domains, typos)
- 📊 Campaign management
- 🔄 Retry mechanism for failed emails
- 📈 Campaign status tracking
- 🛡️ Rate limiting and security headers

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)
- SMTP credentials (Gmail, SendGrid, etc.)

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SMTP_USER` - SMTP username (email)
- `SMTP_PASS` - SMTP password (app password for Gmail)
- `SMTP_FROM_EMAIL` - Sender email address

### Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  total_emails INTEGER DEFAULT 0,
  valid_emails INTEGER DEFAULT 0,
  invalid_emails INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE
);

-- Campaign recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON campaign_recipients(email);
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/check-services` - Detailed service status

### Campaigns
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/send` - Start sending campaign
- `POST /api/campaigns/:id/stop` - Stop a running campaign
- `GET /api/campaigns/:id/results` - Get campaign results

## Deployment on Render

The app is configured for Render deployment. See `render.yaml` in the project root.

Environment variables to set on Render:
- All variables from `.env.example`
- Set `NODE_ENV=production`

## Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
3. Use this password as `SMTP_PASS`

## License

MIT
