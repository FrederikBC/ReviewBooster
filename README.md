ReviewBooster MVP (demo)
=======================

What this is
------------
A minimal demo of ReviewBooster: frontend (static) + backend (Express).
This is intentionally simple and uses in-memory storage so you can run it immediately for local testing.

How to run
----------
1. Open a terminal.
2. Start the backend (this will also serve the frontend):
   ```
   cd backend
   npm install
   node server.js
   ```
3. Find your computer's local IP (e.g., 192.168.0.42).
4. On your phone (connected to same Wi‑Fi), open:
   ```
   http://<YOUR_IP>:5000
   ```
5. Upload a CSV with header:
   first_name,last_name,email,phone,service_date
   Example row:
   Jonas,Jensen,jonas@example.com,+4512345678,2025-08-01

6. Click "Upload", then "Send alle". You'll get short links. Open one on your phone to test the rating flow.

Notes
-----
- This is a demo; it does not send real SMS or emails.
- Data is stored in memory and resets when server restarts.
- For production you'd add a DB (Postgres), Twilio, SendGrid, authentication, and secure tokens.

Files
-----
- backend/server.js  (Express backend + static file serving)
- frontend/index.html (Single-page demo UI)

If you want, I can:
- Extend this to use PostgreSQL (Supabase) and real email/SMS.
- Prepare a deployable version for Render/Vercel with env vars.
- Add authentication and persistent storage.

Enjoy testing on your phone — sig hvis du vil have næste skridt: opsætning til cloud deployment.
