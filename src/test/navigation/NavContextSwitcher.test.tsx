import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavContextSwitcher } from "@/components/navigation/NavContextSwitcher";

describe("NavContextSwitcher", () => {
  it("does not render when userRole is not ADMIN", () => {
    const { container: containerUser } = render(
      <NavContextSwitcher
        currentContext="WORKSPACE"
        onContextChange={vi.fn()}
        userRole="USER"
      />
    );
    expect(containerUser.firstChild).toBeNull();

    const { container: containerNull } = render(
      <NavContextSwitcher
        currentContext="WORKSPACE"
        onContextChange={vi.fn()}
        userRole={null}
      />
    );
    expect(containerNull.firstChild).toBeNull();
  });

  it("renders segmented control for ADMIN in expanded mode", () => {
    const onContextChange = vi.fn();
    render(
      <NavContextSwitcher
        currentContext="WORKSPACE"
        onContextChange={onContextChange}
        userRole="ADMIN"
      />
    );

    const switcher = screen.getByTestId("nav-context-switcher");
    expect(switcher).toBeInTheDocument();

    const workspaceBtn = screen.getByTestId("context-btn-workspace");
    const adminBtn = screen.getByTestId("context-btn-admin");

    expect(workspaceBtn).toHaveAttribute("aria-selected", "true");
    expect(adminBtn).toHaveAttribute("aria-selected", "false");

    // Clicking the admin button triggers callback
    fireEvent.click(adminBtn);
    expect(onContextChange).toHaveBeenCalledWith("ADMIN_SYSTEM");
  });

  it("highlights admin button when currentContext is ADMIN_SYSTEM", () => {
    const onContextChange = vi.fn();
    render(
      <NavContextSwitcher
        currentContext="ADMIN_SYSTEM"
        onContextChange={onContextChange}
        userRole="ADMIN"
      />
    );

    const workspaceBtn = screen.getByTestId("context-btn-workspace");
    const adminBtn = screen.getByTestId("context-btn-admin");

    expect(adminBtn).toHaveAttribute("aria-selected", "true");
    expect(workspaceBtn).toHaveAttribute("aria-selected", "false");

    // Clicking the workspace button triggers callback
    fireEvent.click(workspaceBtn);
    expect(onContextChange).toHaveBeenCalledWith("WORKSPACE");
  });

  it("renders compact toggle icon button in collapsed desktop mode", () => {
    const onContextChange = vi.fn();
    const { rerender } = render(
      <NavContextSwitcher
        currentContext="WORKSPACE"
        onContextChange={onContextChange}
        isCollapsed={true}
        isMobile={false}
        userRole="ADMIN"
      />
    );

    const collapsedBtn = screen.getByTestId("nav-context-switcher-collapsed");
    expect(collapsedBtn).toBeInTheDocument();

    // Clicking while WORKSPACE triggers toggle to ADMIN_SYSTEM
    fireEvent.click(collapsedBtn);
    expect(onContextChange).toHaveBeenCalledWith("ADMIN_SYSTEM");

    // Rerender with ADMIN_SYSTEM
    rerender(
      <NavContextSwitcher
        currentContext="ADMIN_SYSTEM"
        onContextChange={onContextChange}
        isCollapsed={true}
        isMobile={false}
        userRole="ADMIN"
      />
    );

    // Clicking while ADMIN_SYSTEM triggers toggle to WORKSPACE
    fireEvent.click(collapsedBtn);
    expect(onContextChange).toHaveBeenCalledWith("WORKSPACE");
  });

  it("renders segmented control in mobile sheet mode even if isCollapsed is true", () => {
    const onContextChange = vi.fn();
    render(
      <NavContextSwitcher
        currentContext="WORKSPACE"
        onContextChange={onContextChange}
        isCollapsed={true}
        isMobile={true}
        userRole="ADMIN"
      />
    );

    expect(screen.getByTestId("nav-context-switcher")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-context-switcher-collapsed")).toBeNull();
  });
});
