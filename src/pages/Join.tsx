import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useGame";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ExistingTeam {
  id: string;
  name: string;
  members: string[];
}

const Join = () => {
  const navigate = useNavigate();
  const { session, save } = useSession();
  const [playerName, setPlayerName] = useState(session?.playerName ?? "");
  const [teamName, setTeamName] = useState(session?.teamName ?? "");
  const [teams, setTeams] = useState<ExistingTeam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name, members")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTeams(data ?? []));
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const player = playerName.trim();
    const team = teamName.trim();
    if (!player || !team) {
      toast.error("Enter your name and a team name");
      return;
    }

    setLoading(true);
    const existing = teams.find((t) => t.name.toLowerCase() === team.toLowerCase());

    if (existing) {
      if (existing.members.length >= 3 && !existing.members.includes(player)) {
        toast.error("Team is full (max 3)");
        setLoading(false);
        return;
      }
      const newMembers = existing.members.includes(player)
        ? existing.members
        : [...existing.members, player];
      const { error } = await supabase
        .from("teams")
        .update({ members: newMembers })
        .eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      save({ teamId: existing.id, teamName: existing.name, playerName: player });
    } else {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: team, members: [player] })
        .select()
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Failed to create team");
        setLoading(false);
        return;
      }
      save({ teamId: data.id, teamName: data.name, playerName: player });
    }

    toast.success(`Welcome, ${player}!`);
    navigate("/bars");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <h1 className="font-display font-extrabold text-5xl mb-2">Join the hunt</h1>
      <p className="text-smoke/60 mb-8">2–3 hunters per team. Type a new team name to start one, or pick an existing team to join them.</p>

      <form onSubmit={handleJoin} className="space-y-5">
        <div>
          <Label htmlFor="player" className="uppercase tracking-widest text-xs text-smoke/60">Your name</Label>
          <Input
            id="player"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Mara Thorne"
            className="mt-2 h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={40}
          />
        </div>

        <div>
          <Label htmlFor="team" className="uppercase tracking-widest text-xs text-smoke/60">Team name</Label>
          <Input
            id="team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="The Coop Crashers"
            className="mt-2 h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={40}
          />
        </div>

        {teams.length > 0 && (
          <div className="vinyl-surface rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-smoke/50 mb-3">Active teams</p>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeamName(t.name)}
                  className="text-xs px-3 py-1.5 rounded-full bg-vinyl-dark/50 border border-brass/20 hover:border-brass transition-colors"
                >
                  {t.name} <span className="text-brass">· {t.members.length}/3</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="hero" size="hero" className="w-full" disabled={loading}>
          {loading ? "Joining…" : "Let's hunt"}
        </Button>
      </form>
    </main>
  );
};

export default Join;
