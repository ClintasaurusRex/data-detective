import { quote } from "../checking/evaluate.js";

// Renders text with `inline code` and *emphasis*. React escapes everything,
// so content is never treated as HTML.
export function RichText({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 1) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function CodeBlock({ code, label }) {
  return (
    <pre className="code-block" aria-label={label} tabIndex={0}>
      <code>{code}</code>
    </pre>
  );
}

function cellText(value) {
  if (typeof value === "string") return quote(value);
  if (value === undefined) return "";
  return JSON.stringify(value);
}

// A table of records. Strings are shown in quotes, with tabs and line breaks
// written as \t and \n, so whitespace is visible.
export function RecordTable({ rows, caption, highlightIds }) {
  const columns = [];
  for (const row of rows) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
    }
  }
  if (!columns.length) return null;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="records">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={highlightIds?.includes(row?.id) ? "highlight" : undefined}>
              <td className="row-number">{i + 1}</td>
              {columns.map((c) => (
                <td key={c}>
                  <span className="cell-value">{row && typeof row === "object" ? cellText(row[c]) : ""}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
