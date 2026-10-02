/**
 * Setup.gs: the sheet template, the health check, triggers, and the
 * "Portal" menu that appears in the sheet's top menu bar.
 *
 * Functions you can run (from Portal menu, or the script editor's Run button):
 *   setupTemplate()   create missing tabs/columns/settings. Never deletes data.
 *   checkHealth()     show what's missing
 *   fillMissingIds()  give an ID to any row you added without one
 *   installTriggers() switch on the daily check and hourly note emails
 *   dailyCheck()      run the daily check right now (in Notify.gs)
 */

// The sheet schema. This is the contract between the sheet and the portal.
// `required` columns must exist; the others are optional but recommended.
const SCHEMA = {
  Settings: {
    headers: ['Key', 'Value', 'Help'],
    required: ['Key', 'Value']
  },
  Sets: {
    headers: ['Set', 'Title', 'Intro', 'Opens', 'Due', 'Release', 'Notify client', 'Notified at', 'Reminded at'],
    required: ['Set', 'Title', 'Release', 'Opens'],
    dates: ['Opens', 'Due'],
    times: ['Notified at', 'Reminded at'],
    dropdowns: { 'Release': ['Auto', 'Open now', 'Hold', 'After previous'], 'Notify client': ['Yes', 'No'] }
  },
  Questions: {
    idPrefix: 'Q',
    headers: ['ID', 'Set', 'Order', 'Question', 'Helpful note', 'Answer', 'Status', 'Answered at'],
    required: ['ID', 'Set', 'Question', 'Answer', 'Status'],
    times: ['Answered at'],
    dropdowns: { 'Status': ['Not started', 'Answered', 'Sent', 'Reviewed'] }
  },
  Approvals: {
    idPrefix: 'A',
    headers: ['ID', 'Posted', 'Title', 'What to look at', 'Preview link', 'Decision', 'Client notes', 'Decided at'],
    required: ['ID', 'Title', 'Decision', 'Client notes', 'Decided at'],
    dates: ['Posted'],
    times: ['Decided at'],
    dropdowns: { 'Decision': ['Coming soon', 'Waiting for you', 'Approved', 'Changes requested'] }
  },
  Plan: {
    idPrefix: 'P',
    headers: ['ID', 'Phase', 'Target date', 'Step', 'Details', 'Owner', 'Status', 'Key date'],
    required: ['ID', 'Phase', 'Step', 'Status'],
    dropdowns: { 'Status': ['Not started', 'In progress', 'Done'], 'Key date': ['Yes', 'No'] }
  },
  Files: {
    idPrefix: 'F',
    headers: ['ID', 'Item', 'Details', 'Status', 'Drive file link', 'Shared link', 'Updated at'],
    required: ['ID', 'Item', 'Status', 'Drive file link', 'Updated at'],
    times: ['Updated at'],
    dropdowns: { 'Status': ['Needed', 'Shared', 'Received'] }
  },
  Notes: {
    idPrefix: 'N',
    headers: ['ID', 'Date', 'From', 'Note', 'Client emailed'],
    required: ['ID', 'Date', 'From', 'Note'],
    times: ['Date', 'Client emailed']
  }
};

// Settings keys, with a default value and a help line for the Help column.
const SETTINGS_KEYS = [
  ['projectName', '', 'Shown at the top of the portal.'],
  ['clientName', '', 'Name used in greetings and emails, e.g. Sam.'],
  ['greeting', 'Dear', 'How Home greets the client, e.g. Dear or Hi.'],
  ['ownerName', 'Edem', 'Your name, as the client sees it.'],
  ['portalUrl', '', 'The Netlify address of this portal. Used in client emails.'],
  ['passcode', '', 'The client types this to open the portal. Keep it private.'],
  ['accentColor', '', 'Optional project color like #8a5a44. Used for progress bars and highlights.'],
  ['logoUrl', '', 'Optional image link (https://...) shown on the passcode screen and header.'],
  ['driveFolderId', '', 'Filled in automatically by Portal → Set up tabs (the script creates its own uploads folder). Leave it alone.'],
  ['notifyEmail', '', 'Your email. You get an email when the client sends answers, decides, uploads, or adds a note.'],
  ['clientEmail', '', 'Optional. If filled, the client gets "next questions are ready" and due-date reminder emails.'],
  ['timezone', '', 'Project timezone, e.g. America/New_York. Decides what "today" is for opening sets.'],
  ['releaseDate', '', 'Launch date (a date), or words like "January 2027" until confirmed.'],
  ['modules', 'questions,approvals,plan,files,notes', 'Which sections the portal shows, separated by commas.'],
  ['questionsLabel', '', 'Optional name for the Questions section.'],
  ['approvalsLabel', '', 'Optional name for the Approvals section.'],
  ['planLabel', '', 'Optional name for the Plan section, e.g. "Website Plan".'],
  ['filesLabel', '', 'Optional name for the Files section.'],
  ['notesLabel', '', 'Optional name for the Notes section.'],
  ['studioName', '', 'Your studio name for the portal footer.'],
  ['studioUrl', '', 'Your studio website for the portal footer link.']
];

