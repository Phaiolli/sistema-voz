-- Create voz-assets storage bucket for event covers and logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voz-assets',
  'voz-assets',
  true,
  3145728, -- 3 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy: anyone can read objects from this bucket
CREATE POLICY "voz-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voz-assets');

-- Authenticated upload policy: only authenticated users can upload
CREATE POLICY "voz-assets authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voz-assets');

-- Authenticated delete policy: only authenticated users can delete
CREATE POLICY "voz-assets authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'voz-assets');
