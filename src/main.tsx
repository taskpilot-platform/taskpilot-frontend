import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import "./index.css";
import "./lib/i18n";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { ColorThemeProvider } from "./components/color-theme-provider.tsx";
import { useAuthStore } from "@/stores/auth.store";
import { initOneSignal } from "@/lib/onesignal";
import { useEffect } from "react";

function AppBootstrap() {
  useEffect(() => {
    void initOneSignal();
  }, []);

  return <RouterProvider router={router} />;
}

useAuthStore.getState().hydrate();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* ThemeProvider: quản lý Sáng/Tối (class "dark" trên <html>) */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={["light", "dark", "glass", "system"]}>
      {/* ColorThemeProvider: quản lý màu chủ đạo (class "theme-xxx" trên <html>) */}
      <ColorThemeProvider defaultTheme="zinc">
        {/* ToastContainer nằm ngoài cùng để hiện ở mọi trang */}
        <ToastContainer />
        {/* Router Provider quản lý việc chuyển trang */}
        <AppBootstrap />
      </ColorThemeProvider>
    </ThemeProvider>
  </StrictMode>,
);
