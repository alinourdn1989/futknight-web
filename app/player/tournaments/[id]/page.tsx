"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
type TopScorer = { player_name: string; team_id: string; teamName: string; goals: number; };

export default function PlayerTournamentDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchGoals, setMatchGoals] = useState<{ [matchId: string]: { team_id: string; player_name: string; goals: number }[] }>({});
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [myTeamId, setMyTeamId] = useState("");
  const [myPlayerName, setMyPlayerName] = useState("");
  const [tab, setTab] = useState<"fixtures" | "standings" | "stats" | "bracket">("fixtures");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (t) setTournament(t);
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
      const map: { [k: string]: { team_id: string; player_name: string; goals: number }[] } = {};
      goals.forEach(g => {
        if (!map[g.match_id]) map[g.match_id] = [];
        map[g.match_id].push(g);
      });
      setMatchGoals(map);
      const scorerMap: { [name: string]: TopScorer } = {};
      goals.forEach(g => {
        if (!scorerMap[g.player_name]) {
          const team = teamsData?.find(t => t.id === g.team_id);
          scorerMap[g.player_name] = { player_name: g.player_name, team_id: g.team_id, teamName: team?.name || "", goals: 0 };
        }
        scorerMap[g.player_name].goals += g.goals;
      });
      setTopScorers(Object.values(scorerMap).sort((a, b) => b.goals - a.goals));
    }
    if (user && teamsData) {
      const { data: tp } = await supabase.from("tournament_players").select("player_name").eq("tournament_id", id).eq("user_id", user.id).single();
      if (tp) setMyPlayerName(tp.player_name);
      for (const team of teamsData) {
        const { data: member } = await supabase.from("team_members").select("id").eq("team_id", team.id).eq("user_id", user.id).maybeSingle();
        if (member) { setMyTeamId(team.id); break; }
      }
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

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading...</p></div>;
  if (!tournament) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-gray-500">Tournament not found</p></div>;

  const isCompleted = tournament.status === "completed";
  const standings = calculateStandings();
  const myTeamName = teams.find(t => t.id === myTeamId)?.name || "";
  const myGoals = topScorers.find(s => s.player_name === myPlayerName)?.goals || 0;
  const matchesByRound: { [round: number]: Match[] } = {};
  matches.forEach(m => { if (!matchesByRound[m.round]) matchesByRound[m.round] = []; matchesByRound[m.round].push(m); });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/player/tournaments")} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold hidden md:block">FutKnight</span>
        <div className="w-16" />
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-white text-2xl font-extrabold">{tournament.name}</h1>
            <div className="flex gap-2 flex-wrap mt-2">
              <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{tournament.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
              <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{tournament.game}</span>
              <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{tournament.team_size}</span>
              {myTeamName && <span className="text-cyan-400 text-xs bg-[#001A1A] border border-cyan-400 px-2 py-1 rounded">{myTeamName}</span>}
            </div>
          </div>
          <span className={"text-xs font-bold px-3 py-1.5 rounded-lg border " + (isCompleted ? "text-orange-500 border-orange-500" : tournament.status === "active" ? "text-cyan-400 border-cyan-400" : "text-gray-500 border-[#333]")}>
            {tournament.status === "upcoming" ? "Upcoming" : tournament.status === "active" ? "Active" : "Completed"}
          </span>
        </div>

        {(myGoals > 0 || myTeamName) && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 flex gap-6 mb-6">
            {myTeamName && <div><p className="text-gray-500 text-xs uppercase tracking-widest mb-1">My Team</p><p className="text-cyan-400 font-bold">{myTeamName}</p></div>}
            {myGoals > 0 && <div><p className="text-gray-500 text-xs uppercase tracking-widest mb-1">My Goals</p><p className="text-orange-500 font-bold text-xl">{myGoals}</p></div>}
          </div>
        )}

        {isCompleted && tournament.winner_team_name && (
          <div className="bg-[#1A0A00] border border-orange-500 rounded-2xl p-6 text-center mb-6">
            <div className="text-5xl mb-2">🏆</div>
            <div className="text-orange-500 text-xl font-bold mb-1">Tournament Completed!</div>
            <div className="text-gray-400">
              Winner: <span className="text-orange-500 font-bold">{tournament.winner_team_name}</span>
              {myTeamName === tournament.winner_team_name && <span className="text-cyan-400 font-bold"> — that&apos;s your team!</span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#222] mb-6 overflow-x-auto">
          <button onClick={() => setTab("fixtures")} className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "fixtures" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>Fixtures</button>
          {tournament.format === "round_robin" && (
            <button onClick={() => setTab("standings")} className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "standings" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>Standings</button>
          )}
          {tournament.format === "knockout" && (
            <button onClick={() => setTab("bracket")} className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "bracket" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>Bracket</button>
          )}
          <button onClick={() => setTab("stats")} className={"px-5 py-2.5 font-bold text-sm whitespace-nowrap " + (tab === "stats" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>Stats</button>
        </div>

        {/* Fixtures */}
        {tab === "fixtures" && (
          matches.length === 0 ? (
            <div className="text-center py-16"><p className="text-white font-bold">No fixtures yet</p></div>
          ) : (
            <div>
              {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                <div key={round} className="mb-8">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Round {round}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roundMatches.map((m) => {
                      const mine = m.home_team_id === myTeamId || m.away_team_id === myTeamId;
                      return (
                        <div key={m.id} className={"bg-[#111] rounded-xl p-4 border " + (mine ? "border-cyan-400" : "border-[#1A1A1A]")}>
                          {mine && <p className="text-cyan-400 text-xs font-bold mb-2">Your match</p>}
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold flex-1 text-center text-sm">{m.home_team?.name}</span>
                            <span className="px-4">{m.status === "completed" ? <span className="text-cyan-400 text-lg font-bold">{m.home_score} - {m.away_score}</span> : <span className="text-gray-600">vs</span>}</span>
                            <span className="text-white font-bold flex-1 text-center text-sm">{m.away_team?.name}</span>
                          </div>
                          <div className={"text-center text-[11px] mt-2 " + (m.status === "completed" ? "text-orange-500" : "text-gray-600")}>{m.status.toUpperCase()}</div>
                          {m.status === "completed" && matchGoals[m.id]?.length > 0 && (
                            <div className="flex mt-2.5 pt-2 border-t border-[#222]">
                              <div className="flex-1">{matchGoals[m.id].filter(g => g.team_id === m.home_team_id).map((g, i) => (<div key={i} className={"text-[11px] " + (g.player_name === myPlayerName ? "text-cyan-400 font-bold" : "text-gray-500")}>{g.player_name}{g.goals > 1 ? " x" + g.goals : ""}</div>))}</div>
                              <div className="flex-1 text-right">{matchGoals[m.id].filter(g => g.team_id === m.away_team_id).map((g, i) => (<div key={i} className={"text-[11px] " + (g.player_name === myPlayerName ? "text-cyan-400 font-bold" : "text-gray-500")}>{g.player_name}{g.goals > 1 ? " x" + g.goals : ""}</div>))}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Standings */}
        {tab === "standings" && tournament.format === "round_robin" && (
          matches.length === 0 ? <div className="text-center py-16"><p className="text-white font-bold">No standings yet</p></div> : (
            <div className="max-w-2xl">
              <div className="flex py-2.5 px-4 bg-[#111] rounded-lg mb-1 text-gray-600 text-xs font-bold uppercase tracking-widest">
                <span className="flex-[2]">Team</span>
                <span className="flex-1 text-center">P</span><span className="flex-1 text-center">W</span><span className="flex-1 text-center">D</span><span className="flex-1 text-center">L</span><span className="flex-1 text-center">PTS</span>
              </div>
              {standings.map((s, i) => (
                <div key={s.teamId} className={"flex py-3.5 px-4 items-center rounded-lg " + (s.teamId === myTeamId ? "bg-[#001A1A]" : i % 2 === 0 ? "bg-[#111]" : "")}>
                  <span className="flex-[2] flex items-center gap-2">
                    <span className="text-gray-600 text-sm w-5">{i + 1}</span>
                    <span className="text-white font-bold text-sm">{s.teamName}</span>
                    {isCompleted && i === 0 && <span>🏆</span>}
                    {s.teamId === myTeamId && <span className="text-cyan-400 text-[10px] font-bold">YOU</span>}
                  </span>
                  <span className="flex-1 text-center text-gray-400 text-sm">{s.played}</span>
                  <span className="flex-1 text-center text-gray-400 text-sm">{s.won}</span>
                  <span className="flex-1 text-center text-gray-400 text-sm">{s.drawn}</span>
                  <span className="flex-1 text-center text-gray-400 text-sm">{s.lost}</span>
                  <span className="flex-1 text-center text-cyan-400 font-bold text-sm">{s.points}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Bracket */}
        {tab === "bracket" && tournament.format === "knockout" && (
          <KnockoutBracket
            matches={matches}
            teams={teams}
            winnerName={tournament.winner_team_name}
            myTeamId={myTeamId}
            isCompleted={isCompleted}
          />
        )}

        {/* Stats */}
        {tab === "stats" && (
          <div className="max-w-2xl">
            <h3 className="text-white font-bold mb-4">Top Scorers</h3>
            {topScorers.length === 0 ? <div className="text-center py-16"><p className="text-white font-bold">No goals recorded yet</p></div> : (
              <div className="flex flex-col gap-2">
                {topScorers.map((s, i) => (
                  <div key={s.player_name} className={"flex items-center bg-[#111] rounded-xl p-4 border " + (s.player_name === myPlayerName ? "border-cyan-400" : "border-[#1A1A1A]")}>
                    <div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mr-4 " + (i === 0 ? "bg-orange-500 text-white" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-orange-800 text-white" : "bg-[#222] text-gray-400")}>{i + 1}</div>
                    <div className="flex-1">
                      <p className={"font-bold text-sm " + (s.player_name === myPlayerName ? "text-cyan-400" : "text-white")}>{s.player_name}{s.player_name === myPlayerName ? " (You)" : ""}</p>
                      <p className="text-gray-500 text-xs">{s.teamName}</p>
                    </div>
                    <div className="text-right"><p className="text-orange-500 font-bold text-xl">{s.goals}</p><p className="text-gray-600 text-xs">goals</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-10" />
      </main>
    </div>
  );
}
