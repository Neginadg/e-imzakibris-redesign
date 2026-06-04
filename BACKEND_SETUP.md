# Form Backend Setup (Supabase + Email)

This project now uses Vercel serverless API routes for secure form handling.

## What was implemented

- Contact form posts to `/api/contact-submit`
  - Stores data in `contact_messages`
  - Sends company notification email
- Application form posts to `/api/application-submit`
  - Stores data in `applications`
  - Sends company notification email
  - Sends customer confirmation email (all submitted info)
- Renewal form posts to `/api/renewal-submit`
  - Stores data in `renewal_requests`
  - Sends company notification email

Frontend UI/HTML structure is unchanged.

## Files added

- `api/contact-submit.js`
- `api/application-submit.js`
- `api/renewal-submit.js`
- `api/_lib/http.js`
- `api/_lib/env.js`
- `api/_lib/supabase.js`
- `api/_lib/email.js`
- `supabase/schema.sql`
- `.env.example`

## Environment variables (Vercel)

Add these in Vercel Project Settings -> Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `COMPANY_EMAIL`
- `CUSTOMER_ATTACHMENT_PATH` optional; points to the PDF attached to application customer emails

Important:
- Never put service role keys in frontend files.
- `SUPABASE_SERVICE_ROLE_KEY` must exist only in backend/serverless env vars.
- `MAIL_FROM` must be a verified sender/domain in Resend.
- `CUSTOMER_ATTACHMENT_PATH` can be a relative project path such as `assets/docs/applicationguidelines/dbh_nesue_10_last_clean.pdf`.
- No Supabase schema migration is required for the attachment setting; it is handled entirely in backend mail configuration.

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Confirm tables exist:
   - `contact_messages`
   - `applications`
   - `renewal_requests`

## How email works

Email sending is done in serverless API routes using Resend HTTP API.

Flow per form:
1. API receives form payload.
2. API inserts row into Supabase.
3. If insert succeeds, API sends required emails.
4. API returns success JSON. If email fails, record is still stored and response includes warning.

This guarantees emails are attempted only after successful DB insertion.

## How to test

### Contact form
1. Submit contact form from website.
2. Verify a new row in `contact_messages`.
3. Verify company inbox gets message with name/email/message.

### Application form
1. Submit full application flow until final send.
2. Verify new row in `applications`.
3. Verify customer receives confirmation email with entered data
4. Verify company receives notification email.

### Renewal form
1. Submit renewal flow until final send.
2. Verify new row in `renewal_requests`.
3. Verify company receives full submission email.

## Notes

- News/pricing read logic using public Supabase config can stay as is.
- Write operations are now routed through backend API endpoints for security.
