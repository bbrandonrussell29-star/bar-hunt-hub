import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession, usePhotosRevealed, useActiveGame, ActiveGame } from "@/hooks/useGame";
import { format, parseISO } from "date-fns";
import { Egg, Trophy, Settings, Lock, Eye, Plus, Calendar, X, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GameRow {
  id: string;
  name: string;
  game_date: string;
  status: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { session, save } = useSession();
  const { revealed, unlock, lock } = usePhotosRevealed();
  const { game: activeGame, setGame: setActiveGame } = useActiveGame();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");

  const [games, setGames] = useState<GameRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGames = () => {
    supabase
      .from("games")
      .select("id, name, game_date, status")
      .order("game_date", { ascending: false })
      .then(({ data }) => setGames(data ?? []));
  };

  useEffect(() => {
    loadGames();
    const ch = supabase
      .channel("home-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, loadGames)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const tryUnlock = () => {
    if (unlock(pw)) {
      toast.success("🐔 All photos unlocked on this device");
      setPw("");
      setOpen(false);
    } else {
      toast.error("Wrong password");
      setPw("");
    }
  };

  const pickGame = (g: GameRow) => {
    const next: ActiveGame = { id: g.id, name: g.name, game_date: g.game_date };
    setActiveGame(next);
    // If saved session is from a different game, clear it so they re-pick a team
    if (session && session.gameId !== g.id) {
      save(null);
    }
    toast.success(`Joined ${g.name}`);
    navigate("/join");
  };

  const createGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return toast.error("Give it a name");
    if (!newDate) return toast.error("Pick a date");
    setCreating(true);
    const { data, error } = await supabase
      .from("games")
      .insert({ name, game_date: newDate, status: "upcoming" })
      .select()
      .single();
    setCreating(false);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    setNewName("");
    setNewDate("");
    setShowCreate(false);
    toast.success(`${data.name} is on the calendar`);
    pickGame(data as GameRow);
  };

  return (
    <main className="min-h-dvh px-6 py-10 max-w-md mx-auto flex flex-col gap-8">
      <header className="flex flex-col items-center text-center gap-2 mt-6">
        <span className="text-xs uppercase tracking-[0.2em] italic brass-text font-semibold">
          The Legendary Hunt
        </span>
        <h1 className="font-display font-extrabold text-7xl text-smoke leading-none">
          CHICKEN <span className="inline-block">🐔</span>
        </h1>
        <div className="h-1 w-24 rounded-full bg-vinyl-bright mt-3" />
      </header>

      {/* Active game card */}
      {activeGame ? (
        <section className="vinyl-surface rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 size-12 rounded-full border-2 border-brass/30 bg-vinyl-dark/40 backdrop-blur-sm flex items-center justify-center">
            <Egg className="text-brass size-5" />
          </div>
          <p className="text-xs uppercase tracking-widest text-smoke/60 mb-1">Active Game</p>
          <h2 className="font-display font-extrabold text-4xl leading-tight">{activeGame.name}</h2>
          <div className="mt-6 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-vinyl-dark/60 border border-white/5 flex items-center justify-center">
              <Calendar className="size-4 text-brass" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {format(parseISO(activeGame.game_date), "EEEE, MMM d")}
              </p>
              <p className="text-xs text-smoke/50">13 bars · One chicken · One winner</p>
            </div>
          </div>
          <Link to="/join" className="block mt-6">
            <Button variant="hero" size="hero" className="w-full">
              {session?.gameId === activeGame.id ? "BACK TO THE HUNT" : "SQUAWK IN"}
            </Button>
          </Link>
          <button
            onClick={() => {
              setActiveGame(null);
              save(null);
            }}
            className="text-[10px] uppercase tracking-widest text-smoke/40 hover:text-brass mt-4"
          >
            Switch game
          </button>
        </section>
      ) : (
        <section className="vinyl-surface rounded-[2rem] p-6">
          <p className="text-xs uppercase tracking-widest text-smoke/60 mb-3">Pick a game</p>
          {games.length === 0 ? (
            <p className="text-smoke/60 text-sm mb-4">No games yet. Start one below.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {games.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => pickGame(g)}
                    className="w-full text-left rounded-2xl p-4 border-2 border-vinyl-red/30 hover:border-brass bg-vinyl-dark/40 flex items-center gap-3 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-lg leading-tight truncate">
                        {g.name}
                      </p>
                      <p className="text-xs text-brass tabular-nums">
                        {format(parseISO(g.game_date), "EEE, MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-smoke/40" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!showCreate ? (
            <Button
              variant="brass"
              size="hero"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-5" /> New Chicken Game
            </Button>
          ) : (
            <form onSubmit={createGame} className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-brass">Schedule a hunt</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-smoke/50 hover:text-smoke"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div>
                <Label className="uppercase tracking-widest text-xs text-smoke/60">Name</Label>
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="The Midnight Crawl"
                  maxLength={60}
                  className="mt-2 h-12 bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
                />
              </div>
              <div>
                <Label className="uppercase tracking-widest text-xs text-smoke/60">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-2 h-12 bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
                />
              </div>
              <Button type="submit" variant="hero" size="hero" className="w-full" disabled={creating}>
                {creating ? "Creating…" : "Create & Open"}
              </Button>
            </form>
          )}
        </section>
      )}

      <div>
        {!revealed ? (
          <Button
            variant="brass"
            size="hero"
            className="w-full"
            onClick={() => setOpen(true)}
          >
            <Lock className="size-5" /> Reveal All Photos
          </Button>
        ) : (
          <div className="rounded-2xl border-2 border-brass bg-brass/10 p-4 flex items-center gap-3">
            <Eye className="size-5 text-brass shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-semibold text-brass">Photos unlocked</span> on this device.
            </p>
            <button
              onClick={() => {
                lock();
                toast.success("Photos hidden again");
              }}
              className="text-[10px] uppercase tracking-widest text-smoke/60 hover:text-brass"
            >
              Hide
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/scoreboard">
          <button className="w-full py-5 rounded-2xl border-2 border-vinyl-red/40 hover:border-vinyl-bright transition-colors flex flex-col items-center gap-1">
            <Trophy className="size-5 text-brass" />
            <span className="font-display font-bold text-lg">Scoreboard</span>
          </button>
        </Link>
        <Link to="/admin">
          <button className="w-full py-5 rounded-2xl border-2 border-vinyl-red/40 hover:border-vinyl-bright transition-colors flex flex-col items-center gap-1">
            <Settings className="size-5 text-brass" />
            <span className="font-display font-bold text-lg">Admin</span>
          </button>
        </Link>
      </div>

      <p className="text-center text-xs text-smoke/30 mt-auto pt-8 tracking-widest uppercase">
        Find the Chicken · Win the Pot
      </p>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPw(""); }}>
        <DialogContent className="bg-card border-vinyl-red/40">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Lock className="size-5 text-brass" /> Enter the Code
            </DialogTitle>
            <DialogDescription>
              Reveals every team's photos on this device — including your own.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") tryUnlock();
            }}
            className="bg-vinyl-dark/60 border-vinyl-red/40 h-14 text-center text-2xl tracking-[0.5em] font-display"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brass" onClick={tryUnlock}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Home;
