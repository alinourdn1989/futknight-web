"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setAdminName(user.email.split("@")[0]);
    });
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const groups = [
    {
      label: "Tournaments",
      items: [
{ href: "/admin/tournaments", label: "Tournaments", icon: "ti-trophy" },
{ href: "/admin/history", label: "History", icon: "ti-history" },
{ href: "/admin/players", label: "Players", icon: "ti-users" },
      ],
    },
    {
      label: "Analytics",
      items: [
{ href: "/admin/stats", label: "Stats", icon: "ti-chart-bar" },
{ href: "/admin/h2h", label: "Head-to-Head", icon: "ti-arrows-exchange" },
      ],
    },
    {
      label: "Explore",
      items: [
       { href: "/football", label: "Football Hub", icon: "ti-ball-football" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/admin/profile", label: "Profile", icon: "ti-user" },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/football") return pathname === "/football";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo + toggle */}
      <div className={"flex items-center border-b border-[#1A1A1A] min-h-[52px] " + (collapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-400/10 border border-cyan-400/20 rounded-lg flex items-center justify-center">
             <i className="ti ti-bolt text-cyan-400" style={{ fontSize: 13 }} aria-hidden="true" />
            </div>
            <span className="text-cyan-400 font-extrabold text-sm">FutKnight</span>
          </div>
        )}
        <button
          onClick={() => { setOpen(!open); setMobileOpen(false); }}
          className="w-6 h-6 rounded-md border border-[#222] bg-[#111] flex items-center justify-center hover:border-cyan-400 transition"
          aria-label="Toggle sidebar">
          <i className={"ti text-[#555] transition-transform " + (collapsed ? "ti-chevron-right" : "ti-chevron-left")} style={{ fontSize: 12 }} aria-hidden="true" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
        {groups.map(group => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="text-[#2A2A2A] text-[10px] font-bold uppercase tracking-widest px-2 mb-1">{group.label}</p>
            )}
            {group.items.map(item => {
              const active = isActive(item.href);
              return (
                <button key={item.href}
                  onClick={() => { router.push(item.href); setMobileOpen(false); }}
                  title={collapsed ? item.label : undefined}
                  className={"w-full flex items-center rounded-lg mb-0.5 transition relative " + (collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2") + " " + (
                    active
                      ? "bg-cyan-400/8 text-cyan-400 border border-cyan-400/12"
                      : "text-[#555] hover:bg-[#161616] hover:text-[#999]"
                  )}>
                  <i className={"ti " + item.icon + " flex-shrink-0 " + (active ? "text-cyan-400" : "text-[#3A3A3A]")} style={{ fontSize: 15 }} aria-hidden="true" />
                  {!collapsed && <span className="text-xs font-medium truncate">{item.label}</span>}
                  {/* Orange dot when collapsed and active */}
                  {collapsed && active && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user card + logout */}
      <div className="border-t border-[#1A1A1A] p-2">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 bg-[#111] border border-[#1A1A1A] rounded-lg px-2.5 py-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {adminName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#bbb] text-xs font-medium truncate">{adminName}</p>
                <p className="text-[#444] text-[10px]">Admin</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#444] hover:text-[#777] hover:bg-[#111] transition text-xs">
              <i className="ti ti-logout flex-shrink-0" style={{ fontSize: 14 }} aria-hidden="true" />
              Logout
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold">
                {adminName[0]?.toUpperCase()}
              </div>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="w-full flex justify-center p-1.5 rounded-lg text-[#444] hover:text-[#777] hover:bg-[#111] transition">
              <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ width: open ? 196 : 52, transition: "width 0.25s ease" }}
        className="hidden md:flex flex-col min-h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] fixed left-0 top-0 bottom-0 overflow-hidden z-30">
        <SidebarContent collapsed={!open} />
      </aside>

      {/* Desktop spacer */}
      <div className="hidden md:block flex-shrink-0" style={{ width: open ? 196 : 52, transition: "width 0.25s ease" }} />

      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 bg-[#111] border border-[#333] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:border-cyan-400 transition"
        aria-label="Open menu">
        <i className="ti ti-menu-2" style={{ fontSize: 16 }} aria-hidden="true" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col h-full">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-[#555] hover:text-white text-lg"
              aria-label="Close menu">
              <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
            <SidebarContent collapsed={false} />
          </div>
        </div>
      )}
    </>
  );
}
