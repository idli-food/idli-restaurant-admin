"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, setRefreshToken, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ tokens: { access: string; refresh: string } }>("/hotel/admin/login", {
        method: "POST",
        body: { username, password },
      });
      setToken(data.tokens.access);
      setRefreshToken(data.tokens.refresh);
      router.replace("/");
    } catch (err) {
      setToken(null);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the backend. Is it running on port 8000?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={signIn} className="w-full max-w-sm rounded-2xl border border-line bg-plate p-8">
        <h1 className="signboard text-[56px] text-leaf">Idli admin</h1>
        <p className="mt-3 text-muted">
          Sign in with your Django admin account. Create one with <code className="text-ink">manage.py createsuperuser</code>.
        </p>

        <label className="mt-8 block text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="field mt-1"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="field mt-1"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="mt-4 text-sm text-chilli">
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="btn btn-primary mt-6 w-full py-2.5 text-[15px]"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
