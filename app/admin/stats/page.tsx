"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type TopScorer = { player_name: string; goals: number; tournaments: number; };
type PlayerWinRate = { player_name: string; played: number; wins: number; rate: number; };
type TournamentStat = { id: string; name: string; status: string; format: string; matchCount: number; goalCount: number; };

export default function AdminStats() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const [completedTournaments, setCompletedTournaments] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [playerWinRates, setPlayerWinRates] = useState<PlayerWinRate[]>([]);
  const [tournamentStats, setTournamentStats] = useState<TournamentStat[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Tournaments
    const { data: tournaments } = await supabase.from("tournaments").select("*").eq("created_by", user.id);
    const t = tournaments || [];
    setTotalTournaments(t.length);
    setActiveTournaments(t.filter(x => x.status === "active").length);
    setCompletedTournaments(t.filter(x => x.status === "completed").length);

    if (t.length === 0) { setLoading(false); return; }
    const tIds = t.map(x => x.id);

    // Matches
    const { data: matches } = await supabase.from("matches").select("*").in("tournament_id", tIds);
    const m = matches || [];
    setTotalMatches(m.length);

    // Goals
    const { data: goals } = await supabase.from("match_goals").select("*").in("tournament_id", tIds);
    const g = goals || [];
    setTotalGoals(g.reduce((sum, x) => sum + (x.goals || 0), 0));

    // Top scorers
    const scorerMap: { [name: string]: { goals: number; tournaments: Set<string> } } = {};
    g.forEach(goal => {
      if (!scorerMap[goal.player_name]) scorerMap[goal.player_name] = { goals: 0, tournaments: new Set() };
      scorerMap[goal.player_name].goals += goal.goals;
      scorerMap[goal.player_name].tournaments.add(goal.tournament_id);
    });
    const scorers = Object.entries(scorerMap)
      .map(([name, data]) => ({ player_name: name, goals: data.goals, tournaments: data.tournaments.size }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);
    setTopScorers(scorers);

    // Player win rates
    const { data: tPlayers } = await supabase.from("tournament_players").select("player_name, tournament_id, user_id").in("tournament_id", tIds);
    const completedT = t.filter(x => x.status === "completed" && x.winner_team_name);

    const winRateMap: { [name: string]: { played: number; wins: number } } = {};
    (tPlayers || []).forEach(tp => {
      if (!winRateMap[tp.player_name]) winRateMap[tp.player_name] = { played: 0, wins: 0 };
      winRateMap[tp.player_name].played++;
    });

    // For wins — check if player's team won
    for (const ct of completedT) {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("user_id, team_id")
        .eq("team_id", ct.winner_team_id || "");

      if (!teamMembers) continue;
      for (const member of teamMembers) {
        const tp = (tPlayers || []).find(p => p.user_id === member.user_id && p.tournament_id === ct.id);
        if (tp && winRateMap[tp.player_name]) {
          winRateMap[tp.player_name].wins++;
        }
      }
    }

    const winRates = Object.entries(winRateMap)
      .filter(([, d]) => d.played > 0)
      .map(([name, d]) => ({ player_name: name, played: d.played, wins: d.wins, rate: Math.round((d.wins / d.played) * 100) }))
      .sort((a, b) => b.rate - a.rate || b.wins - a.wins)
      .slice(0, 10);
    setPlayerWinRates(winRates);

    // Per-tournament stats
    const tStats: TournamentStat[] = t.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      format: tournament.format,
      matchCount: m.filter(x => x.tournament_id === tournament.id).length,
      goalCount: g.filter(x => x.tournament_id === tournament.id).reduce((sum, x) => sum + (x.goals || 0), 0),
    }));
    setTournamentStats(tStats);

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxGoals = topScorers[0]?.goals || 1;
  const maxRate = 100;

  if (loading) return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 md:ml-56 flex items-center justify-center"><p className="text-cyan-400">Loading...</p></main>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />

    <main className="flex-1 px-4 md:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-extrabold">Stats Dashboard</h1>
          <p className="text-gray-600 text-sm mt-0.5">Overview of all your tournaments</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { label: "Tournaments", value: totalTournaments, color: "text-white" },
            { label: "Active", value: activeTournaments, color: "text-orange-500" },
            { label: "Completed", value: completedTournaments, color: "text-cyan-400" },
            { label: "Matches", value: totalMatches, color: "text-white" },
            { label: "Goals", value: totalGoals, color: "text-orange-500" },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-600 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {totalTournaments === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-white font-bold text-lg">No data yet</p>
            <p className="text-gray-600 mt-2">Create and run tournaments to see stats here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Scorers Chart */}
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-5">⚽ Top Scorers</h2>
              {topScorers.length === 0 ? (
                <p className="text-gray-600 text-sm">No goals recorded yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topScorers.map((s, i) => (
                    <div key={s.player_name}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                          <span className={`text-sm font-bold ${i === 0 ? "text-orange-500" : "text-white"}`}>{s.player_name}</span>
                          <span className="text-gray-600 text-xs">{s.tournaments} tournament{s.tournaments !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="text-orange-500 font-bold text-sm">{s.goals} ⚽</span>
                      </div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${(s.goals / maxGoals) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Win Rate Chart */}
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <h2 className="text-white font-bold text-base mb-5">🏆 Player Win Rates</h2>
              {playerWinRates.length === 0 ? (
                <p className="text-gray-600 text-sm">No completed tournaments yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {playerWinRates.map((p, i) => (
                    <div key={p.player_name}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                          <span className={`text-sm font-bold ${i === 0 ? "text-cyan-400" : "text-white"}`}>{p.player_name}</span>
                          <span className="text-gray-600 text-xs">{p.wins}W / {p.played}P</span>
                        </div>
                        <span className="text-cyan-400 font-bold text-sm">{p.rate}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all"
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tournament breakdown */}
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-white font-bold text-base mb-5">📋 Tournament Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1A1A1A]">
                      <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Tournament</th>
                      <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Format</th>
                      <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Status</th>
                      <th className="text-center text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Matches</th>
                      <th className="text-center text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Goals</th>
                      <th className="text-center text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Avg Goals</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentStats.map(t => (
                      <tr key={t.id} className="border-b border-[#0D0D0D] hover:bg-[#0D0D0D] transition group">
                        <td className="py-3.5">
                          <span className="text-white font-bold text-sm">{t.name}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="text-gray-500 text-xs">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
                        </td>
                        <td className="py-3.5">
                          <span className={`text-xs font-bold ${t.status === "active" ? "text-orange-500" : t.status === "completed" ? "text-cyan-400" : "text-gray-500"}`}>
                            {t.status === "active" ? "🔥 Active" : t.status === "completed" ? "✅ Done" : "⏳ Upcoming"}
                          </span>
                        </td>
                        <td className="py-3.5 text-center text-gray-400 text-sm">{t.matchCount}</td>
                        <td className="py-3.5 text-center text-orange-500 font-bold text-sm">{t.goalCount}</td>
                        <td className="py-3.5 text-center text-gray-400 text-sm">
                          {t.matchCount > 0 ? (t.goalCount / t.matchCount).toFixed(1) : "—"}
                        </td>
                        <td className="py-3.5 pr-2">
                          <button
                            onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                            className="opacity-0 group-hover:opacity-100 text-cyan-400 text-xs px-3 py-1 bg-[#1A1A1A] rounded-lg border border-[#333] transition"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
