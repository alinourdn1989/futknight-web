// app/admin/Sidebar.tsx  — shared sidebar component
"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/admin/tournaments", label: "Tournaments", icon: "🏆" },
    { href: "/admin/players", label: "Players", icon: "👥" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] px-4 py-6 fixed left-0 top-0 bottom-0">
      {/* Logo */}
      <div className="text-cyan-400 text-lg font-extrabold tracking-tight mb-10 px-2">⚔️ FutKnight</div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
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

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:bg-[#1A1A1A] transition"
      >
        <span>↩</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
