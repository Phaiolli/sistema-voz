-- Enable Row Level Security on all data tables (audit 2026-06-25, C4).
--
-- Strategy: the anon key is shipped to the browser, but the app NEVER reads
-- tables directly from the client — the browser only subscribes to Realtime
-- broadcast channels and calls our API routes. All server-side data access goes
-- through the service-role key (src/lib/supabase.ts), which bypasses RLS.
--
-- Therefore we enable RLS with NO policies for anon/authenticated. With RLS on
-- and no permissive policy, the anon key cannot SELECT/INSERT/UPDATE/DELETE any
-- row — closing the exposure of the public anon key — while the server keeps
-- full access via service_role. See ADR 010.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediator_assignments ENABLE ROW LEVEL SECURITY;
