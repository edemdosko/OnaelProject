/**
 * To update: Deploy → Manage deployments → Edit → Version: New version → Deploy.
 * Never create a new deployment, or the URL changes.
 *
 * ---------------------------------------------------------------------------
 * Client Project Portal: Apps Script engine
 *
 * The portal sends:  POST  body = JSON string, Content-Type: text/plain
 *   { "action": "...", "passcode": "...", "payload": { ... } }
 * and gets back:
 *   { "ok": true, "data": ... }
 *   { "ok": false, "error": { "code": "...", "message": "plain English" } }
 *
 * Files in this project:
 *   Code.gs    this router and every action
 *   Table.gs   reads and writes tabs by header name and rows by ID
 *   Setup.gs   setupTemplate, health check, triggers, the "Portal" menu
 *   Notify.gs  emails and the daily check
 *   Seed*.gs   optional starter content for one project (not in git)
 * ---------------------------------------------------------------------------
 */

// Limits on text the client can send.
const LIMITS = {
  answer: 5000,
  approvalNotes: 3000,
  note: 2000,
  fileName: 200,
  mimeType: 100,
  id: 40,
  uploadBytes: 10 * 1024 * 1024 // 10 MB
};

// Every action the portal can call. Nothing else is reachable.
const ACTIONS = {
  health: actionHealth_,
  getProject: actionGetProject_,
  getQuestions: actionGetQuestions_,
  saveAnswer: actionSaveAnswer_,
  submitSet: actionSubmitSet_,
  getApprovals: actionGetApprovals_,
  decideApproval: actionDecideApproval_,
  getPlan: actionGetPlan_,
  getFiles: actionGetFiles_,
  updateFileStatus: actionUpdateFileStatus_,
  uploadFile: actionUploadFile_,
  getNotes: actionGetNotes_,
  addNote: actionAddNote_
};

const MODULES = ['questions', 'approvals', 'plan', 'files', 'notes'];

const DEFAULT_LABELS = {
  questions: 'Questions',
  approvals: 'Approvals',
  plan: 'Plan',
  files: 'Files',
  notes: 'Notes'
};

// ===========================================================================
// Entry points
// ===========================================================================

function doPost(e) {
  let action = '(unknown)';
  try {
    const req = parseRequest_(e);
    action = req.action;

    if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
      throw portalError_('BAD_REQUEST', 'The portal asked for something this project doesn\'t support ("' + action + '"). Please refresh the page.');
    }

    // health with no passcode is a simple "is it running?" ping.
    if (action === 'health' && !req.passcode) {
      return json_({ ok: true, data: { alive: true } });
    }

    checkPasscode_(req.passcode, action === 'health');
    return json_({ ok: true, data: ACTIONS[action](req.payload) });
  } catch (err) {
    return json_({ ok: false, error: toPublicError_(err, action) });
  }
}

/** Opening the script URL in a browser shows this instead of an error. */
function doGet() {
  return json_({ ok: true, data: { alive: true, note: 'This is the portal engine. The portal talks to it with POST requests.' } });
}

