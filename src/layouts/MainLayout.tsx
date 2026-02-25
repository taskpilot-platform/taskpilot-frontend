import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 border-r bg-card text-card-foreground p-4">
        <h2 className="text-lg font-bold mb-4">TaskPilot</h2>
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
    </div>
  );
}
