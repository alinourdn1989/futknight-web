"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
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
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user?.id,
      username,
      phone: phone.trim() || null,
      role,
      email: cleanEmail,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Auto-link player to admin roster by email
    if (role === "player") {
      const { data: adminPlayers } = await supabase
        .from("admin_players")
        .select("*")
        .eq("player_email", cleanEmail);

      if (adminPlayers && adminPlayers.length > 0) {
        for (const adminPlayer of adminPlayers) {
          await supabase
            .from("admin_players")
            .update({ user_id: data.user?.id })
            .eq("id", adminPlayer.id);
        }
      }

      // Auto-link by phone
      if (phone) {
        const { data: byPhone } = await supabase
          .from("admin_players")
          .select("*")
          .eq("player_phone", phone.trim());

        if (byPhone && byPhone.length > 0) {
          for (const adminPlayer of byPhone) {
            await supabase
              .from("admin_players")
              .update({ user_id: data.user?.id })
              .eq("id", adminPlayer.id);
          }
        }
      }
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h1 className="text-cyan-400 text-5xl font-bold">⚔️ FutKnight</h1>
        <p className="text-gray-500 text-base mb-8 mt-1">Create Account</p>

        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        {success && (
          <div className="bg-[#003322] rounded-lg p-3 mb-3 w-full">
            <p className="text-cyan-400 text-sm text-center">
              ✅ Account created! Please check your email to confirm, then login.
            </p>
          </div>
        )}

        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="w-full bg-[#111] text-white border border-[#222] rounded-lg p-3.5 mb-3 text-base outline-none focus:border-cyan-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <p className="text-gray-500 text-xs mb-2.5 self-start">I am a...</p>
        <div className="flex gap-3 mb-6 w-full">
          <button
            onClick={() => setRole("player")}
            className={`flex-1 p-3.5 rounded-lg border font-bold ${
              role === "player"
                ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A]"
                : "border-[#333] text-gray-500"
            }`}
          >
            🎮 Player
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`flex-1 p-3.5 rounded-lg border font-bold ${
              role === "admin"
                ? "bg-orange-500 border-orange-500 text-[#0A0A0A]"
                : "border-[#333] text-gray-500"
            }`}
          >
            👑 Admin
          </button>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-cyan-400 text-[#0A0A0A] p-4 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "REGISTER"}
        </button>

        <Link href="/login" className="text-gray-500 mt-6 text-sm">
          Already have an account? <span className="text-orange-500">Login</span>
        </Link>
      </div>
    </div>
  );
}