function parseRequest_(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    throw portalError_('BAD_REQUEST', 'The request could not be read. Please refresh the page and try again.');
  }
  if (!body || typeof body !== 'object') {
    throw portalError_('BAD_REQUEST', 'The request could not be read. Please refresh the page and try again.');
  }
  const payload = (body.payload && typeof body.payload === 'object') ? body.payload : {};
  return {
    action: String(body.action || ''),
    passcode: String(body.passcode || ''),
    payload: payload
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===========================================================================
// Errors
// ===========================================================================

/** Creates an error whose message is safe and helpful to show the client. */
function portalError_(code, message) {
  const err = new Error(message);
  err.portalCode = code;
  return err;
}

function toPublicError_(err, action) {
  if (err && err.portalCode) {
    console.warn('[' + action + '] ' + err.portalCode + ': ' + err.message);
    return { code: err.portalCode, message: err.message };
  }
  // Unexpected: log every detail for Edem, show a calm message to the client.
  console.error('[' + action + '] Unexpected error: ' + (err && err.stack ? err.stack : err));
  return {
    code: 'SERVER_ERROR',
    message: 'Something went wrong on our side. Your typing is still on your screen. Please try again in a minute, and if it keeps happening, let ' + ownerNameSafe_() + ' know.'
  };
}

function ownerNameSafe_() {
  try { return readSettings_().ownerName || 'us'; } catch (e) { return 'us'; }
}

// ===========================================================================
// Passcode, locking, input checks
// ===========================================================================

const MAX_BAD_TRIES = 10;
const BAD_TRY_WINDOW_SECONDS = 600; // 10 minutes

function checkPasscode_(given, isHealth) {
  let settings;
  try {
    settings = readSettings_();
  } catch (e) {
    if (isHealth) return; // let health report what's missing
    throw e;
  }
  const real = str_(settings.passcode);

  // Before a passcode is set, allow health only, so setup can be checked.
  if (!real) {
    if (isHealth) return;
    throw portalError_('SETUP_INCOMPLETE', 'This portal isn\'t switched on yet (no passcode has been set). Please check back soon.');
  }

  const cache = CacheService.getScriptCache();
  const tries = Number(cache.get('badPasscodeTries') || 0);
  if (tries >= MAX_BAD_TRIES) {
    throw portalError_('TOO_MANY_TRIES', 'Too many wrong passcodes. For safety, sign-in is paused for 10 minutes. Please try again after that.');
  }

  if (String(given).trim() !== real) {
    cache.put('badPasscodeTries', String(tries + 1), BAD_TRY_WINDOW_SECONDS);
    throw portalError_('BAD_PASSCODE', 'That passcode didn\'t match. Please check it and try again.');
  }
}

/** Runs fn while holding the script lock, so two saves never collide. */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw portalError_('BUSY', 'Another save is in progress. Please wait a moment and press the button again.');
  }
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

/** Reads a text field from the payload, trimmed, with a length limit. */
function textField_(payload, name, max, label, required) {
  const raw = payload[name];
  if (raw !== undefined && raw !== null && typeof raw !== 'string') {
    throw portalError_('BAD_REQUEST', 'The ' + label + ' must be text. Please refresh the page and try again.');
  }
  const s = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (required && !s) {
    throw portalError_('BAD_REQUEST', 'Please fill in the ' + label + '.');
  }
  if (s.length > max) {
    throw portalError_('BAD_REQUEST', 'The ' + label + ' is too long (' + s.length + ' characters; the limit is ' + max + '). Please shorten it and try again.');
  }
  return s;
}

function requireModule_(settings, name) {
  if (enabledModules_(settings).indexOf(name) === -1) {
    throw portalError_('NOT_ALLOWED', 'That section isn\'t switched on for this project.');
  }
}

// ===========================================================================
// Settings and shared helpers
// ===========================================================================

// Settings are read once per request and reused (forgetSettings_ resets this
// after anything changes the Settings tab).
let settingsMemo_ = null;

/** Settings tab as an object: { projectName: ..., passcode: ..., ... } */
function readSettings_() {
  if (settingsMemo_) return settingsMemo_;
  const table = loadTable_('Settings', ['Key', 'Value']);
  const out = {};
  table.rows.forEach(function (row) {
    const k = str_(row['Key']);
    if (k) out[k] = row['Value'];
  });
  settingsMemo_ = out;
  return out;
}

function forgetSettings_() {
  settingsMemo_ = null;
}

function projectTimezone_(settings) {
  return str_(settings.timezone) || Session.getScriptTimeZone();
}

/** Today as "YYYY-MM-DD" in the project's timezone. */
function today_(settings) {
  return Utilities.formatDate(new Date(), projectTimezone_(settings), 'yyyy-MM-dd');
}

