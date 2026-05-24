"use client";

type Team = { id: string; name: string };
type Match = {
  id: string; home_team_id: string; away_team_id: string;
  home_score: number; away_score: number; status: string; round: number;
  home_team?: Team; away_team?: Team;
};

type Props = {
  matches: Match[];
  teams: Team[];
  winnerName?: string;
  myTeamId?: string;
  isCompleted?: boolean;
};

export default function KnockoutBracket({ matches, teams, winnerName, myTeamId, isCompleted }: Props) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white font-bold">No bracket yet</p>
        <p className="text-gray-600 text-sm mt-2">Generate fixtures to see the bracket</p>
      </div>
    );
  }

  // Group matches by round
  const rounds: { [round: number]: Match[] } = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const maxRound = Math.max(...roundNumbers);

  function getRoundName(round: number, maxRound: number) {
    const diff = maxRound - round;
    if (diff === 0) return "Final";
    if (diff === 1) return "Semi Final";
    if (diff === 2) return "Quarter Final";
    return "Round " + round;
  }

  function getWinner(m: Match): string | null {
    if (m.status !== "completed") return null;
    return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
  }

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-6 min-w-max px-2">
        {roundNumbers.map(round => (
          <div key={round} className="flex flex-col gap-4">
            {/* Round label */}
            <div className="text-center mb-2">
              <span className={"text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full " + (
                round === maxRound
                  ? "text-orange-500 bg-orange-500/10 border border-orange-500/30"
                  : "text-gray-500 bg-[#111] border border-[#222]"
              )}>
                {getRoundName(round, maxRound)}
              </span>
            </div>

            {/* Matches in this round */}
            <div className="flex flex-col gap-4" style={{ justifyContent: "space-around", flex: 1 }}>
              {rounds[round].map((m, idx) => {
                const winnerId = getWinner(m);
                const isMyMatch = myTeamId && (m.home_team_id === myTeamId || m.away_team_id === myTeamId);
                const isFinal = round === maxRound;

                return (
                  <div key={m.id} className={"relative w-52 " + (idx > 0 ? "mt-2" : "")}>
                    {/* Match card */}
                    <div className={"bg-[#111] rounded-xl border overflow-hidden " + (
                      isFinal ? "border-orange-500/50" :
                      isMyMatch ? "border-cyan-400/50" :
                      "border-[#1A1A1A]"
                    )}>
                      {/* Round indicator for final */}
                      {isFinal && (
                        <div className="bg-orange-500/10 px-3 py-1 border-b border-orange-500/20">
                          <p className="text-orange-500 text-[10px] font-bold text-center">FINAL</p>
                        </div>
                      )}

                      {/* Home team */}
                      <div className={"flex items-center justify-between px-3 py-2.5 border-b border-[#1A1A1A] " + (
                        winnerId === m.home_team_id ? "bg-cyan-400/5" : ""
                      )}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 " + (
                            myTeamId && m.home_team_id === myTeamId ? "bg-cyan-400 text-black" : "bg-[#222] text-gray-400"
                          )}>
                            {m.home_team?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className={"text-sm font-bold truncate " + (
                            winnerId === m.home_team_id ? "text-white" :
                            winnerId && winnerId !== m.home_team_id ? "text-gray-600" :
                            "text-white"
                          )}>
                            {m.home_team?.name || "TBD"}
                          </span>
                        </div>
                        <span className={"text-sm font-extrabold ml-2 shrink-0 " + (
                          winnerId === m.home_team_id ? "text-cyan-400" : "text-gray-500"
                        )}>
                          {m.status === "completed" ? m.home_score : "-"}
                        </span>
                      </div>

                      {/* Away team */}
                      <div className={"flex items-center justify-between px-3 py-2.5 " + (
                        winnerId === m.away_team_id ? "bg-cyan-400/5" : ""
                      )}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 " + (
                            myTeamId && m.away_team_id === myTeamId ? "bg-cyan-400 text-black" : "bg-[#222] text-gray-400"
                          )}>
                            {m.away_team?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className={"text-sm font-bold truncate " + (
                            winnerId === m.away_team_id ? "text-white" :
                            winnerId && winnerId !== m.away_team_id ? "text-gray-600" :
                            "text-white"
                          )}>
                            {m.away_team?.name || "TBD"}
                          </span>
                        </div>
                        <span className={"text-sm font-extrabold ml-2 shrink-0 " + (
                          winnerId === m.away_team_id ? "text-cyan-400" : "text-gray-500"
                        )}>
                          {m.status === "completed" ? m.away_score : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="text-center mt-1">
                      <span className={"text-[10px] font-bold " + (
                        m.status === "completed" ? "text-orange-500" :
                        m.status === "scheduled" ? "text-gray-600" :
                        "text-cyan-400"
                      )}>
                        {m.status === "completed" ? "FT" : m.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Champion card */}
        {isCompleted && winnerName && (
          <div className="flex flex-col">
            <div className="text-center mb-2">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full text-yellow-400 bg-yellow-400/10 border border-yellow-400/30">
                Champion
              </span>
            </div>
            <div className="flex items-center justify-center flex-1">
              <div className="bg-[#1A0A00] border border-orange-500 rounded-2xl p-5 text-center w-52">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-orange-500 font-extrabold text-base">{winnerName}</p>
                <p className="text-gray-600 text-xs mt-1">Tournament Winner</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}