/**
 * Approvals: drafts to review. Each has a preview link (opens in a new tab),
 * and Approve / Request changes buttons. Notes are required for changes.
 */

import { h, add, chip, formatDate, formatWhen, draftTextarea, announce } from '../ui.js';

const ORDER = { 'waiting for you': 0, 'changes requested': 1, 'approved': 2, 'coming soon': 3 };

export function render(main, ctx) {
  ctx.load('approvals', (items) => main.replaceChildren(build(items, main, ctx)));
}

function build(items, main, ctx) {
  const sorted = items.slice().sort((a, b) =>
    (ORDER[a.decision.toLowerCase()] ?? 9) - (ORDER[b.decision.toLowerCase()] ?? 9));
  const waiting = sorted.filter((i) => i.decision.toLowerCase() === 'waiting for you').length;

  return h('div', { class: 'view view-approvals' },
    h('header', { class: 'view-header' },
      h('h1', {}, ctx.label('approvals')),
      h('p', { class: 'lead' }, waiting
        ? `${waiting} ${waiting === 1 ? 'item is' : 'items are'} ready for you. Open the preview, then approve it or ask for changes.`
        : 'When a draft is ready for you to look at, it will appear here.')),
    sorted.length
      ? h('ul', { class: 'stack' }, sorted.map((item) => h('li', {}, itemCard(item, main, ctx))))
      : h('div', { class: 'card card-calm' }, h('p', { class: 'card-title' }, 'Nothing to review yet.')));
}

function decisionChip(decision) {
  const d = decision.toLowerCase();
  if (d === 'approved') return chip('Approved', 'green');
  if (d === 'changes requested') return chip('Changes requested', 'amber');
  if (d === 'waiting for you') return chip('Waiting for you', 'accent');
  return chip('Coming soon', 'neutral');
}

function itemCard(item, main, ctx) {
  const d = item.decision.toLowerCase();
  const owner = ctx.project.ownerName || 'us';
  const headingId = `approval-${item.id}`;

  const preview = item.previewUrl
    ? h('a', { class: 'btn btn-outline', href: item.previewUrl, target: '_blank', rel: 'noopener' },
      'Open the preview', h('span', { 'aria-hidden': 'true' }, ' ↗'), h('span', { class: 'sr-only' }, ' (opens in a new tab)'))
    : null;

  const card = h('article', { class: 'card approval' + (d === 'waiting for you' ? ' card-action' : '') + (d === 'coming soon' ? ' is-quiet' : ''), 'aria-labelledby': headingId },
    h('div', { class: 'approval-top' },
      decisionChip(item.decision),
      item.posted && d !== 'coming soon' ? h('span', { class: 'muted small' }, `Posted ${formatDate(item.posted, { short: true })}`) : null),
    h('h2', { id: headingId, class: 'card-title' }, item.title),
    item.whatToLook ? h('p', { class: 'muted' }, item.whatToLook) : null);

  if (d === 'coming soon') {
    card.append(h('p', { class: 'small muted' }, `${owner} will add a preview link when it's ready.`));
    return card;
  }

  if (d === 'approved' || d === 'changes requested') {
    add(card,
      preview ? h('div', { class: 'card-actions' }, preview) : null,
      h('div', { class: 'decision-record' },
        h('p', { class: 'small' }, h('strong', {}, d === 'approved' ? 'You approved this' : 'You asked for changes'),
          item.decidedAt ? ` on ${formatWhen(item.decidedAt)}.` : '.'),
        item.notes ? h('p', { class: 'decision-notes' }, item.notes) : null,
        d === 'changes requested' ? h('p', { class: 'small muted' }, `${owner} will post an updated version here.`) : null));
    return card;
  }

  // Waiting for you: preview + decide.
  const notes = draftTextarea(`portal:${ctx.slug}:approval:${item.id}`, {
    id: `notes-${item.id}`, class: 'q-input', rows: '3', maxlength: '3000'
  });
  const notesLabel = h('label', { for: `notes-${item.id}`, class: 'field-label' });
  const error = h('p', { class: 'field-error', role: 'alert' });
  const confirmButton = h('button', { class: 'btn btn-primary', type: 'button', onclick: submit });
  const panel = h('div', { class: 'decide-panel', hidden: true },
    h('div', { class: 'field' }, notesLabel, notes.el),
    error,
    h('div', { class: 'confirm-actions' },
      confirmButton,
      h('button', { class: 'btn btn-outline', type: 'button', onclick: closePanel }, 'Cancel')));

  const approveButton = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openPanel('Approved') }, 'Approve');
  const changesButton = h('button', { class: 'btn btn-outline', type: 'button', onclick: () => openPanel('Changes requested') }, 'Request changes');
  const choices = h('div', { class: 'card-actions' }, approveButton, changesButton);

  add(card, preview ? h('div', { class: 'card-actions' }, preview) : null, choices, panel);

  let mode = null;
  let sending = false;

  // If a note was typed earlier and not sent, reopen the panel with it.
  if (notes.value()) openPanel('Changes requested', false);

  function openPanel(which, focus = true) {
    mode = which;
    error.textContent = '';
    choices.hidden = true;
    panel.hidden = false;
    if (which === 'Approved') {
      notesLabel.textContent = 'Anything to add? (optional)';
      confirmButton.textContent = 'Approve';
    } else {
      notesLabel.textContent = 'What would you like changed?';
      confirmButton.textContent = `Send to ${owner}`;
    }
    if (focus) notes.el.focus();
  }

  function closePanel() {
    if (sending) return;
    panel.hidden = true;
    choices.hidden = false;
    error.textContent = '';
  }

  async function submit() {
    if (sending) return;
    if (mode === 'Changes requested' && !notes.value()) {
      error.textContent = 'Please describe the changes you\'d like, so they can be made.';
      notes.el.focus();
      return;
    }
    sending = true;
    confirmButton.disabled = true;
    confirmButton.textContent = 'Sending…';
    error.textContent = '';
    try {
      await ctx.api.decideApproval(item.id, mode, notes.value());
      notes.clear();
      ctx.forget('approvals', 'home');
      announce(mode === 'Approved' ? 'Approved. Thank you!' : `Sent. ${owner} has your notes.`, 'success');
      render(main, ctx);
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      sending = false;
      confirmButton.disabled = false;
      confirmButton.textContent = mode === 'Approved' ? 'Approve' : `Send to ${owner}`;
      error.textContent = `${err.message} Your note is still here.`;
    }
  }

  return card;
}
