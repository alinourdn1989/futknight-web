"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TournamentPlayer = { id: string; user_id: string; player_name: string; status: string; };
type Team = { name: string; members: TournamentPlayer[]; };

export default function FormTeams() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [tournament, setTournament] = useState<{ name: string; team_size: string; formation_method: string; format: string } | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragPlayer, setDragPlayer] = useState<TournamentPlayer | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (t) setTournament(t);

    const { data: tp } = await supabase.from("tournament_players").select("*").eq("tournament_id", id);
    if (tp) setPlayers(tp);

    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-build teams when players load
  useEffect(() => {
    if (!tournament || players.length === 0) return;

    const method = tournament.formation_method;
    const size = tournament.team_size;

    if (size === "1v1") {
      // Each player is their own team
      setTeams(players.map((p, i) => ({ name: `Team ${i + 1}`, members: [p] })));
      return;
    }

    // 2v2: 2 players per team
    const playersPerTeam = 2;
    let orderedPlayers = [...players];

    if (method === "random") {
      orderedPlayers = orderedPlayers.sort(() => Math.random() - 0.5);
    } else if (method === "seeded") {
      // Seeded: snake draft — best players spread across teams
      // We don't have ratings, so just alternate
      const numTeams = Math.floor(players.length / playersPerTeam);
      const newTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({ name: `Team ${i + 1}`, members: [] }));
      orderedPlayers.forEach((p, i) => {
        const teamIdx = i % numTeams;
        newTeams[teamIdx].members.push(p);
      });
      setTeams(newTeams);
      return;
    }

    // Manual or Random (after shuffle): pair players sequentially
    const numTeams = Math.floor(orderedPlayers.length / playersPerTeam);
    const newTeams: Team[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({
        name: `Team ${i + 1}`,
        members: orderedPlayers.slice(i * playersPerTeam, (i + 1) * playersPerTeam),
      });
    }
    setTeams(newTeams);
  }, [players, tournament]);

  function reshuffleRandom() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const playersPerTeam = 2;
    const numTeams = Math.floor(shuffled.length / playersPerTeam);
    const newTeams: Team[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({
        name: `Team ${i + 1}`,
        members: shuffled.slice(i * playersPerTeam, (i + 1) * playersPerTeam),
      });
    }
    setTeams(newTeams);
  }

  function movePlayerToTeam(player: TournamentPlayer, toTeamIdx: number) {
    setTeams(prev => {
      const next = prev.map(t => ({ ...t, members: [...t.members] }));
      // Remove from current team
      next.forEach(t => { t.members = t.members.filter(m => m.id !== player.id); });
      // Add to target team
      next[toTeamIdx].members.push(player);
      return next;
    });
  }

  function updateTeamName(idx: number, name: string) {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, name } : t));
  }

  async function saveTeams() {
    if (teams.some(t => t.members.length === 0)) {
      alert("All teams must have at least one player");
      return;
    }
    setSaving(true);

    for (const team of teams) {
      // Insert team
      const { data: teamData } = await supabase.from("teams").insert({
        tournament_id: id,
        name: team.name,
      }).select().single();

      if (!teamData) continue;

      // Insert team members
      for (const member of team.members) {
        await supabase.from("team_members").insert({
          team_id: teamData.id,
          user_id: member.user_id,
        });
      }
    }

    setSaving(false);
    router.push(`/admin/tournaments/${id}`);
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading...</p></div>;
  if (!tournament) return null;

  const isManual = tournament.formation_method === "manual";
  const isRandom = tournament.formation_method === "random";
  const is1v1 = tournament.team_size === "1v1";

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="text-orange-500 mb-4">← Back</button>

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-cyan-400 text-2xl font-bold">⚡ Form Teams</h1>
        {isRandom && !is1v1 && (
          <button
            onClick={reshuffleRandom}
            className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-4 py-2 rounded-lg hover:border-cyan-400 text-sm"
          >
            🎲 Reshuffle
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">
        {is1v1 ? "1v1 — each player is their own team" :
          isManual ? "Manual — drag players between teams to assign" :
          isRandom ? "Random — reshuffled randomly. Edit names or reshuffle." :
          "Seeded — players spread evenly across teams"}
      </p>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {teams.map((team, teamIdx) => (
          <div
            key={teamIdx}
            className="bg-[#111] rounded-xl border border-cyan-400 p-4"
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              if (dragPlayer) movePlayerToTeam(dragPlayer, teamIdx);
              setDragPlayer(null);
            }}
          >
            {/* Team name (editable) */}
            <input
              className="bg-transparent text-cyan-400 font-bold text-base w-full border-b border-[#333] pb-1 mb-3 focus:outline-none focus:border-cyan-400"
              value={team.name}
              onChange={e => updateTeamName(teamIdx, e.target.value)}
            />

            {/* Members */}
            {team.members.length === 0 ? (
              <p className="text-gray-600 text-sm italic">Drop a player here</p>
            ) : (
              team.members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 py-2 border-t border-[#222] ${isManual && !is1v1 ? "cursor-grab" : ""}`}
                  draggable={isManual && !is1v1}
                  onDragStart={() => setDragPlayer(member)}
                  onDragEnd={() => setDragPlayer(null)}
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {member.player_name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{member.player_name}</span>
                  {isManual && !is1v1 && <span className="text-gray-600 text-xs ml-auto">drag</span>}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Manual: unassigned players pool */}
      {isManual && !is1v1 && (() => {
        const assignedIds = teams.flatMap(t => t.members.map(m => m.id));
        const unassigned = players.filter(p => !assignedIds.includes(p.id));
        return unassigned.length > 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4 mb-6">
            <p className="text-gray-500 text-sm font-bold mb-3">Unassigned Players — drag to a team</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDragPlayer(p)}
                  onDragEnd={() => setDragPlayer(null)}
                  className="flex items-center gap-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 cursor-grab hover:border-cyan-400"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    {p.player_name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{p.player_name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      <button
        onClick={saveTeams}
        disabled={saving}
        className="w-full bg-cyan-400 text-black font-bold py-4 rounded-xl hover:bg-cyan-300 disabled:opacity-50 text-lg"
      >
        {saving ? "Saving..." : "✅ Confirm Teams"}
      </button>
    </div>
  );
}