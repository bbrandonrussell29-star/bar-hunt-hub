ALTER TABLE public.teams DROP CONSTRAINT teams_name_key;
CREATE UNIQUE INDEX teams_name_per_game_key ON public.teams (game_id, lower(name));