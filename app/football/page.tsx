"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LEAGUES = [
  { id: 2021, name: "Premier League", country: "England", flag: "England", afId: 39 },
  { id: 2014, name: "La Liga", country: "Spain", flag: "Spain", afId: 140 },
  { id: 2019, name: "Serie A", country: "Italy", flag: "Italy", afId: 135 },
  { id: 2002, name: "Bundesliga", country: "Germany", flag: "Germany", afId: 78 },
  { id: 2015, name: "Ligue 1", country: "France", flag: "France", afId: 61 },
  { id: 2001, name: "Champions League", country: "Europe", flag: "Europe", afId: 2 },
];

const LEAGUE_FLAGS: { [key: string]: string } = {
  England: "England",
  Spain: "Spain",
  Italy: "Italy",
  Germany: "Germany",
  France: "France",
  Europe: "Europe",
};

const LEAGUE_EMOJIS: { [key: string]: string } = {
  England: "England",
  Spain: "Spain",
  Italy: "Italy",
  Germany: "Germany",
  France: "France",
  Europe: "Europe",
};

const currentSeason = new Date().getMonth() >= 7
  ? new Date().getFullYear()
  : new Date().getFullYear() - 1;

export default function FootballHub() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [tab, setTab] = useState<"standings" | "fixtures" | "results" | "scorers">("standings");
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [scorers, setScorers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [supabase, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "standings") {
        const res = await fetch(
          `/api/football?type=fd&path=competitions/${selectedLeague.id}/standings%3Fseason=${currentSeason}`
        );
        const data = await res.json();
        if (data.standings) {
          setStandings(data.standings[0]?.table || []);
        } else {
          setError(data.message || "No standings available");
          setStandings([]);
        }
      } else if (tab === "fixtures") {
        const today = new Date().toISOString().split("T")[0];
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const res = await fetch(
          `/api/football?type=fd&path=competitions/${selectedLeague.id}/matches%3FdateFrom=${today}%26dateTo=${future}%26status=SCHEDULED`
        );
        const data = await res.json();
        setFixtures(data.matches?.slice(0, 20) || []);
      } else if (tab === "results") {
        const past = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(
          `/api/football?type=fd&path=competitions/${selectedLeague.id}/matches%3FdateFrom=${past}%26dateTo=${today}%26status=FINISHED`
        );
        const data = await res.json();
        setResults((data.matches || []).reverse().slice(0, 20));
      } else if (tab === "scorers") {
        const res = await fetch(
          `/api/football?type=af&path=players/topscorers%3Fleague=${selectedLeague.afId}%26season=${currentSeason}`
        );
        const data = await res.json();
        setScorers(data.response?.slice(0, 20) || []);
      }
    } catch {
      setError("Failed to load data. Please try again.");
    }
    setLoading(false);
  }, [selectedLeague, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const leagueEmoji: { [key: number]: string } = {
    2021: "England",
    2014: "Spain",
    2019: "Italy",
    2002: "Germany",
    2015: "France",
    2001: "Europe",
  };

  const flagEmoji: { [key: string]: string } = {
    England: "EN",
    Spain: "ES",
    Italy: "IT",
    Germany: "DE",
    France: "FR",
    Europe: "EU",
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.back()} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">Football Hub</span>
        <span className="text-gray-600 text-xs">{currentSeason}/{currentSeason + 1}</span>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto">
        {/* League selector */}
        <div className="flex gap-2 flex-wrap mb-6">
          {LEAGUES.map(league => (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league)}
              className={"px-3 py-2 rounded-xl text-sm font-bold transition border " + (
                selectedLeague.id === league.id
                  ? "bg-cyan-400 text-black border-cyan-400"
                  : "bg-[#111] text-gray-500 border-[#222] hover:border-cyan-400 hover:text-white"
              )}
            >
              {league.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#222] mb-6">
          {(["standings", "fixtures", "results", "scorers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={"px-5 py-2.5 font-bold text-sm " + (
                tab === t ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400"
              )}>
              {t === "standings" ? "Standings" : t === "fixtures" ? "Fixtures" : t === "results" ? "Results" : "Top Scorers"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20"><p className="text-cyan-400">Loading...</p></div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">Soccer ball</p>
            <p className="text-white font-bold">{error}</p>
            <p className="text-gray-600 text-sm mt-2">This league may not be available for the current season yet</p>
            <button onClick={fetchData} className="mt-4 text-cyan-400 text-sm underline">Try again</button>
          </div>
        ) : (
          <>
            {/* Standings */}
            {tab === "standings" && standings.length > 0 && (
              <div>
                <div className="hidden md:flex py-2.5 px-4 bg-[#111] rounded-lg mb-2 text-gray-600 text-xs font-bold uppercase tracking-widest">
                  <span className="w-8">#</span>
                  <span className="flex-1">Team</span>
                  <span className="w-10 text-center">P</span>
                  <span className="w-10 text-center">W</span>
                  <span className="w-10 text-center">D</span>
                  <span className="w-10 text-center">L</span>
                  <span className="w-14 text-center">GD</span>
                  <span className="w-12 text-center">PTS</span>
                </div>
                {standings.map((row: any, i: number) => (
                  <div key={row.team.id} className={"flex items-center py-3 px-4 rounded-lg " + (i % 2 === 0 ? "bg-[#111]" : "")}>
                    <span className={"w-8 text-sm font-bold " + (
                      i < 4 ? "text-cyan-400" : i < 6 ? "text-orange-500" : i >= standings.length - 3 ? "text-red-500" : "text-gray-500"
                    )}>
                      {row.position}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      {row.team.crest && (
                        <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain" />
                      )}
                      <span className="text-white font-bold text-sm">{row.team.shortName || row.team.name}</span>
                    </div>
                    <span className="w-10 text-center text-gray-400 text-sm hidden md:block">{row.playedGames}</span>
                    <span className="w-10 text-center text-gray-400 text-sm hidden md:block">{row.won}</span>
                    <span className="w-10 text-center text-gray-400 text-sm hidden md:block">{row.draw}</span>
                    <span className="w-10 text-center text-gray-400 text-sm hidden md:block">{row.lost}</span>
                    <span className={"w-14 text-center text-sm hidden md:block " + (row.goalDifference > 0 ? "text-cyan-400" : row.goalDifference < 0 ? "text-red-400" : "text-gray-500")}>
                      {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
                    </span>
                    <span className="w-12 text-center text-cyan-400 font-extrabold text-sm">{row.points}</span>
                  </div>
                ))}
                <div className="flex gap-4 mt-4 px-2 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400" /><span className="text-gray-600 text-xs">Champions League</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-gray-600 text-xs">Europa League</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-gray-600 text-xs">Relegation</span></div>
                </div>
              </div>
            )}

            {/* Fixtures */}
            {tab === "fixtures" && (
              fixtures.length === 0 ? (
                <div className="text-center py-20"><p className="text-white font-bold">No upcoming fixtures</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fixtures.map((m: any) => (
                    <div key={m.id} className="bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                      <p className="text-gray-600 text-xs mb-3">{formatDate(m.utcDate)}{m.matchday ? " - Matchday " + m.matchday : ""}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {m.homeTeam.crest && <img src={m.homeTeam.crest} alt={m.homeTeam.name} className="w-7 h-7 object-contain" />}
                          <span className="text-white font-bold text-sm">{m.homeTeam.shortName || m.homeTeam.name}</span>
                        </div>
                        <span className="text-gray-500 text-xs px-3 font-bold bg-[#1A1A1A] rounded-lg py-1">vs</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-white font-bold text-sm">{m.awayTeam.shortName || m.awayTeam.name}</span>
                          {m.awayTeam.crest && <img src={m.awayTeam.crest} alt={m.awayTeam.name} className="w-7 h-7 object-contain" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Results */}
            {tab === "results" && (
              results.length === 0 ? (
                <div className="text-center py-20"><p className="text-white font-bold">No recent results</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((m: any) => (
                    <div key={m.id} className="bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                      <p className="text-gray-600 text-xs mb-3">{formatDate(m.utcDate)}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {m.homeTeam.crest && <img src={m.homeTeam.crest} alt={m.homeTeam.name} className="w-7 h-7 object-contain" />}
                          <span className={"font-bold text-sm " + (m.score.winner === "HOME_TEAM" ? "text-white" : "text-gray-500")}>
                            {m.homeTeam.shortName || m.homeTeam.name}
                          </span>
                        </div>
                        <div className="px-3 text-center">
                          <span className="text-cyan-400 font-extrabold text-lg">{m.score.fullTime.home} - {m.score.fullTime.away}</span>
                          <p className="text-gray-600 text-[10px]">FT</p>
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className={"font-bold text-sm " + (m.score.winner === "AWAY_TEAM" ? "text-white" : "text-gray-500")}>
                            {m.awayTeam.shortName || m.awayTeam.name}
                          </span>
                          {m.awayTeam.crest && <img src={m.awayTeam.crest} alt={m.awayTeam.name} className="w-7 h-7 object-contain" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Top Scorers */}
            {tab === "scorers" && (
              scorers.length === 0 ? (
                <div className="text-center py-20"><p className="text-white font-bold">No scorer data available</p></div>
              ) : (
                <div className="flex flex-col gap-2">
                  {scorers.map((s: any, i: number) => (
                    <div key={s.player.id} className="flex items-center bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                      <div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mr-4 shrink-0 " + (
                        i === 0 ? "bg-orange-500 text-white" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-orange-800 text-white" : "bg-[#222] text-gray-400"
                      )}>
                        {i + 1}
                      </div>
                      <img src={s.player.photo} alt={s.player.name}
                        className="w-10 h-10 rounded-full object-cover mr-3 shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{s.player.name}</p>
                        <p className="text-gray-500 text-xs">{s.statistics[0]?.team.name} · {s.player.nationality}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-orange-500 font-extrabold text-xl">{s.statistics[0]?.goals.total}</p>
                        <p className="text-gray-600 text-xs">goals</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}
