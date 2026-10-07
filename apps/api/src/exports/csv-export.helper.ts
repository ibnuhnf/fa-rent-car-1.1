export function csvString(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
