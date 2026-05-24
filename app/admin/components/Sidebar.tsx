"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/admin/tournaments", label: "Tournaments", icon: "🏆" },
    { href: "/admin/players", label: "Players", icon: "👥" },
    { href: "/admin/stats", label: "Stats", icon: "📊" },
    { href: "/admin/profile", label: "Profile", icon: "👤" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="text-cyan-400 text-lg font-extrabold tracking-tight mb-10 px-2">⚔️ FutKnight</div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <button
              key={link.href}
              onClick={() => { router.push(link.href); setMobileOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
                active
                  ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A]"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:bg-[#1A1A1A] transition"
      >
        <span>↩</span>
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] px-4 py-6 fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 bg-[#111] border border-[#333] text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:border-cyan-400 transition"
      >
        ☰
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-[#0D0D0D] border-r border-[#1A1A1A] px-4 py-6 flex flex-col h-full">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
