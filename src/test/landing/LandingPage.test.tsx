import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import i18n from "i18next";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("LandingPage Component & SEO Unit Tests", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  it("renders Landing Page hero section, badges, and primary call to actions", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Hero headline elements
    expect(screen.getByText("Nền tảng quản trị dự án")).toBeInTheDocument();
    expect(screen.getByText("Thông minh thế hệ mới")).toBeInTheDocument();
    expect(screen.getByText("Trải nghiệm miễn phí")).toBeInTheDocument();
  });

  it("allows switching interactive preview tabs between Copilot, Kanban, Meetings, and RAG", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Default tab is Copilot
    expect(screen.getByText("TaskPilot Autonomous Agent")).toBeInTheDocument();

    // Switch to Kanban
    const kanbanTabBtn = screen.getByRole("button", { name: /kanban/i });
    fireEvent.click(kanbanTabBtn);
    expect(screen.getByText(/CẦN LÀM \(TO DO\)/i)).toBeInTheDocument();

    // Switch to HD Meeting
    const meetingTabBtn = screen.getByRole("button", { name: /hd meeting/i });
    fireEvent.click(meetingTabBtn);
    expect(screen.getByText(/Họp Daily Standup - Phòng #234/i)).toBeInTheDocument();

    // Switch to RAG Knowledge
    const ragTabBtn = screen.getByRole("button", { name: /rag knowledge/i });
    fireEvent.click(ragTabBtn);
    expect(screen.getByText(/architecture_design_phase3.pdf/i)).toBeInTheDocument();
  });

  it("renders Bento grid features and pricing tiers correctly", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Bento features
    expect(screen.getByText("Multi-Model AI Copilot")).toBeInTheDocument();
    expect(screen.getAllByText("Bảng Kanban & Sprint Board").length).toBeGreaterThanOrEqual(1);

    // Pricing
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Pro Team")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("expands FAQ answers when accordion question is clicked", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Click second question (Data security)
    const q2Btn = screen.getByRole("button", { name: /Dữ liệu dự án và tài liệu của tôi có được bảo mật không/i });
    fireEvent.click(q2Btn);
    expect(screen.getByText(/Tuyệt đối an toàn. Dữ liệu của bạn được mã hóa chuẩn ngân hàng/i)).toBeInTheDocument();
  });

  it("switches language smoothly to English and reflects in navigation and content", async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const langBtn = screen.getByTitle("Switch to English");
    fireEvent.click(langBtn);

    await waitFor(() => {
      expect(screen.getByText("The Next-Gen")).toBeInTheDocument();
      expect(screen.getByText("Intelligent Project Platform")).toBeInTheDocument();
    });
  });
});
