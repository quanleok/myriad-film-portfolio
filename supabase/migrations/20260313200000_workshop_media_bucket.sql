-- Workshop media storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-media', 'workshop-media', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "workshop_media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'workshop-media');

CREATE POLICY "workshop_media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workshop-media' AND auth.role() = 'authenticated');
