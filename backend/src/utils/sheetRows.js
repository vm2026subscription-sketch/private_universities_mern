/**
 * Spreadsheet row bookkeeping for the Excel importer.
 *
 * The importer discards blank rows before parsing, which means the index of a row
 * in the resulting array is NOT the row number an admin sees in Excel. Reporting
 * the array index (as the first version of the unmatched-row reporting did) sends
 * someone to the wrong line of their own spreadsheet — one blank row above the
 * header is enough to shift every number.
 *
 * These helpers keep the real position attached to each retained row. They are
 * pure and dependency-free so they can be unit tested directly.
 */

/** Non-enumerable so it never leaks into a parsed payload or a JSON response. */
const SHEET_ROW = '__sheetRow';

/**
 * Drops blank rows from a raw sheet matrix, tagging each survivor with its true
 * 1-based position in the sheet.
 *
 * @param {Array<Array<any>>} raw - rows as XLSX returns them (header: 1)
 * @returns {Array<Array<any>>} the non-blank rows, in order
 */
const compactRows = (raw = []) => {
  const rows = [];

  raw.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    if (!row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')) return;

    Object.defineProperty(row, SHEET_ROW, {
      value: index + 1,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    rows.push(row);
  });

  return rows;
};

/**
 * The 1-based row number an admin sees in Excel for data row `i`.
 *
 * Prefers the tag compactRows attached. The arithmetic fallback
 * (headerRowIndex + i + 2) is only correct when no rows were dropped, so it
 * exists solely for rows that arrived from somewhere other than compactRows.
 *
 * @param {Array<Array<any>>} dataRows - rows AFTER the header, i.e. rows.slice(headerRowIndex + 1)
 * @param {number} headerRowIndex - index of the header row within the compacted matrix
 * @param {number} i - index within dataRows
 */
const sheetRowNumber = (dataRows, headerRowIndex, i) => {
  const row = dataRows && dataRows[i];
  const tagged = row && row[SHEET_ROW];
  return tagged || headerRowIndex + i + 2;
};

module.exports = { SHEET_ROW, compactRows, sheetRowNumber };
