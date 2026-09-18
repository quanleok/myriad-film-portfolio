-- Create chat-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true)
ON CONFLICT DO NOTHING;

-- Anyone can read chat images
CREATE POLICY "chat_images_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Authenticated users can upload chat images
CREATE POLICY "chat_images_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');
