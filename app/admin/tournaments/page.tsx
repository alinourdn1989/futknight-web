"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type Tournament = {
  id: string; name: string; game: string; format: string;
  team_size: string; status: string; date: string; formation_method: string;
  matchCount?: number; completedMatches?: number; playerCount?: number; goalCount?: number;
  winner_team_name?: string;
};

const GAMES = ["FIFA", "CoD", "NBA 2K", "Rocket League", "Other"];
const FORMATS = ["round_robin", "knockout"];
const TEAM_SIZES = ["1v1", "2v2"];
const FORMATION_METHODS = ["manual", "random", "seeded"];
const FILTER_TABS = ["all", "active", "upcoming", "completed"] as const;

export default function AdminTournaments() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "upcoming" | "completed">("all");

  const [name, setName] = useState("");
  const [game, setGame] = useState("FIFA");
  const [format, setFormat] = useState("round_robin");
  const [teamSize, setTeamSize] = useState("1v1");
  const [formationMethod, setFormationMethod] = useState("manual");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("tournaments").select("*").eq("created_by", user?.id).order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    const tIds = data.map(t => t.id);
    const [matchRes, playerRes, goalRes] = await Promise.all([
      supabase.from("matches").select("tournament_id, status").in("tournament_id", tIds),
      supabase.from("tournament_players").select("tournament_id").in("tournament_id", tIds),
      supabase.from("match_goals").select("tournament_id, goals").in("tournament_id", tIds),
    ]);

    const matches = matchRes.data || [];
    const players = playerRes.data || [];
    const goals = goalRes.data || [];

    const enriched = data.map(t => ({
      ...t,
      matchCount: matches.filter(m => m.tournament_id === t.id).length,
      completedMatches: matches.filter(m => m.tournament_id === t.id && m.status === "completed").length,
      playerCount: players.filter(p => p.tournament_id === t.id).length,
      goalCount: goals.filter(g => g.tournament_id === t.id).reduce((s, g) => s + (g.goals || 0), 0),
    }));

    setTournaments(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  async function createTournament() {
    if (!name) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("tournaments").insert({
      name, game, format, team_size: teamSize,
      formation_method: teamSize === "1v1" ? "auto" : formationMethod,
      created_by: user?.id, status: "upcoming", date,
    });
    setModalOpen(false);
    setName(""); setGame("FIFA"); setFormat("round_robin"); setTeamSize("1v1");
    setFormationMethod("manual"); setDate(new Date().toISOString().split("T")[0]);
    setCreating(false);
    fetchTournaments();
  }

  function openEdit(t: Tournament, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTournament(t); setEditName(t.name); setEditDate(t.date); setEditModalOpen(true);
  }

  async function saveEdit() {
    if (!editTournament || !editName.trim()) return;
    setSaving(true);
    await supabase.from("tournaments").update({ name: editName.trim(), date: editDate }).eq("id", editTournament.id);
    setSaving(false); setEditModalOpen(false); setEditTournament(null); fetchTournaments();
  }

  async function deleteTournament(t: Tournament, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? This will remove all matches, scores and player data. This cannot be undone.`)) return;
    await supabase.from("match_goals").delete().eq("tournament_id", t.id);
    await supabase.from("matches").delete().eq("tournament_id", t.id);
    const { data: teams } = await supabase.from("teams").select("id").eq("tournament_id", t.id);
    if (teams?.length) await supabase.from("team_members").delete().in("team_id", teams.map(t => t.id));
    await supabase.from("teams").delete().eq("tournament_id", t.id);
    await supabase.from("tournament_players").delete().eq("tournament_id", t.id);
    await supabase.from("tournaments").delete().eq("id", t.id);
    fetchTournaments();
  }

  const filtered = tournaments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterTab === "all" || t.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const active = filtered.filter(t => t.status === "active");
  const upcoming = filtered.filter(t => t.status === "upcoming");
  const completed = filtered.filter(t => t.status === "completed");

  const totalActive = tournaments.filter(t => t.status === "active").length;
  const totalUpcoming = tournaments.filter(t => t.status === "upcoming").length;
  const totalCompleted = tournaments.filter(t => t.status === "completed").length;

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Tournaments</h1>
            <p className="text-gray-600 text-sm mt-0.5">{tournaments.length} total · {totalActive} active</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-orange-400 transition text-sm">
            + New Tournament
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-cyan-400 text-2xl font-extrabold">{tournaments.length}</p>
            <p className="text-gray-600 text-xs mt-1">Total</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-orange-500 text-2xl font-extrabold">{totalActive}</p>
            <p className="text-gray-600 text-xs mt-1">Active</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-gray-400 text-2xl font-extrabold">{totalUpcoming}</p>
            <p className="text-gray-600 text-xs mt-1">Upcoming</p>
          </div>
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <p className="text-cyan-400 text-2xl font-extrabold">{totalCompleted}</p>
            <p className="text-gray-600 text-xs mt-1">Completed</p>
          </div>
        </div>

        {/* Search + filter tabs */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            className="flex-1 bg-[#111] text-white border border-[#1A1A1A] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400 transition"
            placeholder="Search tournaments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setFilterTab(tab)}
                className={"px-4 py-2 rounded-xl text-xs font-bold capitalize transition border " + (
                  filterTab === tab
                    ? "bg-cyan-400 text-black border-cyan-400"
                    : "bg-[#111] text-gray-500 border-[#1A1A1A] hover:border-cyan-400/50 hover:text-gray-300"
                )}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-cyan-400 text-center mt-10">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center mt-32">
            <p className="text-5xl mb-4">🏆</p>
            <p className="text-white text-lg font-bold">No tournaments yet</p>
            <p className="text-gray-600 mt-2 mb-6">Create your first tournament to get started</p>
            <button onClick={() => setModalOpen(true)} className="bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-300 transition">
              + New Tournament
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-white font-bold">No tournaments match your search</p>
            <button onClick={() => { setSearch(""); setFilterTab("all"); }} className="mt-3 text-cyan-400 text-sm underline">Clear filters</button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {active.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Active</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {active.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/admin/tournaments/${t.id}`)} onEdit={e => openEdit(t, e)} onDelete={e => deleteTournament(t, e)} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Upcoming</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {upcoming.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/admin/tournaments/${t.id}`)} onEdit={e => openEdit(t, e)} onDelete={e => deleteTournament(t, e)} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Completed</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {completed.map(t => <TournamentCard key={t.id} t={t} onClick={() => router.push(`/admin/tournaments/${t.id}`)} onEdit={e => openEdit(t, e)} onDelete={e => deleteTournament(t, e)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">New Tournament</h2>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Name</label>
            <input className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl p-3.5 mb-4 outline-none focus:border-cyan-400 transition"
              placeholder="Tournament name" value={name} onChange={e => setName(e.target.value)} />
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Date</label>
            <input type="date" className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl p-3.5 mb-4 outline-none focus:border-cyan-400 transition"
              value={date} onChange={e => setDate(e.target.value)} />
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Game</label>
            <div className="flex gap-2 flex-wrap mb-4">
              {GAMES.map(g => <button key={g} onClick={() => setGame(g)} className={"px-3.5 py-2 rounded-lg border text-sm transition " + (game === g ? "bg-cyan-400 border-cyan-400 text-black font-bold" : "border-[#333] text-gray-500 hover:border-gray-500")}>{g}</button>)}
            </div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Format</label>
            <div className="flex gap-2 mb-4">
              {FORMATS.map(f => <button key={f} onClick={() => setFormat(f)} className={"px-3.5 py-2 rounded-lg border text-sm transition " + (format === f ? "bg-cyan-400 border-cyan-400 text-black font-bold" : "border-[#333] text-gray-500 hover:border-gray-500")}>{f === "round_robin" ? "Round Robin" : "Knockout"}</button>)}
            </div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Team Size</label>
            <div className="flex gap-2 mb-4">
              {TEAM_SIZES.map(s => <button key={s} onClick={() => setTeamSize(s)} className={"px-3.5 py-2 rounded-lg border text-sm transition " + (teamSize === s ? "bg-cyan-400 border-cyan-400 text-black font-bold" : "border-[#333] text-gray-500 hover:border-gray-500")}>{s}</button>)}
            </div>
            {teamSize === "2v2" && (
              <>
                <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Team Formation</label>
                <div className="flex gap-2 mb-4">
                  {FORMATION_METHODS.map(m => <button key={m} onClick={() => setFormationMethod(m)} className={"px-3.5 py-2 rounded-lg border text-sm transition " + (formationMethod === m ? "bg-cyan-400 border-cyan-400 text-black font-bold" : "border-[#333] text-gray-500 hover:border-gray-500")}>{m === "manual" ? "Manual" : m === "random" ? "Random" : "Seeded"}</button>)}
                </div>
              </>
            )}
            <button onClick={createTournament} disabled={creating} className="w-full bg-cyan-400 text-black p-4 rounded-xl font-bold mb-3 hover:bg-cyan-300 disabled:opacity-50 transition">
              {creating ? "Creating..." : "Create Tournament"}
            </button>
            <button onClick={() => setModalOpen(false)} className="w-full text-gray-500 p-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editTournament && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">Edit Tournament</h2>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Name</label>
            <input className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl p-3.5 mb-4 outline-none focus:border-cyan-400 transition"
              value={editName} onChange={e => setEditName(e.target.value)} />
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Date</label>
            <input type="date" className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-xl p-3.5 mb-6 outline-none focus:border-cyan-400 transition"
              value={editDate} onChange={e => setEditDate(e.target.value)} />
            <button onClick={saveEdit} disabled={saving} className="w-full bg-cyan-400 text-black font-bold py-4 rounded-xl mb-3 hover:bg-cyan-300 disabled:opacity-50 transition">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => { setEditModalOpen(false); setEditTournament(null); }} className="w-full text-gray-500 py-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, onClick, onEdit, onDelete }: {
  t: Tournament; onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isActive = t.status === "active";
  const isCompleted = t.status === "completed";
  const progress = t.matchCount && t.matchCount > 0 ? Math.round(((t.completedMatches || 0) / t.matchCount) * 100) : 0;

  return (
    <div onClick={onClick}
      className={"relative bg-[#111] rounded-2xl p-5 border transition group cursor-pointer overflow-hidden hover:border-cyan-400/50 " + (isActive ? "border-orange-500/40" : "border-[#1A1A1A]")}>
      {/* Active top accent */}
      {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />}

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <p className="text-white font-extrabold text-sm leading-tight pr-2">{t.name}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " + (
            isActive ? "text-orange-500 bg-orange-500/10 border-orange-500/25" :
            isCompleted ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/25" :
            "text-gray-500 bg-[#1A1A1A] border-[#333]"
          )}>
            {isActive ? "Active" : isCompleted ? "Completed" : "Upcoming"}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.game}</span>
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.team_size}</span>
        <span className="text-gray-500 text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
      </div>

      {/* Progress bar */}
      {(t.matchCount || 0) > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 text-[10px]">Progress</span>
            <span className="text-gray-500 text-[10px]">{t.completedMatches}/{t.matchCount} matches</span>
          </div>
          <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className={"h-full rounded-full transition-all " + (isCompleted ? "bg-cyan-400" : "bg-orange-500")} style={{ width: progress + "%" }} />
          </div>
        </div>
      )}

      {/* Winner */}
      {isCompleted && t.winner_team_name && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base">🏆</span>
          <span className="text-orange-500 font-bold text-xs">{t.winner_team_name}</span>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-[#1A1A1A]">
        <div className="flex items-center gap-1">
          <span className="text-gray-600 text-[10px]">Players</span>
          <span className="text-gray-400 text-[10px] font-bold">{t.playerCount || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600 text-[10px]">Goals</span>
          <span className="text-orange-500 text-[10px] font-bold">{t.goalCount || 0}</span>
        </div>
        <span className="text-gray-700 text-[10px] ml-auto">{t.date}</span>
        {/* Edit + Delete */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="text-gray-600 hover:text-cyan-400 text-[10px] px-2 py-1 bg-[#1A1A1A] rounded border border-[#333] hover:border-cyan-400 transition">Edit</button>
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 text-[10px] px-2 py-1 bg-[#1A1A1A] rounded border border-[#333] hover:border-red-400 transition">Del</button>
        </div>
      </div>
    </div>
  );
}