const REQUIRED_SETTINGS = ['projectName', 'clientName', 'ownerName', 'passcode', 'notifyEmail', 'timezone', 'modules'];

// ===========================================================================
// Menu
// ===========================================================================

function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu('Portal')
    .addItem('Set up tabs (safe, keeps data)', 'setupTemplate')
    .addItem('Check health', 'checkHealth')
    .addItem('Fill missing IDs', 'fillMissingIds')
    .addSeparator()
    .addItem('Install triggers (daily + hourly)', 'installTriggers')
    .addItem('Run daily check now', 'runDailyCheckFromMenu')
    .addItem('Send note emails now', 'runNoteEmailsFromMenu');
  if (typeof seedProject === 'function') {
    menu.addSeparator().addItem('Load starter content', 'seedProject');
  }
  // A project can add one-off changes in its own Changes*.gs file (not in git).
  if (typeof projectChanges === 'function') {
    menu.addItem(typeof PROJECT_CHANGES_LABEL === 'string' ? PROJECT_CHANGES_LABEL : 'Apply project changes', 'projectChanges');
  }
  menu.addToUi();
}

/** Shows a message in the sheet if it's open; otherwise just logs it. */
function tellUser_(title, message) {
  console.log(title + '\n' + message);
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Run from the editor or a trigger: no dialog available; see Execution log.
  }
}

function runDailyCheckFromMenu() {
  tellUser_('Daily check', dailyCheck());
}

function runNoteEmailsFromMenu() {
  tellUser_('Note emails', emailNewNotes());
}

// ===========================================================================
// setupTemplate
// ===========================================================================

/**
 * Creates any missing tabs, adds any missing columns at the right end, adds
 * any missing Settings keys, and sets dropdowns and date formats.
 * It never deletes or overwrites your data, so it's safe to run any time.
 */
function setupTemplate() {
  const report = ensureTemplate_();
  tellUser_('Set up tabs', report.length ? report.join('\n') : 'Everything was already in place. Nothing changed.');
  return report;
}

