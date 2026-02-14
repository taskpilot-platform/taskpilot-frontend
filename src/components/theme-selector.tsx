import { useTheme } from "next-themes"
import { useColorTheme, COLOR_THEMES, type ColorTheme } from "./color-theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"

/**
 * Cấu hình hiển thị cho từng color theme
 */
const colorThemeConfig: Record<ColorTheme, { label: string; bgClass: string }> = {
  zinc: { label: "Zinc", bgClass: "bg-zinc-600" },
  blue: { label: "Xanh dương", bgClass: "bg-blue-600" },
  rose: { label: "Hồng", bgClass: "bg-rose-600" },
  green: { label: "Xanh lá", bgClass: "bg-green-600" },
  violet: { label: "Tím", bgClass: "bg-violet-600" },
  orange: { label: "Cam", bgClass: "bg-orange-600" },
}

/**
 * ThemeSelector - Component chọn Theme
 *
 * Cho phép user thay đổi:
 * 1. Chế độ Sáng / Tối / Hệ thống (next-themes)
 * 2. Màu chủ đạo: Zinc, Blue, Rose, Green, Violet, Orange
 *
 * Cả hai được lưu tự động vào localStorage.
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()

  return (
    <div className="space-y-4">
      {/* ========== Chế độ Sáng / Tối ========== */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">Chế độ hiển thị</p>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4 mr-1" />
            Sáng
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4 mr-1" />
            Tối
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-4 w-4 mr-1" />
            Hệ thống
          </Button>
        </div>
      </div>

      {/* ========== Màu chủ đạo ========== */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">Màu chủ đạo</p>
        <div className="flex gap-2 flex-wrap">
          {COLOR_THEMES.map((t) => {
            const config = colorThemeConfig[t]
            return (
              <button
                key={t}
                onClick={() => setColorTheme(t)}
                className={`w-8 h-8 rounded-full ${config.bgClass} border-2 transition-all hover:scale-110 ${
                  colorTheme === t
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
    </div>
  )
}
