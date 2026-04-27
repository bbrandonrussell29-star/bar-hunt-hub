-- Game settings (single row)
CREATE TABLE public.game_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  game_date DATE,
  status TEXT NOT NULL DEFAULT 'closed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.game_settings (id, status) VALUES (1, 'closed');

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  members TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  bar_slug TEXT NOT NULL,
  bar_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, bar_slug)
);

-- Enable RLS
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Open policies (party game, no auth)
CREATE POLICY "anyone read settings" ON public.game_settings FOR SELECT USING (true);
CREATE POLICY "anyone update settings" ON public.game_settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anyone read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "anyone insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update teams" ON public.teams FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anyone read check_ins" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "anyone insert check_ins" ON public.check_ins FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_settings;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-photos', 'proof-photos', true);

CREATE POLICY "anyone read proof photos" ON storage.objects FOR SELECT USING (bucket_id = 'proof-photos');
CREATE POLICY "anyone upload proof photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'proof-photos');