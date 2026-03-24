import { Outlet } from "react-router-dom";
import { FloatingChat } from "@/components/FloatingChat";
import logo from "@/assets/logo.svg";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 border-r bg-card text-card-foreground p-4">
        <div className="mb-4 flex items-center gap-2">
          <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
          <h2 className="text-lg font-bold tracking-tight">
            <span className="text-[#103E6A]">task</span>
            <span className="text-[#0394B1]">pilot</span>
          </h2>
        </div>
        <nav className="space-y-2">
          <a href="/" className="block px-3 py-2 rounded-md hover:bg-accent">
            Dashboard
          </a>
          <a
            href="/projects"
            className="block px-3 py-2 rounded-md hover:bg-accent"
          >
            Dự án
          </a>
          <a
            href="/tasks"
            className="block px-3 py-2 rounded-md hover:bg-accent"
          >
            Công việc
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <FloatingChat />
    </div>
  );
}
