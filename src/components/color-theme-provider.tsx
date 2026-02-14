import { createContext, useContext, useEffect, useState } from "react"

/**
 * Danh sách các color theme có sẵn.
 * "zinc" là mặc định (không cần thêm class).
 * Các theme khác sẽ thêm class "theme-{name}" vào <html>.
 */
export const COLOR_THEMES = ["zinc", "blue", "rose", "green", "violet", "orange"] as const

export type ColorTheme = (typeof COLOR_THEMES)[number]

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ColorTheme
  storageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeProviderContext = createContext<ColorThemeProviderState>({
  colorTheme: "zinc",
  setColorTheme: () => null,
})

/**
 * ColorThemeProvider - Quản lý màu chủ đạo (Primary Color)
 *
 * Cơ chế hoạt động:
 * 1. Đọc theme từ localStorage khi khởi tạo
 * 2. Thêm/xóa class "theme-{name}" trên thẻ <html>
 * 3. CSS Variables trong index.css sẽ tự động override theo class
 *
 * Hoạt động song song với next-themes (Light/Dark):
 * - next-themes quản lý class "dark" trên <html>
 * - ColorThemeProvider quản lý class "theme-blue", "theme-rose"... trên <html>
 * - Kết quả: <html class="dark theme-blue"> → Chế độ tối + Màu xanh
 */
export function ColorThemeProvider({
  children,
  defaultTheme = "zinc",
  storageKey = "taskpilot-color-theme",
}: ColorThemeProviderProps) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && COLOR_THEMES.includes(stored as ColorTheme)) {
        return stored as ColorTheme
      }
    } catch {
      // localStorage không khả dụng (incognito, SSR, v.v.)
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    // Xóa tất cả class theme cũ
    COLOR_THEMES.forEach((t) => {
      if (t !== "zinc") {
        root.classList.remove(`theme-${t}`)
      }
    })

    // Thêm class theme mới (zinc là mặc định, không cần class)
    if (colorTheme !== "zinc") {
      root.classList.add(`theme-${colorTheme}`)
    }
  }, [colorTheme])

  const setColorTheme = (theme: ColorTheme) => {
    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      // Bỏ qua lỗi localStorage
    }
    setColorThemeState(theme)
  }

  return (
    <ColorThemeProviderContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

/**
 * Hook để truy cập color theme hiện tại và hàm đổi theme
 *
 * @example
 * const { colorTheme, setColorTheme } = useColorTheme()
 * setColorTheme("blue") // Đổi sang theme xanh dương
 */
export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider")
  }
  return context
}
