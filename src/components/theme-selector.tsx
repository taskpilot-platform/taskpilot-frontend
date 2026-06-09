import { useTheme } from "next-themes"
import { useColorTheme, COLOR_THEMES, type ColorTheme, GLASS_WALLPAPERS } from "./color-theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor, Sparkles, Image as ImageIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

const colorThemeConfig: Record<ColorTheme, { label: string; bgClass: string }> = {
  zinc: { label: "Zinc", bgClass: "bg-zinc-600" },
  blue: { label: "Xanh dương", bgClass: "bg-blue-600" },
  rose: { label: "Hồng", bgClass: "bg-rose-600" },
  green: { label: "Xanh lá", bgClass: "bg-green-600" },
  violet: { label: "Tím", bgClass: "bg-violet-600" },
  orange: { label: "Cam", bgClass: "bg-orange-600" },
}

export function ThemeSelector() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme, glassWallpaper, setGlassWallpaper } = useColorTheme()

  return (
    <div className="space-y-6">
      {/* ========== Chế độ Sáng / Tối ========== */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">{t("theme.display_mode", { defaultValue: "Chế độ hiển thị" })}</p>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4 mr-1" />
            {t("theme.light")}
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4 mr-1" />
            {t("theme.dark")}
          </Button>
          <Button
            variant={theme === "glass" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("glass")}
            className={theme === "glass" ? "bg-gradient-to-r from-blue-400 to-purple-400 border-none text-white" : ""}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {t("theme.glass")}
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-4 w-4 mr-1" />
            {t("theme.system")}
          </Button>
        </div>
      </div>

      {/* ========== Màu chủ đạo ========== */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">{t("theme.primary_color")}</p>
        <div className="flex gap-2 flex-wrap">
          {COLOR_THEMES.map((t) => {
            const config = colorThemeConfig[t]
            return (
              <button
                key={t}
                onClick={() => setColorTheme(t)}
                className={`w-8 h-8 rounded-full ${config.bgClass} border-2 transition-all hover:scale-110 ${colorTheme === t
                    ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground"
                    : "border-transparent"
                  }`}
                title={config.label}
                aria-label={`Chọn theme ${config.label}`}
              />
            )
          })}
        </div>
      </div>

      {/* ========== Hình nền (Chỉ hiển thị ở Glass mode) ========== */}
      {theme === "glass" && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4" />
            {t("theme.select_glass_wallpaper", { defaultValue: "Chọn hình nền Glass" })}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GLASS_WALLPAPERS.map((wp, idx) => (
              <button
                key={wp}
                onClick={() => setGlassWallpaper(wp)}
                className={`relative h-16 w-full overflow-hidden rounded-md border-2 transition-all hover:scale-105 ${
                  glassWallpaper === wp ? "border-primary ring-2 ring-primary/50" : "border-transparent"
                }`}
                title={`Hình nền ${idx + 1}`}
              >
                <img src={`${wp}?v=3`} alt={`Wallpaper ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
