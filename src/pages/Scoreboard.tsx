import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, EyeOff, Eye, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { BARS } from "@/data/bars";
import { useSession, usePhotosRevealed, useGames, getActiveGameId, setActiveGameId } from "@/hooks/useGame";

interface Team {
  id: string;
  name: string;
  members: string[];
  found_chicken_at: string | null;
  found_chicken_bar_name: string | null;
  game_id: string | null;
}
interface CheckIn {
  id: string;
  team_id: string;
  bar_slug: string;
  bar_name: string;
  photo_url: string;
  created_at: string;
  game_id: string | null;
}

const Scoreboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const { session } = useSession();
  const { revealed } = usePhotosRevealed();
  const { games } = useGames();
  const [gameId, setGameId] = useState<string | null>(
    () => session?.gameId ?? getActiveGameId()
  );

  useEffect(() => {
    if (!gameId) return;
    const load = async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, members, found_chicken_at, found_chicken_bar_name, game_id")
          .eq("game_id", gameId),
        supabase
          .from("check_ins")
          .select("*")
          .eq("game_id", gameId)
          .order("created_at", { ascending: true }),
      ]);
      setTeams(t ?? []);
      setCheckIns(c ?? []);
    };
    load();

    const ch = supabase
      .channel(`scoreboard-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins", filter: `game_id=eq.${gameId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);

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
  const currentGame = games.find((g) => g.id === gameId);

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <header className="text-center mb-6">
        <Trophy className="size-10 text-brass mx-auto mb-2" />
        <h1 className="font-display font-extrabold text-5xl">Scoreboard</h1>
        <p className="text-smoke/60 text-sm mt-1">Most bars hit · Bragging rights forever</p>
      </header>

      {/* Game picker */}
      {games.length > 0 && (
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-smoke/50 flex items-center gap-2 mb-2">
            <Calendar className="size-3" /> Game
          </label>
          <select
            value={gameId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setGameId(id);
              if (id) setActiveGameId(id);
            }}
            className="w-full h-12 rounded-2xl bg-vinyl-dark/60 border-2 border-vinyl-red/40 px-4 font-display font-bold text-base focus:outline-none focus:border-brass"
          >
            <option value="" disabled>
              Pick a game
            </option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {format(parseISO(g.game_date), "MMM d")}
              </option>
            ))}
          </select>
          {currentGame && (
            <p className="text-xs text-smoke/40 mt-2">
              {format(parseISO(currentGame.game_date), "EEEE, MMM d")} · {currentGame.status}
            </p>
          )}
        </div>
      )}

      {!revealed ? (
        <div className="rounded-2xl border-2 border-brass/40 bg-vinyl-dark/60 p-4 mb-6 flex items-start gap-3">
          <EyeOff className="size-5 text-brass shrink-0 mt-0.5" />
          <p className="text-xs text-smoke/80 leading-relaxed">
            <span className="font-semibold text-brass">Photos are hidden.</span> Only your own team's
            shots are visible. Use <span className="text-brass font-semibold">Reveal All Photos</span>{" "}
            on the home screen to unlock the rest.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-brass bg-brass/10 p-4 mb-6 flex items-center gap-3">
          <Eye className="size-5 text-brass shrink-0" />
          <p className="text-xs text-smoke/90">
            <span className="font-semibold text-brass">Photos unlocked</span> on this device.
          </p>
        </div>
      )}

      {!gameId ? (
        <div className="vinyl-surface rounded-2xl p-8 text-center text-smoke/60">
          Pick a game above to see the scoreboard.
        </div>
      ) : ranked.length === 0 ? (
        <div className="vinyl-surface rounded-2xl p-8 text-center text-smoke/60">
          No teams yet for this game.
        </div>
      ) : (
        <ul className="space-y-4">
          {ranked.map(({ team, checkIns: ci, count }, idx) => {
            const isOwnTeam = session?.teamId === team.id;
            const showPhotos = isOwnTeam || revealed;
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
                        title="Hidden — unlock from home screen"
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
      )}
    </main>
  );
};

export default Scoreboard;
