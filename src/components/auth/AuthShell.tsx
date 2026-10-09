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
    <Card className="w-full max-w-md rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
          <img src={logo} alt="TaskPilot logo" className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
        {footer ? <div className="pt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
