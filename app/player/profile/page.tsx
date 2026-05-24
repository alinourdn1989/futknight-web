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
  const [wins, setWins] = useState(0);

  // Real player data from admin_players
  const [realPlayerPhoto, setRealPlayerPhoto] = useState<string | null>(null);
  const [realPlayerClub, setRealPlayerClub] = useState<string | null>(null);
  const [realPlayerNationality, setRealPlayerNationality] = useState<string | null>(null);
  const [realPlayerPosition, setRealPlayerPosition] = useState<string | null>(null);
  const [realPlayerRating, setRealPlayerRating] = useState<number | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const userEmail = user.email || "";
    setEmail(userEmail);

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name) setFullName(profile.full_name);

    // Fetch real player data linked by email
    const { data: adminPlayer } = await supabase
      .from("admin_players")
      .select("photo_url, club, nationality, position, rating, player_name")
      .eq("player_email", userEmail.toLowerCase())
      .maybeSingle();

    if (adminPlayer) {
      setRealPlayerPhoto(adminPlayer.photo_url);
      setRealPlayerClub(adminPlayer.club);
      setRealPlayerNationality(adminPlayer.nationality);
      setRealPlayerPosition(adminPlayer.position);
      setRealPlayerRating(adminPlayer.rating);
    }

    const { data: tp } = await supabase.from("tournament_players").select("player_name, tournament_id").eq("user_id", user.id);
    if (tp && tp.length > 0) {
      setPlayerName(tp[0].player_name);
      setTournamentsPlayed(tp.length);

      const { data: goals } = await supabase.from("match_goals").select("goals").eq("player_name", tp[0].player_name);
      setTotalGoals((goals || []).reduce((sum, g) => sum + (g.goals || 0), 0));

      const tIds = tp.map(t => t.tournament_id);
      const { data: tournaments } = await supabase.from("tournaments").select("winner_team_name, id").in("id", tIds).eq("status", "completed");
      let winCount = 0;
      for (const t of (tournaments || [])) {
        if (!t.winner_team_name) continue;
        const { data: teamMember } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
        if (teamMember) {
          const { data: team } = await supabase.from("teams").select("name").eq("id", teamMember.team_id).single();
          if (team?.name === t.winner_team_name) winCount++;
        }
      }
      setWins(winCount);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({ id: user?.id, full_name: fullName.trim() });
    setProfileMsg(error ? { text: "Failed to save profile.", ok: false } : { text: "Profile updated!", ok: true });
    setSavingProfile(false);
  }

  async function changePassword() {
    setPasswordMsg(null);
    if (!newPassword) { setPasswordMsg({ text: "Enter a new password.", ok: false }); return; }
    if (newPassword.length < 6) { setPasswordMsg({ text: "Password must be at least 6 characters.", ok: false }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ text: "Passwords do not match.", ok: false }); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ text: error.message, ok: false });
    } else {
      setPasswordMsg({ text: "Password updated successfully!", ok: true });
      setNewPassword(""); setConfirmPassword("");
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
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/player/tournaments")} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold hidden md:block">FutKnight</span>
        <button onClick={() => router.push("/player/stats")}
          className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-3 py-2 rounded-lg hover:border-cyan-400 text-sm transition">
          Stats
        </button>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto">
        <h1 className="text-white text-2xl font-extrabold mb-8">Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left card */}
          <div className="md:col-span-1">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 text-center sticky top-24">
              {/* Avatar — real photo or initials */}
              {realPlayerPhoto ? (
                <img src={realPlayerPhoto} alt={playerName}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-cyan-400" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-cyan-400 flex items-center justify-center text-black text-4xl font-extrabold mx-auto mb-4">
                  {initials}
                </div>
              )}

              <p className="text-white text-lg font-extrabold">{playerName || fullName || email}</p>
              {playerName && <p className="text-gray-500 text-sm mt-0.5">{email}</p>}

              {/* Real player info */}
              {realPlayerClub && (
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-gray-400 text-xs">{realPlayerClub}</span>
                  {realPlayerNationality && <span className="text-gray-500 text-xs">{realPlayerNationality} · {realPlayerPosition}</span>}
                </div>
              )}

              {/* OVR rating badge */}
              {realPlayerRating && (
                <div className="inline-flex items-center gap-2 mt-3 bg-[#001A1A] border border-cyan-400 rounded-xl px-4 py-2">
                  <span className="text-cyan-400 text-2xl font-extrabold">{realPlayerRating}</span>
                  <span className="text-gray-500 text-xs">OVR</span>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-[#0A0A0A] rounded-xl p-3">
                  <p className="text-orange-500 text-xl font-extrabold">{tournamentsPlayed}</p>
                  <p className="text-gray-600 text-xs mt-0.5">Played</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl p-3">
                  <p className="text-cyan-400 text-xl font-extrabold">{totalGoals}</p>
                  <p className="text-gray-600 text-xs mt-0.5">Goals</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl p-3">
                  <p className="text-cyan-400 text-xl font-extrabold">{wins}</p>
                  <p className="text-gray-600 text-xs mt-0.5">Wins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right forms */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-4">Personal Info</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Full Name</label>
                  <input className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Email</label>
                  <input className="w-full bg-[#0A0A0A] text-gray-500 border border-[#222] rounded-lg px-4 py-3 cursor-not-allowed"
                    value={email} disabled />
                </div>
                {playerName && (
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Player Name</label>
                    <input className="w-full bg-[#0A0A0A] text-gray-500 border border-[#222] rounded-lg px-4 py-3 cursor-not-allowed"
                      value={playerName} disabled />
                    <p className="text-gray-600 text-xs mt-1">Player name is set by your admin</p>
                  </div>
                )}
              </div>
              {profileMsg && <p className={"text-sm mt-3 " + (profileMsg.ok ? "text-cyan-400" : "text-red-400")}>{profileMsg.text}</p>}
              <button onClick={saveProfile} disabled={savingProfile}
                className="mt-4 bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition text-sm">
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-4">Change Password</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">New Password</label>
                  <input type="password"
                    className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Confirm Password</label>
                  <input type="password"
                    className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              {passwordMsg && <p className={"text-sm mt-3 " + (passwordMsg.ok ? "text-cyan-400" : "text-red-400")}>{passwordMsg.text}</p>}
              <button onClick={changePassword} disabled={savingPassword}
                className="mt-4 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-orange-400 disabled:opacity-50 transition text-sm">
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}