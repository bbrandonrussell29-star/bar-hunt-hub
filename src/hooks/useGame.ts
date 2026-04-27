import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const REVEAL_KEY = "chicken.photosRevealed";
export const REVEAL_PASSWORD = "2486";

export function usePhotosRevealed() {
  const [revealed, setRevealed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REVEAL_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === REVEAL_KEY) setRevealed(e.newValue === "1");
    };
    const onCustom = () => setRevealed(localStorage.getItem(REVEAL_KEY) === "1");
    window.addEventListener("storage", onStorage);
    window.addEventListener("chicken:reveal-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("chicken:reveal-changed", onCustom);
    };
  }, []);

  const unlock = (password: string) => {
    if (password.trim() !== REVEAL_PASSWORD) return false;
    try {
      localStorage.setItem(REVEAL_KEY, "1");
    } catch {
      /* ignore */
    }
    setRevealed(true);
    window.dispatchEvent(new Event("chicken:reveal-changed"));
    return true;
  };

  const lock = () => {
    try {
      localStorage.removeItem(REVEAL_KEY);
    } catch {
      /* ignore */
    }
    setRevealed(false);
    window.dispatchEvent(new Event("chicken:reveal-changed"));
  };

  return { revealed, unlock, lock };
}

// ===== Player auth (custom: name + 4-digit PIN) =====
export interface AuthUser {
  playerId: string;
  playerName: string;
}
const AUTH_KEY = "chicken.auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onCustom = () => {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("chicken:auth-changed", onCustom);
    return () => window.removeEventListener("chicken:auth-changed", onCustom);
  }, []);

  const setAuth = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    else localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event("chicken:auth-changed"));
  };

  const signUp = async (name: string, pin: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Enter your name" };
    if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits" };
    const { data, error } = await supabase.rpc("create_player", { _name: trimmed, _pin: pin });
    if (error) {
      if (error.message.includes("duplicate") || error.message.toLowerCase().includes("unique")) {
        return { error: "That name is taken — try logging in" };
      }
      return { error: error.message };
    }
    setAuth({ playerId: data as string, playerName: trimmed });
    return { error: null };
  };

  const logIn = async (name: string, pin: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Enter your name" };
    if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits" };
    const { data, error } = await supabase.rpc("verify_player_pin", { _name: trimmed, _pin: pin });
    if (error) return { error: error.message };
    if (!data) return { error: "Wrong name or PIN" };
    setAuth({ playerId: data as string, playerName: trimmed });
    return { error: null };
  };

  const signOut = () => setAuth(null);

  return { user, signUp, logIn, signOut };
}

// ===== Team session (per-game) =====
export interface TeamSession {
  gameId: string;
  gameName: string;
  teamId: string;
  teamName: string;
  playerName: string;
}

const KEY = "chicken.session";

export function useSession() {
  const [session, setSession] = useState<TeamSession | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const save = (s: TeamSession | null) => {
    setSession(s);
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  };

  return { session, save };
}

// ===== Active game selection =====
const ACTIVE_GAME_KEY = "chicken.activeGameId";

export function getActiveGameId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_GAME_KEY);
  } catch {
    return null;
  }
}

export function setActiveGameId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_GAME_KEY, id);
  else localStorage.removeItem(ACTIVE_GAME_KEY);
  window.dispatchEvent(new Event("chicken:active-game-changed"));
}

export interface GameRow {
  id: string;
  name: string;
  game_date: string;
  status: string;
}

export function useGames() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      supabase
        .from("games")
        .select("id, name, game_date, status")
        .order("game_date", { ascending: true })
        .then(({ data }) => {
          if (mounted) {
            setGames(data ?? []);
            setLoading(false);
          }
        });
    };
    load();
    const ch = supabase
      .channel("games-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { games, loading };
}

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<GameRow | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      return;
    }
    let mounted = true;
    supabase
      .from("games")
      .select("id, name, game_date, status")
      .eq("id", gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setGame(data ?? null);
      });
    const ch = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as GameRow)
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [gameId]);

  return game;
}

export interface TeamRow {
  id: string;
  name: string;
  members: string[];
  found_chicken_at: string | null;
  found_chicken_bar_slug: string | null;
  found_chicken_bar_name: string | null;
}
