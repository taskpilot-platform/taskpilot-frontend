import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ColorThemeProvider } from './components/color-theme-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ThemeProvider: quản lý Sáng/Tối (class "dark" trên <html>) */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* ColorThemeProvider: quản lý màu chủ đạo (class "theme-xxx" trên <html>) */}
      <ColorThemeProvider defaultTheme="zinc">
        <App />
      </ColorThemeProvider>
    </ThemeProvider>
  </StrictMode>,
)
