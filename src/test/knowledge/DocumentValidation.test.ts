import { describe, it, expect } from "vitest";
import { validateFile, MAX_FILE_SIZE_BYTES } from "@/hooks/useDocumentUpload";

describe("Document Upload Validation", () => {
  it("accepts valid supported file formats under 25MB", () => {
    const validPdf = new File(["dummy pdf content"], "spec.pdf", {
      type: "application/pdf",
    });
    const validDocx = new File(["dummy docx content"], "report.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const validTxt = new File(["dummy text content"], "notes.txt", {
      type: "text/plain",
    });
    const validMd = new File(["# Markdown content"], "readme.md", {
      type: "text/markdown",
    });
    const validCsv = new File(["id,name\n1,task"], "data.csv", {
      type: "text/csv",
    });

    expect(validateFile(validPdf)).toBeNull();
    expect(validateFile(validDocx)).toBeNull();
    expect(validateFile(validTxt)).toBeNull();
    expect(validateFile(validMd)).toBeNull();
    expect(validateFile(validCsv)).toBeNull();
  });

  it("rejects files exceeding 25MB limit", () => {
    const largeBlob = new Blob([new Uint8Array(MAX_FILE_SIZE_BYTES + 1024)]);
    const largeFile = new File([largeBlob], "huge.pdf", {
      type: "application/pdf",
    });

    const error = validateFile(largeFile);
    expect(error).toContain("Kích thước file vượt quá giới hạn 25MB");
  });

  it("rejects unsupported file extensions (e.g., .exe, .png, .zip)", () => {
    const exeFile = new File(["binary"], "malware.exe", {
      type: "application/x-msdownload",
    });
    const imgFile = new File(["binary"], "photo.png", {
      type: "image/png",
    });
    const zipFile = new File(["binary"], "archive.zip", {
      type: "application/zip",
    });

    expect(validateFile(exeFile)).toContain("Định dạng file không được hỗ trợ");
    expect(validateFile(imgFile)).toContain("Định dạng file không được hỗ trợ");
    expect(validateFile(zipFile)).toContain("Định dạng file không được hỗ trợ");
  });
});
