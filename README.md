# Loveria — couple companion website

**Loveria** is a website for couples: sign up, log in, and personalize a shared space with nicknames, a “together since” date, optional calendar reminders with notes, shared drawing/slideshow, and cinematic photo backgrounds.

## Two codebases

| Path | Stack | Purpose |
|------|--------|---------|
| Repo root (`api/`, `src/`, …) | PHP + MySQL (XAMPP) | Original local app |
| [`web/`](web/) | **Next.js + Prisma + Neon + Vercel Blob** | **Deploy to Vercel (Option B)** |

For production on Vercel, use the **`web/`** app only.

---

## Deploy to Vercel (free Hobby)

### 1. Create Neon Postgres (free)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the connection string (`DATABASE_URL`)

### 2. Enable Vercel Blob (free)

1. In the Vercel dashboard → Storage → Blob → Create
2. Copy `BLOB_READ_WRITE_TOKEN`  
   (Local/dev can omit this; images fall back to data URLs.)

### 3. Push this repo to GitHub

### 4. Import on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo  
2. **Root Directory:** `web`  
3. Framework: Next.js (auto)  
4. Add environment variables:

```
DATABASE_URL=postgresql://...neon.tech/... ?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_...
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Loveria <your-gmail@gmail.com>
```

5. Deploy — build runs `prisma generate`, `prisma migrate deploy`, then `next build`.

### 5. Google OAuth

In Google Cloud Console → Credentials → your OAuth client:

- Authorized JavaScript origins: `https://YOUR-APP.vercel.app`
- Authorized redirect URIs: `https://YOUR-APP.vercel.app` (if required)

---

## Run `web/` locally

```bash
cd web
cp .env.example .env
# fill DATABASE_URL (+ optional BLOB + Google + SMTP)
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Run original PHP app (XAMPP)

1. Start Apache + MySQL in XAMPP  
2. Project at `/Applications/XAMPP/xamppfiles/htdocs/loveria`  
3. `php composer.phar install`  
4. Copy `.env.example` → `.env` and set DB / Google / SMTP  
5. Open `http://localhost/loveria/`

---

## Features (Next.js `web/`)

- Google sign-in + email OTP (Nodemailer / Gmail SMTP)
- Onboarding: gender, nicknames, date, profile & couple photos, pairing
- Home with cinematic photo backgrounds (Ken Burns)
- Shared slideshow (Blob URLs), reminders, location distance, live drawing poll

## One-line summary

> Next.js couple app on Vercel with Neon Postgres, Blob images, Google OTP auth, and the same Loveria features as the original PHP site.
