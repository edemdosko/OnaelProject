/**
 * Questions: each open set as a friendly form, one question per card.
 *
 * Typed text is never lost:
 *  - every keystroke is kept on this device as a draft until it's saved;
 *  - a failed save leaves the text in place with a "Try again" button;
 *  - leaving the page with unsaved text asks first.
 */

import { h, store, announce, formatDate, daysUntil, progressBar, chip, nextSetText, voiceButton, stopAllVoice, canUseVoice } from '../ui.js';

let unsavedGuard = null;

export function leave() {
  stopAllVoice();
  if (unsavedGuard) window.removeEventListener('beforeunload', unsavedGuard);
  unsavedGuard = null;
}

export function render(main, ctx) {
  ctx.load('questions', (data) => {
    leave();
    main.replaceChildren(build(data, main, ctx));
  });
}

function draftKey(ctx, id) {
  return `portal:${ctx.slug}:draft:${id}`;
}

function build(data, main, ctx) {
  const owner = ctx.project.ownerName || 'us';
  const open = data.sets.filter((s) => !s.submitted);
  const sent = data.sets.filter((s) => s.submitted);
  let restoredAny = false;

  // Warn before closing the tab while something is unsaved.
  const allCards = [];
  unsavedGuard = (event) => {
    if (allCards.some((c) => c.isDirty())) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', unsavedGuard);

  const openSections = open.map((set) => {
    const cards = set.questions.map((q, i) => {
      const card = questionCard(q, i + 1, ctx, () => setFooter.update());
      if (card.restored) restoredAny = true;
      allCards.push(card);
      return card;
    });
    const setFooter = sendPanel(set, cards, owner, ctx, () => render(main, ctx));

    return h('section', { class: 'q-set', 'aria-labelledby': `set-${slugify(set.set)}` },
      h('header', { class: 'q-set-header' },
        h('h2', { id: `set-${slugify(set.set)}`, class: 'q-set-title' }, set.title || set.set),
        set.intro ? h('p', { class: 'muted' }, set.intro) : null,
        set.due ? h('p', { class: 'q-due' }, dueText(set.due, ctx.project.today)) : null,
        setFooter.progress),
      h('ol', { class: 'q-list' }, cards.map((c) => h('li', {}, c.el))),
      setFooter.el);
  });

  const sentSection = sent.length
    ? h('section', { class: 'section', 'aria-labelledby': 'sent-heading' },
      h('h2', { id: 'sent-heading', class: 'section-title' }, 'Already sent'),
      sent.map((set) => h('details', { class: 'card sent-set' },
        h('summary', {}, h('span', {}, set.title || set.set), chip(`Sent to ${owner}`, 'green')),
        h('dl', { class: 'sent-answers' }, set.questions.map((q) => [
          h('dt', {}, q.question),
          h('dd', {}, q.answer || '(no answer)')
        ])))))
    : null;

  const nextNote = data.nextSet
    ? h('p', { class: 'next-note' }, nextSetText(data.nextSet))
    : null;

  const empty = !open.length
    ? h('div', { class: 'card card-calm' },
      h('p', { class: 'card-title' }, sent.length ? 'Thank you! Your answers are with ' + owner + '.' : 'No questions right now.'),
      h('p', { class: 'muted' }, data.nextSet ? 'The next set will appear here when it opens.' : 'New questions will appear here when they\'re ready.'))
    : null;

  return h('div', { class: 'view view-questions' },
    h('header', { class: 'view-header' },
      h('h1', {}, ctx.label('questions')),
      open.length ? h('p', { class: 'lead' }, 'Short answers are fine. Press Save under each answer, then send them all when you\'re done.' +
        (canUseVoice ? ' Prefer to talk? Tap Speak and say your answer.' : ' Prefer to talk? Tap the microphone on your keyboard.')) : null),
    restoredAny ? h('div', { class: 'notice', role: 'status' },
      'We kept text you hadn\'t saved yet. Press Save on those answers to keep them.') : null,
    empty,
    openSections,
    nextNote,
    sentSection);
}

// ---------------------------------------------------------------------------
// One question card
// ---------------------------------------------------------------------------

function questionCard(q, number, ctx, onChange) {
  const key = draftKey(ctx, q.id);
  let saved = q.answer || '';
  let saving = false;
  let errorMessage = '';

  const draft = store.get(key);
  const restored = draft !== null && draft !== saved;
  if (draft !== null && !restored) store.remove(key);

  const inputId = `answer-${q.id}`;
  const noteId = `note-${q.id}`;
  const stateId = `state-${q.id}`;

  const textarea = h('textarea', {
    id: inputId,
    class: 'q-input',
    rows: '3',
    maxlength: '5000',
    'aria-describedby': [q.note ? noteId : null, stateId].filter(Boolean).join(' '),
    oninput: () => {
      store.set(key, textarea.value);
      errorMessage = '';
      autoGrow();
      update();
      onChange();
    },
    onkeydown: (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
    }
  });
  textarea.value = restored ? draft : saved;

  const stateText = h('span', { id: stateId, class: 'q-state', 'aria-live': 'polite' });
  const button = h('button', { class: 'btn btn-primary btn-small', type: 'button', onclick: save }, 'Save');

  const el = h('article', { class: 'card q-card' },
    h('label', { class: 'q-label', for: inputId },
      h('span', { class: 'q-num', 'aria-hidden': 'true' }, String(number)),
      h('span', {}, q.question)),
    q.note ? h('p', { id: noteId, class: 'q-note' }, q.note) : null,
    textarea,
    h('div', { class: 'q-footer' }, stateText, h('div', { class: 'q-buttons' }, voiceButton(textarea), button)));

  function isDirty() { return textarea.value.trim() !== saved.trim(); }

  function update() {
    const dirty = isDirty();
    el.classList.toggle('is-dirty', dirty && !saving);
    el.classList.toggle('is-error', !!errorMessage);
    el.classList.toggle('is-saved', !dirty && !saving && !!saved);
    button.disabled = saving || !dirty;
    button.textContent = saving ? 'Saving…' : (errorMessage ? 'Try again' : (!dirty && saved ? 'Saved' : 'Save'));
    if (saving) stateText.textContent = 'Saving…';
    else if (errorMessage) stateText.textContent = errorMessage;
    else if (dirty) stateText.textContent = 'Not saved yet';
    else if (saved) stateText.textContent = '✓ Saved';
    else stateText.textContent = '';
  }

  async function save() {
    if (saving || !isDirty()) return;
    saving = true;
    errorMessage = '';
    update();
    const sending = textarea.value.trim();
    try {
      const result = await ctx.api.saveAnswer(q.id, sending);
      saved = result.answer;
      // Keep the page's cached copy current, so coming back shows this answer.
      q.answer = result.answer;
      q.status = result.status;
      // Only clear the draft if nothing was typed while saving.
      if (textarea.value.trim() === saved.trim()) store.remove(key);
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      errorMessage = `${err.message} Your answer is still here.`;
    } finally {
      saving = false;
      update();
      onChange();
    }
  }

  function autoGrow() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight + 2, 480)}px`;
  }

  update();
  requestAnimationFrame(autoGrow);

  return {
    el,
    restored,
    isDirty,
    isSaving: () => saving,
    hasSavedAnswer: () => !!saved.trim()
  };
}

// ---------------------------------------------------------------------------
// Progress line and "Send answers" panel for a set
// ---------------------------------------------------------------------------

function sendPanel(set, cards, owner, ctx, reload) {
  const progressText = h('p', { class: 'q-progress-text' });
  const bar = h('div', { class: 'q-progress-bar' });
  const progress = h('div', { class: 'q-progress' }, progressText, bar);

  const help = h('p', { class: 'muted send-help' });
  const error = h('p', { class: 'field-error', role: 'alert' });
  const sendButton = h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: askToConfirm }, `Send answers to ${owner}`);

  const confirmBox = h('div', { class: 'confirm', hidden: true, role: 'group', 'aria-labelledby': `confirm-${slugify(set.set)}` },
    h('p', { id: `confirm-${slugify(set.set)}` },
      h('strong', {}, `Send these answers to ${owner}?`),
      ` After sending, they can't be changed here. If something changes later, just let ${owner} know.`),
    h('div', { class: 'confirm-actions' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: send }, 'Yes, send'),
      h('button', { class: 'btn btn-outline', type: 'button', onclick: cancel }, 'Not yet')));

  const el = h('div', { class: 'send-panel' }, help, sendButton, confirmBox, error);
  let sending = false;

  function counts() {
    const done = cards.filter((c) => c.hasSavedAnswer() && !c.isDirty()).length;
    return { done, total: cards.length };
  }

  function update() {
    const { done, total } = counts();
    progressText.textContent = `${done} of ${total} answered and saved`;
    bar.replaceChildren(progressBar(done, total, `${set.title || set.set}: answers saved`));
    const unsaved = cards.some((c) => c.isDirty());
    const ready = done === total && !unsaved && !cards.some((c) => c.isSaving());
    sendButton.disabled = !ready || sending;
    help.textContent = ready
      ? 'Everything is answered and saved.'
      : unsaved ? 'Save your changes first, then you can send.' : 'Answer and save every question to send them.';
    if (!ready) cancel();
  }

  function askToConfirm() {
    error.textContent = '';
    sendButton.hidden = true;
    confirmBox.hidden = false;
    confirmBox.querySelector('button').focus();
  }

  function cancel() {
    confirmBox.hidden = true;
    sendButton.hidden = false;
  }

  async function send() {
    if (sending) return;
    sending = true;
    confirmBox.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    confirmBox.querySelector('button').textContent = 'Sending…';
    try {
      const result = await ctx.api.submitSet(set.set);
      ctx.forget('questions', 'home');
      announce(result.opened && result.opened.length
        ? `Sent! ${owner} has your answers. Your next questions are ready below.`
        : `Sent! ${owner} has your answers.`, 'success');
      reload();
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      sending = false;
      confirmBox.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      confirmBox.querySelector('button').textContent = 'Yes, send';
      cancel();
      error.textContent = err.message;
      update();
    }
  }

  update();
  return { el, progress, update };
}

function dueText(due, today) {
  const days = daysUntil(due, today);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `It would help to have these soon (they were due ${formatDate(due)}).`;
  return `It would help to have these by ${formatDate(due)}.`;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
