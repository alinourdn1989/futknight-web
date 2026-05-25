"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function MatchDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [match, setMatch] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatch() {
      setLoading(true);
      try {
        if (id.startsWith("fd-")) {
          const fdId = id.replace("fd-", "");
          const res = await fetch(`/api/football?type=fd&path=matches/${fdId}`);
          const data = await res.json();
          setMatch({ fd: data });
        } else {
          const [fixtureRes, eventsRes, statsRes] = await Promise.all([
            fetch(`/api/football?type=af&path=fixtures%3Fid=${id}`),
            fetch(`/api/football?type=af&path=fixtures/events%3Ffixture=${id}`),
            fetch(`/api/football?type=af&path=fixtures/statistics%3Ffixture=${id}`),
          ]);
          const fixtureData = await fixtureRes.json();
          const eventsData = await eventsRes.json();
          const statsData = await statsRes.json();
          setMatch({ af: fixtureData.response?.[0] });
          setEvents(eventsData.response || []);
          setStats(statsData.response || []);
        }
      } catch { setError("Failed to load match details."); }
      setLoading(false);
    }
    fetchMatch();
  }, [id]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function eventIcon(type: string, detail: string) {
    if (type === "Goal") return detail?.includes("Own") ? "⚽ OG" : "⚽";
    if (type === "Card") return detail?.includes("Yellow") ? "🟨" : "🟥";
    if (type === "subst") return "⇄";
    return "•";
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <p className="text-cyan-400">Loading match details...</p>
    </div>
  );

  if (error || !match) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-bold">{error || "Match not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-cyan-400 underline text-sm">Go back</button>
      </div>
    </div>
  );

  // API-Football live match
  if (match.af) {
    const m = match.af;
    const homeEvents = events.filter(e => e.team.id === m.teams.home.id);
    const awayEvents = events.filter(e => e.team.id === m.teams.away.id);
    const homeGoals = homeEvents.filter(e => e.type === "Goal");
    const awayGoals = awayEvents.filter(e => e.type === "Goal");
    const homeStats = stats.find((s: any) => s.team.id === m.teams.home.id)?.statistics || [];
    const awayStats = stats.find((s: any) => s.team.id === m.teams.away.id)?.statistics || [];
    const hasStats = homeStats.length > 0;
    const hasEvents = events.filter(e => e.type === "Goal" || e.type === "Card").length > 0;

    const statTypes = ["Ball Possession", "Total Shots", "Shots on Goal", "Corner Kicks", "Fouls", "Yellow Cards", "Red Cards"];

    function getStat(arr: any[], name: string) {
      return arr.find((s: any) => s.type === name)?.value ?? "-";
    }

    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
          <button onClick={() => router.back()} className="text-orange-500 text-sm">Back</button>
          <span className="text-cyan-400 font-extrabold text-sm truncate max-w-xs">{m.league.name}</span>
          <span className="text-gray-600 text-xs">{m.league.round?.replace("Regular Season - ", "")}</span>
        </nav>

        <main className="px-4 md:px-10 py-8 max-w-3xl mx-auto">
          {/* Score header */}
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 mb-6">
            <p className="text-gray-600 text-xs text-center mb-5">{formatDate(m.fixture.date)}</p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                {m.teams.home.logo && <img src={m.teams.home.logo} alt={m.teams.home.name} className="w-14 h-14 md:w-20 md:h-20 object-contain" />}
                <p className="text-white font-extrabold text-sm text-center">{m.teams.home.name}</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-cyan-400 font-extrabold text-4xl md:text-5xl">{m.goals.home ?? "-"} - {m.goals.away ?? "-"}</p>
                {m.score?.halftime && (
                  <p className="text-gray-600 text-xs text-center mt-1">HT: {m.score.halftime.home} - {m.score.halftime.away}</p>
                )}
                <p className={"text-xs font-bold text-center mt-2 " + (m.fixture.status.short === "FT" ? "text-orange-500" : "text-red-400")}>
                  {m.fixture.status.short === "FT" ? "Full Time" : m.fixture.status.elapsed ? m.fixture.status.elapsed + "'" : m.fixture.status.long}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                {m.teams.away.logo && <img src={m.teams.away.logo} alt={m.teams.away.name} className="w-14 h-14 md:w-20 md:h-20 object-contain" />}
                <p className="text-white font-extrabold text-sm text-center">{m.teams.away.name}</p>
              </div>
            </div>

            {/* Goal scorers summary */}
            {(homeGoals.length > 0 || awayGoals.length > 0) && (
              <div className="flex pt-4 border-t border-[#1A1A1A] mt-2">
                <div className="flex-1 text-left">
                  {homeGoals.map((e, i) => (
                    <p key={i} className="text-gray-400 text-xs mb-0.5">⚽ {e.player.name} {e.time.elapsed}&apos;</p>
                  ))}
                </div>
                <div className="flex-1 text-right">
                  {awayGoals.map((e, i) => (
                    <p key={i} className="text-gray-400 text-xs mb-0.5">⚽ {e.player.name} {e.time.elapsed}&apos;</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Match stats */}
          {hasStats ? (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-bold mb-4">Match Stats</h3>
              {statTypes.map(statName => {
                const hVal = getStat(homeStats, statName);
                const aVal = getStat(awayStats, statName);
                const hNum = parseInt(String(hVal)) || 0;
                const aNum = parseInt(String(aVal)) || 0;
                const total = hNum + aNum;
                const hPct = total > 0 ? (hNum / total) * 100 : 50;
                return (
                  <div key={statName} className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-white">{hVal}</span>
                      <span className="text-gray-500">{statName}</span>
                      <span className="font-bold text-white">{aVal}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-[#222]">
                      <div className="bg-cyan-400 h-full" style={{ width: `${hPct}%` }} />
                      <div className="bg-orange-500 h-full" style={{ width: `${100 - hPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6 text-center">
              <p className="text-gray-600 text-sm">Match stats not available for this match</p>
              <p className="text-gray-700 text-xs mt-1">Detailed stats are available for top league matches only</p>
            </div>
          )}

          {/* Events timeline */}
          {hasEvents ? (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-bold mb-4">Match Events</h3>
              {events.filter(e => e.type === "Goal" || e.type === "Card").map((e, i) => {
                const isHome = e.team.id === m.teams.home.id;
                return (
                  <div key={i} className={"flex items-center gap-3 py-2.5 border-b border-[#1A1A1A] last:border-0 " + (isHome ? "" : "flex-row-reverse")}>
                    <span className="text-gray-500 text-xs w-8 text-center font-bold">{e.time.elapsed}&apos;</span>
                    <span className="text-base">{eventIcon(e.type, e.detail)}</span>
                    <div className={`flex-1 ${isHome ? "text-left" : "text-right"}`}>
                      <p className="text-white text-sm font-bold">{e.player.name}</p>
                      {e.assist?.name && <p className="text-gray-500 text-xs">Assist: {e.assist.name}</p>}
                      {e.detail && e.type === "Card" && <p className="text-gray-600 text-xs">{e.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
              <p className="text-gray-600 text-sm">Event details not available for this match</p>
              <p className="text-gray-700 text-xs mt-1">Events are available for top league matches only</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Football-data.org match (results tab)
  if (match.fd) {
    const m = match.fd;
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
          <button onClick={() => router.back()} className="text-orange-500 text-sm">Back</button>
          <span className="text-cyan-400 font-extrabold text-sm truncate max-w-xs">{m.competition?.name}</span>
          <span className="text-gray-600 text-xs">MD {m.matchday}</span>
        </nav>
        <main className="px-4 md:px-10 py-8 max-w-3xl mx-auto">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 mb-6">
            <p className="text-gray-600 text-xs text-center mb-5">{formatDate(m.utcDate)}</p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                {m.homeTeam.crest && <img src={m.homeTeam.crest} alt={m.homeTeam.name} className="w-14 h-14 md:w-20 md:h-20 object-contain" />}
                <p className="text-white font-extrabold text-sm text-center">{m.homeTeam.name}</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-cyan-400 font-extrabold text-4xl md:text-5xl">{m.score.fullTime.home} - {m.score.fullTime.away}</p>
                {m.score.halfTime && (
                  <p className="text-gray-600 text-xs text-center mt-1">HT: {m.score.halfTime.home} - {m.score.halfTime.away}</p>
                )}
                <p className="text-orange-500 text-xs font-bold text-center mt-2">Full Time</p>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                {m.awayTeam.crest && <img src={m.awayTeam.crest} alt={m.awayTeam.name} className="w-14 h-14 md:w-20 md:h-20 object-contain" />}
                <p className="text-white font-extrabold text-sm text-center">{m.awayTeam.name}</p>
              </div>
            </div>

            {m.goals?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-2 text-center">Goals</p>
                {m.goals.map((g: any, i: number) => (
                  <p key={i} className={"text-gray-400 text-xs mb-1 " + (g.team?.id === m.homeTeam.id ? "text-left" : "text-right")}>
                    ⚽ {g.scorer?.name} {g.minute}&apos;
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 text-center">
            <p className="text-gray-600 text-sm">Detailed stats available for live matches only</p>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
