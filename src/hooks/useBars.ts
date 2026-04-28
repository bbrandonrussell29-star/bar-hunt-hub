import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Bar {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export function useBars(opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive ?? false;
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      let q = supabase
        .from("bars")
        .select("id, slug, name, sort_order, active")
        .order("sort_order", { ascending: true });
      if (!includeInactive) q = q.eq("active", true);
      const { data } = await q;
      if (mounted) {
        setBars(data ?? []);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel(`bars-list-${includeInactive ? "all" : "active"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bars" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [includeInactive]);

  return { bars, loading };
}
