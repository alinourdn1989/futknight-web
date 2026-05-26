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
    if (error) { setError(error.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role === "admin") router.push("/admin/tournaments");
    else router.push("/player/tournaments");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Navbar */}
      <nav className="px-6 md:px-12 py-5 flex items-center border-b border-[#111]">
        <button onClick={() => router.push("/")} className="text-cyan-400 text-xl font-extrabold tracking-tight hover:text-cyan-300 transition">
          ⚔️ FutKnight
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 md:p-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-white text-2xl font-extrabold mb-1">Welcome back</h1>
              <p className="text-gray-500 text-sm">Sign in to your FutKnight account</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                {error}
              </div>
            )}

            {/* Fields */}
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Email</label>
                <input
                  className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400 transition"
                  placeholder="your@email.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Password</label>
                <input
                  className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400 transition"
                  placeholder="Your password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {/* Login button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-cyan-400 text-black font-extrabold py-3.5 rounded-xl hover:bg-cyan-300 disabled:opacity-50 transition text-sm">
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#1A1A1A]" />
              <span className="text-gray-700 text-xs">or</span>
              <div className="flex-1 h-px bg-[#1A1A1A]" />
            </div>

            {/* Register link */}
            <p className="text-center text-gray-500 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-orange-500 font-bold hover:text-orange-400 transition">
                Sign Up Free
              </Link>
            </p>
          </div>

          {/* Footer links */}
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={() => router.push("/privacy")} className="text-gray-700 text-xs hover:text-gray-500 transition">Privacy Policy</button>
            <span className="text-gray-800 text-xs">·</span>
            <button onClick={() => router.push("/support")} className="text-gray-700 text-xs hover:text-gray-500 transition">Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}