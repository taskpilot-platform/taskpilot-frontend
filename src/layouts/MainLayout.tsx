import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { FloatingChat } from "@/components/FloatingChat";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "react-toastify";

export default function MainLayout() {
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công");
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r bg-card p-4 text-card-foreground">
        <div className="mb-4 flex items-center gap-2">
          <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
          <h2 className="text-lg font-bold tracking-tight">
            <span className="text-[#103E6A]">task</span>
            <span className="text-[#0394B1]">pilot</span>
          </h2>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 transition-colors ${
                isActive ? "bg-accent font-medium" : "hover:bg-accent"
              }`
            }
          >
            Dashboard
          </NavLink>
          <Link
            to="/"
            className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-accent"
          >
            Dự án (sắp có)
          </Link>
          <Link
            to="/"
            className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-accent"
          >
            Công việc (sắp có)
          </Link>
        </nav>

        <div className="mt-auto">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Đang đăng xuất..." : "Đăng xuất"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <FloatingChat />
    </div>
  );
}
