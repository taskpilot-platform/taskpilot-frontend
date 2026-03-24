import { cn } from "@/lib/utils"

interface LiquidCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function LiquidCard({ children, className, ...props }: LiquidCardProps) {
  return (
    <div
      className={cn("liquid-glass rounded-[2rem] p-6 text-white", className)}
      {...props}
    >
      {children}
    </div>
  )
}
