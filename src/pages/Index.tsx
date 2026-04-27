import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  useAuth,
  useGames,
  usePhotosRevealed,
  setActiveGameId,
  useSession,
} from "@/hooks/useGame";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Egg, Trophy, Settings, Lock, Eye, LogOut, Calendar, ChevronRight } from "lucide-react";
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

const Home = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { games, loading } = useGames();
  const { session, save: saveSession } = useSession();
  const { revealed, unlock, lock } = usePhotosRevealed();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");

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

  const pickGame = (g: { id: string; name: string }) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setActiveGameId(g.id);
    // If the saved team session is for a different game, clear it.
    if (session && session.gameId !== g.id) saveSession(null);
    navigate("/join");
  };

  const upcoming = games.filter(
    (g) => g.status !== "closed" && !isPast(parseISO(g.game_date + "T23:59:59"))
  );
  const past = games.filter(
    (g) => g.status === "closed" || isPast(parseISO(g.game_date + "T23:59:59"))
  );

  return (
    <main className="min-h-dvh px-6 py-10 max-w-md mx-auto flex flex-col gap-8">
      <header className="flex flex-col items-center text-center gap-2 mt-6 relative w-full">
        {user && (
          <button
            onClick={() => {
              signOut();
              saveSession(null);
              toast.success("Signed out");
            }}
            className="absolute right-0 top-0 text-[10px] uppercase tracking-widest text-smoke/50 hover:text-brass flex items-center gap-1"
          >
            <LogOut className="size-3" /> Sign out
          </button>
        )}
        <span className="text-xs uppercase tracking-[0.2em] italic brass-text font-semibold">
          The Legendary Hunt
        </span>
        <h1 className="font-display font-extrabold text-7xl text-smoke leading-none">
          CHICKEN <span className="inline-block">🐔</span>
        </h1>
        <div className="h-1 w-24 rounded-full bg-vinyl-bright mt-3" />
        {user && (
          <p className="text-xs text-smoke/60 mt-3">
            Signed in as <span className="text-brass font-semibold">{user.playerName}</span>
          </p>
        )}
      </header>

      {!user ? (
        <section className="vinyl-surface rounded-[2rem] p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-smoke/60 mb-2">Step One</p>
          <h2 className="font-display font-extrabold text-3xl mb-3">Make an account</h2>
          <p className="text-sm text-smoke/60 mb-5">
            Pick a name and a 4-digit PIN. That's all you need to join the hunt.
          </p>
          <Link to="/auth">
            <Button variant="hero" size="hero" className="w-full">
              Create account / Log in
            </Button>
          </Link>
        </section>
      ) : (
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-brass">Choose a game</p>
              <h2 className="font-display font-extrabold text-3xl">Upcoming hunts</h2>
            </div>
            <span className="text-xs text-smoke/40 tabular-nums">{upcoming.length}</span>
          </div>

          {loading ? (
            <div className="vinyl-surface rounded-2xl p-6 text-center text-smoke/50">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="vinyl-surface rounded-2xl p-6 text-center text-smoke/60">
              No games scheduled yet. An admin needs to add one.
            </div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((g) => {
                const d = parseISO(g.game_date);
                const today = isToday(d);
                return (
                  <li key={g.id}>
                    <button
                      onClick={() => pickGame(g)}
                      className="w-full text-left rounded-2xl p-4 border-2 border-vinyl-red/30 hover:border-brass bg-vinyl-dark/40 active:scale-[0.99] transition-all flex items-center gap-3"
                    >
                      <div className="size-12 rounded-xl bg-vinyl-dark/60 border border-brass/30 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] uppercase text-brass font-bold leading-none">
                          {format(d, "MMM")}
                        </span>
                        <span className="font-display font-extrabold text-lg leading-none mt-0.5">
                          {format(d, "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-lg leading-tight truncate">
                          {g.name}
                        </p>
                        <p className="text-xs text-smoke/50">
                          {format(d, "EEEE")} ·{" "}
                          <span
                            className={
                              g.status === "active"
                                ? "text-brass font-semibold"
                                : today
                                ? "text-vinyl-bright"
                                : "text-smoke/50"
                            }
                          >
                            {g.status === "active" ? "Hunt on" : today ? "Today" : "Upcoming"}
                          </span>
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-smoke/40" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {past.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs uppercase tracking-widest text-smoke/50 cursor-pointer hover:text-brass">
                Past games ({past.length})
              </summary>
              <ul className="space-y-2 mt-3">
                {past.map((g) => (
                  <li key={g.id}>
                    <button
                      onClick={() => pickGame(g)}
                      className="w-full text-left rounded-2xl p-3 border border-vinyl-red/20 bg-vinyl-dark/30 opacity-70 hover:opacity-100 flex items-center gap-3"
                    >
                      <Calendar className="size-4 text-smoke/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold truncate">{g.name}</p>
                        <p className="text-[11px] text-smoke/40">
                          {format(parseISO(g.game_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
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
              Reveals every team's photos on this device. The Chicken won't be happy.
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
