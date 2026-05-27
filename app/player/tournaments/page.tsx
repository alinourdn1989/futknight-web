"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string; name: string; game: string; format: string;
  team_size: string; status: string; date: string; winner_team_name?: string;
};

type PlayerStats = {
  totalGoals: number; tournamentsPlayed: number; wins: number; badges: number;
};

export default function PlayerTournaments() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [stats, setStats] = useState<PlayerStats>({ totalGoals: 0, tournamentsPlayed: 0, wins: 0, badges: 0 });
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("tournaments");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "upcoming" | "completed">("all");

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: tp } = await supabase.from("tournament_players").select("tournament_id, player_name").eq("user_id", user.id);
    const ids = (tp || []).map(t => t.tournament_id);
    const name = tp?.[0]?.player_name || "";
    if (name) setPlayerName(name);
    if (ids.length === 0) { setTournaments([]); setLoading(false); return; }

    const { data } = await supabase.from("tournaments").select("*").in("id", ids).order("date", { ascending: false });
    if (data) setTournaments(data);

    const [goalsRes, badgesRes] = await Promise.all([
      supabase.from("match_goals").select("goals").in("tournament_id", ids).eq("player_name", name),
      supabase.from("player_badges").select("id").eq("player_name", name),
    ]);

    const totalGoals = (goalsRes.data || []).reduce((sum, g) => sum + (g.goals || 0), 0);
    const badges = (badgesRes.data || []).length;

    const completedTournaments = (data || []).filter(t => t.status === "completed");
    let wins = 0;
    for (const t of completedTournaments) {
      const { data: teamMember } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
      if (teamMember) {
        const { data: team } = await supabase.from("teams").select("name").eq("id", teamMember.team_id).single();
        if (team && t.winner_team_name === team.name) wins++;
      }
    }

    setStats({ totalGoals, tournamentsPlayed: ids.length, wins, badges });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Filter logic
  const filtered = tournaments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterTab === "all" || t.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const active = filtered.filter(t => t.status === "active");
  const upcoming = filtered.filter(t => t.status === "upcoming");
  const completed = filtered.filter(t => t.status === "completed");

  const navLinks = [
    { key: "tournaments", label: "Home", icon: "🎮", path: "/player/tournaments" },
    { key: "football", label: "Football", icon: "⚽", path: "/football" },
    { key: "h2h", label: "H2H", icon: "⚔️", path: "/player/h2h" },
    { key: "stats", label: "Stats", icon: "📊", path: "/player/stats" },
    { key: "profile", label: "Profile", icon: "👤", path: "/player/profile" },
  ];

  const initials = playerName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "P";

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20 md:pb-0">
      {/* Top navbar */}
      <nav className="border-b border-[#111] px-4 md:px-8 py-3 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-base font-extrabold">⚔️ FutKnight</span>
          {playerName && (
            <div className="hidden md:flex items-center gap-2 bg-[#111] border border-[#1A1A1A] rounded-lg px-2.5 py-1.5">
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold">{initials}</div>
              <span className="text-gray-400 text-xs">{playerName}</span>
              <span className="text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded font-bold">Player</span>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <button key={link.path} onClick={() => { router.push(link.path); setActiveNav(link.key); }}
              className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition " + (
                activeNav === link.key
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
              )}>
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </button>
          ))}
          <div className="w-px h-5 bg-[#222] mx-1" />
          <button onClick={handleLogout} className="text-gray-600 text-xs px-3 py-2 rounded-lg hover:text-gray-400 hover:bg-[#111] transition">Logout</button>
        </div>

        <button onClick={handleLogout} className="md:hidden text-gray-600 text-xs border border-[#333] px-2.5 py-1.5 rounded-lg">Logout</button>
      </nav>

      <main className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

        {/* Player header mobile */}
        {playerName && (
          <div className="md:hidden flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">{initials}</div>
            <div>
              <p className="text-white font-bold">{playerName}</p>
              <p className="text-gray-600 text-xs">Player Dashboard</p>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!loading && stats.tournamentsPlayed > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-cyan-400 text-2xl font-extrabold">{stats.tournamentsPlayed}</p>
              <p className="text-gray-600 text-xs mt-1">Tournaments</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-orange-500 text-2xl font-extrabold">{stats.totalGoals}</p>
              <p className="text-gray-600 text-xs mt-1">Goals</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-cyan-400 text-2xl font-extrabold">{stats.wins}</p>
              <p className="text-gray-600 text-xs mt-1">Wins</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-orange-500 text-2xl font-extrabold">{stats.badges}</p>
              <p className="text-gray-600 text-xs mt-1">Badges</p>
            </div>
          </div>
        )}

        {/* Title + search + filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-extrabold text-lg">My Tournaments</h2>
            <span className="text-gray-600 text-xs">{tournaments.length} total</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 bg-[#111] text-white border border-[#1A1A1A] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400 transition"
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {(["all", "active", "upcoming", "completed"] as const).map(tab => (
                <button key={tab} onClick={() => setFilterTab(tab)}
                  className={"px-3 py-2 rounded-xl text-xs font-bold capitalize transition border " + (
                    filterTab === tab
                      ? "bg-cyan-400 text-black border-cyan-400"
                      : "bg-[#111] text-gray-500 border-[#1A1A1A] hover:border-cyan-400/50"
                  )}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-cyan-400 text-center mt-10">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center mt-32">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-white text-lg font-bold">No tournaments yet</p>
            <p className="text-gray-600 mt-2">You will appear here once an admin adds you</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-white font-bold">No tournaments match your search</p>
            <button onClick={() => { setSearch(""); setFilterTab("all"); }} className="mt-3 text-cyan-400 text-sm underline">Clear filters</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {active.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Active</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {active.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Upcoming</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {upcoming.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Completed</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {completed.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/player/tournaments/${t.id}`)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-[#1A1A1A] flex z-50">
        {navLinks.map(link => (
          <button key={link.path} onClick={() => { router.push(link.path); setActiveNav(link.key); }}
            className={"flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition " + (
              activeNav === link.key ? "text-cyan-400" : "text-gray-600 hover:text-gray-400"
            )}>
            <span className="text-lg">{link.icon}</span>
            <span className="text-[9px] font-bold">{link.label}</span>
            {activeNav === link.key && <span className="w-1 h-1 bg-cyan-400 rounded-full mt-0.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TournamentCard({ t, onClick }: { t: any; onClick: () => void }) {
  const isActive = t.status === "active";
  const isCompleted = t.status === "completed";

  return (
    <button onClick={onClick}
      className={"relative text-left bg-[#111] rounded-2xl p-4 border transition w-full overflow-hidden hover:border-cyan-400/50 " + (isActive ? "border-orange-500/40" : "border-[#1A1A1A]")}>
      {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />}

      <div className="flex justify-between items-start mb-2.5">
        <p className="text-white font-bold text-sm pr-2 leading-tight">{t.name}</p>
        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 " + (
          isActive ? "text-orange-500 bg-orange-500/10 border-orange-500/25" :
          isCompleted ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/25" :
          "text-gray-500 bg-[#1A1A1A] border-[#333]"
        )}>
          {isActive ? "Active" : isCompleted ? "Completed" : "Upcoming"}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.game}</span>
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.team_size}</span>
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
      </div>

      {isCompleted && t.winner_team_name && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">🏆</span>
          <span className="text-orange-500 font-bold text-xs">{t.winner_team_name}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-[#1A1A1A]">
        <span className="text-gray-700 text-[10px]">{t.date}</span>
        <span className="text-cyan-400 text-[10px] font-bold">View →</span>
      </div>
    </button>
  );
}