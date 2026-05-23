"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = { id: string; name: string; };
type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  round: number;
  home_team?: Team;
  away_team?: Team;
};
type TeamPlayer = { id: string; player_name: string; team_id: string; };
type GoalEntry = { playerId: string; playerName: string; teamId: string; goals: number; };

export default function FixturesPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");

  const [showGoals, setShowGoals] = useState(false);
  const [matchPlayers, setMatchPlayers] = useState<TeamPlayer[]>([]);
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>([]);
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null);
  const [matchGoals, setMatchGoals] = useState<{ [matchId: string]: any[] }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: t } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
    setTournament(t);

    const { data: teamsData } = await supabase.from("teams").select("*").eq("tournament_id", tournamentId);
    setTeams(teamsData || []);

    const { data: matchesData } = await supabase.from("matches").select("*")
      .eq("tournament_id", tournamentId).order("round", { ascending: true });

    if (matchesData && teamsData) {
      setMatches(matchesData.map(m => ({
        ...m,
        home_team: teamsData.find(t => t.id === m.home_team_id),
        away_team: teamsData.find(t => t.id === m.away_team_id),
      })));
    }

    const { data: goalsData } = await supabase.from("match_goals").select("*").eq("tournament_id", tournamentId);
    if (goalsData) {
      const goalsMap: { [matchId: string]: any[] } = {};
      goalsData.forEach(goal => {
        if (!goalsMap[goal.match_id]) goalsMap[goal.match_id] = [];
        goalsMap[goal.match_id].push(goal);
      });
      setMatchGoals(goalsMap);
    }

    setLoading(false);
  }, [supabase, tournamentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generateFixtures() {
    setGenerating(true);

    if (tournament.format === "round_robin") {
      const matchups: { home: Team; away: Team; round: number }[] = [];
      const n = teams.length;
      const teamsCopy = [...teams];

      for (let round = 0; round < n - 1; round++) {
        for (let i = 0; i < n / 2; i++) {
          const home = teamsCopy[i];
          const away = teamsCopy[n - 1 - i];
          if (home && away && home.id !== away.id) {
            matchups.push({ home, away, round: round + 1 });
          }
        }
        teamsCopy.splice(1, 0, teamsCopy.pop()!);
      }

      for (const matchup of matchups) {
        await supabase.from("matches").insert({
          tournament_id: tournamentId,
          home_team_id: matchup.home.id,
          away_team_id: matchup.away.id,
          status: "scheduled",
          round: matchup.round,
          home_score: 0,
          away_score: 0,
        });
      }
    } else {
      // Knockout — insert round 1 matches
      for (let i = 0; i < teams.length; i += 2) {
        if (teams[i] && teams[i + 1]) {
          await supabase.from("matches").insert({
            tournament_id: tournamentId,
            home_team_id: teams[i].id,
            away_team_id: teams[i + 1].id,
            status: "scheduled",
            round: 1,
            home_score: 0,
            away_score: 0,
          });
        }
      }
    }

    // FIX: Always set tournament to "active" after generating fixtures (both formats)
    await supabase.from("tournaments").update({ status: "active" }).eq("id", tournamentId);

    setGenerating(false);
    fetchData();
  }

  async function fetchMatchPlayers(match: Match) {
    const { data: homeMembers } = await supabase.from("team_members").select("user_id").eq("team_id", match.home_team_id);
    const { data: awayMembers } = await supabase.from("team_members").select("user_id").eq("team_id", match.away_team_id);

    const allUserIds = [
      ...(homeMembers || []).map(m => ({ userId: m.user_id, teamId: match.home_team_id })),
      ...(awayMembers || []).map(m => ({ userId: m.user_id, teamId: match.away_team_id })),
    ];

    const players: TeamPlayer[] = [];
    for (const { userId, teamId } of allUserIds) {
      const { data: tp } = await supabase.from("tournament_players").select("player_name")
        .eq("tournament_id", tournamentId).eq("user_id", userId).single();
      if (tp) {
        players.push({ id: userId, player_name: tp.player_name, team_id: teamId });
      }
    }

    setMatchPlayers(players);
    setGoalEntries(players.map(p => ({ playerId: p.id, playerName: p.player_name, teamId: p.team_id, goals: 0 })));
  }

  async function updateScore() {
    if (!scoringMatch) return;

    const homeGoals = parseInt(homeScore);
    const awayGoals = parseInt(awayScore);

    if (tournament.format === "knockout" && homeGoals === awayGoals) {
      alert("No draws allowed in knockout matches. There must be a winner.");
      return;
    }

    await supabase.from("matches").update({
      home_score: homeGoals,
      away_score: awayGoals,
      status: "completed",
    }).eq("id", scoringMatch.id);

    setSavedMatchId(scoringMatch.id);
    await fetchMatchPlayers(scoringMatch);
    setShowGoals(true);
  }

  async function saveGoals() {
    const homeGoalsEntered = goalEntries.filter(g => g.teamId === scoringMatch?.home_team_id).reduce((sum, g) => sum + g.goals, 0);
    const awayGoalsEntered = goalEntries.filter(g => g.teamId === scoringMatch?.away_team_id).reduce((sum, g) => sum + g.goals, 0);
    const expectedHome = parseInt(homeScore) || 0;
    const expectedAway = parseInt(awayScore) || 0;

    if (homeGoalsEntered !== expectedHome) {
      alert(`${scoringMatch?.home_team?.name} must have exactly ${expectedHome} goal${expectedHome !== 1 ? "s" : ""}. Currently: ${homeGoalsEntered}`);
      return;
    }

    if (awayGoalsEntered !== expectedAway) {
      alert(`${scoringMatch?.away_team?.name} must have exactly ${expectedAway} goal${expectedAway !== 1 ? "s" : ""}. Currently: ${awayGoalsEntered}`);
      return;
    }

    const goalsToSave = goalEntries.filter(g => g.goals > 0);

    await supabase.from("match_goals").delete().eq("match_id", savedMatchId);

    for (const goal of goalsToSave) {
      await supabase.from("match_goals").insert({
        match_id: savedMatchId,
        tournament_id: tournamentId,
        team_id: goal.teamId,
        player_name: goal.playerName,
        goals: goal.goals,
      });
    }

    if (tournament.format === "knockout" && scoringMatch) {
      await advanceKnockout(scoringMatch);
    }

    setShowGoals(false);
    setScoringMatch(null);
    setSavedMatchId(null);
    setGoalEntries([]);
    fetchData();
  }

  async function skipGoals() {
    if (tournament.format === "knockout" && scoringMatch) {
      await advanceKnockout(scoringMatch);
    }

    setShowGoals(false);
    setScoringMatch(null);
    setSavedMatchId(null);
    setGoalEntries([]);
    fetchData();
  }

  async function advanceKnockout(completedMatch: Match) {
    const currentRound = completedMatch.round;

    const { data: roundMatches } = await supabase.from("matches").select("*")
      .eq("tournament_id", tournamentId).eq("round", currentRound);

    if (!roundMatches) return;

    const allCompleted = roundMatches.every(m => m.status === "completed");
    if (!allCompleted) return;

    const winners: string[] = roundMatches.map(m => {
      return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
    });

    if (winners.length === 1) {
      const winnerTeam = teams.find(t => t.id === winners[0]);
      if (winnerTeam) {
        await supabase.from("tournaments").update({
          status: "completed",
          winner_team_id: winnerTeam.id,
          winner_team_name: winnerTeam.name,
        }).eq("id", tournamentId);

        alert(`🏆 Tournament Complete! ${winnerTeam.name} wins!`);
        router.push(`/admin/tournaments/${tournamentId}`);
      }
      return;
    }

    const nextRound = currentRound + 1;
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i] && winners[i + 1]) {
        await supabase.from("matches").insert({
          tournament_id: tournamentId,
          home_team_id: winners[i],
          away_team_id: winners[i + 1],
          status: "scheduled",
          round: nextRound,
          home_score: 0,
          away_score: 0,
        });
      }
    }

    alert(`⚡ Round ${currentRound} complete! Round ${nextRound} matches generated.`);
    fetchData();
  }

  async function finalizeTournament() {
    let winnerTeamId = "";
    let winnerName = "";

    if (tournament.format === "round_robin") {
      const standingsMap: { [key: string]: { teamId: string; teamName: string; points: number } } = {};
      teams.forEach(team => {
        standingsMap[team.id] = { teamId: team.id, teamName: team.name, points: 0 };
      });
      matches.forEach(m => {
        if (m.status !== "completed") return;
        if (m.home_score > m.away_score) {
          if (standingsMap[m.home_team_id]) standingsMap[m.home_team_id].points += 3;
        } else if (m.away_score > m.home_score) {
          if (standingsMap[m.away_team_id]) standingsMap[m.away_team_id].points += 3;
        } else {
          if (standingsMap[m.home_team_id]) standingsMap[m.home_team_id].points += 1;
          if (standingsMap[m.away_team_id]) standingsMap[m.away_team_id].points += 1;
        }
      });
      const sorted = Object.values(standingsMap).sort((a, b) => b.points - a.points);
      if (sorted.length > 0) {
        winnerTeamId = sorted[0].teamId;
        winnerName = sorted[0].teamName;
      }
    }

    await supabase.from("tournaments").update({
      status: "completed",
      winner_team_id: winnerTeamId,
      winner_team_name: winnerName,
    }).eq("id", tournamentId);

    alert(`🏆 Tournament finalized! Winner: ${winnerName}`);
    router.push(`/admin/tournaments/${tournamentId}`);
  }

  function updateGoalEntry(playerId: string, goals: number) {
    setGoalEntries(prev =>
      prev.map(g => g.playerId === playerId ? { ...g, goals: Math.max(0, goals) } : g)
    );
  }

  const homeGoalsEntered = goalEntries.filter(g => g.teamId === scoringMatch?.home_team_id).reduce((sum, g) => sum + g.goals, 0);
  const awayGoalsEntered = goalEntries.filter(g => g.teamId === scoringMatch?.away_team_id).reduce((sum, g) => sum + g.goals, 0);
  const expectedHome = parseInt(homeScore) || 0;
  const expectedAway = parseInt(awayScore) || 0;

  const allMatchesCompleted = matches.length > 0 && matches.every(m => m.status === "completed");
  const isCompleted = tournament?.status === "completed";
  const isActive = tournament?.status === "active";

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <button onClick={() => router.push(`/admin/tournaments/${tournamentId}`)} className="text-orange-500">← Back</button>
        <h1 className="text-cyan-400 text-lg font-bold flex-1 text-center">{tournament?.name}</h1>
        {matches.length === 0 ? (
          <button onClick={generateFixtures} disabled={generating} className="bg-orange-500 text-white px-3 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
            {generating ? "..." : "Generate"}
          </button>
        ) : (
          <button onClick={() => router.push(`/admin/tournaments/${tournamentId}`)} className="bg-cyan-400 text-black px-3 py-2 rounded-lg font-bold text-sm">
            Done ✓
          </button>
        )}
      </div>

      <p className="text-gray-500 text-xs text-center mb-6">
        {tournament?.format === "round_robin" ? "🔄 Round Robin" : "⚡ Knockout"} • {teams.length} Teams
      </p>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white font-bold text-lg">No fixtures yet</p>
          <p className="text-gray-600 text-sm mt-2">Tap "Generate" to create fixtures</p>
        </div>
      ) : (
        <>
          {/* Finalize button — round robin only, all matches done */}
          {allMatchesCompleted && !isCompleted && tournament?.format === "round_robin" && (
            <button onClick={finalizeTournament} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl mb-4">
              🏆 Finalize Tournament
            </button>
          )}

          {/* Matches list */}
          <div className="flex flex-col gap-2.5">
            {matches.map(m => (
              <div
                key={m.id}
                onClick={() => {
                  if (m.status === "completed") return;
                  if (!isActive) return; // FIX: only allow scoring when tournament is active
                  setScoringMatch(m);
                  setHomeScore(m.home_score.toString());
                  setAwayScore(m.away_score.toString());
                  setShowGoals(false);
                }}
                className={`bg-[#111] rounded-xl p-4 border ${
                  m.status !== "completed" && isActive
                    ? "border-[#333] cursor-pointer hover:border-cyan-400"
                    : "border-[#222]"
                }`}
              >
                <p className="text-gray-600 text-xs mb-2">Round {m.round}</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold flex-1 text-center text-sm">{m.home_team?.name}</span>
                  <span className="px-4">
                    {m.status === "completed"
                      ? <span className="text-cyan-400 text-lg font-bold">{m.home_score} - {m.away_score}</span>
                      : <span className="text-gray-600">vs</span>}
                  </span>
                  <span className="text-white font-bold flex-1 text-center text-sm">{m.away_team?.name}</span>
                </div>
                <p className={`text-center text-[11px] mt-2 ${m.status === "completed" ? "text-orange-500" : "text-gray-600"}`}>
                  {m.status.toUpperCase()}
                </p>

                {/* Goal scorers */}
                {m.status === "completed" && matchGoals[m.id] && matchGoals[m.id].length > 0 && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-[#222]">
                    <div className="flex-1">
                      {matchGoals[m.id].filter(g => g.team_id === m.home_team_id).map((g, i) => (
                        <p key={i} className="text-gray-500 text-xs">⚽ {g.player_name}{g.goals > 1 ? ` x${g.goals}` : ""}</p>
                      ))}
                    </div>
                    <div className="flex-1 text-right">
                      {matchGoals[m.id].filter(g => g.team_id === m.away_team_id).map((g, i) => (
                        <p key={i} className="text-gray-500 text-xs">⚽ {g.player_name}{g.goals > 1 ? ` x${g.goals}` : ""}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Score Modal */}
      {scoringMatch && !showGoals && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-cyan-400 text-xl font-bold mb-2">Update Score</h2>
            {tournament?.format === "knockout" && (
              <p className="text-orange-500 text-xs text-center mb-3">⚡ No draws allowed in knockout</p>
            )}
            <p className="text-white text-center mb-5">{scoringMatch.home_team?.name} vs {scoringMatch.away_team?.name}</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex flex-col items-center">
                <p className="text-gray-500 text-xs mb-2">{scoringMatch.home_team?.name}</p>
                <input
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center"
                />
              </div>
              <span className="text-gray-600 text-2xl font-bold">-</span>
              <div className="flex flex-col items-center">
                <p className="text-gray-500 text-xs mb-2">{scoringMatch.away_team?.name}</p>
                <input
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center"
                />
              </div>
            </div>
            <button onClick={updateScore} className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg mb-3">SAVE SCORE</button>
            <button onClick={() => setScoringMatch(null)} className="w-full text-gray-500 py-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Goals Modal */}
      {showGoals && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-2">⚽ Goal Scorers</h2>
            <p className="text-white text-center mb-1">{scoringMatch?.home_team?.name} <span className="text-cyan-400">{homeScore}</span> - <span className="text-cyan-400">{awayScore}</span> {scoringMatch?.away_team?.name}</p>
            <p className="text-orange-500 text-xs text-center mb-5">
              Enter exactly {expectedHome} goal{expectedHome !== 1 ? "s" : ""} for {scoringMatch?.home_team?.name} and {expectedAway} goal{expectedAway !== 1 ? "s" : ""} for {scoringMatch?.away_team?.name}
            </p>

            {/* Home team */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-orange-500 text-sm font-bold">{scoringMatch?.home_team?.name}</p>
                <p className={`text-sm font-bold ${homeGoalsEntered === expectedHome ? "text-cyan-400" : "text-red-500"}`}>
                  {homeGoalsEntered}/{expectedHome}
                </p>
              </div>
              {goalEntries.filter(g => g.teamId === scoringMatch?.home_team_id).map((entry) => (
                <div key={entry.playerId} className="flex justify-between items-center py-2.5 border-b border-[#222]">
                  <span className="text-white text-sm">{entry.playerName}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateGoalEntry(entry.playerId, entry.goals - 1)} className="w-8 h-8 rounded-full bg-[#222] text-cyan-400 text-lg font-bold">−</button>
                    <span className="text-white text-lg font-bold w-6 text-center">{entry.goals}</span>
                    <button onClick={() => updateGoalEntry(entry.playerId, entry.goals + 1)} className="w-8 h-8 rounded-full bg-[#222] text-cyan-400 text-lg font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Away team */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-orange-500 text-sm font-bold">{scoringMatch?.away_team?.name}</p>
                <p className={`text-sm font-bold ${awayGoalsEntered === expectedAway ? "text-cyan-400" : "text-red-500"}`}>
                  {awayGoalsEntered}/{expectedAway}
                </p>
              </div>
              {goalEntries.filter(g => g.teamId === scoringMatch?.away_team_id).map((entry) => (
                <div key={entry.playerId} className="flex justify-between items-center py-2.5 border-b border-[#222]">
                  <span className="text-white text-sm">{entry.playerName}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateGoalEntry(entry.playerId, entry.goals - 1)} className="w-8 h-8 rounded-full bg-[#222] text-cyan-400 text-lg font-bold">−</button>
                    <span className="text-white text-lg font-bold w-6 text-center">{entry.goals}</span>
                    <button onClick={() => updateGoalEntry(entry.playerId, entry.goals + 1)} className="w-8 h-8 rounded-full bg-[#222] text-cyan-400 text-lg font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveGoals} className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg mb-3">SAVE GOALS</button>
            <button onClick={skipGoals} className="w-full text-gray-500 py-3 text-sm">Skip — No goals to track</button>
          </div>
        </div>
      )}
    </div>
  );
}