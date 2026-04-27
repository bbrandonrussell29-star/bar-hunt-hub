import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useGame";
import { ArrowLeft, Egg } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { signUp, logIn } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signup" ? signUp : logIn;
    const { error } = await fn(name, pin);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === "signup" ? `Welcome, ${name.trim()}!` : `Welcome back, ${name.trim()}!`);
    navigate("/");
  };

  return (
    <main className="min-h-dvh px-6 py-8 max-w-md mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-smoke/60 hover:text-smoke text-sm mb-6">
        <ArrowLeft className="size-4" /> Home
      </Link>

      <header className="text-center mb-8">
        <div className="inline-flex size-16 rounded-full border-2 border-brass/40 items-center justify-center mb-4">
          <Egg className="text-brass size-7" />
        </div>
        <h1 className="font-display font-extrabold text-5xl">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-smoke/60 mt-2">
          {mode === "signup"
            ? "Pick a name and a 4-digit PIN."
            : "Enter your name and 4-digit PIN."}
        </p>
      </header>

      <form onSubmit={submit} className="vinyl-surface rounded-3xl p-6 space-y-5">
        <div>
          <Label htmlFor="name" className="uppercase tracking-widest text-xs text-smoke/60">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mara Thorne"
            className="mt-2 h-14 text-lg bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl px-4"
            maxLength={40}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div>
          <Label htmlFor="pin" className="uppercase tracking-widest text-xs text-smoke/60">
            4-digit PIN
          </Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="mt-2 h-14 text-center text-3xl tracking-[0.6em] font-display bg-vinyl-dark/60 border-vinyl-red/40 rounded-2xl"
            maxLength={4}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        <Button type="submit" variant="hero" size="hero" className="w-full" disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Create account" : "Log in"}
        </Button>
      </form>

      <button
        onClick={() => setMode((m) => (m === "signup" ? "login" : "signup"))}
        className="block mx-auto mt-6 text-sm text-smoke/60 hover:text-brass uppercase tracking-widest"
      >
        {mode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
      </button>
    </main>
  );
};

export default Auth;
