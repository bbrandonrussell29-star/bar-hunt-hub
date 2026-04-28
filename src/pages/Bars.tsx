import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession, usePhotosRevealed } from "@/hooks/useGame";
import { BARS } from "@/data/bars";
import { Check, Camera, ArrowLeft, Trophy, PartyPopper, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CheckIn {
  bar_slug: string;
  bar_name: string;
  photo_url: string;
  created_at: string;
}

interface TeamFound {
  found_chicken_at: string | null;
  found_chicken_bar_name: string | null;
}

const Bars = () => {
  const { session, save } = useSession();
  const { revealed } = usePhotosRevealed();
  const navigate = useNavigate();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBar, setPendingBar] = useState<{ slug: string; name: string } | null>(null);
  const [teamFound, setTeamFound] = useState<TeamFound>({ found_chicken_at: null, found_chicken_bar_name: null });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/join");
      return;
    }

    supabase
      .from("check_ins")
      .select("bar_slug, bar_name, photo_url, created_at")
      .eq("team_id", session.teamId)
      .then(({ data }) => setCheckIns(data ?? []));

    supabase
      .from("teams")
      .select("found_chicken_at, found_chicken_bar_name")
      .eq("id", session.teamId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTeamFound(data);
      });

    const ch = supabase
      .channel(`bars-${session.teamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "check_ins", filter: `team_id=eq.${session.teamId}` },
        (payload) => {
          const row = payload.new as CheckIn;
          setCheckIns((prev) => (prev.some((c) => c.bar_slug === row.bar_slug) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teams", filter: `id=eq.${session.teamId}` },
        (payload) => {
          const row = payload.new as TeamFound;
          setTeamFound({
            found_chicken_at: row.found_chicken_at,
            found_chicken_bar_name: row.found_chicken_bar_name,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, navigate]);

  const visited = new Set(checkIns.map((c) => c.bar_slug));

  const triggerCheckIn = (slug: string, name: string) => {
    if (visited.has(slug) || teamFound.found_chicken_at) return;
    setPendingBar({ slug, name });
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingBar || !session) return;

    setUploadingSlug(pendingBar.slug);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${session.teamId}/${pendingBar.slug}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("proof-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      toast.error(upErr.message);
      setUploadingSlug(null);
      setPendingBar(null);
      return;
    }
    const { data: pub } = supabase.storage.from("proof-photos").getPublicUrl(path);

    const { error: insErr } = await supabase.from("check_ins").insert({
      team_id: session.teamId,
      bar_slug: pendingBar.slug,
      bar_name: pendingBar.name,
      photo_url: pub.publicUrl,
      game_id: session.gameId ?? null,
    });
    if (insErr) {
      toast.error(insErr.message);
    } else {
      toast.success(`Checked in at ${pendingBar.name}!`);
    }
    setUploadingSlug(null);
    setPendingBar(null);
  };

  const undoFound = async () => {
    if (!session) return;
    const { error } = await supabase
      .from("teams")
      .update({
        found_chicken_at: null,
        found_chicken_bar_slug: null,
        found_chicken_bar_name: null,
      })
      .eq("id", session.teamId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTeamFound({ found_chicken_at: null, found_chicken_bar_name: null });
    toast.success("Hunt resumed — keep going!");
  };

  const declareFound = async (barSlug: string, barName: string) => {
    if (!session) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("teams")
      .update({
        found_chicken_at: now,
        found_chicken_bar_slug: barSlug,
        found_chicken_bar_name: barName,
      })
      .eq("id", session.teamId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTeamFound({ found_chicken_at: now, found_chicken_bar_name: barName });
    setPickerOpen(false);
    setConfirmOpen(false);
    toast.success(`🐔 You found the Chicken at ${barName}!`);
  };

  const signOut = () => {
    save(null);
    navigate("/");
  };

  if (!session) return null;

  // ===== RECAP VIEW =====
  if (teamFound.found_chicken_at) {
    return (
      <main className="min-h-dvh px-6 py-8 max-w-md mx-auto pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <button onClick={signOut} className="text-xs text-smoke/40 hover:text-smoke uppercase tracking-widest">
            Leave team
          </button>
        </div>

        <div className="vinyl-surface rounded-3xl p-6 mb-6 text-center relative overflow-hidden">
          <div className="text-6xl mb-2">🐔</div>
          <p className="text-xs uppercase tracking-[0.2em] brass-text font-semibold mb-1">Hunt Complete</p>
          <h1 className="font-display font-extrabold text-4xl leading-tight">You found the Chicken!</h1>
          <p className="text-smoke/70 mt-3">
            <span className="font-semibold text-brass">{teamFound.found_chicken_bar_name}</span>
          </p>
          <p className="text-xs text-smoke/50 mt-1 tabular-nums">
            {format(new Date(teamFound.found_chicken_at), "h:mm a · MMM d")}
          </p>
          <div className="mt-5 vinyl-surface rounded-2xl py-3">
            <p className="text-xs uppercase tracking-widest text-smoke/60">Team</p>
            <p className="font-display font-extrabold text-2xl">{session.teamName}</p>
          </div>
        </div>

        <h2 className="font-display font-bold text-2xl mb-4">Your Crawl Recap</h2>
        <p className="text-sm text-smoke/60 mb-4">
          {checkIns.length} bar{checkIns.length === 1 ? "" : "s"} hit before the catch.
        </p>

        <ul className="space-y-3">
          {checkIns
            .slice()
            .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
            .map((c) => (
              <li
                key={c.bar_slug}
                className="rounded-2xl p-3 bg-vinyl-red/30 border-2 border-brass/60 flex items-center gap-3"
              >
                {revealed ? (
                  <img
                    src={c.photo_url}
                    alt={`Proof at ${c.bar_name}`}
                    loading="lazy"
                    className="size-20 rounded-xl object-cover border border-brass/40"
                  />
                ) : (
                  <div className="size-20 rounded-xl bg-vinyl-dark/80 border border-brass/40 flex items-center justify-center">
                    <EyeOff className="size-6 text-smoke/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg leading-tight truncate">{c.bar_name}</p>
                  <p className="text-xs text-brass tabular-nums">{format(new Date(c.created_at), "h:mm a")}</p>
                </div>
              </li>
            ))}
        </ul>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-vinyl-dark/90 backdrop-blur-xl border-t border-vinyl-red/30">
          <div className="max-w-md mx-auto space-y-2">
            <Link to="/scoreboard">
              <Button variant="brass" size="hero" className="w-full">
                <Trophy className="size-5" /> Scoreboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="hero"
              className="w-full border-vinyl-red/50 text-smoke hover:bg-vinyl-red/20"
              onClick={undoFound}
            >
              Wait — we didn't find the Chicken
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ===== ACTIVE HUNT VIEW =====
  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto pb-44">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <button onClick={signOut} className="text-xs text-smoke/40 hover:text-smoke uppercase tracking-widest">
          Leave team
        </button>
      </div>

      <div className="vinyl-surface rounded-2xl p-5 mb-6">
        <p className="text-xs uppercase tracking-widest text-smoke/60">Hunting as</p>
        <h2 className="font-display font-extrabold text-3xl leading-tight">{session.teamName}</h2>
        <p className="text-sm text-smoke/60 mt-1">{session.playerName}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-vinyl-dark/60 overflow-hidden">
            <div
              className="h-full bg-brass transition-all"
              style={{ width: `${(checkIns.length / BARS.length) * 100}%` }}
            />
          </div>
          <span className="font-display font-bold text-brass tabular-nums">
            {checkIns.length}/{BARS.length}
          </span>
        </div>
      </div>

      <h3 className="font-display font-bold text-2xl mb-4">The Crawl</h3>

      <ul className="space-y-3">
        {BARS.map((bar) => {
          const checkIn = checkIns.find((c) => c.bar_slug === bar.slug);
          const isVisited = !!checkIn;
          const isUploading = uploadingSlug === bar.slug;

          return (
            <li key={bar.slug}>
              <button
                onClick={() => triggerCheckIn(bar.slug, bar.name)}
                disabled={isVisited || isUploading}
                className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 border-2 transition-all ${
                  isVisited
                    ? "bg-vinyl-red/30 border-brass/60"
                    : "bg-vinyl-dark/40 border-vinyl-red/30 hover:border-vinyl-bright active:scale-[0.99]"
                }`}
              >
                <div
                  className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isVisited ? "bg-brass text-vinyl-dark" : "bg-vinyl-dark/60 border border-white/5"
                  }`}
                >
                  {isVisited ? <Check className="size-6" /> : <Camera className="size-5 text-smoke/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg leading-tight">{bar.name}</p>
                  {isVisited ? (
                    <p className="text-xs text-brass tabular-nums">
                      {format(new Date(checkIn!.created_at), "h:mm a")}
                    </p>
                  ) : (
                    <p className="text-xs text-smoke/40 uppercase tracking-widest">
                      {isUploading ? "Uploading…" : "Tap to check in"}
                    </p>
                  )}
                </div>
                {isVisited && checkIn && (
                  revealed ? (
                    <img
                      src={checkIn.photo_url}
                      alt={`Proof at ${bar.name}`}
                      loading="lazy"
                      className="size-14 rounded-xl object-cover border border-brass/40"
                    />
                  ) : (
                    <div className="size-14 rounded-xl bg-vinyl-dark/80 border border-brass/40 flex items-center justify-center">
                      <EyeOff className="size-5 text-smoke/40" />
                    </div>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-vinyl-dark/90 backdrop-blur-xl border-t border-vinyl-red/30 space-y-2">
        <div className="max-w-md mx-auto space-y-2">
          <Button
            variant="hero"
            size="hero"
            className="w-full"
            onClick={() => setPickerOpen(true)}
          >
            <PartyPopper className="size-5" /> I FOUND THE CHICKEN!
          </Button>
          <Link to="/scoreboard" className="block">
            <Button variant="brass" size="hero" className="w-full">
              <Trophy className="size-5" /> Scoreboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Bar picker for declaring catch */}
      <AlertDialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <AlertDialogContent className="bg-card border-vinyl-red/40 max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Where did you find the Chicken?</AlertDialogTitle>
            <AlertDialogDescription>
              Pick the bar. This ends your hunt and locks your recap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-2 my-2">
            {BARS.map((bar) => (
              <li key={bar.slug}>
                <button
                  onClick={() => {
                    setPendingBar({ slug: bar.slug, name: bar.name });
                    setConfirmOpen(true);
                  }}
                  className="w-full text-left rounded-xl p-3 border-2 border-vinyl-red/30 hover:border-brass bg-vinyl-dark/40 font-display font-bold"
                >
                  {bar.name}
                </button>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-vinyl-red/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              Found at {pendingBar?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This ends the hunt for {session.teamName}. You'll see your full recap of bars and photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBar) declareFound(pendingBar.slug, pendingBar.name);
              }}
              className="bg-brass text-vinyl-dark hover:bg-brass/90"
            >
              Yes, we caught the Chicken
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Bars;
