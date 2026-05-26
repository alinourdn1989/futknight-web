"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Animated ball */}
        <div className="text-7xl mb-6 animate-bounce">⚽</div>

        {/* Error code */}
        <div className="inline-flex items-center gap-2 bg-[#111] border border-red-500/30 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-widest">
          404 — PAGE NOT FOUND
        </div>

        <h1 className="text-white text-3xl font-extrabold mb-3">
          Red card for this page.
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          The page you are looking for does not exist or has been moved. Let&apos;s get you back in the game.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="bg-cyan-400 text-black font-extrabold px-6 py-3 rounded-xl hover:bg-cyan-300 transition">
            Go Home
          </button>
          <button
            onClick={() => router.back()}
            className="bg-[#111] border border-[#333] text-gray-400 font-bold px-6 py-3 rounded-xl hover:border-[#555] hover:text-white transition">
            Go Back
          </button>
        </div>

        <p className="text-gray-700 text-xs mt-10">
          ⚔️ <span className="text-cyan-400 font-bold">FutKnight</span>
        </p>
      </div>
    </div>
  );
}
