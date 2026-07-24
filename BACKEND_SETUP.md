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
- Credit card payments (application, renewal, molohiya, timestamp forms) go through PayPoint:
  - Submit endpoint calls `beginCreditCardCheckout` (`lib/paypoint.js`), which stores a pending row and registers the transaction with PayPoint
  - Browser is redirected to PayPoint's hosted gateway (`assets/js/paypoint-checkout.js`)
  - PayPoint POSTs the result server-to-server to `/api/paypoint-callback`, which independently re-verifies the transaction status before marking `payment_done`
  - Customer lands on `support/paymentresult.html`, which polls `/api/paypoint-status` for the confirmed result

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
- `PAYPOINT_MERCHANT_CODE`, `PAYPOINT_MERCHANT_USER`, `PAYPOINT_SECRET_KEY` — issued by PayPoint for the "Kredi Kartı" payment option on the application, renewal, molohiya and timestamp forms
- `PAYPOINT_ENV` — `production` (set 2026-07; was `test` during integration). Must be `production` for real credentials to route to the live gateway.
- `PAYPOINT_API_BASE_URL` / `PAYPOINT_ECOM_BASE_URL` — optional overrides, not needed; PayPoint confirmed the built-in defaults (`https://paypointcyprus.com` / `https://paypointcyprus.com/ecom`) are correct.

Important:
- Never put service role keys in frontend files.
- `SUPABASE_SERVICE_ROLE_KEY` must exist only in backend/serverless env vars.
- `MAIL_FROM` must be a verified sender/domain in Resend.
- `CUSTOMER_ATTACHMENT_PATH` can be a relative project path such as `assets/docs/applicationguidelines/dbh_nesue_10_last_clean.pdf`.
- No Supabase schema migration is required for the attachment setting; it is handled entirely in backend mail configuration.

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Also run the numbered migration files in `supabase/` in order (`01_...` through `07_...`) — each is idempotent (`add column if not exists` / `create index if not exists`), so re-running is safe. `06_paypoint_payment_tracking.sql` adds the columns PayPoint payments depend on (`merchant_trn_id`, `paypoint_response`, `payment_done`) across all four submission tables.
4. Confirm tables exist:
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
