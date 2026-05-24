"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type TournamentHistory = {
  id: string;
  name: string;
  game: string;
  format: string;
  team_size: string;
  date: string;
  winner_team_name: string | null;
  matchCount: number;
  goalCount: number;
  playerCount: number;
  topScorer: { name: string; goals: number } | null;
};

export default function TournamentHistory() {
  const router = useRouter();
  const supabase = createClient();

  const [history, setHistory] = useState<TournamentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGame, setFilterGame] = useState("all");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", user.id)
      .eq("status", "completed")
      .order("date", { ascending: false });

    if (!tournaments || tournaments.length === 0) { setLoading(false); return; }

    const tIds = tournaments.map(t => t.id);

    const { data: matches } = await supabase.from("matches").select("tournament_id, status").in("tournament_id", tIds);
    const { data: goals } = await supabase.from("match_goals").select("tournament_id, player_name, goals").in("tournament_id", tIds);
    const { data: players } = await supabase.from("tournament_players").select("tournament_id").in("tournament_id", tIds);

    const enriched: TournamentHistory[] = tournaments.map(t => {
      const tMatches = (matches || []).filter(m => m.tournament_id === t.id);
      const tGoals = (goals || []).filter(g => g.tournament_id === t.id);
      const tPlayers = (players || []).filter(p => p.tournament_id === t.id);

      // Top scorer
      const scorerMap: { [name: string]: number } = {};
      tGoals.forEach(g => { scorerMap[g.player_name] = (scorerMap[g.player_name] || 0) + g.goals; });
      const topScorer = Object.entries(scorerMap).sort((a, b) => b[1] - a[1])[0];

      return {
        id: t.id,
        name: t.name,
        game: t.game,
        format: t.format,
        team_size: t.team_size,
        date: t.date,
        winner_team_name: t.winner_team_name || null,
        matchCount: tMatches.length,
        goalCount: tGoals.reduce((sum, g) => sum + (g.goals || 0), 0),
        playerCount: tPlayers.length,
        topScorer: topScorer ? { name: topScorer[0], goals: topScorer[1] } : null,
      };
    });

    setHistory(enriched);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const games = ["all", ...Array.from(new Set(history.map(t => t.game)))];

  const filtered = history.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.winner_team_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesGame = filterGame === "all" || t.game === filterGame;
    return matchesSearch && matchesGame;
  });

  const totalGoals = history.reduce((sum, t) => sum + t.goalCount, 0);
  const totalMatches = history.reduce((sum, t) => sum + t.matchCount, 0);

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />

      <main className="flex-1 md:ml-56 px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Tournament History</h1>
            <p className="text-gray-600 text-sm mt-0.5">{history.length} completed tournaments</p>
          </div>
          <button onClick={() => router.push("/admin/tournaments")}
            className="text-orange-500 text-sm font-bold hover:text-orange-400 transition">
            Active Tournaments
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20"><p className="text-cyan-400">Loading...</p></div>
        ) : history.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-5xl mb-4">No history yet</p>
            <p className="text-white font-bold text-lg">No completed tournaments yet</p>
            <p className="text-gray-600 text-sm mt-2">Completed tournaments will appear here</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
                <p className="text-cyan-400 text-3xl font-extrabold">{history.length}</p>
                <p className="text-gray-600 text-xs mt-1">Tournaments</p>
              </div>
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
                <p className="text-orange-500 text-3xl font-extrabold">{totalMatches}</p>
                <p className="text-gray-600 text-xs mt-1">Total Matches</p>
              </div>
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
                <p className="text-cyan-400 text-3xl font-extrabold">{totalGoals}</p>
                <p className="text-gray-600 text-xs mt-1">Total Goals</p>
              </div>
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
                <p className="text-orange-500 text-3xl font-extrabold">
                  {totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : "0"}
                </p>
                <p className="text-gray-600 text-xs mt-1">Avg Goals/Match</p>
              </div>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <input
                className="flex-1 bg-[#111] text-white border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-400 transition text-sm"
                placeholder="Search by tournament or winner name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {games.map(g => (
                  <button key={g} onClick={() => setFilterGame(g)}
                    className={"px-3 py-2 rounded-xl text-xs font-bold transition border " + (
                      filterGame === g
                        ? "bg-cyan-400 text-black border-cyan-400"
                        : "bg-[#111] text-gray-500 border-[#222] hover:border-cyan-400"
                    )}>
                    {g === "all" ? "All Games" : g}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white font-bold">No tournaments match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(t => (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                    className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 hover:border-cyan-400 transition cursor-pointer group"
                  >
                    {/* Tournament name + date */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-extrabold truncate group-hover:text-cyan-400 transition">{t.name}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{t.date}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-[#1A1A1A] px-2 py-1 rounded ml-2 shrink-0">{t.game}</span>
                    </div>

                    {/* Winner */}
                    {t.winner_team_name && (
                      <div className="flex items-center gap-2 bg-[#1A0A00] border border-orange-500/30 rounded-xl px-3 py-2 mb-3">
                        <span className="text-lg">Trophy</span>
                        <div>
                          <p className="text-orange-500 font-bold text-sm">{t.winner_team_name}</p>
                          <p className="text-gray-600 text-xs">Winner</p>
                        </div>
                      </div>
                    )}

                    {/* Top scorer */}
                    {t.topScorer && (
                      <div className="flex items-center gap-2 bg-[#0A0A1A] border border-cyan-400/20 rounded-xl px-3 py-2 mb-3">
                        <span className="text-lg">Top scorer</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-cyan-400 font-bold text-sm truncate">{t.topScorer.name}</p>
                          <p className="text-gray-600 text-xs">Top Scorer</p>
                        </div>
                        <span className="text-orange-500 font-extrabold text-lg">{t.topScorer.goals}</span>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1A1A1A]">
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">{t.playerCount}</p>
                        <p className="text-gray-600 text-xs">Players</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">{t.matchCount}</p>
                        <p className="text-gray-600 text-xs">Matches</p>
                      </div>
                      <div className="text-center">
                        <p className="text-orange-500 font-bold text-sm">{t.goalCount}</p>
                        <p className="text-gray-600 text-xs">Goals</p>
                      </div>
                    </div>

                    {/* Format badges */}
                    <div className="flex gap-2 mt-3">
                      <span className="text-gray-600 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
                      <span className="text-gray-600 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.team_size}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