function ensureTemplate_() {
  const ss = SpreadsheetApp.getActive();
  const report = [];

  Object.keys(SCHEMA).forEach(function (tabName) {
    const spec = SCHEMA[tabName];
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      report.push('Created tab "' + tabName + '"');
    }

    // Add missing headers at the end of row 1.
    const lastCol = sheet.getLastColumn();
    const existing = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); })
      : [];
    const missing = spec.headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      // Put them after the last non-empty header.
      let used = existing.length;
      while (used > 0 && !existing[used - 1]) used--;
      sheet.getRange(1, used + 1, 1, missing.length).setValues([missing]);
      report.push(tabName + ': added column(s) ' + missing.join(', '));
      if (tabName === 'Notes' && missing.indexOf('Client emailed') !== -1) markOldNotesEmailed_();
    }

    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Dropdowns and formats, applied to the whole column below the header.
    const table = loadTable_(tabName);
    const maxRows = sheet.getMaxRows();
    if (maxRows > 1) {
      Object.keys(spec.dropdowns || {}).forEach(function (h) {
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(spec.dropdowns[h], true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, table.col[h], maxRows - 1, 1).setDataValidation(rule);
      });
      (spec.dates || []).forEach(function (h) {
        sheet.getRange(2, table.col[h], maxRows - 1, 1).setNumberFormat('yyyy-mm-dd');
      });
      (spec.times || []).forEach(function (h) {
        sheet.getRange(2, table.col[h], maxRows - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
      });
    }
  });

  // Settings keys.
  const settings = loadTable_('Settings', ['Key', 'Value']);
  const have = settings.rows.map(function (r) { return str_(r['Key']); });
  const added = [];
  SETTINGS_KEYS.forEach(function (k) {
    if (have.indexOf(k[0]) !== -1) return;
    let value = k[1];
    if (k[0] === 'timezone') value = ss.getSpreadsheetTimeZone();
    appendRow_(settings, { 'Key': k[0], 'Value': value, 'Help': k[2] });
    added.push(k[0]);
  });
  if (added.length) report.push('Settings: added ' + added.join(', '));
  forgetSettings_();

  // Uploads folder: created by the script, so the narrow "drive.file"
  // permission covers it. You can move it anywhere in your Drive afterwards.
  // If this sheet was copied from another project, its folder ID belongs to
  // the other script, which this one can't open, so a new folder is made.
  const current = readSettings_();
  const oldFolderId = str_(current.driveFolderId);
  if (enabledModules_(current).indexOf('files') !== -1 && !folderReachable_(oldFolderId)) {
    if (oldFolderId) report.push('The uploads folder in Settings belongs to another project, so a new one was created.');
    const folderName = (str_(current.projectName) || ss.getName()) + ' - Client uploads';
    const folder = Drive.Files.create({ name: folderName, mimeType: 'application/vnd.google-apps.folder' });
    const st = loadTable_('Settings', ['Key', 'Value']);
    const row = st.rows.filter(function (r) { return str_(r['Key']) === 'driveFolderId'; })[0];
    updateRow_(st, row, { 'Value': folder.id });
    forgetSettings_();
    report.push('Created Drive folder "' + folderName + '" for uploads (in My Drive; move it wherever you like)');
  }

  // The sheet's own timezone should match the project timezone.
  const tz = str_(readSettings_().timezone);
  if (tz && tz !== ss.getSpreadsheetTimeZone()) {
    report.push('Note: the sheet\'s timezone (' + ss.getSpreadsheetTimeZone() + ') differs from Settings → timezone (' + tz + '). ' +
      'Fix it in File → Settings → Time zone.');
  }

  // Remove the default empty "Sheet1" if it's still there and empty.
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(blank);
    report.push('Removed the empty "Sheet1" tab');
  }
  return report;
}

// ===========================================================================
// Starter content (used by a project's Seed*.gs file)
// ===========================================================================

/**
 * Loads starter content. `data` looks like:
 *   { settings: { key: value }, tabs: { Sets: [ { 'Set': 'Set 1', ... } ], ... } }
 * Safe to run twice: a tab that already has rows is skipped, and a setting
 * that already has a value is left alone.
 */
function loadSeed_(data) {
  const report = ensureTemplate_();

  withLock_(function () {
    const settings = loadTable_('Settings', ['Key', 'Value']);
    const filled = [];
    Object.keys(data.settings || {}).forEach(function (k) {
      const row = settings.rows.filter(function (r) { return str_(r['Key']) === k; })[0];
      if (row && str_(row['Value']) === '' && data.settings[k] !== '') {
        updateRow_(settings, row, { 'Value': data.settings[k] });
        filled.push(k);
      }
    });
    if (filled.length) report.push('Settings filled: ' + filled.join(', '));
    forgetSettings_();

    Object.keys(data.tabs || {}).forEach(function (tabName) {
      const table = loadTable_(tabName);
      if (table.rows.length) {
        report.push(tabName + ': skipped (already has ' + table.rows.length + ' row(s))');
        return;
      }
      const lines = data.tabs[tabName].map(function (obj) {
        return table.headers.map(function (h) {
          return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
        });
      });
      if (lines.length) {
        table.sheet.getRange(2, 1, lines.length, table.headers.length).setValues(lines);
        report.push(tabName + ': loaded ' + lines.length + ' row(s)');
      }
    });
  });

  tellUser_('Load starter content', report.join('\n'));
  return report;
}

