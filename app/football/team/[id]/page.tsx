"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

const currentSeason = new Date().getMonth() >= 7
  ? new Date().getFullYear()
  : new Date().getFullYear() - 1;

export default function TeamDetails() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const teamId = params.id as string;
  const leagueId = searchParams.get("league") || "39";
  const teamName = searchParams.get("name") || "Team";

  const [lastMatches, setLastMatches] = useState<any[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [lastRes, nextRes, scorersRes] = await Promise.all([
          fetch(`/api/football?type=af&path=fixtures%3Fteam=${teamId}%26last=5`),
          fetch(`/api/football?type=af&path=fixtures%3Fteam=${teamId}%26next=1`),
          fetch(`/api/football?type=af&path=players/topscorers%3Fleague=${leagueId}%26season=${currentSeason}`),
        ]);
        const lastData = await lastRes.json();
        const nextData = await nextRes.json();
        const scorersData = await scorersRes.json();

        const last5 = (lastData.response || []).reverse();
        setLastMatches(last5);
        setNextMatch(nextData.response?.[0] || null);

        // Get team info from last match
        if (last5.length > 0) {
          const m = last5[0];
          const isHome = m.teams.home.id === parseInt(teamId);
          setTeamInfo(isHome ? m.teams.home : m.teams.away);
        }

        // Filter top scorers for this team
        const teamScorers = (scorersData.response || [])
          .filter((s: any) => s.statistics?.[0]?.team?.id === parseInt(teamId))
          .slice(0, 5);
        setTopScorers(teamScorers);
      } catch { setError("Failed to load team details."); }
      setLoading(false);
    }
    fetchAll();
  }, [teamId, leagueId]);

  function formColor(result: string) {
    if (result === "W") return "bg-cyan-400 text-black";
    if (result === "D") return "bg-gray-600 text-white";
    return "bg-red-500 text-white";
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  // Calculate form from last matches
  const form = lastMatches.map((m: any) => {
    const isHome = m.teams.home.id === parseInt(teamId);
    const myGoals = isHome ? m.goals.home : m.goals.away;
    const theirGoals = isHome ? m.goals.away : m.goals.home;
    if (myGoals === null || theirGoals === null) return null;
    return myGoals > theirGoals ? "W" : myGoals === theirGoals ? "D" : "L";
  }).filter(Boolean) as string[];

  // Season stats from last matches
  const wins = form.filter(r => r === "W").length;
  const draws = form.filter(r => r === "D").length;
  const losses = form.filter(r => r === "L").length;
  const goalsScored = lastMatches.reduce((sum: number, m: any) => {
    const isHome = m.teams.home.id === parseInt(teamId);
    const g = isHome ? m.goals.home : m.goals.away;
    return sum + (g || 0);
  }, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <p className="text-cyan-400">Loading team details...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-bold">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-cyan-400 underline text-sm">Go back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.back()} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">{teamName}</span>
        <span className="text-gray-600 text-xs">{currentSeason}/{currentSeason + 1}</span>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-3xl mx-auto">

        {/* Team header */}
        <div className="flex items-center gap-4 mb-6">
          {teamInfo?.logo && (
            <img src={teamInfo.logo} alt={teamName} className="w-20 h-20 object-contain" />
          )}
          <div>
            <h1 className="text-white text-2xl font-extrabold">{teamName}</h1>
            <p className="text-gray-500 text-sm">{currentSeason}/{currentSeason + 1} Season</p>
          </div>
        </div>

        {/* Last 5 stats summary */}
        {form.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-cyan-400 text-2xl font-extrabold">{wins}</p>
              <p className="text-gray-600 text-xs mt-1">Wins</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-gray-400 text-2xl font-extrabold">{draws}</p>
              <p className="text-gray-600 text-xs mt-1">Draws</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-red-400 text-2xl font-extrabold">{losses}</p>
              <p className="text-gray-600 text-xs mt-1">Losses</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-orange-500 text-2xl font-extrabold">{goalsScored}</p>
              <p className="text-gray-600 text-xs mt-1">Goals</p>
            </div>
          </div>
        )}

        {/* Form */}
        {form.length > 0 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Recent Form</h3>
              <span className="text-gray-600 text-xs">Last {form.length} matches</span>
            </div>
            <div className="flex gap-2">
              {form.map((r: string, i: number) => (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm ${formColor(r)}`}>{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Next fixture */}
        {nextMatch && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
            <h3 className="text-white font-bold mb-3">Next Match</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {nextMatch.teams.home.logo && <img src={nextMatch.teams.home.logo} className="w-8 h-8 object-contain" />}
                <span className={"font-bold text-sm " + (nextMatch.teams.home.id === parseInt(teamId) ? "text-white" : "text-gray-400")}>
                  {nextMatch.teams.home.name}
                </span>
              </div>
              <div className="text-center px-4">
                <span className="text-gray-500 text-xs font-bold bg-[#1A1A1A] px-3 py-1 rounded-lg">vs</span>
                <p className="text-gray-600 text-[10px] mt-2">{formatDate(nextMatch.fixture.date)}</p>
                <p className="text-gray-600 text-[10px]">{nextMatch.league.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className={"font-bold text-sm " + (nextMatch.teams.away.id === parseInt(teamId) ? "text-white" : "text-gray-400")}>
                  {nextMatch.teams.away.name}
                </span>
                {nextMatch.teams.away.logo && <img src={nextMatch.teams.away.logo} className="w-8 h-8 object-contain" />}
              </div>
            </div>
          </div>
        )}

        {/* Last 5 results */}
        {lastMatches.length > 0 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
            <h3 className="text-white font-bold mb-3">Last 5 Results</h3>
            <div className="flex flex-col gap-1">
              {lastMatches.map((m: any, i: number) => {
                const isHome = m.teams.home.id === parseInt(teamId);
                const myGoals = isHome ? m.goals.home : m.goals.away;
                const theirGoals = isHome ? m.goals.away : m.goals.home;
                const result = myGoals > theirGoals ? "W" : myGoals === theirGoals ? "D" : "L";
                const opp = isHome ? m.teams.away : m.teams.home;
                return (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-[#1A1A1A] last:border-0">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${formColor(result)}`}>
                      {result}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {opp.logo && <img src={opp.logo} className="w-6 h-6 object-contain shrink-0" />}
                      <span className="text-white text-sm font-bold truncate">{opp.name}</span>
                      <span className="text-gray-600 text-xs shrink-0">{isHome ? "H" : "A"}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-cyan-400 font-extrabold">{myGoals} - {theirGoals}</span>
                      <p className="text-gray-600 text-[10px]">{m.league.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top scorers from this team */}
        {topScorers.length > 0 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-3">Top Scorers This Season</h3>
            {topScorers.map((s: any, i: number) => (
              <div key={s.player.id} className="flex items-center gap-3 py-2.5 border-b border-[#1A1A1A] last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${i === 0 ? "bg-orange-500 text-white" : "bg-[#222] text-gray-400"}`}>
                  {i + 1}
                </div>
                <img src={s.player.photo} alt={s.player.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-white font-bold text-sm flex-1 truncate">{s.player.name}</span>
                <span className="text-orange-500 font-extrabold shrink-0">{s.statistics[0]?.goals.total} goals</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {lastMatches.length === 0 && !nextMatch && !loading && (
          <div className="text-center py-20">
            <p className="text-white font-bold">No data available for this team</p>
            <p className="text-gray-600 text-sm mt-2">Try selecting a top league team</p>
            <button onClick={() => router.back()} className="mt-4 text-cyan-400 underline text-sm">Go back</button>
          </div>
        )}
      </main>
    </div>
  );
}
