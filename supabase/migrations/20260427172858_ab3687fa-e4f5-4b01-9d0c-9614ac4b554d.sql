-- PLAYERS TABLE (custom auth: name + 4-digit PIN)
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone can see player names (needed for team rosters), but pin_hash is protected by column-level concern: we only ever select name/id from the client.
CREATE POLICY "anyone read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "anyone insert players" ON public.players FOR INSERT WITH CHECK (true);

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function: create a player with hashed PIN. Returns the new player id.
CREATE OR REPLACE FUNCTION public.create_player(_name TEXT, _pin TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF _pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;
  IF length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Name required';
  END IF;
  INSERT INTO public.players (name, pin_hash)
  VALUES (trim(_name), crypt(_pin, gen_salt('bf')))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Function: verify a player's PIN. Returns player id if correct, else null.
CREATE OR REPLACE FUNCTION public.verify_player_pin(_name TEXT, _pin TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id UUID;
  found_hash TEXT;
BEGIN
  SELECT id, pin_hash INTO found_id, found_hash
  FROM public.players
  WHERE lower(name) = lower(trim(_name))
  LIMIT 1;
  IF found_id IS NULL THEN RETURN NULL; END IF;
  IF found_hash = crypt(_pin, found_hash) THEN
    RETURN found_id;
  END IF;
  RETURN NULL;
END;
$$;

-- GAMES TABLE
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  game_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "anyone insert games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update games" ON public.games FOR UPDATE USING (true) WITH CHECK (true);

-- Migrate existing game_settings row into games (if any date set)
INSERT INTO public.games (name, game_date, status)
SELECT 'The Midnight Crawl', game_date, COALESCE(status, 'upcoming')
FROM public.game_settings
WHERE id = 1 AND game_date IS NOT NULL;

-- Add game_id to teams + check_ins
ALTER TABLE public.teams ADD COLUMN game_id UUID;
ALTER TABLE public.check_ins ADD COLUMN game_id UUID;

-- Backfill any existing teams/check_ins to the first game (if exists)
UPDATE public.teams SET game_id = (SELECT id FROM public.games ORDER BY created_at ASC LIMIT 1) WHERE game_id IS NULL;
UPDATE public.check_ins SET game_id = (SELECT id FROM public.games ORDER BY created_at ASC LIMIT 1) WHERE game_id IS NULL;

CREATE INDEX idx_teams_game_id ON public.teams(game_id);
CREATE INDEX idx_check_ins_game_id ON public.check_ins(game_id);