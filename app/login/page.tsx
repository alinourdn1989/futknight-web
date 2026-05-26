"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") {
      router.push("/admin/tournaments");
    } else {
      router.push("/player/tournaments");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h1 className="text-cyan-400 text-5xl font-bold">⚔️ FutKnight</h1>
        <p className="text-gray-500 text-base mb-8 mt-1">Welcome Back</p>

        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
        />
        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-cyan-400 text-[#0A0A0A] p-4 rounded-lg font-bold text-base mt-2 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "LOGIN"}
        </button>

        <Link href="/register" className="text-gray-500 mt-6 text-sm">
          Don&apos;t have an account? <span className="text-orange-500">Register</span>
        </Link>
      </div>
    </div>
  );
}