function enabledModules_(settings) {
  const raw = str_(settings.modules);
  if (!raw) return MODULES.slice();
  return raw.split(',').map(function (m) { return m.trim().toLowerCase(); })
    .filter(function (m) { return MODULES.indexOf(m) !== -1; });
}

function labels_(settings) {
  const out = {};
  MODULES.forEach(function (m) {
    out[m] = str_(settings[m + 'Label']) || DEFAULT_LABELS[m];
  });
  return out;
}

function isHttpUrl_(s) {
  return /^https?:\/\/\S+$/i.test(s);
}

// ===========================================================================
// Questions: visibility rule
// ===========================================================================

/**
 * When is a set visible?
 *   "Open now"        → always
 *   "Hold"            → never (even after its date)
 *   "Auto" (or blank) → once Opens is on or before today (project timezone)
 *   "After previous"  → as soon as the previous set is sent, or on its Opens
 *                       date, whichever comes first
 * "Previous" means the set with the next-earliest Opens date. Sets without
 * questions are ignored. A set the client already sent stays visible (unless
 * on Hold), even if a new set is later added before it.
 */
function isSetVisible_(setRow, today, previousSent, submitted) {
  const release = key_(setRow['Release']);
  if (release === 'hold') return false;
  if (release === 'open now' || submitted) return true;
  const opens = isoDate_(setRow['Opens']);
  if (opens && opens <= today) return true;
  return release === 'after previous' && previousSent;
}

/** Shared by getQuestions, getProject, submitSet and the daily check. */
function buildQuestionsView_(settings) {
  const today = today_(settings);
  const sets = loadTable_('Sets', ['Set', 'Title', 'Release', 'Opens']);
  const questions = loadTable_('Questions', ['ID', 'Set', 'Question', 'Answer', 'Status']);

  const bySet = {};
  questions.rows.forEach(function (q) {
    const s = str_(q['Set']);
    if (!s || !str_(q['Question'])) return;
    (bySet[s] = bySet[s] || []).push(q);
  });

  // Every set that has questions, in Opens-date order (undated sets last).
  const all = sets.rows
    .filter(function (row) { return str_(row['Set']) && (bySet[str_(row['Set'])] || []).length; })
    .map(function (row) {
      const name = str_(row['Set']);
      const qs = bySet[name].slice().sort(function (a, b) {
        return (Number(a['Order']) || 0) - (Number(b['Order']) || 0);
      });
      return {
        set: name,
        title: str_(row['Title']),
        intro: str_(row['Intro']),
        opens: isoDate_(row['Opens']) || null,
        due: isoDate_(row['Due']) || null,
        release: key_(row['Release']),
        submitted: qs.every(function (q) {
          const st = key_(q['Status']);
          return st === 'sent' || st === 'reviewed';
        }),
        questions: qs.map(function (q) {
          return {
            id: str_(q['ID']),
            order: Number(q['Order']) || 0,
            question: str_(q['Question']),
            note: str_(q['Helpful note']),
            answer: str_(q['Answer']),
            status: str_(q['Status']) || 'Not started',
            options: optionsList_(q['Options']),
            followsUp: null,
            planStep: null,
            _followsUpId: str_(q['Follows up']),
            _planStepId: str_(q['Plan step'])
          };
        }),
        _setRow: row
      };
    })
    .sort(function (a, b) { return String(a.opens || '9999').localeCompare(String(b.opens || '9999')); });

  const visible = [];
  let nextSet = null;
  let previousSent = false;

  all.forEach(function (s) {
    if (isSetVisible_(s._setRow, today, previousSent, s.submitted)) {
      visible.push(s);
    } else if (s.release !== 'hold' && !nextSet) {
      // The first hidden set (not on Hold) is "next". Its questions stay hidden.
      if (s.release === 'after previous') {
        nextSet = { title: s.title || s.set, opens: s.opens, afterPrevious: true };
      } else if (s.opens && s.opens > today) {
        nextSet = { title: s.title || s.set, opens: s.opens, afterPrevious: false };
      }
    }
    previousSent = s.submitted;
  });

  linkFollowUps_(visible, settings);
  return { today: today, sets: visible, nextSet: nextSet, setsTable: sets, questionsTable: questions };
}

