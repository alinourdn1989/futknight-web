// app/admin/layout.tsx
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {children}
    </div>
  );
}
