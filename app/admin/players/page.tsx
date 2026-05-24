"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type AdminPlayer = {
  id: string;
  player_name: string;
  player_email: string | null;
  player_phone: string | null;
  user_id: string | null;
  api_player_id: number | null;
  photo_url: string | null;
  club: string | null;
  nationality: string | null;
  position: string | null;
  rating: number | null;
};

type ApiPlayer = {
  player: {
    id: number;
    name: string;
    nationality: string;
    photo: string;
  };
  statistics: {
    team: { name: string };
    games: { position: string; rating: string };
  }[];
};

export default function AdminPlayers() {
  const supabase = createClient();

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedApiPlayer, setSelectedApiPlayer] = useState<ApiPlayer | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

useEffect(() => {
  if (!searchQuery || searchQuery.length < 3 || editPlayer) {
    setSearchResults([]);
    return;
  }
  if (searchTimeout.current) clearTimeout(searchTimeout.current);
  searchTimeout.current = setTimeout(async () => {
    setSearching(true);
    try {
      // Search across top 5 leagues simultaneously
      const leagues = [39, 140, 135, 78, 61]; // PL, La Liga, Serie A, Bundesliga, Ligue 1
      const results = await Promise.all(
        leagues.map(league =>
          fetch(
            `https://v3.football.api-sports.io/players?search=${encodeURIComponent(searchQuery)}&league=${league}&season=2024`,
            { headers: { "x-apisports-key": process.env.NEXT_PUBLIC_API_FOOTBALL_KEY! } }
          ).then(r => r.json()).then(d => d.response || [])
        )
      );
      // Merge and deduplicate by player ID
      const merged = results.flat();
      const unique = Object.values(
        merged.reduce((acc: any, p: any) => {
          acc[p.player.id] = p;
          return acc;
        }, {})
      );
      setSearchResults(unique as ApiPlayer[]);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, 500);
}, [searchQuery, editPlayer]);

  function selectApiPlayer(p: ApiPlayer) {
    setSelectedApiPlayer(p);
    setSearchQuery(p.player.name);
    setSearchResults([]);
  }

  function openAdd() {
    setEditPlayer(null);
    setSearchQuery(""); setEmail(""); setPhone(""); setError("");
    setSelectedApiPlayer(null); setSearchResults([]);
    setShowModal(true);
  }

  function openEdit(p: AdminPlayer) {
    setEditPlayer(p);
    setSearchQuery(p.player_name);
    setEmail(p.player_email || "");
    setPhone(p.player_phone || "");
    setError(""); setSelectedApiPlayer(null); setSearchResults([]);
    setShowModal(true);
  }

  async function handleSave() {
    if (!editPlayer && !selectedApiPlayer && !searchQuery.trim()) {
      setError("Search and select a player, or type a name"); return;
    }
    if (!email.trim() && !phone.trim()) { setError("Enter at least an email or phone"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const playerData = selectedApiPlayer ? {
      player_name: selectedApiPlayer.player.name,
      api_player_id: selectedApiPlayer.player.id,
      photo_url: selectedApiPlayer.player.photo,
      club: selectedApiPlayer.statistics[0]?.team.name || null,
      nationality: selectedApiPlayer.player.nationality,
      position: selectedApiPlayer.statistics[0]?.games.position || null,
      rating: selectedApiPlayer.statistics[0]?.games.rating
        ? Math.round(parseFloat(selectedApiPlayer.statistics[0].games.rating) * 10)
        : null,
    } : {
      player_name: searchQuery.trim(),
      api_player_id: null, photo_url: null, club: null,
      nationality: null, position: null, rating: null,
    };
    if (editPlayer) {
      await supabase.from("admin_players").update({
        ...playerData,
        player_email: email.trim().toLowerCase() || null,
        player_phone: phone.trim() || null,
      }).eq("id", editPlayer.id);
    } else {
      await supabase.from("admin_players").insert({
        admin_id: user!.id, ...playerData,
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
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 md:ml-56 px-4 md:px-10 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Players</h1>
            <p className="text-gray-600 text-sm mt-0.5">
              {players.length} total · {players.filter(p => p.user_id).length} registered · {players.filter(p => p.api_player_id).length} linked to real players
            </p>
          </div>
          <button onClick={openAdd} className="bg-orange-500 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-orange-400 transition text-sm">
            + Add Player
          </button>
        </div>

        {loading ? (
          <p className="text-cyan-400 text-center mt-10">Loading...</p>
        ) : players.length === 0 ? (
          <div className="text-center mt-32">
            <p className="text-4xl mb-4">&#128101;</p>
            <p className="text-white text-lg font-bold">No players yet</p>
            <p className="text-gray-600 mt-2 mb-6">Search real footballers or add custom players</p>
            <button onClick={openAdd} className="bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-300 transition">+ Add First Player</button>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {players.map(p => <PlayerCard key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />)}
            </div>
            <div className="md:hidden flex flex-col gap-3">
              {players.map(p => <PlayerCardMobile key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />)}
            </div>
          </>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">{editPlayer ? "Edit Player" : "Add Player"}</h2>
            <div className="relative mb-3">
              <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">
                {editPlayer ? "Player Name" : "Search Real Player"}
              </label>
              <input
                className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400"
                placeholder={editPlayer ? "Player name" : "Search by name (e.g. Salah, Mbappe)..."}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (!editPlayer) setSelectedApiPlayer(null); }}
              />
              {searching && <p className="text-gray-600 text-xs mt-1">Searching...</p>}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-[#1A1A1A] border border-[#333] rounded-xl mt-1 max-h-64 overflow-y-auto shadow-xl">
                  {searchResults.map(result => (
                    <button key={result.player.id} onClick={() => selectApiPlayer(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#222] transition text-left border-b border-[#222] last:border-0">
                      <img src={result.player.photo} alt={result.player.name}
                        className="w-10 h-10 rounded-full object-cover bg-[#333]"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{result.player.name}</p>
                        <p className="text-gray-500 text-xs">{result.statistics[0]?.team.name} · {result.statistics[0]?.games.position} · {result.player.nationality}</p>
                      </div>
                      {result.statistics[0]?.games.rating && (
                        <span className="text-cyan-400 text-xs font-bold bg-[#001A1A] px-2 py-1 rounded">
                          {parseFloat(result.statistics[0].games.rating).toFixed(1)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedApiPlayer && (
              <div className="flex items-center gap-3 bg-[#0A0A0A] border border-cyan-400 rounded-xl p-3 mb-4">
                <img src={selectedApiPlayer.player.photo} alt={selectedApiPlayer.player.name} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{selectedApiPlayer.player.name}</p>
                  <p className="text-gray-500 text-xs">{selectedApiPlayer.statistics[0]?.team.name} · {selectedApiPlayer.player.nationality}</p>
                </div>
                <button onClick={() => { setSelectedApiPlayer(null); setSearchQuery(""); }} className="text-gray-600 hover:text-red-400 text-lg">x</button>
              </div>
            )}
            <input className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-cyan-400"
              placeholder="Email (required if no phone)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="w-full bg-[#0A0A0A] text-white border border-[#333] rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-cyan-400"
              placeholder="Phone (required if no email)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={handleSave} disabled={saving} className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 disabled:opacity-50 mb-3">
              {saving ? "Saving..." : editPlayer ? "Save Changes" : "Add Player"}
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-gray-500 py-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ p, onEdit, onDelete }: { p: AdminPlayer; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 hover:border-[#333] transition group">
      <div className="flex items-center gap-4 mb-4">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.player_name} className="w-14 h-14 rounded-full object-cover bg-[#222]" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-extrabold shrink-0">
            {p.player_name[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold truncate">{p.player_name}</p>
          {p.club && <p className="text-gray-500 text-xs mt-0.5">{p.club}</p>}
          {p.nationality && <p className="text-gray-600 text-xs">{p.nationality} · {p.position}</p>}
        </div>
        {p.rating && (
          <div className="bg-[#001A1A] border border-cyan-400 rounded-lg px-2.5 py-1.5 text-center shrink-0">
            <p className="text-cyan-400 text-lg font-extrabold leading-none">{p.rating}</p>
            <p className="text-gray-600 text-[9px]">OVR</p>
          </div>
        )}
      </div>
      <div className="border-t border-[#1A1A1A] pt-3 flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs">{p.player_email || p.player_phone || "No contact"}</p>
          <p className={"text-xs font-bold mt-0.5 " + (p.user_id ? "text-cyan-400" : "text-orange-500")}>
            {p.user_id ? "Registered" : "Pending"}
          </p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="text-gray-400 hover:text-cyan-400 text-xs px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]">Edit</button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-400 text-xs px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]">x</button>
        </div>
      </div>
    </div>
  );
}

function PlayerCardMobile({ p, onEdit, onDelete }: { p: AdminPlayer; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-[#111] rounded-xl p-4 border border-[#222] flex items-center gap-4">
      {p.photo_url ? (
        <img src={p.photo_url} alt={p.player_name} className="w-12 h-12 rounded-full object-cover bg-[#222] shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-lg shrink-0">
          {p.player_name[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold truncate">{p.player_name}</p>
        {p.club && <p className="text-gray-500 text-xs">{p.club} · {p.position}</p>}
        <p className="text-gray-600 text-xs mt-0.5">{p.player_email || p.player_phone || "No contact"}</p>
        <p className={"text-xs font-bold mt-0.5 " + (p.user_id ? "text-cyan-400" : "text-orange-500")}>
          {p.user_id ? "Registered" : "Pending"}
        </p>
      </div>
      {p.rating && (
        <div className="bg-[#001A1A] border border-cyan-400 rounded-lg px-2 py-1 text-center shrink-0 mr-1">
          <p className="text-cyan-400 text-base font-extrabold leading-none">{p.rating}</p>
          <p className="text-gray-600 text-[9px]">OVR</p>
        </div>
      )}
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="text-gray-400 hover:text-cyan-400 text-sm px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]">Edit</button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-400 text-sm px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#333]">x</button>
      </div>
    </div>
  );
}