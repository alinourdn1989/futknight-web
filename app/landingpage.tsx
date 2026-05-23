"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-5 border-b border-[#111] sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-50">
        <div className="text-cyan-400 text-xl font-extrabold tracking-tight">⚔️ FutKnight</div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => router.push("/login")}
            className="text-gray-500 text-sm px-4 py-2 border border-[#222] rounded-lg hover:border-[#333] hover:text-gray-400 transition"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/register")}
            className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-orange-400 transition"
          >
            Sign Up Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-16 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#111] border border-orange-500 text-orange-500 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest">
          ⚽ FIFA TOURNAMENT MANAGER
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-[1.08] mb-6 tracking-tight">
          Run Your<br />
          <span className="text-cyan-400">FIFA Nights</span><br />
          Like a <span className="text-orange-500">Legend.</span>
        </h1>

        <p className="text-gray-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10">
          Stop juggling WhatsApp groups and spreadsheets. FutKnight runs your tournaments — fixtures, scores, standings, stats — all in one place.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <button
            onClick={() => router.push("/register")}
            className="bg-cyan-400 text-black font-extrabold text-base px-8 py-4 rounded-xl hover:bg-cyan-300 transition"
          >
            Start Your Tournament →
          </button>
          <button
            onClick={() => router.push("/login")}
            className="bg-transparent text-white font-bold text-base px-8 py-4 rounded-xl border border-[#333] hover:border-[#555] transition"
          >
            Login
          </button>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-12 border-t border-[#111] pt-10">
          <div className="text-center">
            <div className="text-orange-500 text-3xl font-extrabold">1v1</div>
            <div className="text-gray-600 text-xs mt-1">& 2v2 formats</div>
          </div>
          <div className="text-center">
            <div className="text-orange-500 text-3xl font-extrabold">∞</div>
            <div className="text-gray-600 text-xs mt-1">Tournaments</div>
          </div>
          <div className="text-center">
            <div className="text-orange-500 text-3xl font-extrabold">Free</div>
            <div className="text-gray-600 text-xs mt-1">Always</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <h2 className="text-white text-2xl font-extrabold text-center mb-2">Everything you need</h2>
        <p className="text-gray-600 text-sm text-center mb-10">Built for the way you actually play.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "⚡", title: "Auto Fixtures", desc: "Knockout or round robin — brackets generated instantly. No more manual scheduling." },
            { icon: "⚽", title: "Live Scoring", desc: "Update scores, track goal scorers and let everyone follow the action in real time." },
            { icon: "📊", title: "Standings & Stats", desc: "Live league tables, top scorer charts and player stats — like the real thing." },
            { icon: "👥", title: "Team Management", desc: "Add players, form teams manually, randomly or by seeding. Your call." },
            { icon: "📱", title: "Mobile + Web", desc: "Native mobile app for players. Web dashboard for admins. Works everywhere." },
            { icon: "🏆", title: "Champion Crown", desc: "Auto-declare winners, save tournament history and brag forever." },
          ].map((f) => (
            <div key={f.title} className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 hover:border-[#333] transition">
              <div className="text-2xl mb-4">{f.icon}</div>
              <div className="text-white font-bold text-sm mb-2">{f.title}</div>
              <div className="text-gray-500 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <h2 className="text-white text-2xl font-extrabold text-center mb-2">Up and running in minutes</h2>
        <p className="text-gray-600 text-sm text-center mb-12">No setup headaches. Just football.</p>

        <div className="flex flex-col md:flex-row gap-4">
          {[
            { step: "01", title: "Create a tournament", desc: "Pick a format, set the team size and add your players from your roster." },
            { step: "02", title: "Generate fixtures", desc: "One tap — brackets or round robin schedule created automatically." },
            { step: "03", title: "Play & track scores", desc: "Update results live, track goal scorers and watch the standings update in real time." },
          ].map((s) => (
            <div key={s.step} className="flex-1 bg-[#111] border border-[#1A1A1A] rounded-2xl p-6">
              <div className="text-cyan-400 text-xs font-extrabold tracking-widest mb-3">{s.step}</div>
              <div className="text-white font-bold text-sm mb-2">{s.title}</div>
              <div className="text-gray-500 text-xs leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-10 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-white text-2xl font-extrabold mb-3">Ready for your next FIFA night?</h2>
          <p className="text-gray-500 text-sm mb-8">Free to use. No credit card. Just football.</p>
          <button
            onClick={() => router.push("/register")}
            className="bg-cyan-400 text-black font-extrabold text-base px-10 py-4 rounded-xl hover:bg-cyan-300 transition"
          >
            Get Started Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#111] px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="text-cyan-400 font-extrabold">⚔️ FutKnight</div>
          <div className="text-gray-600 text-xs">© 2026 FutKnight. All rights reserved.</div>
          <div className="flex gap-6">
            <button onClick={() => router.push("/login")} className="text-gray-600 text-xs hover:text-gray-400 transition">Login</button>
            <button onClick={() => router.push("/register")} className="text-gray-600 text-xs hover:text-gray-400 transition">Sign Up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}