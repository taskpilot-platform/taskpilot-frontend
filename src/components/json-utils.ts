export interface TableData {
  type: "table";
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

export interface DiagramData {
  type: "diagram";
  format: "mermaid" | "flowchart";
  content: string;
  title?: string;
}

export interface ListData {
  type: "list";
  items: string[];
  title?: string;
}

export interface TextData {
  type: "text";
  content: string;
}

export interface CodeData {
  type: "code";
  language: string;
  content: string;
}

export type JSONContent = TableData | DiagramData | ListData | TextData | CodeData | undefined;

export function parseJSONResponse(text: string): JSONContent {
  try {
    // Xóa markdown code block wrapper nếu có
    const cleanedText = text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    // Thử tìm JSON trong text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return undefined;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as JSONContent;
  } catch (error) {
    console.error("❌ Lỗi parse JSON:", error, "Text:", text);
    return undefined;
  }
}