/** "Options" cell → list of choices, one per line (blank lines ignored). */
function optionsList_(cell) {
  return str_(cell).split(/\r?\n/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s; })
    .slice(0, 10);
}

/**
 * Fills followsUp {question, answer} and planStep {id, step, date, label} on
 * visible questions. An earlier question is only shown when its own set is
 * visible too, so hidden question text never reaches the portal.
 */
function linkFollowUps_(visibleSets, settings) {
  const shown = {};
  visibleSets.forEach(function (s) { s.questions.forEach(function (q) { shown[q.id] = q; }); });

  let plan = null;
  const wantsPlan = visibleSets.some(function (s) { return s.questions.some(function (q) { return q._planStepId; }); });
  if (wantsPlan && enabledModules_(settings).indexOf('plan') !== -1 && SpreadsheetApp.getActive().getSheetByName('Plan')) {
    plan = loadTable_('Plan', ['ID', 'Step']);
  }

  visibleSets.forEach(function (s) {
    s.questions.forEach(function (q) {
      const earlier = shown[q._followsUpId];
      if (earlier && earlier !== q) q.followsUp = { id: earlier.id, question: earlier.question, answer: earlier.answer };
      const step = plan && findById_(plan, q._planStepId);
      if (step && str_(step['Step'])) {
        const t = dateOrLabel_(step['Target date']);
        q.planStep = { id: str_(step['ID']), step: str_(step['Step']), date: t.date, label: t.label };
      }
      delete q._followsUpId;
      delete q._planStepId;
    });
  });
}

function findVisibleSet_(view, setName) {
  for (let i = 0; i < view.sets.length; i++) {
    if (view.sets[i].set === setName) return view.sets[i];
  }
  return null;
}

// ===========================================================================
// Actions
// ===========================================================================

function actionHealth_() {
  return runHealthChecks_();
}

function actionGetProject_() {
  const settings = readSettings_();
  const modules = enabledModules_(settings);
  const counts = {};
  let openSet = null;
  let nextSet = null;

  if (modules.indexOf('questions') !== -1) {
    const view = buildQuestionsView_(settings);
    const pending = view.sets.filter(function (s) { return !s.submitted; });
    counts.questionsTotal = 0;
    counts.questionsAnswered = 0;
    pending.forEach(function (s) {
      counts.questionsTotal += s.questions.length;
      counts.questionsAnswered += s.questions.filter(function (q) { return q.answer !== ''; }).length;
    });
    if (pending.length) openSet = { set: pending[0].set, title: pending[0].title, due: pending[0].due };
    nextSet = view.nextSet;
  }
  if (modules.indexOf('approvals') !== -1) {
    counts.approvalsWaiting = loadTable_('Approvals', ['ID', 'Decision']).rows
      .filter(function (r) { return key_(r['Decision']) === 'waiting for you'; }).length;
  }
  if (modules.indexOf('files') !== -1) {
    counts.filesNeeded = loadTable_('Files', ['ID', 'Status']).rows
      .filter(function (r) { return str_(r['Item']) && key_(r['Status']) === 'needed'; }).length;
  }
  const keyDates = [];
  if (modules.indexOf('plan') !== -1) {
    const plan = loadTable_('Plan', ['ID', 'Step', 'Status']).rows.filter(function (r) { return str_(r['Step']); });
    counts.planTotal = plan.length;
    counts.planDone = plan.filter(function (r) { return key_(r['Status']) === 'done'; }).length;
    plan.forEach(function (r) {
      if (key_(r['Key date']) === 'yes') {
        const t = dateOrLabel_(r['Target date']);
        keyDates.push({ step: str_(r['Step']), date: t.date, label: t.label, status: str_(r['Status']) || 'Not started' });
      }
    });
  }

  const release = dateOrLabel_(settings.releaseDate);
  return {
    projectName: str_(settings.projectName),
    clientName: str_(settings.clientName),
    greeting: str_(settings.greeting) || 'Hi',
    ownerName: str_(settings.ownerName),
    labels: labels_(settings),
    accentColor: /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(str_(settings.accentColor)) ? str_(settings.accentColor) : '',
    logoUrl: isHttpUrl_(str_(settings.logoUrl)) ? str_(settings.logoUrl) : '',
    releaseDate: release.date,
    releaseLabel: release.label,
    modules: modules,
    footer: {
      name: str_(settings.studioName),
      url: isHttpUrl_(str_(settings.studioUrl)) ? str_(settings.studioUrl) : ''
    },
    today: today_(settings),
    counts: counts,
    openSet: openSet,
    nextSet: nextSet,
    keyDates: keyDates
  };
}

