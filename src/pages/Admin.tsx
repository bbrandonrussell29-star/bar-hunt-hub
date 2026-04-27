import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGames } from "@/hooks/useGame";

const Admin = () => {
  const { games } = useGames();
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name the game");
      return;
    }
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("games").insert({
      name: name.trim(),
      game_date: format(date, "yyyy-MM-dd"),
      status: "upcoming",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name.trim()} added`);
    setName("");
    setDate(undefined);
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("games").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Updated");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <h1 className="font-display font-extrabold text-5xl mb-2">Admin</h1>
      <p className="text-smoke/60 mb-8">Schedule new chicken games. Open and close them.</p>

      <section className="vinyl-surface rounded-2xl p-6 space-y-5 mb-8">
        <p className="text-xs uppercase tracking-widest text-brass flex items-center gap-2">
          <Plus className="size-3.5" /> New game
        </p>
        <div>
          <Label htmlFor="game-name" className="uppercase tracking-widest text-xs text-smoke/60">
            Name
          </Label>
          <Input
            id="game-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Midnight Crawl"
            className="mt-2 h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={60}
          />
        </div>
        <div>
          <p className="uppercase tracking-widest text-xs text-smoke/60 mb-2">Game date</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-14 justify-start text-left font-normal bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl text-base",
                  !date && "text-smoke/40"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-vinyl-red/40" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="hero" size="hero" className="w-full" onClick={create} disabled={saving}>
          {saving ? "Creating…" : "Create game"}
        </Button>
      </section>

      <h2 className="font-display font-bold text-2xl mb-4">All games</h2>
      {games.length === 0 ? (
        <p className="text-smoke/50 text-sm">No games yet.</p>
      ) : (
        <ul className="space-y-3">
          {games.map((g) => (
            <li key={g.id} className="vinyl-surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-display font-extrabold text-xl truncate">{g.name}</p>
                  <p className="text-xs text-smoke/50">{format(parseISO(g.game_date), "EEE, MMM d, yyyy")}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold",
                    g.status === "active"
                      ? "bg-brass text-vinyl-dark"
                      : g.status === "closed"
                      ? "bg-vinyl-red/40 text-smoke/70"
                      : "bg-vinyl-dark/60 text-smoke/60 border border-vinyl-red/40"
                  )}
                >
                  {g.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["upcoming", "active", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(g.id, s)}
                    disabled={g.status === s}
                    className={cn(
                      "py-2 rounded-xl text-xs font-display font-bold uppercase tracking-tight border-2 transition-all",
                      g.status === s
                        ? "border-brass text-brass bg-brass/10"
                        : "border-vinyl-red/40 text-smoke/60 hover:border-vinyl-bright"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default Admin;
