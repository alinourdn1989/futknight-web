"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

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
  const [dragOverTeam, setDragOverTeam] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (t) setTournament(t);
    const { data: tp } = await supabase.from("tournament_players").select("*").eq("tournament_id", id);
    if (tp) setPlayers(tp);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!tournament || players.length === 0) return;
    const method = tournament.formation_method;
    const size = tournament.team_size;

    if (size === "1v1") {
      setTeams(players.map((p, i) => ({ name: `Team ${i + 1}`, members: [p] })));
      return;
    }

    const playersPerTeam = 2;
    let orderedPlayers = [...players];

    if (method === "random") {
      orderedPlayers = orderedPlayers.sort(() => Math.random() - 0.5);
    } else if (method === "seeded") {
      const numTeams = Math.floor(players.length / playersPerTeam);
      const newTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({ name: `Team ${i + 1}`, members: [] }));
      orderedPlayers.forEach((p, i) => { newTeams[i % numTeams].members.push(p); });
      setTeams(newTeams);
      return;
    }

    const numTeams = Math.floor(orderedPlayers.length / playersPerTeam);
    const newTeams: Team[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({ name: `Team ${i + 1}`, members: orderedPlayers.slice(i * playersPerTeam, (i + 1) * playersPerTeam) });
    }
    setTeams(newTeams);
  }, [players, tournament]);

  function reshuffleRandom() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const numTeams = Math.floor(shuffled.length / 2);
    const newTeams: Team[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({ name: `Team ${i + 1}`, members: shuffled.slice(i * 2, (i + 1) * 2) });
    }
    setTeams(newTeams);
  }

  function movePlayerToTeam(player: TournamentPlayer, toTeamIdx: number) {
    setTeams(prev => {
      const next = prev.map(t => ({ ...t, members: [...t.members] }));
      next.forEach(t => { t.members = t.members.filter(m => m.id !== player.id); });
      next[toTeamIdx].members.push(player);
      return next;
    });
  }

  function updateTeamName(idx: number, name: string) {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, name } : t));
  }

  async function saveTeams() {
    if (teams.some(t => t.members.length === 0)) { alert("All teams must have at least one player"); return; }
    setSaving(true);
    for (const team of teams) {
      const { data: teamData } = await supabase.from("teams").insert({ tournament_id: id, name: team.name }).select().single();
      if (!teamData) continue;
      for (const member of team.members) {
        await supabase.from("team_members").insert({ team_id: teamData.id, user_id: member.user_id });
      }
    }
    setSaving(false);
    // FIX 1: Navigate to fixtures page after confirming teams
    router.push(`/admin/tournaments/${id}/fixtures`);
  }

  if (loading) return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 md:ml-56 flex items-center justify-center"><p className="text-cyan-400">Loading...</p></main>
    </div>
  );
  if (!tournament) return null;

  const isManual = tournament.formation_method === "manual";
  const isRandom = tournament.formation_method === "random";
  const is1v1 = tournament.team_size === "1v1";
  const assignedIds = teams.flatMap(t => t.members.map(m => m.id));
  const unassigned = players.filter(p => !assignedIds.includes(p.id));

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />

      <main className="flex-1 md:ml-56 px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <button onClick={() => router.back()} className="text-orange-500 text-sm mb-1">← Back</button>
            <h1 className="text-white text-2xl font-extrabold">⚡ Form Teams</h1>
          </div>
          {isRandom && !is1v1 && (
            <button onClick={reshuffleRandom} className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-4 py-2.5 rounded-lg hover:border-cyan-400 text-sm transition">
              🎲 Reshuffle
            </button>
          )}
        </div>

        <p className="text-gray-500 text-sm mb-8">
          {is1v1 ? "1v1 — each player is their own team" :
            isManual ? "Manual — drag players between teams to assign" :
            isRandom ? "Random — reshuffled randomly. Edit names or reshuffle." :
            "Seeded — players spread evenly across teams"}
        </p>

        <div className="flex gap-6">
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {teams.map((team, teamIdx) => (
                <div
                  key={teamIdx}
                  // FIX 4: Visual feedback when dragging over a team
                  className={`rounded-xl border p-4 transition-all ${
                    dragOverTeam === teamIdx
                      ? "bg-[#001A1A] border-cyan-400 scale-[1.02] shadow-lg shadow-cyan-400/10"
                      : "bg-[#111] border-cyan-400"
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOverTeam(teamIdx); }}
                  onDragLeave={() => setDragOverTeam(null)}
                  onDrop={e => {
                    e.preventDefault();
                    if (dragPlayer) movePlayerToTeam(dragPlayer, teamIdx);
                    setDragPlayer(null);
                    setDragOverTeam(null);
                  }}
                >
                  <input
                    className="bg-transparent text-cyan-400 font-bold text-base w-full border-b border-[#333] pb-1 mb-3 focus:outline-none focus:border-cyan-400"
                    value={team.name}
                    onChange={e => updateTeamName(teamIdx, e.target.value)}
                  />
                  {team.members.length === 0 ? (
                    <p className="text-gray-600 text-sm italic py-4 text-center">Drop a player here</p>
                  ) : (
                    team.members.map((member) => (
                      <div
                        key={member.id}
                        // FIX 4: Better cursor and drag styling
                        className={`flex items-center gap-3 py-2.5 border-t border-[#222] rounded transition-all ${
                          isManual && !is1v1
                            ? "cursor-grab hover:bg-[#1A1A1A] active:cursor-grabbing active:opacity-50 select-none"
                            : ""
                        } ${dragPlayer?.id === member.id ? "opacity-30" : ""}`}
                        draggable={isManual && !is1v1}
                        onDragStart={(e) => {
                          setDragPlayer(member);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => { setDragPlayer(null); setDragOverTeam(null); }}
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {member.player_name[0].toUpperCase()}
                        </div>
                        <span className="text-white text-sm flex-1">{member.player_name}</span>
                        {isManual && !is1v1 && <span className="text-gray-600 text-base">⠿</span>}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveTeams}
              disabled={saving}
              className="w-full bg-cyan-400 text-black font-bold py-4 rounded-xl hover:bg-cyan-300 disabled:opacity-50 text-base transition"
            >
              {saving ? "Saving..." : "✅ Confirm Teams"}
            </button>
          </div>

          {/* Unassigned players panel — desktop, manual 2v2 */}
          {isManual && !is1v1 && (
            <div className="hidden md:block w-56 shrink-0">
              <div className="bg-[#111] border border-[#333] rounded-xl p-4 sticky top-8">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">
                  Unassigned {unassigned.length > 0 && <span className="text-orange-500">({unassigned.length})</span>}
                </p>
                {unassigned.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">All players assigned ✅</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {unassigned.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => { setDragPlayer(p); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => { setDragPlayer(null); setDragOverTeam(null); }}
                        className={`flex items-center gap-2 bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2.5 cursor-grab hover:border-cyan-400 hover:bg-[#0D1A1A] transition select-none ${dragPlayer?.id === p.id ? "opacity-30" : ""}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.player_name[0].toUpperCase()}
                        </div>
                        <span className="text-white text-sm">{p.player_name}</span>
                        <span className="text-gray-600 text-base ml-auto">⠿</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile unassigned pool */}
        {isManual && !is1v1 && unassigned.length > 0 && (
          <div className="md:hidden bg-[#1A1A1A] rounded-xl border border-[#333] p-4 mt-4">
            <p className="text-gray-500 text-sm font-bold mb-3">Unassigned Players — drag to a team</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => { setDragPlayer(p); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragPlayer(null); setDragOverTeam(null); }}
                  className={`flex items-center gap-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 cursor-grab hover:border-cyan-400 select-none ${dragPlayer?.id === p.id ? "opacity-30" : ""}`}
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    {p.player_name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{p.player_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
