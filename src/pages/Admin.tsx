import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Plus, X, Trash2, ArrowUp, ArrowDown, Power, Edit2, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBars } from "@/hooks/useBars";

interface GameRow {
  id: string;
  name: string;
  game_date: string;
  status: string;
}

const Admin = () => {
  const [games, setGames] = useState<GameRow[]>([]);
  const { bars } = useBars({ includeInactive: true });

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
      .channel("admin-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, loadGames)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setGameStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("games").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "closed" ? "Game ended" : "Game reopened");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <h1 className="font-display font-extrabold text-5xl mb-2">Admin</h1>
      <p className="text-smoke/60 mb-8">Manage games and the bar list.</p>

      {/* GAMES */}
      <section className="mb-10">
        <h2 className="font-display font-bold text-2xl mb-3 flex items-center gap-2">
          <Calendar className="size-5 text-brass" /> Games
        </h2>
        {games.length === 0 ? (
          <div className="vinyl-surface rounded-2xl p-6 text-center text-smoke/60">
            No games yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const isClosed = g.status === "closed";
              return (
                <li
                  key={g.id}
                  className="vinyl-surface rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg leading-tight truncate">
                      {g.name}
                    </p>
                    <p className="text-xs text-brass tabular-nums">
                      {format(parseISO(g.game_date), "EEE, MMM d, yyyy")}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] uppercase tracking-widest mt-1",
                        isClosed ? "text-smoke/50" : "text-brass"
                      )}
                    >
                      {isClosed ? "Closed" : g.status === "active" ? "Hunt on" : "Upcoming"}
                    </p>
                  </div>
                  {isClosed ? (
                    <Button
                      variant="brass"
                      size="sm"
                      onClick={() => setGameStatus(g.id, "active")}
                    >
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGameStatus(g.id, "closed")}
                    >
                      End
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* BARS */}
      <BarsAdmin bars={bars} />
    </main>
  );
};

interface BarsAdminProps {
  bars: { id: string; slug: string; name: string; sort_order: number; active: boolean }[];
}

const BarsAdmin = ({ bars }: BarsAdminProps) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const addBar = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return toast.error("Name required");
    const slug = slugify(name);
    if (!slug) return toast.error("Invalid name");
    const maxOrder = bars.reduce((m, b) => Math.max(m, b.sort_order), 0);
    const { error } = await supabase
      .from("bars")
      .insert({ name, slug, sort_order: maxOrder + 1, active: true });
    if (error) return toast.error(error.message);
    setNewName("");
    setShowAdd(false);
    toast.success(`Added ${name}`);
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return toast.error("Name required");
    const { error } = await supabase.from("bars").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Saved");
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("bars").update({ active: !active }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeBar = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? Past check-ins are kept but the bar disappears from the hunt.`))
      return;
    const { error } = await supabase.from("bars").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
  };

  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...bars].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((b) => b.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      supabase.from("bars").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("bars").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  return (
    <section>
      <h2 className="font-display font-bold text-2xl mb-3 flex items-center justify-between">
        <span>The Bar List</span>
        <span className="text-xs text-smoke/40 tabular-nums font-sans font-normal">
          {bars.filter((b) => b.active).length} active
        </span>
      </h2>

      <ul className="space-y-2 mb-3">
        {bars.map((b, i) => {
          const isEditing = editingId === b.id;
          return (
            <li
              key={b.id}
              className={cn(
                "vinyl-surface rounded-2xl p-3 flex items-center gap-2",
                !b.active && "opacity-50"
              )}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(b.id, -1)}
                  disabled={i === 0}
                  className="text-smoke/40 hover:text-brass disabled:opacity-20"
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  onClick={() => move(b.id, 1)}
                  disabled={i === bars.length - 1}
                  className="text-smoke/40 hover:text-brass disabled:opacity-20"
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(b.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-9 bg-vinyl-dark/60 border-vinyl-red/40"
                    maxLength={60}
                  />
                ) : (
                  <p className="font-display font-bold leading-tight truncate">{b.name}</p>
                )}
              </div>
              {isEditing ? (
                <button
                  onClick={() => saveEdit(b.id)}
                  className="size-8 rounded-lg bg-brass/20 text-brass flex items-center justify-center hover:bg-brass/30"
                  aria-label="Save"
                >
                  <Check className="size-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(b.id);
                      setEditName(b.name);
                    }}
                    className="size-8 rounded-lg text-smoke/60 hover:text-brass flex items-center justify-center"
                    aria-label="Edit"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(b.id, b.active)}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center",
                      b.active
                        ? "text-brass hover:bg-brass/10"
                        : "text-smoke/40 hover:bg-white/5"
                    )}
                    aria-label={b.active ? "Hide" : "Show"}
                    title={b.active ? "Active" : "Hidden"}
                  >
                    <Power className="size-4" />
                  </button>
                  <button
                    onClick={() => removeBar(b.id, b.name)}
                    className="size-8 rounded-lg text-smoke/40 hover:text-vinyl-bright flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {!showAdd ? (
        <Button variant="brass" size="hero" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="size-5" /> Add a Bar
        </Button>
      ) : (
        <form onSubmit={addBar} className="vinyl-surface rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-widest text-brass">New bar</Label>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setNewName("");
              }}
              className="text-smoke/50 hover:text-smoke"
              aria-label="Cancel"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="The Roost"
            className="h-12 bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={60}
          />
          <Button type="submit" variant="hero" size="hero" className="w-full">
            Add Bar
          </Button>
        </form>
      )}
    </section>
  );
};

export default Admin;
