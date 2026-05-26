"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/app/admin/components/Sidebar";
import KnockoutBracket from "@/components/KnockoutBracket";
import { QRCodeSVG } from "qrcode.react";

type AdminPlayer = { id: string; player_name: string; player_email: string; player_phone: string; user_id: string | null; };
type TournamentPlayer = { id: string; user_id: string; status: string; player_name: string; };
type Team = { id: string; name: string; members: string[]; };
type Match = {
  id: string; home_team_id: string; away_team_id: string;
  home_score: number; away_score: number; status: string; round: number;
  home_team?: { id: string; name: string }; away_team?: { id: string; name: string };
};

export default function TournamentDetail() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<any>(null);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [rosterPlayers, setRosterPlayers] = useState<AdminPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<"players" | "teams" | "fixtures" | "standings" | "bracket">("players");
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: tData } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
    setTournament(tData);
    const { data: tp } = await supabase.from("tournament_players").select("*").eq("tournament_id", tournamentId);
    setTournamentPlayers(tp || []);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roster } = await supabase.from("admin_players").select("*").eq("admin_id", user?.id);
    setRosterPlayers(roster || []);
    const { data: teamsData } = await supabase.from("teams").select("*").eq("tournament_id", tournamentId);
    if (teamsData) {
      const withMembers = await Promise.all(teamsData.map(async (team) => {
        const { data: members } = await supabase.from("team_members").select("user_id").eq("team_id", team.id);
        const names = await Promise.all((members || []).map(async (m) => {
          const { data: p } = await supabase.from("tournament_players").select("player_name")
            .eq("tournament_id", tournamentId).eq("user_id", m.user_id).single();
          return p?.player_name || "Unknown";
        }));
        return { ...team, members: names };
      }));
      setTeams(withMembers);
    }
    const { data: matchesData } = await supabase.from("matches").select("*")
      .eq("tournament_id", tournamentId).order("round", { ascending: true });
    if (matchesData && teamsData) {
      setMatches(matchesData.map(m => ({
        ...m,
        home_team: teamsData?.find(t => t.id === m.home_team_id),
        away_team: teamsData?.find(t => t.id === m.away_team_id),
      })));
    }
    setLoading(false);
  }, [supabase, tournamentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const availablePlayers = rosterPlayers.filter(
    rp => !tournamentPlayers.find(tp => tp.player_name === rp.player_name)
  );

  const teamSize = tournament?.team_size || "1v1";
  const format = tournament?.format || "round_robin";
  const minPlayers = teamSize === "1v1" ? 2 : 4;
  const isCompleted = tournament?.status === "completed";
  const isActive = tournament?.status === "active";
  const canFormTeams = tournamentPlayers.length >= minPlayers && teams.length === 0;

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function inviteSelected() {
    const players = availablePlayers.filter(p => selected.includes(p.id));
    for (const player of players) {
      if (tournamentPlayers.find(tp => tp.player_name === player.player_name)) continue;
      await supabase.from("tournament_players").insert({
        tournament_id: tournamentId, user_id: player.user_id || player.id,
        player_name: player.player_name, status: "invited",
      });
    }
    setModalOpen(false); setSelected([]); fetchAll();
  }

  async function inviteAll() {
    for (const player of availablePlayers) {
      if (tournamentPlayers.find(tp => tp.player_name === player.player_name)) continue;
      await supabase.from("tournament_players").insert({
        tournament_id: tournamentId, user_id: player.user_id || player.id,
        player_name: player.player_name, status: "invited",
      });
    }
    setModalOpen(false); setSelected([]); fetchAll();
  }

  async function removePlayer(id: string) {
    await supabase.from("tournament_players").delete().eq("id", id);
    fetchAll();
  }

  function calculateStandings() {
    const map: { [k: string]: { teamId: string; teamName: string; played: number; won: number; drawn: number; lost: number; points: number } } = {};
    teams.forEach(t => { map[t.id] = { teamId: t.id, teamName: t.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }; });
    matches.filter(m => m.status === "completed").forEach(m => {
      if (map[m.home_team_id]) {
        map[m.home_team_id].played++;
        if (m.home_score > m.away_score) { map[m.home_team_id].won++; map[m.home_team_id].points += 3; }
        else if (m.home_score === m.away_score) { map[m.home_team_id].drawn++; map[m.home_team_id].points += 1; }
        else map[m.home_team_id].lost++;
      }
      if (map[m.away_team_id]) {
        map[m.away_team_id].played++;
        if (m.away_score > m.home_score) { map[m.away_team_id].won++; map[m.away_team_id].points += 3; }
        else if (m.away_score === m.home_score) { map[m.away_team_id].drawn++; map[m.away_team_id].points += 1; }
        else map[m.away_team_id].lost++;
      }
    });
    return Object.values(map).sort((a, b) => b.points - a.points);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.origin + "/tournament/" + tournamentId);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function openQrModal() {
    setQrUrl(window.location.origin + "/tournament/" + tournamentId);
    setQrModalOpen(true);
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement("a");
      a.download = `futknight-${tournament?.name || "tournament"}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  if (loading) return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <main className="flex-1 md:ml-56 flex items-center justify-center"><p className="text-cyan-400">Loading...</p></main>
    </div>
  );

  const tabs = ["players", "teams", "fixtures", "standings", ...(format === "knockout" ? ["bracket"] : [])] as const;

  return (
    <div className="flex w-full min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <<main className="flex-1 px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <button onClick={() => router.push("/admin/tournaments")} className="text-orange-500 text-sm mb-1">Back</button>
            <h1 className="text-white text-2xl font-extrabold">{tournament?.name}</h1>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={openQrModal}
              className="bg-[#1A1A1A] border border-[#333] text-orange-500 px-3 py-2 rounded-lg hover:border-orange-500 text-sm font-bold transition">
              QR Code
            </button>
            <button onClick={copyShareLink}
              className={"border px-3 py-2 rounded-lg text-sm font-bold transition " + (linkCopied ? "bg-cyan-400 text-black border-cyan-400" : "bg-[#1A1A1A] border-[#333] text-cyan-400 hover:border-cyan-400")}>
              {linkCopied ? "Copied!" : "Share"}
            </button>
            {!isCompleted ? (
              <button onClick={() => setModalOpen(true)} className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-orange-400 transition">+ Player</button>
            ) : (
              <span className="text-cyan-400 text-xs font-bold border border-cyan-400 px-2.5 py-1.5 rounded-lg">Done</span>
            )}
          </div>
        </div>

        {/* Info badges */}
        <div className="flex gap-2 flex-wrap mb-6">
          <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{format === "round_robin" ? "Round Robin" : "Knockout"}</span>
          <span className="text-gray-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">{teamSize}</span>
          <span className={"text-xs px-2 py-1 rounded border " + (isCompleted ? "text-cyan-400 border-cyan-400" : isActive ? "text-orange-500 border-orange-500" : "text-gray-500 border-[#333]")}>
            {isCompleted ? "Completed" : isActive ? "Active" : "Upcoming"}
          </span>
          {isCompleted && tournament?.winner_team_name && (
            <span className="text-orange-500 text-xs bg-[#1A1A1A] px-2 py-1 rounded">🏆 {tournament.winner_team_name}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#222] mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={"px-5 py-2.5 text-sm font-bold capitalize whitespace-nowrap " + (activeTab === tab ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-600 hover:text-gray-400")}>
              {tab}
              {tab === "players" && <span className="ml-1.5 text-xs text-gray-600">({tournamentPlayers.length})</span>}
              {tab === "teams" && teams.length > 0 && <span className="ml-1.5 text-xs text-gray-600">({teams.length})</span>}
            </button>
          ))}
        </div>

        {/* Players Tab */}
        {activeTab === "players" && (
          <div>
            {tournamentPlayers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white font-bold text-lg">No players yet</p>
                <p className="text-gray-600 text-sm mt-2">Click "+ Player" to add from your roster</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1A1A1A]">
                        <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3 pl-4">#</th>
                        <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Player</th>
                        <th className="text-left text-gray-600 text-xs font-bold uppercase tracking-widest pb-3">Status</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentPlayers.map((p, i) => (
                        <tr key={p.id} className="border-b border-[#111] hover:bg-[#111] transition group">
                          <td className="py-3.5 pl-4 text-gray-600 text-sm">{i + 1}</td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">{p.player_name[0]?.toUpperCase()}</div>
                              <span className="text-white font-bold text-sm">{p.player_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className={"text-xs font-bold " + (p.status === "accepted" ? "text-cyan-400" : "text-orange-500")}>{p.status.toUpperCase()}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            {teams.length === 0 && !isCompleted && (
                              <button onClick={() => removePlayer(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500 text-sm px-3 py-1 bg-[#1A1A1A] rounded-lg border border-[#333] transition">Remove</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden flex flex-col gap-2.5">
                  {tournamentPlayers.map((p, i) => (
                    <div key={p.id} className="bg-[#111] rounded-xl p-4 flex items-center border border-[#222]">
                      <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center mr-3 text-white font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-white font-bold">{p.player_name}</p>
                        <p className={"text-xs mt-0.5 " + (p.status === "accepted" ? "text-cyan-400" : "text-orange-500")}>{p.status.toUpperCase()}</p>
                      </div>
                      {teams.length === 0 && !isCompleted && (
                        <button onClick={() => removePlayer(p.id)} className="text-red-500 text-xl font-bold px-2">x</button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {canFormTeams && !isCompleted && (
              <button onClick={() => router.push("/admin/tournaments/" + tournamentId + "/form-teams")}
                className="w-full mt-6 bg-cyan-400 text-black font-bold py-4 rounded-xl hover:bg-cyan-300 text-base transition">
                Form Teams
              </button>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === "teams" && (
          <div>
            {teams.length === 0 ? (
              <div className="text-center py-16"><p className="text-white font-bold text-lg">No teams yet</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="bg-[#111] rounded-xl p-4 border border-cyan-400">
                    <p className="text-cyan-400 font-bold mb-3">{team.name}</p>
                    {team.members.map((m, i) => (
                      <div key={i} className="flex items-center py-2 border-t border-[#222]">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center mr-3 text-white font-bold text-sm">{m[0]?.toUpperCase()}</div>
                        <span className="text-white text-sm">{m}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fixtures Tab */}
        {activeTab === "fixtures" && (
          <div>
            {matches.length === 0 ? (
              <div>
                <div className="text-center py-16">
                  <p className="text-white font-bold text-lg">No fixtures yet</p>
                  <p className="text-gray-600 text-sm mt-2">Generate fixtures to get started</p>
                </div>
                {!isCompleted && teams.length > 0 && (
                  <button onClick={() => router.push("/admin/tournaments/" + tournamentId + "/fixtures")}
                    className="w-full bg-cyan-400 text-black font-bold py-4 rounded-xl hover:bg-cyan-300 transition">
                    Generate Fixtures
                  </button>
                )}
              </div>
            ) : (
              <div>
                {isActive && (
                  <button onClick={() => router.push("/admin/tournaments/" + tournamentId + "/fixtures")}
                    className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-400 mb-6 transition">
                    Go to Scoring
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matches.map(m => (
                    <div key={m.id} className="bg-[#111] rounded-xl p-4 border border-[#222]">
                      <p className="text-gray-600 text-xs mb-2">Round {m.round}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold flex-1 text-center text-sm">{m.home_team?.name}</span>
                        <span className="px-4">
                          {m.status === "completed"
                            ? <span className="text-cyan-400 text-lg font-bold">{m.home_score} - {m.away_score}</span>
                            : <span className="text-gray-600">vs</span>}
                        </span>
                        <span className="text-white font-bold flex-1 text-center text-sm">{m.away_team?.name}</span>
                      </div>
                      <p className={"text-center text-[11px] mt-2 " + (m.status === "completed" ? "text-orange-500" : "text-gray-600")}>{m.status.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <div>
            {matches.length === 0 ? (
              <div className="text-center py-16"><p className="text-white font-bold">No standings yet</p></div>
            ) : format === "knockout" ? (
              <div className="text-center py-16">
                <p className="text-white font-bold">Knockout Format</p>
                <p className="text-gray-600 text-sm mt-2">No standings for knockout</p>
                {isCompleted && tournament?.winner_team_name && (
                  <div className="mt-6">
                    <p className="text-4xl mb-2">🏆</p>
                    <p className="text-cyan-400 font-bold text-xl">{tournament.winner_team_name}</p>
                    <p className="text-gray-500 text-sm mt-1">Tournament Winner</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex bg-[#111] rounded-lg py-2.5 px-4 mb-2">
                  <span className="flex-[2] text-gray-600 text-xs font-bold uppercase tracking-widest">Team</span>
                  <span className="flex-1 text-gray-600 text-xs font-bold text-center">P</span>
                  <span className="flex-1 text-gray-600 text-xs font-bold text-center">W</span>
                  <span className="flex-1 text-gray-600 text-xs font-bold text-center">D</span>
                  <span className="flex-1 text-gray-600 text-xs font-bold text-center">L</span>
                  <span className="flex-1 text-gray-600 text-xs font-bold text-center">PTS</span>
                </div>
                {calculateStandings().map((s, i) => (
                  <div key={s.teamId} className={"flex py-3.5 px-4 items-center rounded-lg " + (i % 2 === 0 ? "bg-[#111]" : "")}>
                    <span className="flex-[2] flex items-center gap-2">
                      <span className="text-gray-600 text-sm w-5">{i + 1}</span>
                      <span className="text-white font-bold text-sm">{s.teamName}</span>
                      {isCompleted && i === 0 && <span>🏆</span>}
                    </span>
                    <span className="flex-1 text-gray-500 text-sm text-center">{s.played}</span>
                    <span className="flex-1 text-gray-500 text-sm text-center">{s.won}</span>
                    <span className="flex-1 text-gray-500 text-sm text-center">{s.drawn}</span>
                    <span className="flex-1 text-gray-500 text-sm text-center">{s.lost}</span>
                    <span className="flex-1 text-cyan-400 text-sm font-bold text-center">{s.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bracket Tab */}
        {activeTab === "bracket" && format === "knockout" && (
          <KnockoutBracket
            matches={matches}
            teams={teams}
            winnerName={tournament?.winner_team_name}
            isCompleted={isCompleted}
          />
        )}
      </main>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-cyan-400 text-xl font-bold mb-1">Tournament QR Code</h2>
            <p className="text-gray-500 text-sm mb-6">Players scan this to view the tournament</p>

            {/* QR Code */}
            <div ref={qrRef} className="bg-white rounded-2xl p-5 inline-block mb-6">
              <QRCodeSVG
                value={qrUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Tournament name below QR */}
            <p className="text-white font-extrabold text-lg mb-1">{tournament?.name}</p>
            <p className="text-gray-600 text-xs mb-6 break-all">{qrUrl}</p>

            <div className="flex gap-3">
              <button onClick={downloadQR}
                className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-400 transition text-sm">
                Download PNG
              </button>
              <button onClick={copyShareLink}
                className="flex-1 bg-[#1A1A1A] border border-[#333] text-cyan-400 font-bold py-3 rounded-lg hover:border-cyan-400 transition text-sm">
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <button onClick={() => setQrModalOpen(false)} className="w-full text-gray-500 py-3 mt-2">Close</button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="bg-[#111] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 text-xl font-bold mb-5">Add from Roster</h2>
            {availablePlayers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white font-bold">No players available</p>
                <p className="text-gray-600 text-sm mt-2">Add players to your roster first</p>
              </div>
            ) : (
              <>
                <button onClick={inviteAll} className="w-full bg-[#1A1A1A] border border-cyan-400 text-cyan-400 p-3 rounded-lg font-bold mb-3">
                  Add All ({availablePlayers.length})
                </button>
                <div className="max-h-80 overflow-y-auto">
                  {availablePlayers.map(player => (
                    <button key={player.id} onClick={() => toggleSelect(player.id)}
                      className={"w-full text-left flex items-center p-3 rounded-lg mb-2 border " + (selected.includes(player.id) ? "border-cyan-400 bg-[#001A1A]" : "border-[#222] bg-[#1A1A1A]")}>
                      <div className={"w-11 h-11 rounded-full flex items-center justify-center mr-3 text-white font-bold " + (selected.includes(player.id) ? "bg-cyan-400" : "bg-orange-500")}>
                        {selected.includes(player.id) ? "v" : player.player_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">{player.player_name}</p>
                        <p className="text-gray-500 text-sm">{player.player_email || player.player_phone || "No contact"}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {selected.length > 0 && (
                  <button onClick={inviteSelected} className="w-full bg-cyan-400 text-[#0A0A0A] p-4 rounded-lg font-bold mt-2">
                    + Add Selected ({selected.length})
                  </button>
                )}
              </>
            )}
            <button onClick={() => { setModalOpen(false); setSelected([]); }} className="w-full text-gray-500 p-3 mt-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}