function actionGetQuestions_() {
  const settings = readSettings_();
  requireModule_(settings, 'questions');
  const view = buildQuestionsView_(settings);
  return {
    sets: view.sets.map(function (s) {
      return { set: s.set, title: s.title, intro: s.intro, due: s.due, submitted: s.submitted, questions: s.questions };
    }),
    nextSet: view.nextSet
  };
}

function actionSaveAnswer_(payload) {
  const id = textField_(payload, 'id', LIMITS.id, 'question ID', true);
  const answer = textField_(payload, 'answer', LIMITS.answer, 'answer', false);
  const settings = readSettings_();
  requireModule_(settings, 'questions');

  return withLock_(function () {
    const view = buildQuestionsView_(settings);
    const q = findById_(view.questionsTable, id);
    if (!q || !findVisibleSet_(view, str_(q['Set']))) {
      throw portalError_('NOT_FOUND', 'That question isn\'t open right now. Please refresh the page.');
    }
    const st = key_(q['Status']);
    if (st === 'sent' || st === 'reviewed') {
      throw portalError_('NOT_ALLOWED', 'These answers were already sent to ' + (str_(settings.ownerName) || 'us') + '. To change one, add a note and it can be reopened for you.');
    }
    const now = new Date();
    const status = answer ? 'Answered' : 'Not started';
    updateRow_(view.questionsTable, q, {
      'Answer': asText_(answer),
      'Status': status,
      'Answered at': answer ? now : ''
    });
    return { id: id, answer: answer, status: status, answeredAt: answer ? now.toISOString() : null };
  });
}

function actionSubmitSet_(payload) {
  const setName = textField_(payload, 'set', LIMITS.id, 'set', true);
  const settings = readSettings_();
  requireModule_(settings, 'questions');

  const result = withLock_(function () {
    const view = buildQuestionsView_(settings);
    const set = findVisibleSet_(view, setName);
    if (!set) throw portalError_('NOT_FOUND', 'That set of questions isn\'t open right now. Please refresh the page.');
    if (!set.questions.length) throw portalError_('NOT_FOUND', 'That set has no questions yet.');
    if (set.submitted) throw portalError_('NOT_ALLOWED', 'These answers were already sent. Thank you!');
    const blank = set.questions.filter(function (q) { return !q.answer; });
    if (blank.length) {
      throw portalError_('BAD_REQUEST', 'Please answer every question before sending (' + blank.length + ' still empty). Remember to press Save on each one.');
    }
    const now = new Date();
    set.questions.forEach(function (q) {
      const row = findById_(view.questionsTable, q.id);
      if (key_(row['Status']) !== 'reviewed') updateRow_(view.questionsTable, row, { 'Status': 'Sent' });
    });

    // Sets that open because this one was sent ("After previous"). The client
    // sees them right away, so the morning "ready" email isn't needed.
    const before = view.sets.map(function (s) { return s.set; });
    const after = buildQuestionsView_(settings);
    const opened = after.sets.filter(function (s) { return before.indexOf(s.set) === -1; });
    opened.forEach(function (s) {
      if (after.setsTable.col['Notified at'] && !s._setRow['Notified at']) {
        updateRow_(after.setsTable, s._setRow, { 'Notified at': now });
      }
    });
    return { set: set, sentAt: now, opened: opened.map(function (s) { return s.title || s.set; }) };
  });

  notifyOwner_(settings,
    (str_(settings.clientName) || 'Your client') + ' sent answers: ' + (result.set.title || result.set.set),
    result.set.questions.map(function (q, i) {
      return (i + 1) + '. ' + q.question + '\n' + q.answer;
    }).join('\n\n'));

  return { set: setName, sentAt: result.sentAt.toISOString(), opened: result.opened };
}

