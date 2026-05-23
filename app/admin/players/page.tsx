"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminPlayer = {
  id: string;
  player_name: string;
  player_email: string | null;
  player_phone: string | null;
  user_id: string | null;
};

export default function AdminPlayers() {
  const router = useRouter();
  const supabase = createClient();

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("admin_players")
      .select("*")
      .eq("admin_id", user!.id)
      .order("player_name", { ascending: true });
    if (data) setPlayers(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  function openAdd() {
    setEditPlayer(null);
    setName(""); setEmail(""); setPhone(""); setError("");
    setShowModal(true);
  }

  function openEdit(p: AdminPlayer) {
    setEditPlayer(p);
    setName(p.player_name);
    setEmail(p.player_email || "");
    setPhone(p.player_phone || "");
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim()) { setError("Player name is required"); return; }
    if (!email.trim() && !phone.trim()) { setError("Enter at least an email or phone"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (editPlayer) {
      await supabase.from("admin_players").update({
        player_name: name.trim(),
        player_email: email.trim().toLowerCase() || null,
        player_phone: phone.trim() || null,
      }).eq("id", editPlayer.id);
    } else {
      await supabase.from("admin_players").insert({
        admin_id: user!.id,
        player_name: name.trim(),
        player_email: email.trim().toLowerCase() || null,
        player_phone: phone.trim() || null,
      });
    }

    setSaving(false);
    setShowModal(false);
    fetchPlayers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this player from your roster?")) return;
    await supabase.from("admin_players").delete().eq("id", id);
    fetchPlayers();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => router.push("/admin/tournaments")} className="text-orange-500 text-sm mb-1">← Tournaments</button>
          <h1 className="text-cyan-400 text-3xl font-bold">👥 My Players</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-orange-600"
        >
          + Add Player
        </button>
      </div>

      {loading ? (
        <p className="text-cyan-400 text-center mt-10">Loading...</p>
      ) : players.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-white text-lg font-bold">No players yet</p>
          <p className="text-gray-600 mt-2">Add players to your roster, then invite them to tournaments</p>
          <button onClick={openAdd} className="mt-6 bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg hover:bg-cyan-300">
            + Add First Player
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {players.map((p) => (
            <div key={p.id} className="bg-[#111] rounded-xl p-4 border border-[#222] flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-lg shrink-0">
                {p.player_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold">{p.player_name}</div>
                <div className="text-gray-500 text-sm mt-0.5">{p.player_email || p.player_phone || "No contact"}</div>
                <div className={`text-xs mt-1 ${p.user_id ? "text-cyan-400" : "text-orange-500"}`}>
                  {p.user_id ? "✅ Registered" : "⏳ Not registered yet"}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="text-gray-400 hover:text-cyan-400 text-sm px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-400 hover:text-red-400 text-sm px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50">
          <div className="bg-[#111] rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-md">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">
              {editPlayer ? "Edit Player" : "Add Player"}
            </h2>

            <input
              className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-cyan-400"
              placeholder="Player Name *"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-cyan-400"
              placeholder="Email (required if no phone)"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-cyan-400"
              placeholder="Phone (required if no email)"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 disabled:opacity-50 mb-3"
            >
              {saving ? "Saving..." : editPlayer ? "Save Changes" : "Add Player"}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="w-full text-gray-500 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}