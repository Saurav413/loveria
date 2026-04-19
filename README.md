# Loveria — couple companion web app

**Loveria** is a full-stack web app for couples: sign up, log in, and personalize a shared space with nicknames, a “together since” date, optional calendar reminders with notes, and an optional couple photo stored in the database.

## Tech stack

- **Backend:** Node.js, Express, REST APIs  
- **Database:** MySQL (`mysql2`), with tables created at startup (`users`, `reminders`, `couple_photos`)  
- **Auth:** Email/password with **bcrypt** hashing  
- **Frontend:** Static HTML/CSS/JS served by Express; API base URL in `src/utils/config.js`  
- **Mobile:** Capacitor (`android/`, `ios/`) to wrap the web UI  
- **Config:** `.env` via **dotenv** — copy `.env.example` to `.env` and set DB credentials  

## Features

- User registration and login backed by MySQL  
- Onboarding: partner nicknames and relationship start date  
- Reminders: pick a date, add a note, persist in DB; browser notifications when due (with permission)  
- Couple photo upload after reminders; image stored in MySQL  
- Dashboard home with links to reminders and other areas  

## Run locally

```bash
cd /path/to/loveria
npm install
cp .env.example .env   # edit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT
npm run start
```

Open `http://localhost:3000/` (redirects to signup). Ensure MySQL is running (e.g. XAMPP).

## Folder structure

- `server.js` — Express app, static files, MySQL pool, API routes  
- `src/` — frontend  
  - `features/auth/` — Login, Signup  
  - `features/onboarding/` — Nicknames, date selection, couple photo  
  - `features/reminders/` — Reminder setup  
  - `utils/config.js` — `API_BASE_URL` for fetch calls  
- `android/`, `ios/` — Capacitor native projects  
- `public/`, `docs/`, `tests/` — placeholders / extras  

## Git notes

- `node_modules/` and `.env` are ignored — run `npm install` and create `.env` after clone.

## One-line summary

> Express + MySQL couple app with auth, onboarding, date reminders, and optional couple photo upload; Capacitor-ready static frontend.
