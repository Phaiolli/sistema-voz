-- Promote platform owner to superadmin (must run after enum value is committed)
UPDATE users
  SET role = 'superadmin'
  WHERE email = 'faiolli@gmail.com';
