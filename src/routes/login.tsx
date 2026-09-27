// @ts-nocheck
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CircleAlert, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — VeriLex" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  component: LoginPage,
});

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (lower.includes("invalid login credentials")) {
    return "That email or password doesn't match our records.";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("confirm")) {
    return "Check your inbox to confirm your email before signing in.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error — please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

function LoginPage() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmNotice, setConfirmNotice] = useState(false);

  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });

  if (!loading && user) {
    navigate({ to: search.redirect || "/" });
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setConfirmNotice(false);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signUp") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: displayName.trim() ? { display_name: displayName.trim() } : undefined },
        });
        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          return;
        }
        if (data.user && !data.session) {
          setConfirmNotice(true);
          return;
        }
        navigate({ to: search.redirect || "/" });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(friendlyAuthError(signInError.message));
          return;
        }
        navigate({ to: search.redirect || "/" });
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="brand" to="/" aria-label="VeriLex home">
          <span className="brand-mark">
            <Scale />
          </span>
          <span>
            VERI<span>LEX</span>
          </span>
        </Link>

        <h1>{mode === "signIn" ? "Sign in" : "Create an account"}</h1>
        <p className="auth-subtitle">
          {mode === "signIn"
            ? "Sign in to run analyses and see your history."
            : "Save every analysis you run to your own private history."}
        </p>

        {confirmNotice ? (
          <div className="auth-notice">
            <p>
              Check your inbox at <strong>{email}</strong> to confirm your account before signing
              in.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmNotice(false);
                setMode("signIn");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signUp" && (
              <div className="field-block">
                <label htmlFor="display-name">
                  <span>Display name</span>
                  <small>Optional</small>
                </label>
                <Input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="field-block">
              <label htmlFor="email">
                <span>Email</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="field-block">
              <label htmlFor="password">
                <span>Password</span>
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="error-message">
                <CircleAlert />
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="analyze-button auth-submit"
              disabled={submitting}
            >
              {submitting ? (
                "Please wait…"
              ) : mode === "signIn" ? (
                <>
                  Sign in <ArrowRight />
                </>
              ) : (
                <>
                  Create account <ArrowRight />
                </>
              )}
            </Button>
          </form>
        )}

        {!confirmNotice && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError("");
            }}
          >
            {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        )}
      </div>
    </main>
  );
}
