# Nova AI — Chat + Document Agent

A single full-stack AI assistant with two modes: normal conversational AI and document-aware agentic workflows. File upload is optional.

## What it does

- Normal AI chat without a file
- Upload PDF, DOCX, TXT, CSV, XLSX or XLS
- Ask natural-language questions about uploaded files
- Agent planning and task execution
- Generate XLSX, CSV, DOCX or TXT outputs
- Retry handling for Gemini 429/503 responses
- Server-side Gemini API key
- File size validation and rate limiting
- Responsive React + TypeScript UI

## Project structure

```text
document-ai-agent/
├── client/
├── server/
├── sample-data/
├── .env.example
└── package.json
```

## Requirements

- Node.js 20+ recommended
- Gemini API key

## Setup

From the project root:

```bash
npm install
cd server
npm install
cd ../client
npm install
cd ..
```

Create `server/.env`:

```env
GEMINI_API_KEY=YOUR_ACTUAL_API_KEY
GEMINI_MODEL=gemini-3.8-flash
PORT=8789
CLIENT_ORIGIN=http://localhost:5175
MAX_FILE_SIZE_MB=15
```

Start both applications from the root:

```bash
npm run dev
```

Open `http://localhost:5175`.

## Modes

### Normal chat
Ask a question without attaching a file. The frontend calls `/api/chat`.

### Document agent
Attach a file and submit a task. The frontend calls `/api/files` to extract the document, then `/api/agent` to plan and execute the requested task.

Example:

> Find employees earning above 10 LPA and create an Excel file containing name, department, salary and location.

## Security note

The app validates extensions and file size and keeps the Gemini key on the backend. Uploaded files are processed locally by the server. For production, add persistent storage isolation, malware scanning, authentication, stronger content validation and a dedicated sandbox for untrusted document processing.

## npm audit note

The starter currently uses SheetJS `xlsx` for Excel parsing/generation. If `npm audit` reports its known advisories, do not blindly run `npm audit fix --force`; review the dependency and replace the spreadsheet layer with an approved maintained alternative before production use.