/**
 * When note emails are first switched on, notes that already exist are
 * marked so the client isn't emailed about old messages.
 */
function markOldNotesEmailed_() {
  const table = loadTable_('Notes', ['Note', 'Client emailed']);
  table.rows.forEach(function (row) {
    if (str_(row['Note']) && !str_(row['Client emailed'])) {
      updateRow_(table, row, { 'Client emailed': 'Not emailed (older note)' });
    }
  });
}

// ===========================================================================
// IDs
// ===========================================================================

/** Gives an ID to every row that has content but no ID. */
function fillMissingIds() {
  const report = [];
  withLock_(function () {
    Object.keys(SCHEMA).forEach(function (tabName) {
      const spec = SCHEMA[tabName];
      if (!spec.idPrefix || !SpreadsheetApp.getActive().getSheetByName(tabName)) return;
      const table = loadTable_(tabName, ['ID']);
      let filled = 0;
      table.rows.forEach(function (row) {
        if (str_(row['ID'])) return;
        const id = nextId_(table, spec.idPrefix);
        updateRow_(table, row, { 'ID': id });
        filled++;
      });
      if (filled) report.push(tabName + ': ' + filled + ' new ID(s)');
    });
  });
  tellUser_('Fill missing IDs', report.length ? report.join('\n') : 'Every row already has an ID.');
  return report;
}

// ===========================================================================
// Triggers
// ===========================================================================

const TRIGGERS = ['dailyCheck', 'emailNewNotes'];

/**
 * Switches on the daily check (about 7am project time) and the hourly note
 * emails. Safe to run again: old copies are replaced.
 */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGERS.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  const tz = projectTimezone_(readSettings_());
  ScriptApp.newTrigger('dailyCheck').timeBased().everyDays(1).atHour(7).inTimezone(tz).create();
  ScriptApp.newTrigger('emailNewNotes').timeBased().everyHours(1).create();
  tellUser_('Triggers', 'On: the daily check runs every morning around 7am (' + tz + '), ' +
    'and note emails are checked every hour.');
}

// ===========================================================================
// Health
// ===========================================================================

/** Returns the folder's name if the script can use it, or '' if not. */
function folderReachable_(folderId) {
  if (!folderId) return '';
  try {
    const f = Drive.Files.get(folderId, { fields: 'name,mimeType,trashed' });
    return (f.mimeType === 'application/vnd.google-apps.folder' && !f.trashed) ? f.name : '';
  } catch (e) {
    console.warn('Drive folder not reachable: ' + e);
    return '';
  }
}

/** Menu version: shows the health report in a dialog. */
function checkHealth() {
  const result = runHealthChecks_();
  const lines = result.checks.map(function (c) {
    return (c.ok ? '✓ ' : '✗ ') + c.name + (c.detail ? ': ' + c.detail : '');
  });
  tellUser_(result.ok ? 'All good' : 'Some things need attention', lines.join('\n'));
  return result;
}

