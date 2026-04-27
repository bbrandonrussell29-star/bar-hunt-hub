import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy } from "lucide-react";
import { format } from "date-fns";
import { BARS } from "@/data/bars";

interface Team {
  id: string;
  name: string;
  members: string[];
}
interface CheckIn {
  id: string;
  team_id: string;
  bar_slug: string;
  bar_name: string;
  photo_url: string;
  created_at: string;
}

const Scoreboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from("teams").select("id, name, members"),
        supabase.from("check_ins").select("*").order("created_at", { ascending: true }),
      ]);
      setTeams(t ?? []);
      setCheckIns(c ?? []);
    };
    load();

    const ch = supabase
      .channel("scoreboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const ranked = teams
    .map((team) => {
      const teamCheckIns = checkIns.filter((c) => c.team_id === team.id);
      return { team, checkIns: teamCheckIns, count: teamCheckIns.length };
    })
    .sort((a, b) => b.count - a.count);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <header className="text-center mb-8">
        <Trophy className="size-10 text-brass mx-auto mb-2" />
        <h1 className="font-display font-extrabold text-5xl">Scoreboard</h1>
        <p className="text-smoke/60 text-sm mt-1">Most bars hit · Bragging rights forever</p>
      </header>

      {ranked.length === 0 && (
        <div className="vinyl-surface rounded-2xl p-8 text-center text-smoke/60">
          No teams yet. Be the first to squawk in.
        </div>
      )}

      <ul className="space-y-4">
        {ranked.map(({ team, checkIns: ci, count }, idx) => (
          <li key={team.id} className="vinyl-surface rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="text-3xl">{medals[idx] ?? "🐔"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-extrabold text-2xl truncate">{team.name}</h2>
                  <span className="font-display font-extrabold text-2xl text-brass tabular-nums shrink-0">
                    {count}
                    <span className="text-sm text-smoke/40">/{BARS.length}</span>
                  </span>
                </div>
                <p className="text-xs text-smoke/50 truncate">{team.members.join(" · ")}</p>
              </div>
            </div>

            {ci.length > 0 && (
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
                  Last: {ci[ci.length - 1].bar_name} · {format(new Date(ci[ci.length - 1].created_at), "h:mm a")}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Scoreboard;
