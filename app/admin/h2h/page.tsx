"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";

type H2HMatch = {
  id: string;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  game: string;
  status: string;
  played_at: string;
};

type H2HRecord = {
  key: string;
  player1: string;
  player2: string;
  p1Wins: number;
  draws: number;
  p2Wins: number;
  matches: H2HMatch[];
};

export default function AdminH2H() {
  const router = useRouter();
  const supabase = createClient();

  const [records, setRecords] = useState<H2HRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState<H2HMatch | null>(null);
  const [editScore1, setEditScore1] = useState("0");
  const [editScore2, setEditScore2] = useState("0");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: matches } = await supabase.from("h2h_matches")
      .select("*")
      .eq("admin_id", user.id)
      .order("played_at", { ascending: false });

    // Group by player pair
    const recordMap: { [key: string]: H2HRecord } = {};
    for (const m of (matches || [])) {
      const key = [m.player1_name, m.player2_name].sort().join(" vs ");
      if (!recordMap[key]) {
        recordMap[key] = { key, player1: m.player1_name, player2: m.player2_name, p1Wins: 0, draws: 0, p2Wins: 0, matches: [] };
      }
      recordMap[key].matches.push(m);
      if (m.status === "approved") {
        if (m.player1_score > m.player2_score) recordMap[key].p1Wins++;
        else if (m.player2_score > m.player1_score) recordMap[key].p2Wins++;
        else recordMap[key].draws++;
      }
    }

    setRecords(Object.values(recordMap).sort((a, b) => (b.matches.length) - (a.matches.length)));
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function saveEdit() {
    if (!editMatch) return;
    setSaving(true);
    await supabase.from("h2h_matches").update({
      player1_score: parseInt(editScore1) || 0,
      player2_score: parseInt(editScore2) || 0,
      status: "approved",
    }).eq("id", editMatch.id);
    setSaving(false);
    setEditMatch(null);
    fetchAll();
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("Delete this H2H match? This cannot be undone.")) return;
    await supabase.from("h2h_matches").delete().eq("id", matchId);
    fetchAll();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function statusColor(s: string) {
    if (s === "approved") return "text-cyan-400";
    if (s === "pending_approval") return "text-orange-500";
    return "text-gray-500";
  }

  function statusLabel(s: string) {
    if (s === "approved") return "Approved";
    if (s === "pending_approval") return "Pending Approval";
    return "Pending Score";
  }

  const filtered = records.filter(r =>
    r.player1.toLowerCase().includes(search.toLowerCase()) ||
    r.player2.toLowerCase().includes(search.toLowerCase())
  );

  const totalMatches = records.reduce((s, r) => s + r.matches.filter(m => m.status === "approved").length, 0);

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 px-4 md:px-10 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Head-to-Head</h1>
            <p className="text-gray-600 text-sm mt-0.5">{records.length} matchups · {totalMatches} approved matches</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20"><p className="text-cyan-400">Loading...</p></div>
        ) : records.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-white font-bold text-lg">No H2H matches yet</p>
            <p className="text-gray-600 text-sm mt-2">Players can challenge each other from their H2H page</p>
          </div>
        ) : (
          <>
            <input
              className="w-full md:w-96 bg-[#111] text-white border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-400 transition text-sm mb-6"
              placeholder="Search by player name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="flex flex-col gap-3">
              {filtered.map(r => {
                const isExpanded = expanded === r.key;
                const total = r.p1Wins + r.draws + r.p2Wins;

                return (
                  <div key={r.key} className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
                    <button onClick={() => setExpanded(isExpanded ? null : r.key)} className="w-full p-5 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Player 1 */}
                          <div className="text-center w-24">
                            <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center text-black font-bold mx-auto mb-1">{r.player1[0]?.toUpperCase()}</div>
                            <p className="text-white font-bold text-xs truncate">{r.player1}</p>
                          </div>

                          {/* Score */}
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-cyan-400 font-extrabold text-2xl">{r.p1Wins}</span>
                              <span className="text-gray-600 text-sm">-</span>
                              <span className="text-gray-400 font-extrabold text-2xl">{r.draws}</span>
                              <span className="text-gray-600 text-sm">-</span>
                              <span className="text-orange-500 font-extrabold text-2xl">{r.p2Wins}</span>
                            </div>
                            <p className="text-gray-600 text-[10px] mt-1">{total} approved match{total !== 1 ? "es" : ""}</p>
                          </div>

                          {/* Player 2 */}
                          <div className="text-center w-24">
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold mx-auto mb-1">{r.player2[0]?.toUpperCase()}</div>
                            <p className="text-white font-bold text-xs truncate">{r.player2}</p>
                          </div>
                        </div>
                        <span className="text-gray-600 text-sm ml-4">{isExpanded ? "v" : ">"}</span>
                      </div>

                      {/* Bar */}
                      {total > 0 && (
                        <div className="mt-3 bg-[#222] rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-cyan-400 h-full" style={{ width: (r.p1Wins / total * 100) + "%" }} />
                          <div className="bg-gray-600 h-full" style={{ width: (r.draws / total * 100) + "%" }} />
                          <div className="bg-orange-500 h-full" style={{ width: (r.p2Wins / total * 100) + "%" }} />
                        </div>
                      )}
                    </button>

                    {/* Match history */}
                    {isExpanded && (
                      <div className="border-t border-[#1A1A1A] px-5 pb-5">
                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-4 mb-3">Match History</p>
                        {r.matches.map(m => (
                          <div key={m.id} className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0 group">
                            <div>
                              <p className="text-gray-500 text-xs">{m.game} · {formatDate(m.played_at)}</p>
                              <span className={"text-xs font-bold " + statusColor(m.status)}>{statusLabel(m.status)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {m.status === "approved" && (
                                <span className="text-white font-bold">{m.player1_score} - {m.player2_score}</span>
                              )}
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => { setEditMatch(m); setEditScore1(m.player1_score.toString()); setEditScore2(m.player2_score.toString()); }}
                                  className="text-gray-500 hover:text-cyan-400 text-xs px-2.5 py-1 bg-[#1A1A1A] rounded border border-[#333]">Edit</button>
                                <button onClick={() => deleteMatch(m.id)}
                                  className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 bg-[#1A1A1A] rounded border border-[#333]">Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-cyan-400 text-xl font-bold mb-2">Edit Score</h2>
            <p className="text-gray-500 text-sm mb-5">{editMatch.player1_name} vs {editMatch.player2_name}</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-2">{editMatch.player1_name}</p>
                <input type="number" min="0" value={editScore1}
                  onChange={e => setEditScore1(String(Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center" />
              </div>
              <span className="text-gray-600 text-2xl">-</span>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-2">{editMatch.player2_name}</p>
                <input type="number" min="0" value={editScore2}
                  onChange={e => setEditScore2(String(Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center" />
              </div>
            </div>
            <button onClick={saveEdit} disabled={saving}
              className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditMatch(null)} className="w-full text-gray-500 py-3 mt-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
