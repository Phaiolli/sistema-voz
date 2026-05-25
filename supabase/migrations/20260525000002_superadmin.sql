-- Add superadmin role to the platform
-- The UPDATE must be in a separate migration due to PostgreSQL enum transaction limitations
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
