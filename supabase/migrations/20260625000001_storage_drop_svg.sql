-- Drop image/svg+xml from the voz-assets bucket allowlist (XSS vector).
-- SVG can embed <script>; served from a public bucket it executes in the
-- browser. Keep only raster formats. See ADR 010 / audit 2026-06-25 (H2).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'voz-assets';
