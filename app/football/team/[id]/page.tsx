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

  const [teamStats, setTeamStats] = useState<any>(null);
  const [lastMatches, setLastMatches] = useState<any[]>([]);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [statsRes, lastRes, nextRes, scorersRes] = await Promise.all([
          fetch(`/api/football?type=af&path=teams/statistics%3Fteam=${teamId}%26league=${leagueId}%26season=${currentSeason}`),
          fetch(`/api/football?type=af&path=fixtures%3Fteam=${teamId}%26last=5`),
          fetch(`/api/football?type=af&path=fixtures%3Fteam=${teamId}%26next=1`),
          fetch(`/api/football?type=af&path=players/topscorers%3Fleague=${leagueId}%26season=${currentSeason}`),
        ]);
        const statsData = await statsRes.json();
        const lastData = await lastRes.json();
        const nextData = await nextRes.json();
        const scorersData = await scorersRes.json();

        setTeamStats(statsData.response || null);
        setLastMatches((lastData.response || []).reverse());
        setNextMatch(nextData.response?.[0] || null);

        // Filter top scorers for this team
        const teamScorers = (scorersData.response || []).filter((s: any) =>
          s.statistics?.[0]?.team?.id === parseInt(teamId)
        ).slice(0, 5);
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

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading team details...</p></div>;
  if (error) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-bold">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-cyan-400 underline text-sm">Go back</button>
      </div>
    </div>
  );

  const s = teamStats;
  const form = s?.form || "";
  const formArr = form.split("").slice(-5);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.back()} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">{teamName}</span>
        <span className="text-gray-600 text-xs">{currentSeason}/{currentSeason + 1}</span>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-3xl mx-auto">

        {/* Team header */}
        {s?.team && (
          <div className="flex items-center gap-4 mb-6">
            {s.team.logo && <img src={s.team.logo} alt={s.team.name} className="w-20 h-20 object-contain" />}
            <div>
              <h1 className="text-white text-2xl font-extrabold">{s.team.name}</h1>
              <p className="text-gray-500 text-sm">{s.league?.name} · {currentSeason}/{currentSeason + 1}</p>
            </div>
          </div>
        )}

        {/* Season stats */}
        {s && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-cyan-400 text-2xl font-extrabold">{s.fixtures?.wins?.total ?? "-"}</p>
              <p className="text-gray-600 text-xs mt-1">Wins</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-gray-400 text-2xl font-extrabold">{s.fixtures?.draws?.total ?? "-"}</p>
              <p className="text-gray-600 text-xs mt-1">Draws</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-red-400 text-2xl font-extrabold">{s.fixtures?.loses?.total ?? "-"}</p>
              <p className="text-gray-600 text-xs mt-1">Losses</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-orange-500 text-2xl font-extrabold">{s.goals?.for?.total?.total ?? "-"}</p>
              <p className="text-gray-600 text-xs mt-1">Goals Scored</p>
            </div>
          </div>
        )}

        {/* Form */}
        {formArr.length > 0 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
            <h3 className="text-white font-bold mb-3">Recent Form</h3>
            <div className="flex gap-2">
              {formArr.map((r: string, i: number) => (
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
                <span className={"font-bold text-sm " + (nextMatch.teams.home.id === parseInt(teamId) ? "text-white" : "text-gray-400")}>{nextMatch.teams.home.name}</span>
              </div>
              <div className="text-center px-4">
                <p className="text-gray-500 text-xs font-bold">vs</p>
                <p className="text-gray-600 text-[10px] mt-1">{formatDate(nextMatch.fixture.date)}</p>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className={"font-bold text-sm " + (nextMatch.teams.away.id === parseInt(teamId) ? "text-white" : "text-gray-400")}>{nextMatch.teams.away.name}</span>
                {nextMatch.teams.away.logo && <img src={nextMatch.teams.away.logo} className="w-8 h-8 object-contain" />}
              </div>
            </div>
          </div>
        )}

        {/* Last 5 matches */}
        {lastMatches.length > 0 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
            <h3 className="text-white font-bold mb-3">Last 5 Results</h3>
            <div className="flex flex-col gap-2">
              {lastMatches.map((m: any, i: number) => {
                const isHome = m.teams.home.id === parseInt(teamId);
                const myGoals = isHome ? m.goals.home : m.goals.away;
                const theirGoals = isHome ? m.goals.away : m.goals.home;
                const result = myGoals > theirGoals ? "W" : myGoals === theirGoals ? "D" : "L";
                const opp = isHome ? m.teams.away : m.teams.home;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#1A1A1A] last:border-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${formColor(result)}`}>{result}</span>
                    <div className="flex items-center gap-2 flex-1">
                      {opp.logo && <img src={opp.logo} className="w-5 h-5 object-contain" />}
                      <span className="text-white text-sm font-bold">{opp.name}</span>
                      <span className="text-gray-600 text-xs">{isHome ? "(H)" : "(A)"}</span>
                    </div>
                    <span className="text-cyan-400 font-extrabold">{myGoals} - {theirGoals}</span>
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${i === 0 ? "bg-orange-500 text-white" : "bg-[#222] text-gray-400"}`}>{i + 1}</div>
                <img src={s.player.photo} alt={s.player.name} className="w-8 h-8 rounded-full object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-white font-bold text-sm flex-1">{s.player.name}</span>
                <span className="text-orange-500 font-extrabold">{s.statistics[0]?.goals.total} goals</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
