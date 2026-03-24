import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/logo.svg";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <Card className="w-full max-w-md border-white/30 bg-white/85 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
          <img src={logo} alt="TaskPilot logo" className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          <span className="text-[#103E6A]">task</span>
          <span className="text-[#0394B1]">pilot</span>
        </CardTitle>
        <h1 className="text-xl font-semibold">{title}</h1>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
        {footer ? <div className="pt-1 text-center text-sm">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
