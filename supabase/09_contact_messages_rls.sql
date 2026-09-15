-- Enables Row Level Security on contact_messages now that the contact form
-- is protected by Cloudflare Turnstile (verified in api/contact-submit.js).
--
-- contact_messages previously had RLS disabled (see schema.sql) so the
-- browser could insert directly with the public anon key. That path bypassed
-- our /api/contact-submit endpoint entirely — including the Turnstile check
-- added there — so a bot could still spam the table by calling the Supabase
-- REST API directly. Enabling RLS with only a service_role policy forces
-- every insert through the API, matching how applications/renewal_requests/
-- molohiya_requests/timestamp_requests are already protected
-- (see 04_unify_applications.sql).

alter table public.contact_messages enable row level security;

drop policy if exists "Service role full access" on public.contact_messages;
create policy "Service role full access"
  on public.contact_messages
  for all
  to service_role
  using (true)
  with check (true);
