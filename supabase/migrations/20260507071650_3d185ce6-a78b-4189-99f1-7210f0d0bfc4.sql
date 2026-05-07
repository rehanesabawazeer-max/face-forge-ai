
-- Storage bucket for case images
INSERT INTO storage.buckets (id, name, public) VALUES ('case-files', 'case-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read case-files" ON storage.objects FOR SELECT USING (bucket_id = 'case-files');
CREATE POLICY "Public insert case-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'case-files');
CREATE POLICY "Public update case-files" ON storage.objects FOR UPDATE USING (bucket_id = 'case-files');
CREATE POLICY "Public delete case-files" ON storage.objects FOR DELETE USING (bucket_id = 'case-files');

-- Cases table
CREATE TABLE public.forensic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  notes text DEFAULT '',
  image_url text NOT NULL,
  image_path text NOT NULL,
  label text DEFAULT 'sketch',
  mode text DEFAULT 'sketch',
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forensic_cases_case_number ON public.forensic_cases(case_number);
CREATE INDEX idx_forensic_cases_created_at ON public.forensic_cases(created_at DESC);

ALTER TABLE public.forensic_cases ENABLE ROW LEVEL SECURITY;

-- Public access (no auth in this app)
CREATE POLICY "Anyone can view cases" ON public.forensic_cases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cases" ON public.forensic_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cases" ON public.forensic_cases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cases" ON public.forensic_cases FOR DELETE USING (true);
