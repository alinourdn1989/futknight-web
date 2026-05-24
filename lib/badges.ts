import { createClient } from "@/lib/supabase/client";

const BADGES = {
  champion: { key: "champion", label: "Champion", icon: "trophy", desc: "Won a tournament", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30" },
  top_scorer: { key: "top_scorer", label: "Top Scorer", icon: "goal", desc: "Most goals in a tournament", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30" },
  hat_trick: { key: "hat_trick", label: "Hat-trick Hero", icon: "hat", desc: "Scored 3+ goals in a single match", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  undefeated: { key: "undefeated", label: "Undefeated", icon: "shield", desc: "Team never lost a match", color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
  veteran: { key: "veteran", label: "Veteran", icon: "star", desc: "Played 5+ tournaments", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  serial_winner: { key: "serial_winner", label: "Serial Winner", icon: "crown", desc: "Won 3+ tournaments", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  finalist: { key: "finalist", label: "Finalist", icon: "medal", desc: "Reached the knockout final", color: "text-gray-300", bg: "bg-gray-300/10 border-gray-300/30" },
};

export type BadgeKey = keyof typeof BADGES;
export { BADGES };

export async function awardBadgesForTournament(tournamentId: string) {
  const supabase = createClient();

  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (!tournament || tournament.status !== "completed") return;

  const { data: tPlayers } = await supabase.from("tournament_players").select("player_name, user_id").eq("tournament_id", tournamentId);
  const { data: matches } = await supabase.from("matches").select("*").eq("tournament_id", tournamentId);
  const { data: goals } = await supabase.from("match_goals").select("*").eq("tournament_id", tournamentId);
  const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tournamentId);
  const { data: teamMembers } = await supabase.from("team_members").select("*").in("team_id", (teams || []).map(t => t.id));

  if (!tPlayers) return;

  async function award(playerName: string, userId: string | null, badgeKey: string, badgeLabel: string) {
    await supabase.from("player_badges").upsert({
      player_name: playerName,
      user_id: userId,
      badge_key: badgeKey,
      badge_label: badgeLabel,
      tournament_id: tournamentId,
    }, { onConflict: "player_name,badge_key,tournament_id" });
  }

  // 1. Champion badge
  if (tournament.winner_team_name) {
    const winnerTeam = (teams || []).find(t => t.name === tournament.winner_team_name);
    if (winnerTeam) {
      const winnerMembers = (teamMembers || []).filter(m => m.team_id === winnerTeam.id);
      for (const member of winnerMembers) {
        const player = tPlayers.find(p => p.user_id === member.user_id);
        if (player) await award(player.player_name, player.user_id, "champion", "Champion");
      }
    }
  }

  // 2. Top scorer badge
  const scorerMap: { [name: string]: number } = {};
  (goals || []).forEach(g => { scorerMap[g.player_name] = (scorerMap[g.player_name] || 0) + g.goals; });
  const topScorerEntry = Object.entries(scorerMap).sort((a, b) => b[1] - a[1])[0];
  if (topScorerEntry && topScorerEntry[1] > 0) {
    const player = tPlayers.find(p => p.player_name === topScorerEntry[0]);
    if (player) await award(player.player_name, player.user_id, "top_scorer", "Top Scorer");
  }

  // 3. Hat-trick Hero — 3+ goals in a single match
  const matchGoalMap: { [matchId: string]: { [name: string]: number } } = {};
  (goals || []).forEach(g => {
    if (!matchGoalMap[g.match_id]) matchGoalMap[g.match_id] = {};
    matchGoalMap[g.match_id][g.player_name] = (matchGoalMap[g.match_id][g.player_name] || 0) + g.goals;
  });
  for (const matchGoals of Object.values(matchGoalMap)) {
    for (const [playerName, goalCount] of Object.entries(matchGoals)) {
      if (goalCount >= 3) {
        const player = tPlayers.find(p => p.player_name === playerName);
        if (player) await award(player.player_name, player.user_id, "hat_trick", "Hat-trick Hero");
      }
    }
  }

  // 4. Undefeated — team never lost
  if (teams && teamMembers && matches) {
    for (const team of teams) {
      const teamMatches = matches.filter(m => m.home_team_id === team.id || m.away_team_id === team.id);
      const completedMatches = teamMatches.filter(m => m.status === "completed");
      if (completedMatches.length === 0) continue;
      const neverLost = completedMatches.every(m => {
        if (m.home_team_id === team.id) return m.home_score >= m.away_score;
        return m.away_score >= m.home_score;
      });
      if (neverLost) {
        const members = teamMembers.filter(m => m.team_id === team.id);
        for (const member of members) {
          const player = tPlayers.find(p => p.user_id === member.user_id);
          if (player) await award(player.player_name, player.user_id, "undefeated", "Undefeated");
        }
      }
    }
  }

  // 5. Finalist — knockout: reached the last round before final (round = max - 1) or final
  if (tournament.format === "knockout" && matches) {
    const maxRound = Math.max(...matches.map(m => m.round));
    const finalMatch = matches.find(m => m.round === maxRound);
    if (finalMatch) {
      const finalistTeamIds = [finalMatch.home_team_id, finalMatch.away_team_id];
      for (const teamId of finalistTeamIds) {
        const members = (teamMembers || []).filter(m => m.team_id === teamId);
        for (const member of members) {
          const player = tPlayers.find(p => p.user_id === member.user_id);
          if (player) await award(player.player_name, player.user_id, "finalist", "Finalist");
        }
      }
    }
  }

  // 6. Veteran + Serial Winner — across all tournaments (check after awarding)
  for (const player of tPlayers) {
    const { data: allTp } = await supabase.from("tournament_players").select("tournament_id").eq("player_name", player.player_name);
    const { data: wonBadges } = await supabase.from("player_badges").select("id").eq("player_name", player.player_name).eq("badge_key", "champion");

    if ((allTp || []).length >= 5) {
      await supabase.from("player_badges").upsert({
        player_name: player.player_name,
        user_id: player.user_id,
        badge_key: "veteran",
        badge_label: "Veteran",
        tournament_id: tournamentId,
      }, { onConflict: "player_name,badge_key,tournament_id" });
    }

    if ((wonBadges || []).length >= 3) {
      await supabase.from("player_badges").upsert({
        player_name: player.player_name,
        user_id: player.user_id,
        badge_key: "serial_winner",
        badge_label: "Serial Winner",
        tournament_id: tournamentId,
      }, { onConflict: "player_name,badge_key,tournament_id" });
    }
  }
}
