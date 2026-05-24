"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PlayerProfile() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [totalGoals, setTotalGoals] = useState(0);
  const [tournamentsPlayed, setTournamentsPlayed] = useState(0);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    setEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name) setFullName(profile.full_name);

    // Get player name from tournament_players
    const { data: tp } = await supabase.from("tournament_players").select("player_name, tournament_id").eq("user_id", user.id);
    if (tp && tp.length > 0) {
      setPlayerName(tp[0].player_name);
      setTournamentsPlayed(tp.length);

      // Get total goals
      const { data: goals } = await supabase.from("match_goals").select("goals").eq("player_name", tp[0].player_name);
      const total = (goals || []).reduce((sum, g) => sum + (g.goals || 0), 0);
      setTotalGoals(total);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({ id: user?.id, full_name: fullName.trim() });
    if (error) {
      setProfileMsg({ text: "Failed to save profile.", ok: false });
    } else {
      setProfileMsg({ text: "Profile updated!", ok: true });
    }
    setSavingProfile(false);
  }

  async function changePassword() {
    setPasswordMsg(null);
    if (!newPassword) { setPasswordMsg({ text: "Enter a new password.", ok: false }); return; }
    if (newPassword.length < 6) { setPasswordMsg({ text: "Password must be at least 6 characters.", ok: false }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ text: "Passwords don't match.", ok: false }); return; }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ text: error.message, ok: false });
    } else {
      setPasswordMsg({ text: "Password updated successfully!", ok: true });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  const initials = (playerName || fullName || email)
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <p className="text-cyan-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.push("/player/tournaments")} className="text-orange-500 text-sm">← Back</button>
        <h1 className="text-white text-xl font-extrabold">Profile</h1>
        <div className="w-16" />
      </div>

      {/* Avatar + stats */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-cyan-400 flex items-center justify-center text-black text-4xl font-extrabold mb-4">
          {initials}
        </div>
        <p className="text-white text-xl font-bold">{playerName || fullName || email}</p>
        {playerName && <p className="text-gray-500 text-sm mt-0.5">{email}</p>}

        {/* Stats */}
        <div className="flex gap-8 mt-5">
          <div className="text-center">
            <p className="text-orange-500 text-2xl font-extrabold">{tournamentsPlayed}</p>
            <p className="text-gray-600 text-xs mt-0.5">Tournaments</p>
          </div>
          <div className="text-center">
            <p className="text-cyan-400 text-2xl font-extrabold">{totalGoals}</p>
            <p className="text-gray-600 text-xs mt-0.5">Total Goals ⚽</p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 mb-4">
        <h2 className="text-white font-bold text-base mb-4">Personal Info</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Full Name</label>
            <input
              className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
              placeholder="Your name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Email</label>
            <input
              className="w-full bg-[#0A0A0A] text-gray-500 border border-[#222] rounded-lg px-4 py-3 cursor-not-allowed"
              value={email}
              disabled
            />
          </div>
          {playerName && (
            <div>
              <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Player Name</label>
              <input
                className="w-full bg-[#0A0A0A] text-gray-500 border border-[#222] rounded-lg px-4 py-3 cursor-not-allowed"
                value={playerName}
                disabled
              />
              <p className="text-gray-600 text-xs mt-1">Player name is set by your admin</p>
            </div>
          )}
        </div>
        {profileMsg && (
          <p className={`text-sm mt-3 ${profileMsg.ok ? "text-cyan-400" : "text-red-400"}`}>{profileMsg.text}</p>
        )}
        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="mt-4 bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition text-sm"
        >
          {savingProfile ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Password form */}
      <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
        <h2 className="text-white font-bold text-base mb-4">Change Password</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">New Password</label>
            <input
              type="password"
              className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        {passwordMsg && (
          <p className={`text-sm mt-3 ${passwordMsg.ok ? "text-cyan-400" : "text-red-400"}`}>{passwordMsg.text}</p>
        )}
        <button
          onClick={changePassword}
          disabled={savingPassword}
          className="mt-4 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-orange-400 disabled:opacity-50 transition text-sm"
        >
          {savingPassword ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}
