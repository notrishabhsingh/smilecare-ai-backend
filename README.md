# Dental Appointment Booking Agent Backend

A production-ready backend for a **voice AI dental receptionist**. Accepts VAPI-format webhooks, manages multi-turn conversations to book appointments, writes to Google Calendar, sends SMS confirmations via Twilio, and persists everything to Firestore.

## Features

- **VAPI webhook intake** — Accepts simulated VAPI webhook payloads with transcript events
- **Multi-turn conversation** — Guides callers through name → service → date/time → confirmation
- **State machine** — Tracks conversation state per session across multiple webhook hits
- **Firestore persistence** — Stores sessions, conversation history, and bookings (with in-memory fallback)
- **Google Calendar booking** — Creates real calendar events via the Calendar API
- **Twilio SMS** — Sends confirmation SMS when a booking is finalized
- **Admin REST API** — View all bookings and full conversation history per session
- **Natural language date parsing** — Supports "Tomorrow at 2pm", "Friday at 11am", "July 3 at 11 AM", ISO dates, and more via chrono-node

## Architecture

```
                         ┌───────────────────┐
  VAPI (voice AI) ──────▶│  POST /vapi-webhook│
                         └────────┬──────────┘
                                  │
                     ┌────────────▼────────────┐
                     │  Conversation State     │
                     │  Machine (stateMachine) │
                     └────────────┬────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
   ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Firestore      │  │    Google    │  │    Twilio    │
   │ (sessions &      │  │   Calendar   │  │     SMS      │
   │  bookings)       │  │   (events)   │  │  (confirm)   │
   └──────────────────┘  └──────────────┘  └──────────────┘
              │
              ▼
   ┌──────────────────┐
   │  Admin REST API  │
   │  GET /admin/*    │
   └──────────────────┘
```

### Conversation Flow

```
GREETING ──▶ AWAITING_NAME ──▶ AWAITING_SERVICE ──▶ AWAITING_DATETIME ──▶ CONFIRMING ──▶ BOOKED
                                                                                     └──▶ CANCELLED
```

1. **Greeting** — Assistant introduces itself and asks for the patient's name
2. **Name** — Patient provides their name; assistant asks which service they need
3. **Service** — Patient picks from: Dental Cleaning, Root Canal, Braces, Teeth Whitening
4. **Date/Time** — Patient provides a date and time (natural language, ISO, etc.)
5. **Confirmation** — Assistant reads back the summary; patient says "yes" or "no"
6. **Booked** — On confirmation: Firestore log → Google Calendar event → Twilio SMS

## Folder Structure

```
├── server.js                        # Express entry point, route mounting, error handler
├── package.json                     # Dependencies and scripts
├── .env.example                     # Environment variable template
├── .gitignore
├── README.md
└── src/
    ├── config/
    │   └── firebase.js              # Firebase Admin SDK lazy initialisation
    ├── services/
    │   ├── stateMachine.js          # Conversation states, transitions, prompt generation
    │   ├── firestoreService.js      # Firestore CRUD with in-memory fallback
    │   ├── calendarService.js       # Google Calendar API — creates events
    │   └── smsService.js            # Twilio SMS — sends confirmation messages
    └── routes/
        ├── vapiWebhook.js           # VAPI webhook receiver — orchestrates the flow
        └── adminApi.js              # Admin REST endpoints for bookings and sessions
```

## Technologies

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Database | Firestore (Firebase Admin SDK) |
| Calendar | Google Calendar API v3 (googleapis) |
| SMS | Twilio |
| Date parsing | chrono-node |
| Logging | morgan |

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd dental-appointment

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the development server
npm run dev
```

The server starts at `http://localhost:3000`.

## Environment Variables

All services are optional. The app works without credentials (uses in-memory storage, skips Calendar and SMS).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `FIREBASE_SERVICE_ACCOUNT_B64` | For persistence | — | Base64-encoded Firebase Admin SDK service account JSON |
| `GOOGLE_SERVICE_ACCOUNT_B64` | For Calendar | — | Base64-encoded Google service account JSON with Calendar API enabled |
| `GOOGLE_CALENDAR_ID` | No | `primary` | Calendar ID to create events in |
| `TWILIO_ACCOUNT_SID` | For SMS | — | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | — | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | For SMS | — | Twilio phone number to send from |
| `TWILIO_TO_NUMBER` | For SMS | — | Phone number to receive the confirmation SMS |
| `PATIENT_PHONE` | No | `+919876543210` | Default patient phone stored in booking metadata |

### Encoding a Service Account to Base64

```powershell
# PowerShell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content ./service-account.json -Raw)))
```

```bash
# macOS / Linux
base64 -i service-account.json | pbcopy
```

## API Endpoints

### `POST /vapi-webhook`

Accepts VAPI-format webhook payloads. Processes user transcript events through the conversation state machine.

**Request body (transcript event):**