function approvalOut_(r) {
  const decision = str_(r['Decision']) || 'Coming soon';
  const link = str_(r['Preview link']);
  return {
    id: str_(r['ID']),
    posted: isoDate_(r['Posted']) || null,
    title: str_(r['Title']),
    whatToLook: str_(r['What to look at']),
    previewUrl: (key_(decision) !== 'coming soon' && isHttpUrl_(link)) ? link : '',
    decision: decision,
    notes: str_(r['Client notes']),
    decidedAt: isoTime_(r['Decided at'])
  };
}

function actionGetApprovals_() {
  const settings = readSettings_();
  requireModule_(settings, 'approvals');
  return loadTable_('Approvals', ['ID', 'Title', 'Decision']).rows
    .filter(function (r) { return str_(r['ID']) && str_(r['Title']); })
    .map(approvalOut_);
}

function actionDecideApproval_(payload) {
  const id = textField_(payload, 'id', LIMITS.id, 'item ID', true);
  const decision = textField_(payload, 'decision', 40, 'decision', true);
  const notes = textField_(payload, 'notes', LIMITS.approvalNotes, 'notes', false);
  if (decision !== 'Approved' && decision !== 'Changes requested') {
    throw portalError_('BAD_REQUEST', 'Please choose Approve or Request changes.');
  }
  if (decision === 'Changes requested' && !notes) {
    throw portalError_('BAD_REQUEST', 'Please describe the changes you\'d like, so they can be made.');
  }
  const settings = readSettings_();
  requireModule_(settings, 'approvals');

  const out = withLock_(function () {
    const table = loadTable_('Approvals', ['ID', 'Title', 'Decision', 'Client notes', 'Decided at']);
    const row = findById_(table, id);
    if (!row) throw portalError_('NOT_FOUND', 'That item couldn\'t be found. Please refresh the page.');
    const current = key_(row['Decision']);
    if (current === 'coming soon' || current === '') {
      throw portalError_('NOT_ALLOWED', 'This item isn\'t ready for review yet.');
    }
    if (current !== 'waiting for you') {
      throw portalError_('NOT_ALLOWED', 'You already decided on this item ("' + str_(row['Decision']) + '"). To change it, add a note.');
    }
    updateRow_(table, row, {
      'Decision': decision,
      'Client notes': asText_(notes),
      'Decided at': new Date()
    });
    row['Client notes'] = notes;
    return approvalOut_(row);
  });

  notifyOwner_(settings,
    (str_(settings.clientName) || 'Your client') + ': ' + decision + ' on "' + out.title + '"',
    'Decision: ' + decision + '\n\nItem: ' + out.title + (notes ? '\n\nNotes:\n' + notes : ''));
  return out;
}

