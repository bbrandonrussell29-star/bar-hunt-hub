import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession, useAuth, getActiveGameId, useGame } from "@/hooks/useGame";
import { toast } from "sonner";
import { ArrowLeft, Plus, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

interface ExistingTeam {
  id: string;
  name: string;
  members: string[];
  found_chicken_at: string | null;
  game_id: string | null;
}

const Join = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, save } = useSession();
  const [gameId] = useState<string | null>(() => getActiveGameId());
  const game = useGame(gameId);
  const [teams, setTeams] = useState<ExistingTeam[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!gameId) {
      navigate("/");
    }
  }, [user, gameId, navigate]);

  const loadTeams = () => {
    if (!gameId) return;
    supabase
      .from("teams")
      .select("id, name, members, found_chicken_at, game_id")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTeams(data ?? []));
  };

  useEffect(() => {
    if (!gameId) return;
    loadTeams();
    const ch = supabase
      .channel(`join-teams-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` },
        loadTeams
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (!user || !gameId) return null;

  const playerName = user.playerName;

  const joinTeam = async (team: ExistingTeam) => {
    if (team.found_chicken_at) {
      toast.error("That team's hunt is already over");
      return;
    }
    if (team.members.length >= 3 && !team.members.includes(playerName)) {
      toast.error("Team is full (max 3)");
      return;
    }
    setLoading(team.id);
    const newMembers = team.members.includes(playerName)
      ? team.members
      : [...team.members, playerName];
    const { error } = await supabase.from("teams").update({ members: newMembers }).eq("id", team.id);
    setLoading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    save({
      gameId,
      gameName: game?.name ?? "Hunt",
      teamId: team.id,
      teamName: team.name,
      playerName,
    });
    toast.success(`Welcome to ${team.name}, ${playerName}!`);
    navigate("/bars");
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
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
      .insert({ name, members: [playerName], game_id: gameId })
      .select()
      .single();
    setLoading(null);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create team");
      return;
    }
    save({
      gameId,
      gameName: game?.name ?? "Hunt",
      teamId: data.id,
      teamName: data.name,
      playerName,
    });
    toast.success(`Team ${name} is on the hunt!`);
    navigate("/bars");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      {game && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-brass">{game.name}</p>
          <p className="text-xs text-smoke/50">{format(parseISO(game.game_date), "EEE, MMM d")}</p>
        </div>
      )}

      <h1 className="font-display font-extrabold text-5xl mb-2">Pick a team</h1>
      <p className="text-smoke/60 mb-8">
        Joining as <span className="text-brass font-semibold">{playerName}</span>. 2–3 hunters per team.
      </p>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-smoke/50 flex items-center gap-2">
          <Users className="size-3.5" /> Teams in this game
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
            const disabled = done || (full && !t.members.includes(playerName));
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
          onClick={() => setShowCreate(true)}
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
