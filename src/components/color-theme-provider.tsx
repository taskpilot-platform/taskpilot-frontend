import { createContext, useContext, useEffect, useState } from "react"

export const COLOR_THEMES = ["zinc", "blue", "rose", "green", "violet", "orange"] as const
export type ColorTheme = (typeof COLOR_THEMES)[number]

export const GLASS_WALLPAPERS = [
  "/bg-glass-1.jpg", 
  "/bg-glass-3.jpg",
  "/bg-glass-4.jpg"
] as const
export type GlassWallpaper = (typeof GLASS_WALLPAPERS)[number]

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ColorTheme
  defaultWallpaper?: GlassWallpaper
  storageKey?: string
  wallpaperStorageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  glassWallpaper: GlassWallpaper
  setGlassWallpaper: (wallpaper: GlassWallpaper) => void
}

const ColorThemeProviderContext = createContext<ColorThemeProviderState>({
  colorTheme: "zinc",
  setColorTheme: () => null,
  glassWallpaper: "/bg-glass-1.jpg",
  setGlassWallpaper: () => null,
})

export function ColorThemeProvider({
  children,
  defaultTheme = "zinc",
  defaultWallpaper = "/bg-glass-1.jpg",
  storageKey = "taskpilot-color-theme",
  wallpaperStorageKey = "taskpilot-glass-wallpaper",
}: ColorThemeProviderProps) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && COLOR_THEMES.includes(stored as ColorTheme)) {
        return stored as ColorTheme
      }
    } catch {}
    return defaultTheme
  })

  const [glassWallpaper, setGlassWallpaperState] = useState<GlassWallpaper>(() => {
    try {
      const stored = localStorage.getItem(wallpaperStorageKey)
      if (stored && GLASS_WALLPAPERS.includes(stored as GlassWallpaper)) {
        return stored as GlassWallpaper
      }
    } catch {}
    return defaultWallpaper
  })

  useEffect(() => {
    const root = window.document.documentElement
    COLOR_THEMES.forEach((t) => {
      if (t !== "zinc") root.classList.remove(`theme-${t}`)
    })
    if (colorTheme !== "zinc") {
      root.classList.add(`theme-${colorTheme}`)
    }
  }, [colorTheme])

  useEffect(() => {
    const root = window.document.documentElement
    // Thêm ?v=3 để xóa cache trình duyệt, đảm bảo load đúng bộ sưu tập mới
    root.style.setProperty("--glass-bg-image", `url('${glassWallpaper}?v=3')`)
  }, [glassWallpaper])

  const setColorTheme = (theme: ColorTheme) => {
    try { localStorage.setItem(storageKey, theme) } catch {}
    setColorThemeState(theme)
  }

  const setGlassWallpaper = (wallpaper: GlassWallpaper) => {
    try { localStorage.setItem(wallpaperStorageKey, wallpaper) } catch {}
    setGlassWallpaperState(wallpaper)
  }

  return (
    <ColorThemeProviderContext.Provider value={{ colorTheme, setColorTheme, glassWallpaper, setGlassWallpaper }}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider")
  }
  return context
}
