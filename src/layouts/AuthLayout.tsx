import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#082f49_100%)]" />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2">
          <section className="hidden text-slate-100 lg:block">
            <p className="mb-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wider">
              TaskPilot Workspace
            </p>
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              Tổ chức công việc thông minh, tập trung đúng ưu tiên.
            </h2>
            <p className="mt-4 max-w-lg text-slate-300">
              Theo dõi deadline, cộng tác theo thời gian thực và kiểm soát tiến độ dự án
              chỉ trong một nơi duy nhất.
            </p>
          </section>

          <section className="mx-auto w-full max-w-md">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
