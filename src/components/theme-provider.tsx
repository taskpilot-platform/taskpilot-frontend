import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * ThemeProvider - Quản lý chế độ Sáng/Tối (Light/Dark)
 * Sử dụng next-themes để tự động lưu vào localStorage
 * và thêm class "dark" vào thẻ <html>
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
