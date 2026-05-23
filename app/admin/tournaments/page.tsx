"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const [name, setName] = useState("");
  const [game, setGame] = useState("FIFA");
  const [format, setFormat] = useState("round_robin");
  const [teamSize, setTeamSize] = useState("1v1");
  const [formationMethod, setFormationMethod] = useState("manual");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  async function createTournament() {
    if (!name) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tournaments").insert({
      name,
      game,
      format,
      team_size: teamSize,
      formation_method: teamSize === "1v1" ? "auto" : formationMethod,
      created_by: user?.id,
      status: "upcoming",
      date,
    });
    if (!error) {
      setModalOpen(false);
      setName("");
      setGame("FIFA");
      setFormat("round_robin");
      setTeamSize("1v1");
      setFormationMethod("manual");
      setDate(new Date().toISOString().split("T")[0]);
      fetchTournaments();
    }
    setCreating(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function statusColor(status: string) {
    if (status === "active") return "text-cyan-400";
    if (status === "completed") return "text-orange-500";
    return "text-gray-500";
  }

  function statusLabel(status: string) {
    if (status === "upcoming") return "⏳ UPCOMING";
    if (status === "active") return "🔥 ACTIVE";
    if (status === "completed") return "✅ COMPLETED";
    return status.toUpperCase();
  }

  function formationLabel(method: string) {
    if (method === "manual") return "👆 Manual";
    if (method === "random") return "🎲 Random";
    if (method === "seeded") return "🎯 Seeded";
    return "👆 Manual";
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-cyan-400 text-3xl font-bold">🏆 Tournaments</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
          >
            + New
          </button>
          <button
            onClick={() => router.push("/admin/players")}
            className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-4 py-2 rounded-lg hover:border-cyan-400"
          >
            👥 Players
          </button>
          <button
            onClick={handleLogout}
            className="bg-[#1A1A1A] border border-[#333] text-gray-400 px-4 py-2 rounded-lg hover:border-gray-500"
          >
            Logout
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-cyan-400 text-center mt-10">Loading...</p>
      ) : tournaments.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-white text-lg font-bold">No tournaments yet</p>
          <p className="text-gray-600 mt-2">Tap &quot;+ New&quot; to create one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/admin/tournaments/${t.id}`)}
              className={`text-left bg-[#111] rounded-xl p-4 border ${
                t.status === "active" ? "border-orange-500" : "border-[#222]"
              } hover:border-cyan-400 transition`}
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-white font-bold">{t.name}</span>
                <span className={`text-xs font-bold ${statusColor(t.status)}`}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">🎮 {t.game}</span>
                <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">👥 {t.team_size}</span>
                <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">📋 {t.format === "round_robin" ? "Round Robin" : "Knockout"}</span>
                <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">📅 {t.date}</span>
                <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{formationLabel(t.formation_method)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">New Tournament</h2>

            <input
              className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-4 outline-none focus:border-cyan-400"
              placeholder="Tournament Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <p className="text-gray-500 text-sm mb-2">Date</p>
            <input
              type="date"
              className="w-full bg-[#0A0A0A] text-white border border-[#222] rounded-lg p-3.5 mb-4 outline-none focus:border-cyan-400"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <p className="text-gray-500 text-sm mb-2">Game</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {GAMES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGame(g)}
                  className={`px-3.5 py-2 rounded-lg border text-sm ${
                    game === g ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <p className="text-gray-500 text-sm mb-2">Format</p>
            <div className="flex gap-2 mb-4">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3.5 py-2 rounded-lg border text-sm ${
                    format === f ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500"
                  }`}
                >
                  {f === "round_robin" ? "Round Robin" : "Knockout"}
                </button>
              ))}
            </div>

            <p className="text-gray-500 text-sm mb-2">Team Size</p>
            <div className="flex gap-2 mb-4">
              {TEAM_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setTeamSize(s)}
                  className={`px-3.5 py-2 rounded-lg border text-sm ${
                    teamSize === s ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {teamSize === "2v2" && (
              <>
                <p className="text-gray-500 text-sm mb-2">Team Formation</p>
                <div className="flex gap-2 mb-6">
                  {FORMATION_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setFormationMethod(m)}
                      className={`px-3.5 py-2 rounded-lg border text-sm ${
                        formationMethod === m ? "bg-cyan-400 border-cyan-400 text-[#0A0A0A] font-bold" : "border-[#333] text-gray-500"
                      }`}
                    >
                      {m === "manual" ? "👆 Manual" : m === "random" ? "🎲 Random" : "🎯 Seeded"}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={createTournament}
              disabled={creating}
              className="w-full bg-cyan-400 text-[#0A0A0A] p-4 rounded-lg font-bold mb-3 hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "..." : "CREATE"}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="w-full text-gray-500 p-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}