# Deploying to Vercel

This project is a Flask app (Python backend + static frontend). Vercel runs it
as a Python serverless function via `vercel.json`. Follow the steps below once,
then every push to the main branch auto-deploys.

## 1. Prerequisites

- The code pushed to a GitHub repository (Vercel deploys from git).
- A [Vercel](https://vercel.com) account.
- A **Groq API key** (get one at https://console.groq.com) — the app raises an
  error at startup if `GROQ_API_KEY` is missing.
- A **Neon** serverless Postgres database (free tier is fine) — used so user
  accounts and progress persist between serverless calls. JSON files do NOT
  persist on Vercel, which is why the app now stores data in Postgres when
  `DATABASE_URL` is set (local dev still uses JSON files when it's unset).

## 2. Set up Neon

1. Go to https://console.neon.tech and create a project (any region).
2. Open **Connection Details** and copy the **pooled connection string**
   (it contains `-pooler` and `?sslmode=require`).
3. Keep it for step 4 — the table is created automatically on first use.

## 3. Create `vercel.json` (already done)

```json
{
  "version": 2,
  "builds": [
    { "src": "backend/server.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "backend/server.py" }
  ]
}
```

Vercel imports the WSGI `app` object from `backend/server.py` and installs
`requirements.txt` automatically. The catch-all route sends every request
(frontend + API) to the Flask app.

## 4. Deploy

1. Push this folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the Vercel dashboard click **Add New -> Project**, import your repo.
   - Framework preset: **Other** (Vercel detects Python automatically).
   - Root directory: leave as default (`./`).
3. Before deploying, add these **Environment Variables**
   (Settings -> Environment Variables, apply to Production/Preview/Development):
   - `GROQ_API_KEY` — your Groq key
   - `FLASK_SECRET` — a long random string (keeps sessions stable across deploys)
   - `DATABASE_URL` — the Neon pooled connection string
4. Click **Deploy**. The first build installs dependencies and can take a couple
   of minutes.

## 5. Verify

- Open the deployment URL — the dashboard should load.
- Register an account, log out, log back in — your session should persist.
- Ask the AI tutor a question (requires a valid Groq key).
- Upload a **text-based** PDF in AI Notes (works via PyPDF2).

## OCR on Vercel

Scanned PDFs and images are handled by **cloud OCR using the Groq vision model**
(`llama-3.2-11b-vision-preview`) — the same `GROQ_API_KEY` you already set, so
no extra service or API key is needed. PyMuPDF renders PDF pages to images
without poppler, so it runs fine on Vercel's Python runtime. Local Tesseract
remains as a fallback for local development.

## Limitations on Vercel
- **Function timeout.** Hobby plans cap functions at ~10s (Pro allows more via
  `maxDuration` in `vercel.json`). Groq responses are usually fast enough, but
  very long AI calls may time out on Hobby.
- **Uploaded files are ephemeral.** Notes/chat files are processed in memory
  and not stored long-term on Vercel.
- **Existing local data doesn't migrate.** Accounts in a local
  `database/users.json` won't appear on Vercel (storage moved to Neon).
- **Concurrent writes are last-write-wins.** Accounts/progress are stored as
  single documents, so two truly simultaneous updates could overwrite each
  other. Fine for small numbers of users.
- **All requests go through the Python function** (CSS/JS included). Works
  perfectly; you'd only move the frontend to a `public/` folder if you wanted
  CDN-level static caching at high traffic.

## Local development (unchanged)

```bash
pip install -r requirements.txt
cp .env.example .env   # add GROQ_API_KEY (+ DATABASE_URL if you want Postgres locally)
python backend/server.py
```

`runtime.txt` and `Procfile` are only used by Heroku and are ignored by Vercel.
