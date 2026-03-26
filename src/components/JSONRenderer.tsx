import {
  type TableData,
  type DiagramData,
  type ListData,
  type TextData,
  type CodeData,
  parseJSONResponse,
} from "./json-utils";

export function JSONRenderer({ content }: { content: string }) {
  const parsed = parseJSONResponse(content);

  // Nếu không phải JSON hoặc parse thất bại, hiển thị text thường
  if (!parsed || !parsed.type) {
    return (
      <div className="text-sm">
        <div className="whitespace-pre-wrap break-words text-gray-900">
          {content}
        </div>
        {content && !content.startsWith("{") && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Response không phải JSON. Server trả về raw text.
          </p>
        )}
      </div>
    );
  }

  // Hiển thị bảng
  if (parsed.type === "table" && "headers" in parsed) {
    const tableData = parsed as TableData;
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200">
        {tableData.title && (
          <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">
            {tableData.title}
          </div>
        )}
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              {tableData.headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-2 text-left font-medium text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Hiển thị sơ đồ (Mermaid)
  if (parsed.type === "diagram" && "content" in parsed) {
    const diagramData = parsed as DiagramData;
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white p-4">
        {diagramData.title && (
          <h4 className="font-semibold mb-3 text-sm">{diagramData.title}</h4>
        )}
        <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
          <pre>{diagramData.content}</pre>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Copy mermaid content vào{" "}
          <a
            href="https://mermaid.live"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            mermaid.live
          </a>{" "}
          để xem sơ đồ
        </p>
      </div>
    );
  }

  // Hiển thị danh sách
  if (parsed.type === "list" && "items" in parsed) {
    const listData = parsed as ListData;
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {listData.title && (
          <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">
            {listData.title}
          </div>
        )}
        <ul className="p-3 space-y-2">
          {listData.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Hiển thị code
  if (parsed.type === "code" && "content" in parsed) {
    const codeData = parsed as CodeData;
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
        <div className="bg-gray-800 px-3 py-2 text-xs font-mono text-gray-300">
          {codeData.language}
        </div>
        <pre className="p-3 text-xs text-gray-100 overflow-x-auto">
          {codeData.content}
        </pre>
      </div>
    );
  }

  // Hiển thị text
  if (parsed.type === "text" && "content" in parsed) {
    return (
      <div className="whitespace-pre-wrap text-sm">
        {(parsed as TextData).content}
      </div>
    );
  }

  // Fallback
  return <div className="text-sm text-gray-600">Không thể hiển thị dữ liệu</div>;
}