function runHealthChecks_() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  function add(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: detail || '' }); }

  add('Sheet', !!ss, ss ? ss.getName() : 'No spreadsheet is attached to this script.');

  // Tabs and required columns.
  const tables = {};
  Object.keys(SCHEMA).forEach(function (tabName) {
    if (!ss.getSheetByName(tabName)) {
      add('Tab: ' + tabName, false, 'Missing. Run Portal → Set up tabs.');
      return;
    }
    const t = loadTable_(tabName);
    tables[tabName] = t;
    const missingReq = SCHEMA[tabName].required.filter(function (h) { return !t.col[h]; });
    const missingOpt = SCHEMA[tabName].headers.filter(function (h) {
      return !t.col[h] && SCHEMA[tabName].required.indexOf(h) === -1;
    });
    if (missingReq.length) {
      add('Tab: ' + tabName, false, 'Missing column(s): ' + missingReq.join(', ') + '. Run Portal → Set up tabs.');
    } else {
      add('Tab: ' + tabName, true, missingOpt.length ? 'Optional column(s) missing: ' + missingOpt.join(', ') : t.rows.length + ' row(s)');
    }
  });

  // Settings.
  let settings = {};
  if (tables.Settings && tables.Settings.col['Key'] && tables.Settings.col['Value']) {
    settings = readSettings_();
    const blank = REQUIRED_SETTINGS.filter(function (k) { return !str_(settings[k]); });
    add('Settings', blank.length === 0, blank.length ? 'Please fill in: ' + blank.join(', ') : 'Required settings are filled in.');
    if (str_(settings.timezone) && str_(settings.timezone) !== ss.getSpreadsheetTimeZone()) {
      add('Timezone', false, 'Settings says ' + str_(settings.timezone) + ' but the sheet uses ' + ss.getSpreadsheetTimeZone() +
        '. Change the sheet in File → Settings → Time zone.');
    }
    if (!str_(settings.clientEmail)) {
      add('Client emails', true, 'clientEmail is blank, so "next questions" and reminder emails are off.');
    }
  }

  // Drive folder.
  const modules = enabledModules_(settings);
  if (modules.indexOf('files') !== -1) {
    const folderId = str_(settings.driveFolderId);
    if (!folderId) {
      add('Drive folder', false, 'driveFolderId is blank in Settings, so uploads won\'t work. Run Portal → Set up tabs to create the uploads folder.');
    } else {
      const folderName = folderReachable_(folderId);
      if (folderName) {
        add('Drive folder', true, folderName);
      } else {
        add('Drive folder', false, 'The script can\'t open the folder with ID "' + folderId + '". ' +
          'It can only use a folder it created itself: clear driveFolderId and run Portal → Set up tabs to create one.');
      }
    }
  }

  // Triggers.
  let installed = [];
  try {
    installed = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  } catch (e) { /* not authorised yet */ }
  const missingTriggers = TRIGGERS.filter(function (name) { return installed.indexOf(name) === -1; });
  add('Triggers', missingTriggers.length === 0, missingTriggers.length
    ? 'Missing: ' + missingTriggers.join(', ') + '. Run Portal → Install triggers.'
    : 'Daily check and hourly note emails are on.');

  // IDs: missing or duplicated.
  Object.keys(SCHEMA).forEach(function (tabName) {
    const t = tables[tabName];
    if (!SCHEMA[tabName].idPrefix || !t || !t.col['ID']) return;
    const seen = {};
    const dupes = [];
    let missing = 0;
    t.rows.forEach(function (r) {
      const id = str_(r['ID']);
      if (!id) { missing++; return; }
      if (seen[id]) dupes.push(id);
      seen[id] = true;
    });
    if (missing || dupes.length) {
      add('IDs: ' + tabName, false,
        (missing ? missing + ' row(s) without an ID (run Portal → Fill missing IDs). ' : '') +
        (dupes.length ? 'Duplicate ID(s): ' + dupes.join(', ') + '. Each ID must be unique.' : ''));
    }
  });

  // Questions pointing at a Set that doesn't exist, and odd dropdown values.
  if (tables.Sets && tables.Questions && tables.Sets.col['Set'] && tables.Questions.col['Set']) {
    const setNames = tables.Sets.rows.map(function (r) { return str_(r['Set']); });
    const orphans = tables.Questions.rows.filter(function (q) {
      return str_(q['Question']) && setNames.indexOf(str_(q['Set'])) === -1;
    }).map(function (q) { return (str_(q['ID']) || 'row ' + q._row) + ' ("' + str_(q['Set']) + '")'; });
    add('Questions link to sets', orphans.length === 0,
      orphans.length ? 'These questions name a Set that isn\'t in the Sets tab: ' + orphans.join(', ') : 'Every question belongs to a set.');

    const badRelease = tables.Sets.rows.filter(function (r) {
      return ['auto', 'open now', 'hold', ''].indexOf(key_(r['Release'])) === -1;
    }).map(function (r) { return str_(r['Set']); });
    if (badRelease.length) add('Release values', false, 'Use Auto, Open now, or Hold for: ' + badRelease.join(', '));
  }

  return { ok: checks.every(function (c) { return c.ok; }), checks: checks };
}
