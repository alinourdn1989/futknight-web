"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

export default function AdminProfile() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    setEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name) setFullName(profile.full_name);

    const { count: tCount } = await supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("created_by", user.id);
    setTournamentCount(tCount || 0);

    const { count: pCount } = await supabase.from("admin_players").select("*", { count: "exact", head: true }).eq("admin_id", user.id);
    setPlayerCount(pCount || 0);

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

  const initials = fullName
    ? fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || "?";

  if (loading) return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 md:ml-56 flex items-center justify-center"><p className="text-cyan-400">Loading...</p></main>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />

      <main className="flex-1 md:ml-56 px-4 md:px-10 py-8 max-w-2xl">
        <h1 className="text-white text-2xl font-extrabold mb-8">Profile</h1>

        {/* Avatar + stats */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-cyan-400 flex items-center justify-center text-black text-3xl font-extrabold shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-white text-xl font-bold">{fullName || email}</p>
            <p className="text-gray-500 text-sm mt-0.5">{email}</p>
            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <p className="text-orange-500 text-lg font-extrabold">{tournamentCount}</p>
                <p className="text-gray-600 text-xs">Tournaments</p>
              </div>
              <div className="text-center">
                <p className="text-cyan-400 text-lg font-extrabold">{playerCount}</p>
                <p className="text-gray-600 text-xs">Players</p>
              </div>
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
      </main>
    </div>
  );
}
