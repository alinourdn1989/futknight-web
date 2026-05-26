"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "player">("player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!email || !password || !username) {
      setError("Email, password and username are required");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    const cleanEmail = email.trim().toLowerCase();
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user?.id, username, phone: phone.trim() || null, role, email: cleanEmail,
    });
    if (profileError) { setError(profileError.message); setLoading(false); return; }

    if (role === "player") {
      const { data: adminPlayers } = await supabase.from("admin_players").select("*").eq("player_email", cleanEmail);
      if (adminPlayers && adminPlayers.length > 0) {
        for (const ap of adminPlayers) {
          await supabase.from("admin_players").update({ user_id: data.user?.id }).eq("id", ap.id);
        }
      }
      if (phone) {
        const { data: byPhone } = await supabase.from("admin_players").select("*").eq("player_phone", phone.trim());
        if (byPhone && byPhone.length > 0) {
          for (const ap of byPhone) {
            await supabase.from("admin_players").update({ user_id: data.user?.id }).eq("id", ap.id);
          }
        }
      }
    }

    setSuccess(true);
    setLoading(false);
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
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {success ? (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-white text-xl font-extrabold mb-2">Account Created!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Please check your email to confirm your account, then log in to start playing.
              </p>
              <button onClick={() => router.push("/login")}
                className="w-full bg-cyan-400 text-black font-extrabold py-3.5 rounded-xl hover:bg-cyan-300 transition text-sm">
                Go to Login
              </button>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 md:p-10">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-white text-2xl font-extrabold mb-1">Create your account</h1>
                <p className="text-gray-500 text-sm">Join FutKnight and start your first tournament</p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
                  {error}
                </div>
              )}

              {/* Role selector */}
              <div className="mb-6">
                <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">I am a...</label>
                <div className="flex gap-3">
                  <button onClick={() => setRole("player")}
                    className={"flex-1 py-3 rounded-xl border font-bold text-sm transition " + (
                      role === "player"
                        ? "bg-cyan-400 border-cyan-400 text-black"
                        : "border-[#222] text-gray-500 bg-[#0A0A0A] hover:border-cyan-400/50"
                    )}>
                    🎮 Player
                  </button>
                  <button onClick={() => setRole("admin")}
                    className={"flex-1 py-3 rounded-xl border font-bold text-sm transition " + (
                      role === "admin"
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "border-[#222] text-gray-500 bg-[#0A0A0A] hover:border-orange-500/50"
                    )}>
                    👑 Admin
                  </button>
                </div>
                <p className="text-gray-700 text-xs mt-2">
                  {role === "player"
                    ? "Players join tournaments created by admins"
                    : "Admins create and manage tournaments"}
                </p>
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Username</label>
                  <input
                    className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400 transition"
                    placeholder="Your display name"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
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
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">
                    Phone <span className="text-gray-700 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400 transition"
                    placeholder="+961 xx xxx xxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Password</label>
                  <input
                    className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400 transition"
                    placeholder="Min 6 characters"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()}
                  />
                </div>
              </div>

              {/* Register button */}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-cyan-400 text-black font-extrabold py-3.5 rounded-xl hover:bg-cyan-300 disabled:opacity-50 transition text-sm">
                {loading ? "Creating account..." : "Create Account"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[#1A1A1A]" />
                <span className="text-gray-700 text-xs">or</span>
                <div className="flex-1 h-px bg-[#1A1A1A]" />
              </div>

              {/* Login link */}
              <p className="text-center text-gray-500 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-orange-500 font-bold hover:text-orange-400 transition">
                  Sign In
                </Link>
              </p>
            </div>
          )}

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