import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Admin = () => {
  const [date, setDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<string>("closed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("game_settings")
      .select("game_date, status")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStatus(data.status);
          if (data.game_date) setDate(parseISO(data.game_date));
        }
      });
  }, []);

  const save = async (next: { game_date?: string | null; status?: string }) => {
    setSaving(true);
    const { error } = await supabase
      .from("game_settings")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <h1 className="font-display font-extrabold text-5xl mb-2">Admin</h1>
      <p className="text-smoke/60 mb-8">Set the date. Open the hunt. Close it when the chicken is found.</p>

      <div className="vinyl-surface rounded-2xl p-6 space-y-6">
        <div>
          <p className="uppercase tracking-widest text-xs text-smoke/60 mb-2">Game date</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-14 justify-start text-left font-normal bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl text-base",
                  !date && "text-smoke/40"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-vinyl-red/40" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  if (d) save({ game_date: format(d, "yyyy-MM-dd") });
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <p className="uppercase tracking-widest text-xs text-smoke/60 mb-2">Status</p>
          <div className="grid grid-cols-2 gap-3">
            {(["active", "closed"] as const).map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => {
                  setStatus(s);
                  save({ status: s });
                }}
                className={cn(
                  "py-4 rounded-2xl font-display font-extrabold text-lg uppercase tracking-tight transition-all border-2",
                  status === s
                    ? s === "active"
                      ? "bg-brass text-vinyl-dark border-brass shadow-[0_0_24px_hsl(var(--brass)/0.4)]"
                      : "bg-vinyl-bright text-smoke border-vinyl-bright"
                    : "border-vinyl-red/40 text-smoke/60 hover:border-vinyl-bright"
                )}
              >
                {s === "active" ? "Hunt On" : "Closed"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Admin;
