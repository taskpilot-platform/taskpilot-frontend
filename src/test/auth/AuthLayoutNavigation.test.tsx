import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import LoginPage from "@/pages/LoginPage";
import i18n from "i18next";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
  }),
}));

describe("Auth Layout & Navigation Unit Tests", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  it("renders Back to Home link and redirects when clicked", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="/" element={<div>Mock Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify back to home link exists
    const backBtn = screen.getByRole("link", { name: /Quay lại trang chủ/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute("href", "/");

    // Click back button
    fireEvent.click(backBtn);
    expect(screen.getByText("Mock Landing Page")).toBeInTheDocument();
  });

  it("renders AuthLiveShowcase with interactive tabs", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Verify AI Triage is displayed initially
    expect(screen.getByText(/Trải nghiệm thời gian thực/i)).toBeInTheDocument();
    expect(screen.getByText(/Phân bổ 3 task frontend/i)).toBeInTheDocument();

    // Click LiveKit Standup tab
    const meetingTabBtn = screen.getByRole("button", { name: /LiveKit Standup/i });
    fireEvent.click(meetingTabBtn);
    expect(screen.getByText(/Cuộc họp Daily Scrum/i)).toBeInTheDocument();

    // Click Sprint Pulse tab
    const kanbanTabBtn = screen.getByRole("button", { name: /Sprint Pulse/i });
    fireEvent.click(kanbanTabBtn);
    expect(screen.getByText(/Sprint #14 Đang diễn ra/i)).toBeInTheDocument();
  });
});