import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGameSettings, useSession, usePhotosRevealed } from "@/hooks/useGame";
import { format, parseISO } from "date-fns";
import { Egg, Trophy, Settings, Lock, Eye } from "lucide-react";
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
  const settings = useGameSettings();
  const { session } = useSession();
  const { revealed, unlock, lock } = usePhotosRevealed();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");

  const dateLabel = settings?.game_date
    ? format(parseISO(settings.game_date), "EEEE, MMM d")
    : "TBA";

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

      <section className="vinyl-surface rounded-[2rem] p-8 relative overflow-hidden">
        <div className="absolute top-4 right-4 size-12 rounded-full border-2 border-brass/30 bg-vinyl-dark/40 backdrop-blur-sm flex items-center justify-center">
          <Egg className="text-brass size-5" />
        </div>

        <p className="text-xs uppercase tracking-widest text-smoke/60 mb-1">
          {settings?.status === "active" ? "Hunt In Progress" : "Next Flight"}
        </p>
        <h2 className="font-display font-extrabold text-4xl leading-tight">
          The Midnight Crawl
        </h2>

        <div className="mt-6 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-vinyl-dark/60 border border-white/5 flex items-center justify-center">
            <div className={`size-2 rounded-full ${settings?.status === "active" ? "bg-brass animate-pulse" : "bg-smoke/40"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">{dateLabel}</p>
            <p className="text-xs text-smoke/50">
              13 bars · One chicken · One winner
            </p>
          </div>
        </div>

        <Link to="/join" className="block mt-6">
          <Button variant="hero" size="hero" className="w-full">
            {session ? "BACK TO THE HUNT" : "SQUAWK IN"}
          </Button>
        </Link>
      </section>

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
