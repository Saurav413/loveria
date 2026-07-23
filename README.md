# Loveria — couple companion website

**Loveria** is a website for couples: sign up, log in, and personalize a shared space with nicknames, a “together since” date, optional calendar reminders with notes, and an optional couple photo stored in the database.

## Tech stack

- **Backend:** PHP (procedural), `mysqli` with prepared statements  
- **Database:** MySQL  
- **Auth:** Google sign-in + email OTP  
- **Email:** Gmail SMTP via **PHPMailer** (Composer)  
- **Frontend:** HTML, CSS, vanilla JavaScript  
- **Server:** Apache via **XAMPP** (or PHP’s built-in server)  

## Features

- Google registration/login with OTP emailed via PHPMailer  
- Onboarding: gender, partner nicknames, relationship start date, pairing codes  
- Reminders: pick a date, add a note, persist in DB; browser notifications when due  
- Couple / profile photo upload; images stored in MySQL  
- Shared drawing (save + live sync via short polling) and shared slideshow  
- Partner location distance on the home page  

## Run locally (XAMPP)

1. Start **Apache** and **MySQL** in the XAMPP control panel.  
2. Place/clone this project at:
   `/Applications/XAMPP/xamppfiles/htdocs/loveria`
3. Install PHP dependencies:
   ```bash
   cd /Applications/XAMPP/xamppfiles/htdocs/loveria
   /Applications/XAMPP/xamppfiles/bin/php composer.phar install
   ```
4. Copy env and edit credentials:
   ```bash
   cp .env.example .env
   ```
   Set `DB_*`, `GOOGLE_CLIENT_ID`, and SMTP (`SMTP_USER` / `SMTP_PASS` Gmail app password).  
5. Open: **http://localhost/loveria/**  

### PHP built-in server (optional)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/loveria
/Applications/XAMPP/xamppfiles/bin/php -S localhost:8080 router.php
```

Then open `http://localhost:8080/`.

## Folder structure

- `landing.html` — public landing / login entry  
- `api/index.php` — PHP front controller (REST API)  
- `config/config.php` — loads `.env` + defaults  
- `includes/` — db schema, helpers, PHPMailer wrapper  
- `src/` — website pages  
  - `features/auth/` — Login, Signup  
  - `features/onboarding/` — Nicknames, date, pairing, photos  
  - `features/reminders/` — Reminder setup  
  - `features/drawing/`, `features/memories/` — shared canvas & slideshow  
  - `utils/config.js` — `API_BASE_URL` for fetch calls  

## Git notes

- `vendor/` and `.env` are ignored — run `composer install` and create `.env` after clone.

## One-line summary

> PHP + MySQL couple website with Google OTP auth, onboarding, reminders, shared drawing/slideshow, and couple photo upload; served by Apache/XAMPP.
