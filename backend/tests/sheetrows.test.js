/**
 * Regression tests for spreadsheet row numbering.
 *
 * The Excel importer discards blank rows, so the index of a row in the parsed
 * matrix is NOT the row number an admin sees in Excel. The unmatched-university
 * reporting is only useful if the numbers it hands back point at the right line,
 * and a single blank row above the header used to shift every one of them.
 *
 * Dependency-free.
 */

const assert = require('assert');
const { test, section } = require('./helpers');
const { compactRows, sheetRowNumber, SHEET_ROW } = require('../src/utils/sheetRows');

/** A sheet shaped like the real templates: a title, a blank line, then a header. */
const TEMPLATE = [
  ['Vidyarthi Mitra — Course Master'], // sheet row 1
  [],                                  // sheet row 2 (blank, dropped)
  ['University Name', 'Base Course'],  // sheet row 3  <- header
  ['Real University', 'B.Tech'],       // sheet row 4
  [],                                  // sheet row 5 (blank, dropped)
  ['Ghost University', 'M.Tech'],      // sheet row 6
  ['Ghost University', 'MBA'],         // sheet row 7
];

module.exports = async () => {
  section('compactRows');

  await test('drops blank rows', () => {
    assert.strictEqual(compactRows(TEMPLATE).length, 5);
  });

  await test('drops whitespace-only and null-filled rows', () => {
    assert.strictEqual(compactRows([['   ', ''], [null, null], ['keep']]).length, 1);
  });

  await test('tags each surviving row with its TRUE 1-based sheet position', () => {
    assert.deepStrictEqual(compactRows(TEMPLATE).map((r) => r[SHEET_ROW]), [1, 3, 4, 6, 7]);
  });

  await test('the tag is non-enumerable, so it cannot leak into a response', () => {
    const [row] = compactRows([['a']]);
    assert.strictEqual(row[SHEET_ROW], 1);
    assert.deepStrictEqual(Object.keys(row), ['0']);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(row)), ['a']);
  });

  await test('ignores non-array entries without throwing', () => {
    assert.strictEqual(compactRows([null, undefined, 'nope', ['keep']]).length, 1);
  });

  await test('an empty sheet yields no rows', () => {
    assert.deepStrictEqual(compactRows([]), []);
    assert.deepStrictEqual(compactRows(), []);
  });

  section('sheetRowNumber');

  await test('reports the real Excel row despite dropped blank rows', () => {
    const rows = compactRows(TEMPLATE);
    const headerRowIndex = 1;                    // header is index 1 after compaction
    const dataRows = rows.slice(headerRowIndex + 1);

    // dataRows[0] is sheet row 4, then 6, then 7 — NOT 4, 5, 6.
    assert.strictEqual(sheetRowNumber(dataRows, headerRowIndex, 0), 4);
    assert.strictEqual(sheetRowNumber(dataRows, headerRowIndex, 1), 6);
    assert.strictEqual(sheetRowNumber(dataRows, headerRowIndex, 2), 7);
  });

  await test('the naive arithmetic would have been wrong here', () => {
    const rows = compactRows(TEMPLATE);
    const headerRowIndex = 1;
    const dataRows = rows.slice(headerRowIndex + 1);
    const naive = (i) => headerRowIndex + i + 2;
    assert.notStrictEqual(sheetRowNumber(dataRows, headerRowIndex, 1), naive(1),
      'this is the bug the tag exists to prevent');
  });

  await test('with no blank rows the tag and the arithmetic agree', () => {
    const dense = compactRows([
      ['University Name', 'Base Course'],  // row 1, header
      ['A', 'B.Tech'],                     // row 2
      ['B', 'M.Tech'],                     // row 3
    ]);
    const dataRows = dense.slice(1);
    assert.strictEqual(sheetRowNumber(dataRows, 0, 0), 2);
    assert.strictEqual(sheetRowNumber(dataRows, 0, 1), 3);
  });

  await test('falls back to arithmetic for untagged rows', () => {
    const untagged = [['A'], ['B']];
    assert.strictEqual(sheetRowNumber(untagged, 0, 0), 2);
    assert.strictEqual(sheetRowNumber(untagged, 2, 1), 5);
  });

  await test('does not throw for an out-of-range index', () => {
    assert.strictEqual(sheetRowNumber([], 0, 5), 7);
    assert.strictEqual(sheetRowNumber(undefined, 0, 0), 2);
  });
};
