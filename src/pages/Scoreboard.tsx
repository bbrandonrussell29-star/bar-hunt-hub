import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, EyeOff, Eye, ChevronRight, Lock, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { BARS } from "@/data/bars";
import { useSession, useGameRevealed } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface GameRow {
  id: string;
  name: string;
  game_date: string;
  status: string;
}
interface Team {
  id: string;
  name: string;
  members: string[];
  game_id: string | null;
  found_chicken_at: string | null;
  found_chicken_bar_name: string | null;
}
interface CheckIn {
  id: string;
  team_id: string;
  game_id: string | null;
  bar_slug: string;
  bar_name: string;
  photo_url: string;
  created_at: string;
}

const Scoreboard = () => {
  const [games, setGames] = useState<GameRow[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, game_date, status")
      .order("game_date", { ascending: false })
      .then(({ data }) => setGames(data ?? []));
  }, []);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  );

  if (selectedGame) {
    return (
      <GameScoreboard
        game={selectedGame}
        onBack={() => setSelectedGameId(null)}
      />
    );
  }

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <header className="text-center mb-8">
        <Trophy className="size-10 text-brass mx-auto mb-2" />
        <h1 className="font-display font-extrabold text-5xl">Scoreboards</h1>
        <p className="text-smoke/60 text-sm mt-1">Pick a hunt to see who caught the Chicken</p>
      </header>

      {games.length === 0 ? (
        <div className="vinyl-surface rounded-2xl p-8 text-center text-smoke/60">
          No games yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => setSelectedGameId(g.id)}
                className="w-full text-left rounded-2xl p-4 border-2 border-vinyl-red/30 hover:border-brass bg-vinyl-dark/40 flex items-center gap-3 transition-all"
              >
                <div className="size-10 rounded-xl bg-vinyl-dark/60 border border-white/5 flex items-center justify-center shrink-0">
                  <Calendar className="size-4 text-brass" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg leading-tight truncate">{g.name}</p>
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
    </main>
  );
};

interface GameScoreboardProps {
  game: GameRow;
  onBack: () => void;
}

