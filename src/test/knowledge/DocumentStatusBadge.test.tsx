import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentStatusBadge } from "@/components/knowledge/DocumentStatusBadge";

describe("DocumentStatusBadge", () => {
  it("renders READY status with emerald badge and Sẵn sàng label", () => {
    render(<DocumentStatusBadge status="READY" />);
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
  });

  it("renders PROCESSING status with blue badge and Đang xử lý label", () => {
    render(<DocumentStatusBadge status="PROCESSING" />);
    expect(screen.getByText("Đang xử lý...")).toBeInTheDocument();
  });

  it("renders UPLOADING status with amber badge and Đang tải lên label", () => {
    render(<DocumentStatusBadge status="UPLOADING" />);
    expect(screen.getByText("Đang tải lên...")).toBeInTheDocument();
  });

  it("renders FAILED status with rose badge and Thất bại label", () => {
    render(<DocumentStatusBadge status="FAILED" />);
    expect(screen.getByText("Thất bại")).toBeInTheDocument();
  });

  it("renders QUEUED status with purple badge and Đang chờ xử lý label", () => {
    render(<DocumentStatusBadge status="QUEUED" />);
    expect(screen.getByText("Đang chờ xử lý")).toBeInTheDocument();
  });

  it("renders RETRY_WAIT status with orange badge and Chờ thử lại label", () => {
    render(<DocumentStatusBadge status="RETRY_WAIT" />);
    expect(screen.getByText("Chờ thử lại")).toBeInTheDocument();
  });
});