function actionGetPlan_() {
  const settings = readSettings_();
  requireModule_(settings, 'plan');
  const rows = loadTable_('Plan', ['ID', 'Phase', 'Step', 'Status']).rows;
  const phases = [];
  const byName = {};
  rows.forEach(function (r) {
    if (!str_(r['Step'])) return;
    const name = str_(r['Phase']) || 'Other';
    if (!byName[name]) {
      byName[name] = { phase: name, done: 0, total: 0, steps: [] };
      phases.push(byName[name]);
    }
    const p = byName[name];
    const status = str_(r['Status']) || 'Not started';
    p.total++;
    if (key_(status) === 'done') p.done++;
    p.steps.push({
      id: str_(r['ID']),
      target: dateOrLabel_(r['Target date']),
      step: str_(r['Step']),
      details: str_(r['Details']),
      owner: str_(r['Owner']),
      status: status
    });
  });
  return { label: labels_(settings).plan, phases: phases };
}

function fileOut_(r) {
  return {
    id: str_(r['ID']),
    item: str_(r['Item']),
    details: str_(r['Details']),
    status: str_(r['Status']) || 'Needed',
    hasFile: isHttpUrl_(str_(r['Drive file link'])),
    hasLink: isHttpUrl_(str_(r['Shared link'])),
    updatedAt: isoTime_(r['Updated at'])
  };
}

function actionGetFiles_() {
  const settings = readSettings_();
  requireModule_(settings, 'files');
  return loadTable_('Files', ['ID', 'Item', 'Status']).rows
    .filter(function (r) { return str_(r['ID']) && str_(r['Item']); })
    .map(fileOut_);
}

function actionUpdateFileStatus_(payload) {
  const id = textField_(payload, 'id', LIMITS.id, 'item ID', true);
  const status = textField_(payload, 'status', 20, 'status', true);
  const link = textField_(payload, 'link', 1000, 'link', false);
  if (status !== 'Needed' && status !== 'Shared') {
    throw portalError_('BAD_REQUEST', 'That status can\'t be chosen here.');
  }
  if (link && !isHttpUrl_(link)) {
    throw portalError_('BAD_REQUEST', 'The link should start with https://. Copy it from the "Share" or "Copy link" button and paste it again.');
  }
  const settings = readSettings_();
  requireModule_(settings, 'files');
  const out = withLock_(function () {
    const table = loadTable_('Files', ['ID', 'Item', 'Status', 'Updated at']);
    const row = findById_(table, id);
    if (!row) throw portalError_('NOT_FOUND', 'That item couldn\'t be found. Please refresh the page.');
    if (key_(row['Status']) === 'received') {
      throw portalError_('NOT_ALLOWED', 'This item was already received. Nothing more to do here.');
    }
    const changes = { 'Status': status, 'Updated at': new Date() };
    if (status === 'Shared' && link) changes['Shared link'] = asText_(link);
    if (status === 'Needed') changes['Shared link'] = '';
    updateRow_(table, row, changes);
    if (changes['Shared link'] !== undefined) row['Shared link'] = status === 'Shared' ? link : '';
    return fileOut_(row);
  });

  if (status === 'Shared') {
    notifyOwner_(settings,
      (str_(settings.clientName) || 'Your client') + ' shared "' + out.item + '" another way',
      'Item: ' + out.item + '\n\n' + (link
        ? 'They shared this link:\n' + link
        : 'They marked it as sent another way (for example by email). No link was added.'));
  }
  return out;
}