const GameScoreboard = ({ game, onBack }: GameScoreboardProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const { session } = useSession();
  const { revealed, unlock, lock } = useGameRevealed(game.id);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, members, game_id, found_chicken_at, found_chicken_bar_name")
          .eq("game_id", game.id),
        supabase
          .from("check_ins")
          .select("*")
          .eq("game_id", game.id)
          .order("created_at", { ascending: true }),
      ]);
      setTeams(t ?? []);
      setCheckIns(c ?? []);
    };
    load();

    const ch = supabase
      .channel(`scoreboard-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins", filter: `game_id=eq.${game.id}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${game.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [game.id]);

  const tryUnlock = () => {
    if (unlock(pw)) {
      toast.success("🐔 Photos unlocked for this game");
      setPw("");
      setOpen(false);
    } else {
      toast.error("Wrong password");
      setPw("");
    }
  };

  const ranked = teams
    .map((team) => {
      const teamCheckIns = checkIns.filter((c) => c.team_id === team.id);
      return { team, checkIns: teamCheckIns, count: teamCheckIns.length };
    })
    .sort((a, b) => {
      if (a.team.found_chicken_at && !b.team.found_chicken_at) return -1;
      if (!a.team.found_chicken_at && b.team.found_chicken_at) return 1;
      return b.count - a.count;
    });

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6"
      >
        <ArrowLeft className="size-4" /> All games
      </button>

      <header className="text-center mb-6">
        <Trophy className="size-10 text-brass mx-auto mb-2" />
        <h1 className="font-display font-extrabold text-4xl">{game.name}</h1>
        <p className="text-smoke/60 text-xs mt-1 tabular-nums">
          {format(parseISO(game.game_date), "EEE, MMM d, yyyy")}
        </p>
      </header>

      {!revealed ? (
        <div className="space-y-3 mb-6">
          <div className="rounded-2xl border-2 border-brass/40 bg-vinyl-dark/60 p-4 flex items-start gap-3">
            <EyeOff className="size-5 text-brass shrink-0 mt-0.5" />
            <p className="text-xs text-smoke/80 leading-relaxed">
              <span className="font-semibold text-brass">All photos are hidden</span> for this game.
              Enter the code to reveal them.
            </p>
          </div>
          <Button variant="brass" size="hero" className="w-full" onClick={() => setOpen(true)}>
            <Lock className="size-5" /> Reveal Photos for this Game
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-brass bg-brass/10 p-4 mb-6 flex items-center gap-3">
          <Eye className="size-5 text-brass shrink-0" />
          <p className="text-xs text-smoke/90 flex-1">
            <span className="font-semibold text-brass">Photos unlocked</span> for this game.
          </p>
          <button
            onClick={() => {
              lock();
              toast.success("Hidden again");
            }}
            className="text-[10px] uppercase tracking-widest text-smoke/60 hover:text-brass"
          >
            Hide
          </button>
        </div>
      )}

      {ranked.length === 0 && (
        <div className="vinyl-surface rounded-2xl p-8 text-center text-smoke/60">
          No teams in this game.
        </div>
      )}

      <ul className="space-y-4">
        {ranked.map(({ team, checkIns: ci, count }, idx) => {
          const isOwnTeam = session?.teamId === team.id;
          const showPhotos = revealed;
          const isWinner = !!team.found_chicken_at;

          return (
            <li
              key={team.id}
              className={`vinyl-surface rounded-2xl p-5 ${
                isWinner ? "border-2 border-brass shadow-[0_0_24px_hsl(var(--brass)/0.3)]" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{isWinner ? "🐔" : medals[idx] ?? "🍻"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display font-extrabold text-2xl truncate">
                      {team.name}
                      {isOwnTeam && <span className="text-xs text-brass ml-2">YOU</span>}
                    </h2>
                    <span className="font-display font-extrabold text-2xl text-brass tabular-nums shrink-0">
                      {count}
                      <span className="text-sm text-smoke/40">/{BARS.length}</span>
                    </span>
                  </div>
                  <p className="text-xs text-smoke/50 truncate">{team.members.join(" · ")}</p>
                  {isWinner && (
                    <p className="text-xs text-brass font-semibold mt-1">
                      🐔 Caught the Chicken
                      {revealed && team.found_chicken_bar_name
                        ? ` at ${team.found_chicken_bar_name}`
                        : ""}
                      {team.found_chicken_at &&
                        ` · ${format(new Date(team.found_chicken_at), "h:mm a")}`}
                    </p>
                  )}
                </div>
              </div>

              {ci.length > 0 && showPhotos && (
                <>
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {ci.slice(-10).reverse().map((c) => (
                      <a
                        key={c.id}
                        href={c.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-brass/30 group relative"
                      >
                        <img
                          src={c.photo_url}
                          alt={`${team.name} at ${c.bar_name}`}
                          loading="lazy"
                          className="size-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-smoke/40 mt-3">
                    Last: {ci[ci.length - 1].bar_name} ·{" "}
                    {format(new Date(ci[ci.length - 1].created_at), "h:mm a")}
                  </p>
                </>
              )}

              {ci.length > 0 && !showPhotos && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {ci.slice(-10).map((c) => (
                    <div
                      key={c.id}
                      className="aspect-square rounded-lg bg-vinyl-dark/80 border border-vinyl-red/40 flex items-center justify-center"
                      title="Hidden — unlock above"
                    >
                      <EyeOff className="size-4 text-smoke/30" />
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPw(""); }}>
        <DialogContent className="bg-card border-vinyl-red/40">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Lock className="size-5 text-brass" /> Enter the Code
            </DialogTitle>
            <DialogDescription>
              Reveals every team's photos for <span className="text-brass font-semibold">{game.name}</span>.
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

export default Scoreboard;
