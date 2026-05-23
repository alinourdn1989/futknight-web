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
};

export default function PlayerTournaments() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Find tournaments this player is part of
    const { data: tp } = await supabase
      .from("tournament_players")
      .select("tournament_id")
      .eq("user_id", user.id);

    const ids = (tp || []).map(t => t.tournament_id);
    if (ids.length === 0) { setTournaments([]); setLoading(false); return; }

    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("id", ids)
      .order("date", { ascending: false });

    if (data) setTournaments(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-cyan-400 text-3xl font-bold">🎮 My Tournaments</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/player/stats")}
            className="bg-[#1A1A1A] border border-[#333] text-cyan-400 px-4 py-2 rounded-lg hover:border-cyan-400"
          >
            📊 My Stats
          </button>
          <button
            onClick={handleLogout}
            className="bg-[#1A1A1A] border border-[#333] text-gray-400 px-4 py-2 rounded-lg hover:border-gray-500"
          >
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-cyan-400 text-center mt-10">Loading...</p>
      ) : tournaments.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-white text-lg font-bold">No tournaments yet</p>
          <p className="text-gray-600 mt-2">You&apos;ll see tournaments here once an admin adds you</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/player/tournaments/${t.id}`)}
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
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}