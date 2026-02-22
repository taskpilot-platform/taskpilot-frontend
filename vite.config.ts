import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // host: true tương đương với việc luôn gắn cờ --host
    port: 5173, // (Tùy chọn) Chốt luôn cổng 5173 cho chắc chắn
  },
});
