"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string; name: string; game: string; format: string;
  team_size: string; status: string; date: string;
};

type PlayerStats = {
  totalGoals: number; tournamentsPlayed: number; wins: number;
};

export default function PlayerTournaments() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [stats, setStats] = useState<PlayerStats>({ totalGoals: 0, tournamentsPlayed: 0, wins: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: tp } = await supabase.from("tournament_players").select("tournament_id, player_name").eq("user_id", user.id);
    const ids = (tp || []).map(t => t.tournament_id);
    if (tp && tp.length > 0) setPlayerName(tp[0].player_name);
    if (ids.length === 0) { setTournaments([]); setLoading(false); return; }

    const { data } = await supabase.from("tournaments").select("*").in("id", ids).order("date", { ascending: false });
    if (data) setTournaments(data);

    const { data: goals } = await supabase.from("match_goals").select("goals").in("tournament_id", ids).eq("player_name", tp?.[0]?.player_name || "");
    const totalGoals = (goals || []).reduce((sum, g) => sum + (g.goals || 0), 0);

    const completedTournaments = (data || []).filter(t => t.status === "completed");
    let wins = 0;
    for (const t of completedTournaments) {
      const { data: teamMember } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
      if (teamMember) {
        const { data: team } = await supabase.from("teams").select("name").eq("id", teamMember.team_id).single();
        if (team && t.winner_team_name === team.name) wins++;
      }
    }

    setStats({ totalGoals, tournamentsPlayed: ids.length, wins });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function statusColor(status: string) {
    if (status === "active") return "text-cyan-400";
    if (status === "completed") return "text-orange-500";
    return "text-gray-500";
  }

  function statusLabel(status: string) {
    if (status === "upcoming") return "Upcoming";
    if (status === "active") return "Active";
    if (status === "completed") return "Completed";
    return status;
  }

  const active = tournaments.filter(t => t.status === "active");
  const upcoming = tournaments.filter(t => t.status === "upcoming");
  const completed = tournaments.filter(t => t.status === "completed");

  const navLinks = [
    { label: "Football", icon: "⚽", path: "/football" },
    { label: "H2H", icon: "⚔️", path: "/player/h2h" },
    { label: "Stats", icon: "📊", path: "/player/stats" },
    { label: "Profile", icon: "👤", path: "/player/profile" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20 md:pb-0">
      {/* Top navbar */}
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <div>
          <span className="text-cyan-400 text-lg font-extrabold">FutKnight</span>
          {playerName && <span className="text-gray-500 text-sm ml-3 hidden md:inline">Welcome, <span className="text-white font-bold">{playerName}</span></span>}
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-2 items-center">
          {navLinks.map(link => (
            <button key={link.path} onClick={() => router.push(link.path)}
              className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-3 py-2 rounded-lg hover:border-cyan-400 text-sm font-medium transition">
              {link.icon} {link.label}
            </button>
          ))}
          <button onClick={handleLogout}
            className="bg-[#1A1A1A] border border-[#333] text-gray-400 px-3 py-2 rounded-lg hover:border-gray-500 text-sm transition ml-1">
            Logout
          </button>
        </div>

        {/* Mobile — logout only in top right */}
        <button onClick={handleLogout} className="md:hidden text-gray-500 text-sm border border-[#333] px-3 py-1.5 rounded-lg">
          Logout
        </button>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-6xl mx-auto">
        {/* Stats bar */}
        {!loading && stats.tournamentsPlayed > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
              <p className="text-cyan-400 text-3xl font-extrabold">{stats.tournamentsPlayed}</p>
              <p className="text-gray-500 text-sm mt-1">Tournaments</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
              <p className="text-orange-500 text-3xl font-extrabold">{stats.totalGoals}</p>
              <p className="text-gray-500 text-sm mt-1">Total Goals</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
              <p className="text-cyan-400 text-3xl font-extrabold">{stats.wins}</p>
              <p className="text-gray-500 text-sm mt-1">Wins</p>
            </div>
          </div>
        )}

        <h2 className="text-white font-extrabold text-xl mb-4">My Tournaments</h2>

        {loading ? (
          <p className="text-cyan-400 text-center mt-10">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center mt-32">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-white text-lg font-bold">No tournaments yet</p>
            <p className="text-gray-600 mt-2">You will appear here once an admin adds you to a tournament</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {active.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Active</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {active.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} statusColor={statusColor} statusLabel={statusLabel} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Upcoming</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {upcoming.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} statusColor={statusColor} statusLabel={statusLabel} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Completed</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {completed.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} statusColor={statusColor} statusLabel={statusLabel} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-[#1A1A1A] flex z-50">
        {navLinks.map(link => (
          <button key={link.path} onClick={() => router.push(link.path)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-gray-500 hover:text-cyan-400 transition">
            <span className="text-xl">{link.icon}</span>
            <span className="text-[10px] font-bold">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TournamentCard({ t, onClick, statusColor, statusLabel }: {
  t: any; onClick: () => void;
  statusColor: (s: string) => string;
  statusLabel: (s: string) => string;
}) {
  return (
    <button onClick={onClick}
      className={"text-left bg-[#111] rounded-xl p-4 border " + (t.status === "active" ? "border-orange-500" : "border-[#1A1A1A]") + " hover:border-cyan-400 transition w-full"}>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-white font-bold">{t.name}</span>
        <span className={"text-xs font-bold " + statusColor(t.status)}>{statusLabel(t.status)}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.game}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.team_size}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
        {t.date && <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.date}</span>}
      </div>
    </button>
  );
}