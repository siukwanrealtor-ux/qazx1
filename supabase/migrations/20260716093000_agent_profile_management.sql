ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS agent_photo_url text,
  ADD COLUMN IF NOT EXISTS agent_phone_number text,
  ADD COLUMN IF NOT EXISTS agent_license_number text,
  ADD COLUMN IF NOT EXISTS broker_name text,
  ADD COLUMN IF NOT EXISTS broker_license_number text,
  ADD COLUMN IF NOT EXISTS office_address text,
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS personal_website text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS email_signature_image_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "select_own_agent" ON agents;
DROP POLICY IF EXISTS "select_linked_agents" ON agents;
CREATE POLICY "select_linked_agents" ON agents FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.agent_id = agents.id AND c.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_agents_updated_at ON agents;
CREATE TRIGGER set_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'agent-profile-photos',
    'agent-profile-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'agent-company-logos',
    'agent-company-logos',
    false,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
  ),
  (
    'agent-email-signatures',
    'agent-email-signatures',
    false,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "profile_photo_upload_own" ON storage.objects;
CREATE POLICY "profile_photo_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_photo_update_own" ON storage.objects;
CREATE POLICY "profile_photo_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_photo_delete_own" ON storage.objects;
CREATE POLICY "profile_photo_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "company_logo_upload_own" ON storage.objects;
CREATE POLICY "company_logo_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "company_logo_update_own" ON storage.objects;
CREATE POLICY "company_logo_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "company_logo_delete_own" ON storage.objects;
CREATE POLICY "company_logo_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "signature_upload_own" ON storage.objects;
CREATE POLICY "signature_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "signature_update_own" ON storage.objects;
CREATE POLICY "signature_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "signature_delete_own" ON storage.objects;
CREATE POLICY "signature_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-email-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);