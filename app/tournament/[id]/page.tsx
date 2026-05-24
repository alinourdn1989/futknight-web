"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import KnockoutBracket from "@/components/KnockoutBracket";

type Tournament = {
  id: string; name: string; game: string; format: string;
  team_size: string; status: string; date: string; winner_team_name: string;
};
type Team = { id: string; name: string };
type Match = {
  id: string; home_team_id: string; away_team_id: string;
  home_score: number; away_score: number; status: string; round: number;
  home_team?: Team; away_team?: Team;
};
type Standing = { teamId: string; teamName: string; played: number; won: number; drawn: number; lost: number; points: number; };
type TopScorer = { player_name: string; teamName: string; goals: number; };

export default function PublicTournament() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchGoals, setMatchGoals] = useState<{ [matchId: string]: any[] }>({});
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [tab, setTab] = useState<"fixtures" | "standings" | "bracket" | "scorers">("fixtures");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (!t) { setNotFound(true); setLoading(false); return; }
    setTournament(t);

    const { data: teamsData } = await supabase.from("teams").select("*").eq("tournament_id", id);
    setTeams(teamsData || []);

    const { data: matchesData } = await supabase.from("matches").select("*").eq("tournament_id", id).order("round", { ascending: true });
    if (matchesData && teamsData) {
      setMatches(matchesData.map(m => ({
        ...m,
        home_team: teamsData.find(t => t.id === m.home_team_id),
        away_team: teamsData.find(t => t.id === m.away_team_id),
      })));
    }

    const { data: goals } = await supabase.from("match_goals").select("*").eq("tournament_id", id);
    if (goals) {
      const map: { [k: string]: any[] } = {};
      goals.forEach(g => { if (!map[g.match_id]) map[g.match_id] = []; map[g.match_id].push(g); });
      setMatchGoals(map);
      const scorerMap: { [name: string]: { goals: number; team_id: string } } = {};
      goals.forEach(g => {
        if (!scorerMap[g.player_name]) scorerMap[g.player_name] = { goals: 0, team_id: g.team_id };
        scorerMap[g.player_name].goals += g.goals;
      });
      const sorted = Object.entries(scorerMap)
        .map(([name, data]) => ({ player_name: name, teamName: teamsData?.find(t => t.id === data.team_id)?.name || "", goals: data.goals }))
        .sort((a, b) => b.goals - a.goals).slice(0, 10);
      setTopScorers(sorted);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function calculateStandings(): Standing[] {
    const map: { [k: string]: Standing } = {};
    teams.forEach(t => { map[t.id] = { teamId: t.id, teamName: t.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }; });
    matches.filter(m => m.status === "completed").forEach(m => {
      const h = map[m.home_team_id], a = map[m.away_team_id];
      if (h) h.played++; if (a) a.played++;
      if (m.home_score > m.away_score) { if (h) { h.won++; h.points += 3; } if (a) a.lost++; }
      else if (m.away_score > m.home_score) { if (a) { a.won++; a.points += 3; } if (h) h.lost++; }
      else { if (h) { h.drawn++; h.points++; } if (a) { a.drawn++; a.points++; } }
    });
    return Object.values(map).sort((a, b) => b.points - a.points);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const matchesByRound: { [round: number]: Match[] } = {};
  matches.forEach(m => { if (!matchesByRound[m.round]) matchesByRound[m.round] = []; matchesByRound[m.round].push(m); });

  const isCompleted = tournament?.status === "completed";
  const standings = calculateStandings();

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading...</p></div>;

  if (notFound) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🏆</p>
        <p className="text-white font-bold text-lg">Tournament not found</p>
        <p className="text-gray-600 text-sm mt-2">This link may be invalid or expired</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <span className="text-cyan-400 font-extrabold text-lg">FutKnight</span>
        <button onClick={copyLink}
          className={"px-4 py-2 rounded-lg text-sm font-bold transition border " + (copied ? "bg-cyan-400 text-black border-cyan-400" : "bg-[#111] text-gray-400 border-[#333] hover:border-cyan-400 hover:text-cyan-400")}>
          {copied ? "Copied!" : "Share"}
        </button>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-white text-3xl font-extrabold">{tournament?.name}</h1>
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="text-gray-500 text-xs bg-[#111] px-2 py-1 rounded">{tournament?.game}</span>
                <span className="text-gray-500 text-xs bg-[#111] px-2 py-1 rounded">{tournament?.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
                <span className="text-gray-500 text-xs bg-[#111] px-2 py-1 rounded">{tournament?.team_size}</span>
                {tournament?.date && <span className="text-gray-500 text-xs bg-[#111] px-2 py-1 rounded">{tournament?.date}</span>}
              </div>
            </div>
            <span className={"text-sm font-bold px-3 py-1.5 rounded-lg border " + (isCompleted ? "text-orange-500 border-orange-500" : tournament?.status === "active" ? "text-cyan-400 border-cyan-400" : "text-gray-500 border-[#333]")}>
              {tournament?.status === "upcoming" ? "Upcoming" : tournament?.status === "active" ? "Active" : "Completed"}
            </span>
          </div>
        </div>

        {/* Winner banner */}
        {isCompleted && tournament?.winner_team_name && (
          <div className="bg-[#1A0A00] border border-orange-500 rounded-2xl p-6 text-center mb-6">
            <div className="text-5xl mb-2">🏆</div>
            <p className="text-orange-500 text-2xl font-extrabold">{tournament.winner_team_name}</p>
            <p className="text-gray-500 text-sm mt-1">Tournament Champion</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-white text-2xl font-extrabold">{teams.length}</p>
            <p className="text-gray-600 text-xs mt-1">Teams</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-orange-500 text-2xl font-extrabold">{matches.filter(m => m.status === "completed").length}</p>
            <p className="text-gray-600 text-xs mt-1">Matches Played</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-cyan-400 text-2xl font-extrabold">{topScorers.reduce((sum, s) => sum + s.goals, 0)}</p>
            <p className="text-gray-600 text-xs mt-1">Total Goals</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#222] mb-6 overflow-x-auto">
          <button onClick={() => setTab("fixtures")}
            className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "fixtures" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>
            Fixtures
          </button>
          {tournament?.format === "round_robin" && (
            <button onClick={() => setTab("standings")}
              className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "standings" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>
              Standings
            </button>
          )}
          {tournament?.format === "knockout" && (
            <button onClick={() => setTab("bracket")}
              className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "bracket" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>
              Bracket
            </button>
          )}
          <button onClick={() => setTab("scorers")}
            className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "scorers" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>
            Top Scorers
          </button>
        </div>

        {/* Fixtures */}
        {tab === "fixtures" && (
          matches.length === 0 ? (
            <div className="text-center py-16"><p className="text-white font-bold">No fixtures yet</p></div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                <div key={round}>
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Round {round}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roundMatches.map(m => (
                      <div key={m.id} className="bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold flex-1 text-center text-sm">{m.home_team?.name}</span>
                          <span className="px-4">{m.status === "completed" ? <span className="text-cyan-400 text-lg font-bold">{m.home_score} - {m.away_score}</span> : <span className="text-gray-600">vs</span>}</span>
                          <span className="text-white font-bold flex-1 text-center text-sm">{m.away_team?.name}</span>
                        </div>
                        <p className={"text-center text-[11px] mt-2 " + (m.status === "completed" ? "text-orange-500" : "text-gray-600")}>{m.status.toUpperCase()}</p>
                        {m.status === "completed" && matchGoals[m.id]?.length > 0 && (
                          <div className="flex mt-2.5 pt-2 border-t border-[#222]">
                            <div className="flex-1">{matchGoals[m.id].filter(g => g.team_id === m.home_team_id).map((g, i) => (<p key={i} className="text-gray-500 text-xs">{g.player_name}{g.goals > 1 ? " x" + g.goals : ""}</p>))}</div>
                            <div className="flex-1 text-right">{matchGoals[m.id].filter(g => g.team_id === m.away_team_id).map((g, i) => (<p key={i} className="text-gray-500 text-xs">{g.player_name}{g.goals > 1 ? " x" + g.goals : ""}</p>))}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Standings */}
        {tab === "standings" && tournament?.format === "round_robin" && (
          standings.length === 0 ? <div className="text-center py-16"><p className="text-white font-bold">No standings yet</p></div> : (
            <div>
              <div className="hidden md:flex py-2.5 px-4 bg-[#111] rounded-lg mb-2 text-gray-600 text-xs font-bold uppercase tracking-widest">
                <span className="w-8">#</span><span className="flex-1">Team</span>
                <span className="w-10 text-center">P</span><span className="w-10 text-center">W</span><span className="w-10 text-center">D</span><span className="w-10 text-center">L</span><span className="w-12 text-center">PTS</span>
              </div>
              {standings.map((s, i) => (
                <div key={s.teamId} className={"flex items-center py-3.5 px-4 rounded-lg " + (i % 2 === 0 ? "bg-[#111]" : "")}>
                  <span className={"w-8 text-sm font-bold " + (i === 0 ? "text-orange-500" : "text-gray-500")}>{i + 1}</span>
                  <span className="flex-1 text-white font-bold text-sm flex items-center gap-2">{s.teamName}{isCompleted && i === 0 && <span>🏆</span>}</span>
                  <span className="w-10 text-center text-gray-400 text-sm">{s.played}</span>
                  <span className="w-10 text-center text-gray-400 text-sm">{s.won}</span>
                  <span className="w-10 text-center text-gray-400 text-sm">{s.drawn}</span>
                  <span className="w-10 text-center text-gray-400 text-sm">{s.lost}</span>
                  <span className="w-12 text-center text-cyan-400 font-extrabold text-sm">{s.points}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Bracket */}
        {tab === "bracket" && tournament?.format === "knockout" && (
          <KnockoutBracket
            matches={matches}
            teams={teams}
            winnerName={tournament?.winner_team_name}
            isCompleted={isCompleted}
          />
        )}

        {/* Top Scorers */}
        {tab === "scorers" && (
          topScorers.length === 0 ? <div className="text-center py-16"><p className="text-white font-bold">No goals recorded yet</p></div> : (
            <div className="flex flex-col gap-2">
              {topScorers.map((s, i) => (
                <div key={s.player_name} className="flex items-center bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
                  <div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mr-4 shrink-0 " + (i === 0 ? "bg-orange-500 text-white" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-orange-800 text-white" : "bg-[#222] text-gray-400")}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{s.player_name}</p>
                    <p className="text-gray-500 text-xs">{s.teamName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-extrabold text-xl">{s.goals}</p>
                    <p className="text-gray-600 text-xs">goals</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <div className="text-center mt-12 pt-6 border-t border-[#111]">
          <p className="text-gray-600 text-xs">Powered by <span className="text-cyan-400 font-bold">FutKnight</span></p>
        </div>
      </main>
    </div>
  );
}