function actionUploadFile_(payload) {
  const id = textField_(payload, 'id', LIMITS.id, 'item ID', true);
  const name = textField_(payload, 'name', LIMITS.fileName, 'file name', true).replace(/[\\/:*?"<>|]/g, '_');
  const mimeType = textField_(payload, 'mimeType', LIMITS.mimeType, 'file type', false) || 'application/octet-stream';
  const base64 = typeof payload.base64 === 'string' ? payload.base64.replace(/^data:[^,]*,/, '') : '';
  if (!base64) throw portalError_('BAD_REQUEST', 'The file was empty. Please choose the file again.');

  // Rough size check before decoding (base64 is about 4/3 of the real size).
  if (base64.length * 3 / 4 > LIMITS.uploadBytes + 4) {
    throw portalError_('TOO_LARGE', 'That file is larger than 10 MB. Please send a smaller version, or email it and mark the item as shared.');
  }

  const settings = readSettings_();
  requireModule_(settings, 'files');

  const table = loadTable_('Files', ['ID', 'Item', 'Status', 'Drive file link', 'Updated at']);
  const row = findById_(table, id);
  if (!row) throw portalError_('NOT_FOUND', 'That item couldn\'t be found. Please refresh the page.');

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (e) {
    throw portalError_('BAD_REQUEST', 'The file couldn\'t be read. Please choose it again.');
  }
  if (bytes.length > LIMITS.uploadBytes) {
    throw portalError_('TOO_LARGE', 'That file is larger than 10 MB. Please send a smaller version, or email it and mark the item as shared.');
  }

  const folderId = str_(settings.driveFolderId);
  if (!folderReachable_(folderId)) {
    throw portalError_('SETUP_INCOMPLETE', 'Uploads aren\'t set up yet for this project. Please email the file instead for now.');
  }

  // Uses the Drive advanced service with the narrow "drive.file" permission:
  // the script can only see files and folders it created itself.
  const fileName = str_(row['Item']) + ' - ' + name;
  const file = Drive.Files.create(
    { name: fileName, parents: [folderId], mimeType: mimeType },
    Utilities.newBlob(bytes, mimeType, fileName),
    { fields: 'id,webViewLink' }
  );
  const fileUrl = file.webViewLink || ('https://drive.google.com/file/d/' + file.id + '/view');

  const out = withLock_(function () {
    const fresh = loadTable_('Files', ['ID', 'Item', 'Status', 'Drive file link', 'Updated at']);
    const r = findById_(fresh, id);
    if (!r) throw portalError_('NOT_FOUND', 'That item couldn\'t be found. Please refresh the page.');
    updateRow_(fresh, r, { 'Drive file link': fileUrl, 'Status': 'Shared', 'Updated at': new Date() });
    return fileOut_(r);
  });

  notifyOwner_(settings,
    (str_(settings.clientName) || 'Your client') + ' uploaded a file: ' + out.item,
    'Item: ' + out.item + '\nFile: ' + fileName + ' (' + Math.round(bytes.length / 1024) + ' KB)\n\nOpen it: ' + fileUrl);
  return out;
}

function noteOut_(r) {
  return {
    id: str_(r['ID']),
    date: hasTime_(r['Date']) ? isoTime_(r['Date']) : (isoDate_(r['Date']) || null),
    from: str_(r['From']),
    note: str_(r['Note'])
  };
}

function actionGetNotes_() {
  const settings = readSettings_();
  requireModule_(settings, 'notes');
  const rows = loadTable_('Notes', ['ID', 'Date', 'From', 'Note']).rows
    .filter(function (r) { return str_(r['Note']); });
  // Newest first; rows with the same date keep "lower in the sheet = newer".
  rows.sort(function (a, b) {
    const ta = a['Date'] instanceof Date ? a['Date'].getTime() : 0;
    const tb = b['Date'] instanceof Date ? b['Date'].getTime() : 0;
    return (tb - ta) || (b._row - a._row);
  });
  return rows.map(noteOut_);
}

function actionAddNote_(payload) {
  const note = textField_(payload, 'note', LIMITS.note, 'note', true);
  const settings = readSettings_();
  requireModule_(settings, 'notes');
  const from = str_(settings.clientName) || 'Client';

  const out = withLock_(function () {
    const table = loadTable_('Notes', ['ID', 'Date', 'From', 'Note']);
    // "Client emailed" is only for your notes to the client; mark theirs.
    const row = { 'ID': nextId_(table, 'N'), 'Date': new Date(), 'From': asText_(from), 'Note': asText_(note), 'Client emailed': 'From client' };
    appendRow_(table, row);
    return { id: row['ID'], date: row['Date'].toISOString(), from: from, note: note };
  });

  notifyOwner_(settings, from + ' left a note', note);
  return out;
}
