"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TournamentStat = {
  id: string;
  name: string;
  status: string;
  format: string;
  myGoals: number;
  myTeamName: string;
  won: boolean;
};

type TopScorer = {
  player_name: string;
  goals: number;
  isMe: boolean;
};

export default function PlayerStats() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [totalGoals, setTotalGoals] = useState(0);
  const [tournamentsPlayed, setTournamentsPlayed] = useState(0);
  const [wins, setWins] = useState(0);
  const [tournamentStats, setTournamentStats] = useState<TournamentStat[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: tp } = await supabase.from("tournament_players").select("player_name, tournament_id").eq("user_id", user.id);
    if (!tp || tp.length === 0) { setLoading(false); return; }

    const myName = tp[0].player_name;
    setPlayerName(myName);
    setTournamentsPlayed(tp.length);

    const tIds = tp.map(t => t.tournament_id);

    // My goals
    const { data: myGoalsData } = await supabase.from("match_goals").select("goals, tournament_id").eq("player_name", myName);
    const totalG = (myGoalsData || []).reduce((sum, g) => sum + (g.goals || 0), 0);
    setTotalGoals(totalG);

    // Tournaments with details
    const { data: tournaments } = await supabase.from("tournaments").select("*").in("id", tIds);

    const stats: TournamentStat[] = [];
    let winCount = 0;

    for (const t of (tournaments || [])) {
      // My goals in this tournament
      const myGoalsInT = (myGoalsData || []).filter(g => g.tournament_id === t.id).reduce((sum, g) => sum + (g.goals || 0), 0);

      // My team
      let myTeamName = "";
      const { data: teamMember } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
      if (teamMember) {
        const { data: team } = await supabase.from("teams").select("name").eq("id", teamMember.team_id).eq("tournament_id", t.id).single();
        if (team) myTeamName = team.name;
      }

      const won = t.status === "completed" && t.winner_team_name === myTeamName && !!myTeamName;
      if (won) winCount++;

      stats.push({ id: t.id, name: t.name, status: t.status, format: t.format, myGoals: myGoalsInT, myTeamName, won });
    }

    setWins(winCount);
    setTournamentStats(stats.sort((a, b) => {
      const order: Record<string, number> = { active: 0, upcoming: 1, completed: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    }));

    // Top scorers across all my tournaments
    const { data: allGoals } = await supabase.from("match_goals").select("player_name, goals").in("tournament_id", tIds);
    const scorerMap: { [name: string]: number } = {};
    (allGoals || []).forEach(g => { scorerMap[g.player_name] = (scorerMap[g.player_name] || 0) + g.goals; });
    const scorers = Object.entries(scorerMap)
      .map(([name, goals]) => ({ player_name: name, goals, isMe: name === myName }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);
    setTopScorers(scorers);

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxGoals = topScorers[0]?.goals || 1;
  const myRank = topScorers.findIndex(s => s.isMe) + 1;

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <p className="text-cyan-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top navbar */}
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/player/tournaments")} className="text-orange-500 text-sm">← My Tournaments</button>
        <span className="text-cyan-400 font-extrabold hidden md:block">⚔️ FutKnight</span>
        <button onClick={() => router.push("/player/profile")} className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-3 py-2 rounded-lg hover:border-cyan-400 text-sm transition">
          👤 Profile
        </button>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-extrabold">My Stats</h1>
          {playerName && <p className="text-gray-500 text-sm mt-0.5">Playing as <span className="text-white font-bold">{playerName}</span></p>}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-white text-3xl font-extrabold">{tournamentsPlayed}</p>
            <p className="text-gray-600 text-xs mt-1">Tournaments</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-orange-500 text-3xl font-extrabold">{totalGoals}</p>
            <p className="text-gray-600 text-xs mt-1">Total Goals ⚽</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-cyan-400 text-3xl font-extrabold">{wins}</p>
            <p className="text-gray-600 text-xs mt-1">Wins 🏆</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-cyan-400 text-3xl font-extrabold">{myRank > 0 ? `#${myRank}` : "—"}</p>
            <p className="text-gray-600 text-xs mt-1">Scorer Rank</p>
          </div>
        </div>

        {tournamentsPlayed === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-white font-bold text-lg">No stats yet</p>
            <p className="text-gray-600 mt-2">Join a tournament to start tracking your stats</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top scorers chart */}
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-5">⚽ Top Scorers (All Tournaments)</h2>
              {topScorers.length === 0 ? (
                <p className="text-gray-600 text-sm">No goals recorded yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topScorers.map((s, i) => (
                    <div key={s.player_name}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                          <span className={`text-sm font-bold ${s.isMe ? "text-cyan-400" : i === 0 ? "text-orange-500" : "text-white"}`}>
                            {s.player_name} {s.isMe ? "(You)" : ""}
                          </span>
                        </div>
                        <span className={`font-bold text-sm ${s.isMe ? "text-cyan-400" : "text-orange-500"}`}>{s.goals} ⚽</span>
                      </div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${s.isMe ? "bg-cyan-400" : "bg-orange-500"}`}
                          style={{ width: `${(s.goals / maxGoals) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tournament by tournament */}
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-5">📋 My Tournaments</h2>
              <div className="flex flex-col gap-3">
                {tournamentStats.map(t => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/player/tournaments/${t.id}`)}
                    className="text-left bg-[#0A0A0A] rounded-xl p-4 border border-[#1A1A1A] hover:border-cyan-400 transition"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white font-bold text-sm">{t.name}</span>
                      <span className={`text-xs font-bold ${
                        t.status === "active" ? "text-orange-500" :
                        t.status === "completed" ? "text-cyan-400" : "text-gray-500"
                      }`}>
                        {t.status === "active" ? "🔥 Active" : t.status === "completed" ? "✅ Done" : "⏳ Upcoming"}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {t.myTeamName && <span className="text-cyan-400 text-xs">⚡ {t.myTeamName}</span>}
                      {t.myGoals > 0 && <span className="text-orange-500 text-xs">⚽ {t.myGoals} goals</span>}
                      {t.won && <span className="text-yellow-500 text-xs">🏆 Winner</span>}
                      {t.status === "completed" && !t.won && <span className="text-gray-600 text-xs">Runner-up</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
