# Phony AI — Bulk IVR Order Status Updates

A minimal web app for uploading customer lists, generating AI-powered order status scripts, placing outbound IVR calls via Twilio, and capturing spoken/DTMF responses.

## Project Structure

```
phony-ai/
├── server/           # Node.js + Express backend
│   ├── index.js      # Express server entry
│   ├── db.js         # SQLite setup + schema
│   ├── llm.js        # OpenAI script generation
│   ├── twilio-client.js  # Twilio outbound call API
│   ├── routes/
│   │   ├── campaigns.js    # CSV upload, campaign CRUD, call triggering
│   │   ├── calls.js        # Call list endpoint
│   │   └── twilio-webhook.js  # TwiML, gather, status callbacks
│   └── env.example   # Environment variable template
├── client/           # React frontend (Vite)
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
│           ├── CampaignList.jsx
│           ├── CreateCampaign.jsx
│           └── CampaignDetail.jsx
└── sample-customers.csv  # Example CSV for testing
```

## Setup

### 1. Configure Environment

```bash
cd server
copy env.example .env
```

Edit `.env` with your credentials:
- `TWILIO_ACCOUNT_SID` — from twilio.com/console
- `TWILIO_AUTH_TOKEN` — from twilio.com/console
- `TWILIO_PHONE_NUMBER` — your Twilio phone number (must support voice)
- `OPENAI_API_KEY` — from platform.openai.com

### 2. Install & Start

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:3001

### 3. Expose Twilio Webhook (for local dev)

Twilio needs to reach your `/api/twilio/*` endpoints. Use ngrok:

```bash
ngrok http 3001
```

Then update `BASE_URL` in `.env` to your ngrok URL.

## CSV Format

Required columns: `name`, `phone`, `order_id`, `order_status`

```csv
name,phone,order_id,order_status
John Doe,+15551234567,ORD-001,Shipped
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/campaigns | Upload CSV, create campaign |
| GET | /api/campaigns | List all campaigns |
| GET | /api/campaigns/:id | Get campaign details |
| GET | /api/campaigns/:id/calls | Get calls for campaign |
| POST | /api/campaigns/:id/start | Start outbound calls |
| POST | /api/twilio/twiml | Twilio TwiML endpoint |
| POST | /api/twilio/gather | Twilio speech/DTMF gather |
| POST | /api/twilio/status | Twilio call status callback |

## How It Works

1. **Upload CSV** → validates rows, creates campaign + call records
2. **Start Campaign** → for each pending call: generates script via OpenAI → places call via Twilio
3. **Call Flow** → Twilio fetches TwiML → `<Say>` reads the script → `<Gather>` captures speech/DTMF → response stored
4. **Dashboard** → view campaigns, click into call details, see responses + transcripts