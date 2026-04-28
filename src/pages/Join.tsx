import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession, useActiveGame } from "@/hooks/useGame";
import { toast } from "sonner";
import { ArrowLeft, Plus, Users, X } from "lucide-react";
import { Link } from "react-router-dom";

interface ExistingTeam {
  id: string;
  name: string;
  members: string[];
  found_chicken_at: string | null;
}

const Join = () => {
  const navigate = useNavigate();
  const { session, save } = useSession();
  const { game } = useActiveGame();
  const [playerName, setPlayerName] = useState(session?.playerName ?? "");
  const [teams, setTeams] = useState<ExistingTeam[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    if (!game) navigate("/");
  }, [game, navigate]);

  useEffect(() => {
    if (!game) return;
    const loadTeams = () => {
      supabase
        .from("teams")
        .select("id, name, members, found_chicken_at")
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTeams(data ?? []));
    };
    loadTeams();
    const ch = supabase
      .channel(`join-teams-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${game.id}` },
        loadTeams
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [game?.id]);

  const requireName = (): string | null => {
    const player = playerName.trim();
    if (!player) {
      toast.error("Enter your name first");
      return null;
    }
    return player;
  };

  const joinTeam = async (team: ExistingTeam) => {
    const player = requireName();
    if (!player) return;
    if (team.found_chicken_at) {
      toast.error("That team's hunt is already over");
      return;
    }
    if (team.members.length >= 3 && !team.members.includes(player)) {
      toast.error("Team is full (max 3)");
      return;
    }
    setLoading(team.id);
    const newMembers = team.members.includes(player) ? team.members : [...team.members, player];
    const { error } = await supabase.from("teams").update({ members: newMembers }).eq("id", team.id);
    setLoading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    save({ teamId: team.id, teamName: team.name, playerName: player, gameId: game?.id, gameName: game?.name });
    toast.success(`Welcome to ${team.name}, ${player}!`);
    navigate("/bars");
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const player = requireName();
    if (!player) return;
    const name = newTeamName.trim();
    if (!name) {
      toast.error("Give the team a name");
      return;
    }
    const dup = teams.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      toast.error("That team already exists — pick it from the list");
      return;
    }
    setLoading("__new__");
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, members: [player] })
      .select()
      .single();
    setLoading(null);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create team");
      return;
    }
    save({ teamId: data.id, teamName: data.name, playerName: player });
    toast.success(`Team ${name} is on the hunt!`);
    navigate("/bars");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <h1 className="font-display font-extrabold text-5xl mb-2">Join the hunt</h1>
      <p className="text-smoke/60 mb-8">
        Pick your team below, or start a new one. 2–3 hunters per team.
      </p>

      <div className="mb-6">
        <Label htmlFor="player" className="uppercase tracking-widest text-xs text-smoke/60">
          Your name
        </Label>
        <Input
          id="player"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Mara Thorne"
          className="mt-2 h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
          maxLength={40}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-smoke/50 flex items-center gap-2">
          <Users className="size-3.5" /> Teams in the game
        </p>
        <span className="text-xs text-smoke/40 tabular-nums">{teams.length}</span>
      </div>

      {teams.length === 0 ? (
        <div className="vinyl-surface rounded-2xl p-6 text-center text-smoke/60 mb-4">
          No teams yet. Be the first to start one.
        </div>
      ) : (
        <ul className="space-y-2 mb-4">
          {teams.map((t) => {
            const full = t.members.length >= 3;
            const done = !!t.found_chicken_at;
            const disabled = done || (full && !t.members.includes(playerName.trim()));
            const isLoading = loading === t.id;
            return (
              <li key={t.id}>
                <button
                  onClick={() => joinTeam(t)}
                  disabled={disabled || isLoading}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all flex items-center gap-3 ${
                    disabled
                      ? "bg-vinyl-dark/30 border-vinyl-red/20 opacity-50 cursor-not-allowed"
                      : "bg-vinyl-dark/40 border-vinyl-red/30 hover:border-brass active:scale-[0.99]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg leading-tight truncate">{t.name}</p>
                    <p className="text-xs text-smoke/50 truncate">
                      {t.members.length > 0 ? t.members.join(" · ") : "No members yet"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-display font-bold tabular-nums px-2.5 py-1 rounded-full ${
                      done
                        ? "bg-brass/20 text-brass"
                        : full
                        ? "bg-vinyl-red/40 text-smoke/60"
                        : "bg-brass/20 text-brass"
                    }`}
                  >
                    {done ? "🐔 Done" : `${t.members.length}/3`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!showCreate ? (
        <Button
          variant="hero"
          size="hero"
          className="w-full"
          onClick={() => {
            if (!requireName()) return;
            setShowCreate(true);
          }}
        >
          <Plus className="size-5" /> Add a New Team
        </Button>
      ) : (
        <form onSubmit={createTeam} className="vinyl-surface rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-brass">Start a new team</p>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewTeamName("");
              }}
              className="text-smoke/50 hover:text-smoke"
              aria-label="Cancel"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            autoFocus
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="The Coop Crashers"
            className="h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={40}
          />
          <Button type="submit" variant="brass" size="hero" className="w-full" disabled={loading === "__new__"}>
            {loading === "__new__" ? "Creating…" : "Create & Join"}
          </Button>
        </form>
      )}
    </main>
  );
};

export default Join;
