"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type Tournament = {
  id: string;
  name: string;
  game: string;
  format: string;
  team_size: string;
  status: string;
  date: string;
  formation_method: string;
};

const GAMES = ["FIFA", "CoD", "NBA 2K", "Rocket League", "Other"];
const FORMATS = ["round_robin", "knockout"];
const TEAM_SIZES = ["1v1", "2v2"];
const FORMATION_METHODS = ["manual", "random", "seeded"];

export default function AdminTournaments() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null>(null);

  const [name, setName] = useState("");
  const [game, setGame] = useState("FIFA");
  const [format, setFormat] = useState("round_robin");
  const [teamSize, setTeamSize] = useState("1v1");
  const [formationMethod, setFormationMethod] = useState("manual");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", user?.id)
      .order("created_at", { ascending: false });
    if (data) setTournaments(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  async function createTournament() {
    if (!name) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tournaments").insert({
      name, game, format,
      team_size: teamSize,
      formation_method: teamSize === "1v1" ? "auto" : formationMethod,
      created_by: user?.id,
      status: "upcoming",
      date,
    });
    if (!error) {
      setModalOpen(false);
      setName(""); setGame("FIFA"); setFormat("round_robin");
      setTeamSize("1v1"); setFormationMethod("manual");
      setDate(new Date().toISOString().split("T")[0]);
      fetchTournaments();
    }
    setCreating(false);
  }

  function openEdit(t: Tournament, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTournament(t);
    setEditName(t.name);
    setEditDate(t.date);
    setEditModalOpen(true);
  }

  async function saveEdit() {
    if (!editTournament || !editName.trim()) return;
    setSaving(true);
    await supabase.from("tournaments").update({
      name: editName.trim(),
      date: editDate,
    }).eq("id", editTournament.id);
    setSaving(false);
    setEditModalOpen(false);
    setEditTournament(null);
    fetchTournaments();
  }

  async function deleteTournament(t: Tournament, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? This will remove all matches, scores and player data. This cannot be undone.`)) return;

    // Delete in order: match_goals → matches → team_members → teams → tournament_players → tournament
    await supabase.from("match_goals").delete().eq("tournament_id", t.id);
    await supabase.from("matches").delete().eq("tournament_id", t.id);

    const { data: teams } = await supabase.from("teams").select("id").eq("tournament_id", t.id);
    if (teams && teams.length > 0) {
      const teamIds = teams.map(tm => tm.id);
      await supabase.from("team_members").delete().in("team_id", teamIds);
    }

    await supabase.from("teams").delete().eq("tournament_id", t.id);
    await supabase.from("tournament_players").delete().eq("tournament_id", t.id);
    await supabase.from("tournaments").delete().eq("id", t.id);

    fetchTournaments();
  }

  function statusColor(status: string) {
    if (status === "active") return "text-cyan-400";
    if (status === "completed") return "text-orange-500";
    return "text-gray-500";
  }

  function statusLabel(status: string) {
    if (status === "upcoming") return "Upcoming";
    if (status === "active") return "Active";
    if (status === "completed") return "Completed";
    return status;
  }

  function formationLabel(method: string) {
    if (method === "manual") return "Manual";
    if (method === "random") return "Random";
    if (method === "seeded") return "Seeded";
    return "Manual";
  }

  const active = tournaments.filter(t => t.status === "active");
  const upcoming = tournaments.filter(t => t.status === "upcoming");
  const completed = tournaments.filter(t => t.status === "completed");

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />

      <main className="flex-1 md:ml-56 px-4 md:px-10 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Tournaments</h1>
            <p className="text-gray-600 text-sm mt-0.5">{tournaments.length} total · {active.length} active</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-orange-400 transition text-sm">
            + New Tournament
          </button>
        </div>

        {loading ? (
          <p className="text-cyan-400 text-center mt-10">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center mt-32">
            <p className="text-4xl mb-4">Trophy</p>
            <p className="text-white text-lg font-bold">No tournaments yet</p>
            <p className="text-gray-600 mt-2 mb-6">Create your first tournament to get started</p>
            <button onClick={() => setModalOpen(true)} className="bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-300 transition">
              + New Tournament
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.length > 0 && (
              <>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Active</p>
                {active.map(t => (
                  <TournamentCard key={t.id} t={t}
                    onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                    onEdit={(e) => openEdit(t, e)}
                    onDelete={(e) => deleteTournament(t, e)}
                    statusColor={statusColor} statusLabel={statusLabel} formationLabel={formationLabel} />
                ))}
                <div className="h-2" />
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Upcoming</p>
                {upcoming.map(t => (
                  <TournamentCard key={t.id} t={t}
                    onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                    onEdit={(e) => openEdit(t, e)}
                    onDelete={(e) => deleteTournament(t, e)}
                    statusColor={statusColor} statusLabel={statusLabel} formationLabel={formationLabel} />
                ))}
                <div className="h-2" />
              </>
            )}
            {completed.length > 0 && (
              <>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Completed</p>
                {completed.map(t => (
                  <TournamentCard key={t.id} t={t}
                    onClick={() => router.push(`/admin/tournaments/${t.id}`)}
                    onEdit={(e) => openEdit(t, e)}
                    onDelete={(e) => deleteTournament(t, e)}
                    statusColor={statusColor} statusLabel={statusLabel} formationLabel={formationLabel} />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">New Tournament</h2>
            <input className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-4 outline-none focus:border-cyan-400"
              placeholder="Tournament Name" value={name} onChange={(e) => setName(e.target.value)} />
            <p className="text-gray-500 text-sm mb-2">Date</p>
            <input type="date" className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-4 outline-none focus:border-cyan-400"
              value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="text-gray-500 text-sm mb-2">Game</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {GAMES.map((g) => (
                <button key={g} onClick={() => setGame(g)} className={"px-3.5 py-2 rounded-lg border text-sm " + (game === g ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500")}>{g}</button>
              ))}
            </div>
            <p className="text-gray-500 text-sm mb-2">Format</p>
            <div className="flex gap-2 mb-4">
              {FORMATS.map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={"px-3.5 py-2 rounded-lg border text-sm " + (format === f ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500")}>
                  {f === "round_robin" ? "Round Robin" : "Knockout"}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-sm mb-2">Team Size</p>
            <div className="flex gap-2 mb-4">
              {TEAM_SIZES.map((s) => (
                <button key={s} onClick={() => setTeamSize(s)} className={"px-3.5 py-2 rounded-lg border text-sm " + (teamSize === s ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500")}>{s}</button>
              ))}
            </div>
            {teamSize === "2v2" && (
              <>
                <p className="text-gray-500 text-sm mb-2">Team Formation</p>
                <div className="flex gap-2 mb-6">
                  {FORMATION_METHODS.map((m) => (
                    <button key={m} onClick={() => setFormationMethod(m)} className={"px-3.5 py-2 rounded-lg border text-sm " + (formationMethod === m ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500")}>
                      {m === "manual" ? "Manual" : m === "random" ? "Random" : "Seeded"}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={createTournament} disabled={creating} className="w-full bg-cyan-400 text-[#0A0A0A] p-4 rounded-lg font-bold mb-3 hover:opacity-90 disabled:opacity-50">
              {creating ? "..." : "CREATE"}
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
            <input className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-4 outline-none focus:border-cyan-400"
              placeholder="Tournament Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Date</label>
            <input type="date" className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-6 outline-none focus:border-cyan-400"
              value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <button onClick={saveEdit} disabled={saving} className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg mb-3 hover:bg-cyan-300 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => { setEditModalOpen(false); setEditTournament(null); }} className="w-full text-gray-500 py-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, onClick, onEdit, onDelete, statusColor, statusLabel, formationLabel }: {
  t: any; onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  statusColor: (s: string) => string;
  statusLabel: (s: string) => string;
  formationLabel: (s: string) => string;
}) {
  return (
    <div className={"relative bg-[#111] rounded-xl p-4 border " + (t.status === "active" ? "border-orange-500" : "border-[#1A1A1A]") + " hover:border-cyan-400 transition group cursor-pointer"}
      onClick={onClick}>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-white font-bold">{t.name}</span>
        <div className="flex items-center gap-3">
          <span className={"text-xs font-bold " + statusColor(t.status)}>{statusLabel(t.status)}</span>
          {/* Edit + Delete — visible on hover */}
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit}
              className="text-gray-500 hover:text-cyan-400 text-xs px-2.5 py-1 bg-[#1A1A1A] rounded-lg border border-[#333] hover:border-cyan-400 transition">
              Edit
            </button>
            <button onClick={onDelete}
              className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 bg-[#1A1A1A] rounded-lg border border-[#333] hover:border-red-400 transition">
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.game}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.team_size}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{t.date}</span>
        <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{formationLabel(t.formation_method)}</span>
      </div>
    </div>
  );
}