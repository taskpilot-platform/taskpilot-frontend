import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { ColorThemeProvider } from "./components/color-theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* ThemeProvider: quản lý Sáng/Tối (class "dark" trên <html>) */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* ColorThemeProvider: quản lý màu chủ đạo (class "theme-xxx" trên <html>) */}
      <ColorThemeProvider defaultTheme="zinc">
        {/* ToastContainer nằm ngoài cùng để hiện ở mọi trang */}
        <ToastContainer />
        {/* Router Provider quản lý việc chuyển trang */}
        <RouterProvider router={router} />
      </ColorThemeProvider>
    </ThemeProvider>
  </StrictMode>,
);
