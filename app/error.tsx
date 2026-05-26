"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="text-7xl mb-6">⚡</div>

        {/* Error code */}
        <div className="inline-flex items-center gap-2 bg-[#111] border border-orange-500/30 text-orange-500 text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-widest">
          500 — SOMETHING WENT WRONG
        </div>

        <h1 className="text-white text-3xl font-extrabold mb-3">
          Own goal on our end.
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Something went wrong on our side. We are working on it. Please try again or head back home.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => reset()}
            className="bg-orange-500 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-orange-400 transition">
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-[#111] border border-[#333] text-gray-400 font-bold px-6 py-3 rounded-xl hover:border-[#555] hover:text-white transition">
            Go Home
          </button>
        </div>

        {error.digest && (
          <p className="text-gray-700 text-xs mt-6">Error ID: {error.digest}</p>
        )}

        <p className="text-gray-700 text-xs mt-6">
          ⚔️ <span className="text-cyan-400 font-bold">FutKnight</span>
        </p>
      </div>
    </div>
  );
}
