-- Promote fab.zanardi@gmail.com to admin role
UPDATE users
  SET role = 'admin'
  WHERE email = 'fab.zanardi@gmail.com';
