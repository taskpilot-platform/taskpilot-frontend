import React from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface LiquidCardProps {
  className?: string
  children?: React.ReactNode
}

export const LiquidCard: React.FC<LiquidCardProps> = ({ className, children }) => {
  const { t } = useTranslation()

  const skills = [
    t("skills.predefined.glassmorphism"),
    t("skills.predefined.shadcn_ui"),
    t("skills.predefined.tailwind_css"),
    t("skills.predefined.framer_motion"),
  ]

  return (
    <Card 
      className={cn(
        "relative overflow-hidden glass shadow-xl",
        className
      )}
    >
      {/* Hiệu ứng tia sáng mờ ở góc */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

      {children ? (
        children
      ) : (
        <>
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">
              UI/UX Innovation
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Exploration of modern design patterns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="bg-white/20 text-foreground backdrop-blur-sm border-white/10 hover:bg-white/30 transition-all"
                >
                  {skill}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Sử dụng <strong>glass</strong> utility để tạo hiệu ứng lớp kính nhất quán toàn hệ thống.
            </p>
          </CardContent>
        </>
      )}
    </Card>
  )
}
