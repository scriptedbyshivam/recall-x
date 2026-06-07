
CREATE TABLE public.content_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  topic TEXT NOT NULL,
  content_type TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER GENERATED ALWAYS AS (likes + (shares * 2) + comments) STORED,
  published_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_memory TO anon, authenticated;
GRANT ALL ON public.content_memory TO service_role;

ALTER TABLE public.content_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content_memory" ON public.content_memory FOR SELECT USING (true);
CREATE POLICY "Public insert content_memory" ON public.content_memory FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update content_memory" ON public.content_memory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete content_memory" ON public.content_memory FOR DELETE USING (true);

CREATE INDEX content_memory_created_at_idx ON public.content_memory (created_at DESC);
