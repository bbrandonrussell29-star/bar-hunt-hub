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


export interface TeamSession {
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

export interface TeamRow {
  id: string;
  name: string;
  members: string[];
  found_chicken_at: string | null;
  found_chicken_bar_slug: string | null;
  found_chicken_bar_name: string | null;
}

export interface GameSettings {
  game_date: string | null;
  status: string;
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("game_settings")
      .select("game_date, status")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setSettings(data);
      });

    const ch = supabase
      .channel("game-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_settings" },
        (payload) => {
          const row = payload.new as GameSettings;
          if (row) setSettings({ game_date: row.game_date, status: row.status });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return settings;
}
