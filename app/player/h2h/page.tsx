"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Challenge = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_name: string;
  opponent_name: string;
  game: string;
  status: string;
  created_at: string;
};

type H2HMatch = {
  id: string;
  challenge_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  game: string;
  status: string;
  score_entered_by: string;
  played_at: string;
};

type Opponent = {
  key: string;
  name: string;
  userId: string;
  game: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matches: H2HMatch[];
};

type RosterPlayer = {
  id: string;
  player_name: string;
  user_id: string | null;
};

const GAMES = ["FIFA", "CoD", "NBA 2K", "Rocket League", "Other"];

const GAME_COLORS: { [key: string]: string } = {
  "FIFA": "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  "CoD": "text-orange-400 bg-orange-400/10 border-orange-400/30",
  "NBA 2K": "text-purple-400 bg-purple-400/10 border-purple-400/30",
  "Rocket League": "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "Other": "text-gray-400 bg-gray-400/10 border-gray-400/30",
};

export default function PlayerH2H() {
  const router = useRouter();
  const supabase = createClient();

  const [myUserId, setMyUserId] = useState("");
  const [myName, setMyName] = useState("");
  const [adminId, setAdminId] = useState("");
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Challenge[]>([]);
  const [pendingSent, setPendingSent] = useState<Challenge[]>([]);
  const [pendingApproval, setPendingApproval] = useState<H2HMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showChallenge, setShowChallenge] = useState(false);
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<RosterPlayer | null>(null);
  const [selectedGame, setSelectedGame] = useState("FIFA");
  const [sending, setSending] = useState(false);

  const [scoreMatch, setScoreMatch] = useState<H2HMatch | null>(null);
  const [score1, setScore1] = useState("0");
  const [score2, setScore2] = useState("0");
  const [savingScore, setSavingScore] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyUserId(user.id);

    const { data: tp } = await supabase.from("tournament_players").select("player_name, tournament_id").eq("user_id", user.id).limit(1).single();
    const name = tp?.player_name || "";
    setMyName(name);

    if (tp) {
      const { data: t } = await supabase.from("tournaments").select("created_by").eq("id", tp.tournament_id).single();
      if (t) setAdminId(t.created_by);
    }

    const { data: challenges } = await supabase.from("h2h_challenges")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`);

    const received = (challenges || []).filter(c => c.opponent_id === user.id && c.status === "pending");
    const sent = (challenges || []).filter(c => c.challenger_id === user.id && c.status === "pending");
    setPendingReceived(received);
    setPendingSent(sent);

    const { data: matches } = await supabase.from("h2h_matches")
      .select("*")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("played_at", { ascending: true });

    const needsMyApproval = (matches || []).filter(m =>
      m.status === "pending_approval" && m.score_entered_by !== user.id
    );
    setPendingApproval(needsMyApproval);

    // Group by opponent + game (separate group per game)
    const opponentMap: { [key: string]: Opponent } = {};
    for (const m of (matches || [])) {
      const isP1 = m.player1_id === user.id;
      const oppId = isP1 ? m.player2_id : m.player1_id;
      const oppName = isP1 ? m.player2_name : m.player1_name;
      const key = `${oppId}__${m.game}`;

      if (!opponentMap[key]) opponentMap[key] = { key, name: oppName, userId: oppId, game: m.game, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: [] };
      opponentMap[key].matches.push(m);

      if (m.status !== "approved") continue;
      const myScore = isP1 ? m.player1_score : m.player2_score;
      const theirScore = isP1 ? m.player2_score : m.player1_score;
      opponentMap[key].goalsFor += myScore;
      opponentMap[key].goalsAgainst += theirScore;
      if (myScore > theirScore) opponentMap[key].wins++;
      else if (myScore === theirScore) opponentMap[key].draws++;
      else opponentMap[key].losses++;
    }
    setOpponents(Object.values(opponentMap).sort((a, b) => (b.wins + b.draws + b.losses) - (a.wins + a.draws + a.losses)));
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function loadRoster() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !adminId) return;
    const { data } = await supabase.from("admin_players")
      .select("id, player_name, user_id")
      .eq("admin_id", adminId)
      .neq("user_id", user.id);
    setRosterPlayers((data || []).filter(p => p.user_id));
  }

  async function sendChallenge() {
    if (!selectedOpponent) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("h2h_challenges").insert({
      challenger_id: user!.id,
      opponent_id: selectedOpponent.user_id,
      challenger_name: myName,
      opponent_name: selectedOpponent.player_name,
      game: selectedGame,
      status: "pending",
      admin_id: adminId,
    });
    setSending(false);
    setShowChallenge(false);
    setSelectedOpponent(null);
    fetchAll();
  }

  async function respondChallenge(challengeId: string, accept: boolean) {
    if (accept) {
      const challenge = pendingReceived.find(c => c.id === challengeId);
      if (!challenge) return;
      await supabase.from("h2h_challenges").update({ status: "accepted" }).eq("id", challengeId);
      await supabase.from("h2h_matches").insert({
        challenge_id: challengeId,
        player1_id: challenge.challenger_id,
        player2_id: challenge.opponent_id,
        player1_name: challenge.challenger_name,
        player2_name: challenge.opponent_name,
        game: challenge.game,
        status: "pending_score",
        admin_id: adminId,
        player1_score: 0,
        player2_score: 0,
      });
    } else {
      await supabase.from("h2h_challenges").update({ status: "declined" }).eq("id", challengeId);
    }
    fetchAll();
  }

  async function enterScore() {
    if (!scoreMatch) return;
    setSavingScore(true);
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    await supabase.from("h2h_matches").update({
      player1_score: s1,
      player2_score: s2,
      status: "pending_approval",
      score_entered_by: myUserId,
    }).eq("id", scoreMatch.id);
    setSavingScore(false);
    setScoreMatch(null);
    fetchAll();
  }

  async function approveScore(matchId: string) {
    await supabase.from("h2h_matches").update({ status: "approved" }).eq("id", matchId);
    fetchAll();
  }

  async function disputeScore(matchId: string) {
    await supabase.from("h2h_matches").update({ status: "pending_score", score_entered_by: null }).eq("id", matchId);
    fetchAll();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const totalMatches = opponents.reduce((s, o) => s + o.wins + o.draws + o.losses, 0);
  const totalWins = opponents.reduce((s, o) => s + o.wins, 0);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><p className="text-cyan-400">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/player/tournaments")} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">Head-to-Head</span>
        <button onClick={() => { setShowChallenge(true); loadRoster(); }}
          className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-orange-400 transition">
          + Challenge
        </button>
      </nav>

      <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto">

        {/* Pending approvals */}
        {pendingApproval.length > 0 && (
          <div className="mb-6">
            <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-3">Waiting for your approval</p>
            {pendingApproval.map(m => {
              const isP1 = m.player1_id === myUserId;
              const oppName = isP1 ? m.player2_name : m.player1_name;
              const myScore = isP1 ? m.player1_score : m.player2_score;
              const theirScore = isP1 ? m.player2_score : m.player1_score;
              return (
                <div key={m.id} className="bg-[#111] border border-orange-500/30 rounded-xl p-4 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">vs {oppName}</p>
                      <p className="text-gray-500 text-xs">{m.game} · {formatDate(m.played_at)}</p>
                    </div>
                    <span className="text-cyan-400 font-extrabold text-xl">{myScore} - {theirScore}</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">{oppName} entered this score. Do you approve?</p>
                  <div className="flex gap-2">
                    <button onClick={() => approveScore(m.id)} className="flex-1 bg-cyan-400 text-black font-bold py-2 rounded-lg text-sm">Approve</button>
                    <button onClick={() => disputeScore(m.id)} className="flex-1 bg-[#1A1A1A] border border-red-500/30 text-red-400 font-bold py-2 rounded-lg text-sm">Dispute</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending received challenges */}
        {pendingReceived.length > 0 && (
          <div className="mb-6">
            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Challenges received</p>
            {pendingReceived.map(c => (
              <div key={c.id} className="bg-[#111] border border-cyan-400/20 rounded-xl p-4 mb-2 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{c.challenger_name} challenged you</p>
                  <p className="text-gray-500 text-xs">{c.game} · {formatDate(c.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respondChallenge(c.id, true)} className="bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs">Accept</button>
                  <button onClick={() => respondChallenge(c.id, false)} className="bg-[#1A1A1A] border border-[#333] text-gray-400 font-bold px-3 py-1.5 rounded-lg text-xs">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending sent */}
        {pendingSent.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">Challenges sent</p>
            {pendingSent.map(c => (
              <div key={c.id} className="bg-[#111] border border-[#1A1A1A] rounded-xl p-4 mb-2 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">vs {c.opponent_name}</p>
                  <p className="text-gray-500 text-xs">{c.game} · {formatDate(c.created_at)}</p>
                </div>
                <span className="text-orange-500 text-xs font-bold">Pending</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary stats */}
        {opponents.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-white text-2xl font-extrabold">{totalMatches}</p>
              <p className="text-gray-600 text-xs mt-1">Total Matches</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-cyan-400 text-2xl font-extrabold">{totalWins}</p>
              <p className="text-gray-600 text-xs mt-1">Wins</p>
            </div>
            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
              <p className="text-orange-500 text-2xl font-extrabold">{opponents.length}</p>
              <p className="text-gray-600 text-xs mt-1">Matchups</p>
            </div>
          </div>
        )}

        {/* H2H Records */}
        {opponents.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && pendingApproval.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-white font-bold text-lg">No H2H matches yet</p>
            <p className="text-gray-600 text-sm mt-2">Challenge a player to get started</p>
            <button onClick={() => { setShowChallenge(true); loadRoster(); }}
              className="mt-6 bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-300 transition">
              + Challenge a Player
            </button>
          </div>
        ) : (
          <>
            {opponents.length > 0 && <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-3">H2H Records</p>}
            <div className="flex flex-col gap-3">
              {opponents.map(opp => {
                const approvedMatches = opp.matches.filter(m => m.status === "approved");
                const pendingScoreMatches = opp.matches.filter(m => m.status === "pending_score");
                const pendingApprovalMatches = opp.matches.filter(m => m.status === "pending_approval");
                const total = opp.wins + opp.draws + opp.losses;
                const winPct = total > 0 ? Math.round((opp.wins / total) * 100) : 0;
                const isExpanded = expanded === opp.key;
                const gameColor = GAME_COLORS[opp.game] || GAME_COLORS["Other"];

                return (
                  <div key={opp.key} className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
                    <button onClick={() => setExpanded(isExpanded ? null : opp.key)} className="w-full p-5 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold shrink-0">
                            {opp.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-extrabold">{opp.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gameColor}`}>{opp.game}</span>
                            </div>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {total} match{total !== 1 ? "es" : ""}{total > 0 ? ` · ${winPct}% win rate` : ""}
                              {pendingScoreMatches.length > 0 && <span className="text-orange-500 ml-1">· {pendingScoreMatches.length} score pending</span>}
                              {pendingApprovalMatches.length > 0 && <span className="text-yellow-500 ml-1">· {pendingApprovalMatches.length} awaiting approval</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {total > 0 && (
                            <>
                              <div className="text-center">
                                <p className="text-cyan-400 font-extrabold text-lg leading-none">{opp.wins}</p>
                                <p className="text-gray-600 text-[10px]">W</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-400 font-extrabold text-lg leading-none">{opp.draws}</p>
                                <p className="text-gray-600 text-[10px]">D</p>
                              </div>
                              <div className="text-center">
                                <p className="text-red-400 font-extrabold text-lg leading-none">{opp.losses}</p>
                                <p className="text-gray-600 text-[10px]">L</p>
                              </div>
                            </>
                          )}
                          <span className="text-gray-600 text-sm ml-1">{isExpanded ? "▾" : "▸"}</span>
                        </div>
                      </div>

                      {total > 0 && (
                        <div className="mt-3 bg-[#222] rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-cyan-400 h-full transition-all" style={{ width: `${opp.wins / total * 100}%` }} />
                          <div className="bg-gray-600 h-full transition-all" style={{ width: `${opp.draws / total * 100}%` }} />
                          <div className="bg-red-500 h-full transition-all" style={{ width: `${opp.losses / total * 100}%` }} />
                        </div>
                      )}
                    </button>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t border-[#1A1A1A] px-5 pb-5">

                        {/* Pending score */}
                        {pendingScoreMatches.map((m, idx) => {
                          const isP1 = m.player1_id === myUserId;
                          const matchNum = idx + 1;
                          return (
                            <div key={m.id} className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-3 mt-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-gray-400 text-xs font-bold mb-0.5">Match {matchNum}</p>
                                  <p className="text-orange-500 text-xs font-bold">Score not entered yet</p>
                                  <p className="text-gray-600 text-xs">{opp.game} · {formatDate(m.played_at)}</p>
                                </div>
                                <button onClick={() => { setScoreMatch(m); setScore1("0"); setScore2("0"); }}
                                  className="text-cyan-400 text-xs font-bold border border-cyan-400 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition">
                                  Enter Score
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Pending approval (submitted by me, waiting) */}
                        {pendingApprovalMatches.filter(m => m.score_entered_by === myUserId).map((m, idx) => {
                          const isP1 = m.player1_id === myUserId;
                          const myScore = isP1 ? m.player1_score : m.player2_score;
                          const theirScore = isP1 ? m.player2_score : m.player1_score;
                          const matchNum = pendingScoreMatches.length + idx + 1;
                          return (
                            <div key={m.id} className="bg-[#1A1A1A] border border-yellow-500/20 rounded-xl p-3 mt-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-gray-400 text-xs font-bold mb-0.5">Match {matchNum}</p>
                                  <p className="text-yellow-500 text-xs font-bold">Submitted · Waiting for approval</p>
                                  <p className="text-gray-600 text-xs">{opp.game} · {formatDate(m.played_at)}</p>
                                </div>
                                <span className="text-yellow-500 font-extrabold text-lg">{myScore} - {theirScore}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Approved match history */}
                        {approvedMatches.length > 0 && (
                          <div className="mt-4">
                            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-2">Match History</p>
                            {approvedMatches.map((m, idx) => {
                              const isP1 = m.player1_id === myUserId;
                              const myScore = isP1 ? m.player1_score : m.player2_score;
                              const theirScore = isP1 ? m.player2_score : m.player1_score;
                              const won = myScore > theirScore;
                              const drew = myScore === theirScore;
                              const matchNum = pendingScoreMatches.length + pendingApprovalMatches.filter(m => m.score_entered_by === myUserId).length + idx + 1;
                              return (
                                <div key={m.id} className="flex items-center justify-between py-3 border-b border-[#222] last:border-0">
                                  <div>
                                    <p className="text-gray-400 text-xs font-bold">Match {matchNum}</p>
                                    <p className="text-gray-600 text-xs">{opp.game} · {formatDate(m.played_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-white font-bold">{myScore} - {theirScore}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "text-cyan-400 bg-cyan-400/10" : drew ? "text-gray-400 bg-[#222]" : "text-red-400 bg-red-400/10"}`}>
                                      {won ? "W" : drew ? "D" : "L"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {approvedMatches.length === 0 && pendingScoreMatches.length === 0 && pendingApprovalMatches.length === 0 && (
                          <p className="text-gray-600 text-xs mt-4">No matches yet</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Challenge Modal */}
      {showChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">Challenge a Player</h2>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">Select Game</label>
            <div className="flex gap-2 flex-wrap mb-5">
              {GAMES.map(g => (
                <button key={g} onClick={() => setSelectedGame(g)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition ${selectedGame === g ? "bg-cyan-400 text-black border-cyan-400" : "border-[#333] text-gray-500 hover:border-gray-400"}`}>
                  {g}
                </button>
              ))}
            </div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">Select Opponent</label>
            {rosterPlayers.length === 0 ? (
              <p className="text-gray-600 text-sm py-4 text-center">No registered players found</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {rosterPlayers.map(p => (
                  <button key={p.id} onClick={() => setSelectedOpponent(p)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${selectedOpponent?.id === p.id ? "border-cyan-400 bg-[#001A1A]" : "border-[#222] bg-[#1A1A1A] hover:border-[#444]"}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${selectedOpponent?.id === p.id ? "bg-cyan-400 text-black" : "bg-orange-500"}`}>
                      {selectedOpponent?.id === p.id ? "✓" : p.player_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-white font-bold text-sm">{p.player_name}</span>
                    {selectedOpponent?.id === p.id && <span className="ml-auto text-cyan-400 text-xs font-bold">Selected</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={sendChallenge} disabled={!selectedOpponent || sending}
              className="w-full mt-5 bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50 transition">
              {sending ? "Sending..." : "Send Challenge"}
            </button>
            <button onClick={() => { setShowChallenge(false); setSelectedOpponent(null); }} className="w-full text-gray-500 py-3 mt-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-cyan-400 text-xl font-bold mb-2">Enter Score</h2>
            <p className="text-gray-500 text-sm mb-1">{scoreMatch.player1_name} vs {scoreMatch.player2_name}</p>
            <p className="text-gray-600 text-xs mb-5">{scoreMatch.game}</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-2">{scoreMatch.player1_name}</p>
                <input type="number" min="0" value={score1}
                  onChange={e => setScore1(String(Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center focus:outline-none focus:border-cyan-400" />
              </div>
              <span className="text-gray-600 text-2xl font-bold mt-4">-</span>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-2">{scoreMatch.player2_name}</p>
                <input type="number" min="0" value={score2}
                  onChange={e => setScore2(String(Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-[#0A0A0A] text-cyan-400 border border-[#333] rounded-lg p-3 text-2xl font-bold w-20 text-center focus:outline-none focus:border-cyan-400" />
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-3 mb-5 text-center">
              <p className="text-gray-500 text-xs">After submitting, the other player will need to approve this score before it counts.</p>
            </div>
            <button onClick={enterScore} disabled={savingScore}
              className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition">
              {savingScore ? "Submitting..." : "Submit Score"}
            </button>
            <button onClick={() => setScoreMatch(null)} className="w-full text-gray-500 py-3 mt-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}