```json
{
  "message": {
    "type": "transcript",
    "transcript": "Hi, I'd like to book a cleaning",
    "role": "user"
  },
  "call": {
    "id": "call-001"
  }
}
```

**Response:**

```json
{
  "response": "Welcome to SmileCare Dental! I'm your booking assistant. What's your name?",
  "state": "AWAITING_NAME",
  "callId": "call-001"
}
```

### `GET /health`

Health check.

```json
{ "status": "ok", "timestamp": "2026-07-01T12:00:00.000Z" }
```

### `GET /admin/bookings`

Returns all confirmed bookings ordered by creation date (newest first).

### `GET /admin/sessions`

Returns the 50 most recent sessions.

### `GET /admin/sessions/:callId`

Returns the full conversation history and state for a specific session.

**Response:**

```json
{
  "session": {
    "id": "call-001",
    "state": "BOOKED",
    "context": {
      "name": "Alice",
      "service": "Dental Cleaning",
      "dateTime": "2026-07-02T08:30:00.000Z"
    },
    "history": [
      { "role": "user", "content": "Hi, I'd like to book", "timestamp": "..." },
      { "role": "assistant", "content": "Welcome...", "timestamp": "..." }
    ],
    "booking": {
      "id": "mem_1",
      "patientName": "Alice",
      "service": "Dental Cleaning",
      "dateTime": "2026-07-02T08:30:00.000Z",
      "status": "confirmed"
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Testing with Postman

### Step 1 — Start the server

```bash
npm run dev
```

### Step 2 — Simulate a full conversation

Send five sequential `POST` requests to `http://localhost:3000/vapi-webhook` with the same `call.id`.

**Request 1 — Greeting:**

```json
{
  "message": { "type": "transcript", "transcript": "Hi, I want to book an appointment", "role": "user" },
  "call": { "id": "test-001" }
}
```

**Request 2 — Provide name:**

```json
{
  "message": { "type": "transcript", "transcript": "My name is Alice", "role": "user" },
  "call": { "id": "test-001" }
}
```

**Request 3 — Choose service:**

```json
{
  "message": { "type": "transcript", "transcript": "Dental Cleaning", "role": "user" },
  "call": { "id": "test-001" }
}
```

**Request 4 — Pick date and time:**

```json
{
  "message": { "type": "transcript", "transcript": "Tomorrow at 2pm", "role": "user" },
  "call": { "id": "test-001" }
}
```

**Request 5 — Confirm:**

```json
{
  "message": { "type": "transcript", "transcript": "Yes, confirm it", "role": "user" },
  "call": { "id": "test-001" }
}
```

### Step 3 — Verify

```bash
# View all bookings
curl http://localhost:3000/admin/bookings

# View the conversation history
curl http://localhost:3000/admin/sessions/test-001
```

### Example cURL Script

```bash
# Full conversation in one script
curl -s -X POST http://localhost:3000/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"transcript","transcript":"Hi","role":"user"},"call":{"id":"demo"}}'

curl -s -X POST http://localhost:3000/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"transcript","transcript":"My name is John","role":"user"},"call":{"id":"demo"}}'

curl -s -X POST http://localhost:3000/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"transcript","transcript":"Root Canal","role":"user"},"call":{"id":"demo"}}'

curl -s -X POST http://localhost:3000/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"transcript","transcript":"Friday at 11am","role":"user"},"call":{"id":"demo"}}'

curl -s -X POST http://localhost:3000/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"transcript","transcript":"Yes","role":"user"},"call":{"id":"demo"}}'
```

## Deployment (Railway)

1. Push the repository to GitHub
2. Create a new project on [Railway](https://railway.app/)
3. Connect your GitHub repository
4. Railway auto-detects Node.js — no manual build command needed
5. Set the start command: `node server.js`
6. Add all environment variables from `.env.example` in the Railway dashboard
7. Deploy

The app uses `process.env.PORT` (Railway sets this automatically) and reads all configuration from environment variables.

## Production Checklist

- [ ] Firestore composite indexes created: `sessions(updatedAt DESC)`, `bookings(createdAt DESC)`
- [ ] Admin API protected with API key middleware
- [ ] CORS restricted to known origins
- [ ] HTTPS enforced (automatic on Railway / Render / Vercel)
- [ ] Rate limiting on `/vapi-webhook` if high volume expected

## Future Improvements

- **Authentication** — Add API key or JWT auth to admin endpoints
- **Multi-clinic support** — Introduce `clinicId` field for tenant isolation
- **Redis session storage** — Faster session lookups than Firestore for high-throughput scenarios
- **Queue workers** — Offload Calendar/SMS calls to a background queue (Bull, Google PubSub)
- **Better NLP** — Replace keyword-based service detection with a small LLM call
- **Doctor scheduling** — Route to specific doctors based on service type and availability
- **Availability checking** — Query Calendar free/busy before confirming a time slot

## License

MIT
