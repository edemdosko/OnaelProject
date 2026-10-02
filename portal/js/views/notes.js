/**
 * Notes: a simple message thread. Newest first, with the message box on top.
 * Replies are added by the project owner in the sheet's Notes tab.
 */

import { h, formatWhen, draftTextarea, announce, loadingBlock, errorBlock } from '../ui.js';

const MAX = 2000;

export function render(main, ctx) {
  main.replaceChildren(loadingBlock('Loading notes…'));
  ctx.api.getNotes()
    .then((notes) => main.replaceChildren(build(notes, main, ctx)))
    .catch((err) => {
      if (ctx.handleAuthError(err)) return;
      main.replaceChildren(errorBlock(err.message, () => render(main, ctx)));
    });
}

function build(notes, main, ctx) {
  const owner = ctx.project.ownerName || 'us';
  const me = (ctx.project.clientName || '').trim().toLowerCase();

  const box = draftTextarea(`portal:${ctx.slug}:note`, {
    id: 'new-note', class: 'q-input', rows: '3', maxlength: String(MAX), 'aria-describedby': 'note-count'
  });
  const count = h('span', { id: 'note-count', class: 'muted small' });
  const error = h('p', { class: 'field-error', role: 'alert' });
  const button = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Send note');
  let sending = false;

  function updateCount() {
    const n = box.el.value.length;
    count.textContent = n > MAX - 200 ? `${MAX - n} characters left` : '';
    button.disabled = sending || !box.value();
  }
  box.el.addEventListener('input', updateCount);
  updateCount();

  const list = h('ol', { class: 'thread' }, notes.map((n) => message(n, me)));
  const empty = h('p', { class: 'muted', hidden: notes.length > 0 }, 'No notes yet.');

  const form = h('form', { class: 'card composer', onsubmit: send },
    h('div', { class: 'field' }, h('label', { for: 'new-note', class: 'field-label' }, `Write a note to ${owner}`), box.el),
    error,
    h('div', { class: 'q-footer' }, count, button));

  async function send(event) {
    event.preventDefault();
    if (sending || !box.value()) return;
    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    error.textContent = '';
    try {
      const added = await ctx.api.addNote(box.value());
      box.clear();
      list.prepend(message(added, me));
      empty.hidden = true;
      announce(`Sent. ${owner} gets an email with your note.`, 'success');
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      error.textContent = `${err.message} Your note is still here.`;
    } finally {
      sending = false;
      button.textContent = 'Send note';
      updateCount();
    }
  }

  return h('div', { class: 'view view-notes' },
    h('header', { class: 'view-header' },
      h('h1', {}, ctx.label('notes')),
      h('p', { class: 'lead' }, `Quick messages between you and ${owner}. ${owner} is emailed when you send one.`)),
    form,
    h('section', { class: 'section', 'aria-labelledby': 'thread-heading' },
      h('h2', { id: 'thread-heading', class: 'sr-only' }, 'Messages'),
      list,
      empty));
}

function message(note, me) {
  const mine = me && note.from.trim().toLowerCase() === me;
  return h('li', { class: 'message' + (mine ? ' is-mine' : '') },
    h('p', { class: 'message-meta' },
      h('strong', {}, mine ? 'You' : note.from || 'Note'),
      note.date ? h('span', { class: 'muted' }, ` · ${formatWhen(note.date)}`) : null),
    h('p', { class: 'message-text' }, note.note));
}
