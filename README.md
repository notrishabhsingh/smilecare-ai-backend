# SmileCare Dental AI Assistant

A backend service that exposes a `/chat` endpoint for AI-powered conversations about SmileCare Dental clinic. Built with Node.js and Express.

## Features

- **Intent Detection** — Identifies user intent (booking, timings, services, general query)
- **Appointment Booking** — Extracts service names and dates from messages
- **Business Queries** — Answers questions about clinic timings and services
- **Validation & Error Handling** — Input validation and centralized error middleware

## Architecture

```
project/
├── src/
│   ├── controllers/    # HTTP request/response handling
│   ├── services/       # Intent detection (llm.js) & response generation (agent.js)
│   ├── routes/         # API endpoint definitions
│   ├── middleware/      # Validation & error handling
│   ├── utils/          # Helper functions (service/date extraction)
│   └── data/           # Clinic business data
├── app.js              # Express server entry point
└── package.json
```

**Data flow:** `POST /chat` → `validateMessage` middleware → `handleChat` controller → `processMessage` service → `callLLM` (mock AI) → response generation → JSON reply

## Setup

```bash
npm install
npm start        # or: npm run dev (nodemon)
```

Server runs on `http://localhost:3000`.

## API

### POST /chat

**Request body:**
```json
{ "message": "I want to book a teeth cleaning appointment tomorrow." }
```

**Response:**
```json
{
  "reply": "Sure! I can help you book a Dental Cleaning appointment Tomorrow.",
  "intent": "BOOK_APPOINTMENT",
  "service": "Dental Cleaning",
  "date": "Tomorrow"
}
```

## Sample Requests

### Ask timings
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are your timings?"}'
```
→ `"We are open Monday to Friday from 10 AM to 7 PM."` (ASK_TIMINGS)

### Ask services
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services do you provide?"}'
```
→ `"We provide Dental Cleaning, Root Canal, Braces, Teeth Whitening."` (ASK_SERVICES)

### Book appointment
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Book root canal tomorrow"}'
```
→ `"Sure! I can help you book a Root Canal appointment Tomorrow."` (BOOK_APPONTMENT, service: "Root Canal", date: "Tomorrow")

### General query
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```
→ Friendly greeting (GENERAL_QUERY)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port |

## Tech Stack

- **Node.js** — Runtime
- **Express 5** — Web framework
- **morgan** — HTTP request logging
- **dotenv** — Environment configuration
- **cors** — Cross-origin support
