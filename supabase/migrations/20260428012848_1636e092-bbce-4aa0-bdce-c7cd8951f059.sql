CREATE TABLE public.bars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read bars" ON public.bars FOR SELECT USING (true);
CREATE POLICY "anyone insert bars" ON public.bars FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update bars" ON public.bars FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anyone delete bars" ON public.bars FOR DELETE USING (true);

INSERT INTO public.bars (slug, name, sort_order) VALUES
  ('mary-margarets', 'Mary Margaret''s', 1),
  ('pour-judgement', 'Pour Judgement', 2),
  ('my-rich-uncle', 'My Rich Uncle', 3),
  ('five-bucks', 'Five Bucks', 4),
  ('welcome-to-the-farm', 'Welcome To The Farm', 5),
  ('the-mandarin-hide', 'The Mandarin Hide', 6),
  ('trailer-daddys', 'Trailer Daddy''s', 7),
  ('pelican-pub', 'Pelican Pub', 8),
  ('good-night-john-boy', 'Good Night John Boy', 9),
  ('the-landing', 'The Landing', 10),
  ('wheres-jubes', 'Where''s Jubes', 11),
  ('the-henley', 'The Henley', 12),
  ('crafty-squirrel', 'Crafty Squirrel', 13);