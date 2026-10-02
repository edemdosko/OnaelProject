/**
 * Table.gs: reading and writing sheet tabs by HEADER NAME and by ID.
 *
 * Nothing in this project reads a column by position or a row by a fixed
 * row number. Columns are found by their header in row 1, and rows are found
 * by their ID. You can reorder or add columns in the sheet safely.
 */

/**
 * Loads a tab into memory.
 * Returns { name, sheet, headers, col, rows } where:
 *   col[header] = 1-based column number (for writing)
 *   rows        = [{ _row: sheetRowNumber, 'Header': value, ... }]
 * _row is only used to write back to the row we just located by ID.
 */
function loadTable_(tabName, requiredHeaders) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(tabName);
  if (!sheet) {
    throw portalError_('SETUP_INCOMPLETE',
      'The "' + tabName + '" tab is missing from the project sheet. ' +
      'Edem needs to run Portal → Set up tabs.');
  }
  // One read for the whole tab (each call to Google takes time).
  const values = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [[]];

  const headers = values[0].map(function (h) { return String(h).trim(); });
  const col = {};
  headers.forEach(function (h, i) { if (h && !col[h]) col[h] = i + 1; });

  (requiredHeaders || []).forEach(function (h) {
    if (!col[h]) {
      throw portalError_('SETUP_INCOMPLETE',
        'The "' + tabName + '" tab is missing its "' + h + '" column. ' +
        'Edem needs to run Portal → Set up tabs.');
    }
  });

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const line = values[r];
    if (line.every(function (v) { return v === '' || v === null; })) continue; // skip blank rows
    const row = { _row: r + 1 };
    headers.forEach(function (h, i) { if (h) row[h] = line[i]; });
    rows.push(row);
  }

  return { name: tabName, sheet: sheet, headers: headers, col: col, rows: rows };
}

/** Finds one row by its ID column. Returns null if not found. */
function findById_(table, id) {
  const wanted = String(id || '').trim();
  if (!wanted) return null;
  for (let i = 0; i < table.rows.length; i++) {
    if (String(table.rows[i]['ID']).trim() === wanted) return table.rows[i];
  }
  return null;
}

/**
 * Writes changes to a row located earlier. `changes` is { 'Header': value }.
 * Headers that don't exist in the tab are skipped (optional columns).
 */
function updateRow_(table, row, changes) {
  Object.keys(changes).forEach(function (header) {
    const c = table.col[header];
    if (!c) return;
    table.sheet.getRange(row._row, c).setValue(changes[header]);
    row[header] = changes[header];
  });
}

/** Adds a new row at the bottom. `obj` is { 'Header': value }. */
function appendRow_(table, obj) {
  const line = table.headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  });
  table.sheet.appendRow(line);
}

/** Next ID like "Q-014": one more than the highest existing number with this prefix. */
function nextId_(table, prefix) {
  let max = 0;
  table.rows.forEach(function (row) {
    const m = String(row['ID'] || '').match(new RegExp('^' + prefix + '-(\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

/**
 * Text typed by the client is always stored as plain text, never as a
 * formula, number or date. (Without this, an answer like "=1+1", "2027" or
 * "Jan 12" would be changed by Google Sheets.) The leading apostrophe is
 * hidden by Sheets and is not returned when the cell is read.
 */
function asText_(s) {
  return s === '' ? '' : "'" + s;
}

/** Reads a cell as trimmed text. */
function str_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return isoDate_(v);
  return String(v).trim();
}

/** Same as str_ but lowercased, for comparing dropdown values. */
function key_(v) {
  return str_(v).toLowerCase();
}

/**
 * Converts a sheet cell to "YYYY-MM-DD", or '' if it isn't a date.
 * Date cells are read in the SPREADSHEET's timezone, because that is the
 * timezone the date was typed in.
 */
function isoDate_(v) {
  if (v instanceof Date && !isNaN(v)) {
    return Utilities.formatDate(v, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  const s = (v === null || v === undefined) ? '' : String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

/** A cell that may hold a date or words ("Release day"). */
function dateOrLabel_(v) {
  const date = isoDate_(v);
  return { date: date || null, label: date ? '' : str_(v) };
}

/** A timestamp cell as an ISO string, or null. */
function isoTime_(v) {
  return (v instanceof Date && !isNaN(v)) ? v.toISOString() : null;
}

/**
 * True if a date cell includes a time of day. A date typed without a time
 * is midnight in the sheet's timezone; sending it as a moment in time would
 * show as the previous evening to someone further west, so we send it as a
 * plain date instead.
 */
function hasTime_(v) {
  if (!(v instanceof Date) || isNaN(v)) return false;
  return Utilities.formatDate(v, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'HH:mm:ss') !== '00:00:00';
}

/** Whole days from date a to date b (both "YYYY-MM-DD"). */
function daysBetween_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
