/**
 * Files: a checklist of what's needed, with an upload button per item.
 * Uploads go to the project's private Drive folder (max 10 MB each).
 */

import { h, fill, chip, announce } from '../ui.js';

const MAX_BYTES = 10 * 1024 * 1024;

export function render(main, ctx) {
  ctx.load('files', (files) => main.replaceChildren(build(files, ctx)));
}

function build(files, ctx) {
  const needed = files.filter((f) => f.status.toLowerCase() === 'needed').length;
  return h('div', { class: 'view view-files' },
    h('header', { class: 'view-header' },
      h('h1', {}, ctx.label('files')),
      h('p', { class: 'lead' }, needed
        ? `${needed} still needed. Upload each one here, or let ${ctx.project.ownerName || 'us'} know you sent it another way.`
        : 'Everything on the list has been shared. Thank you!')),
    h('aside', { class: 'tip', 'aria-label': 'Large files' },
      h('p', { class: 'tip-title' }, 'Large files, like videos'),
      h('p', {}, `Uploads here can be up to 10 MB. For anything bigger, email it to ${ctx.project.ownerName || 'us'}, ` +
        'or share it from Google Drive and paste the link. Use "I sent it another way" on that item.')),
    files.length
      ? h('ul', { class: 'stack' }, files.map((f) => h('li', {}, fileCard(f, ctx))))
      : h('div', { class: 'card card-calm' }, h('p', { class: 'card-title' }, 'No files needed right now.')));
}

function statusChip(file) {
  const s = file.status.toLowerCase();
  if (s === 'received') return chip('Received', 'green');
  if (s === 'shared') return chip(file.hasFile ? 'Uploaded' : file.hasLink ? 'Link shared' : 'Sent', 'green');
  return chip('Needed', 'amber');
}

function fileCard(initial, ctx) {
  let file = initial;
  let busy = false;
  let pending = null; // a chosen file kept for "Try again" if the upload fails

  const owner = ctx.project.ownerName || 'us';
  const inputId = `upload-${file.id}`;
  const card = h('article', { class: 'card file-card', 'aria-labelledby': `file-${file.id}` });
  const status = h('p', { class: 'file-status', 'aria-live': 'polite' });
  const error = h('p', { class: 'field-error', role: 'alert' });

  const input = h('input', {
    id: inputId, type: 'file', class: 'sr-only',
    onchange: () => { if (input.files[0]) upload(input.files[0]); }
  });

  // "Sent another way" box: kept between redraws so a pasted link isn't lost.
  let otherWayOpen = false;
  const linkId = `link-${file.id}`;
  const linkInput = h('input', {
    id: linkId, type: 'url', inputmode: 'url', autocomplete: 'off',
    placeholder: 'https://drive.google.com/…', class: 'text-input'
  });
  const otherWayIntro = h('p', {});

  function draw() {
    const s = file.status.toLowerCase();
    const actions = h('div', { class: 'card-actions' });

    if (s === 'received') {
      status.textContent = `${owner} has this. Nothing more to do.`;
    } else {
      if (!busy) {
        status.textContent = s === 'shared'
          ? (file.hasFile ? 'Uploaded. You can add another version if needed.'
            : file.hasLink ? 'Link shared. Thank you!' : 'Marked as sent another way.')
          : '';
      }
      // A <label> styled as a button opens the file picker and works with the keyboard.
      actions.append(...[
        h('label', {
          for: inputId,
          class: 'btn ' + (s === 'needed' ? 'btn-primary' : 'btn-outline') + (busy ? ' is-disabled' : ''),
          tabindex: busy ? '-1' : '0',
          role: 'button',
          'aria-disabled': busy ? 'true' : null,
          onkeydown: (e) => { if (!busy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); input.click(); } }
        }, s === 'needed' ? 'Upload a file' : 'Upload another'),
        pending && !busy ? h('button', { class: 'btn btn-outline', type: 'button', onclick: () => upload(pending) }, 'Try again') : null,
        s === 'needed' && !busy && !otherWayOpen
          ? h('button', { class: 'btn-link', type: 'button', onclick: () => openOtherWay() }, 'I sent it another way')
          : null,
        s === 'shared' && !file.hasFile && !busy
          ? h('button', { class: 'btn-link', type: 'button', onclick: () => setStatus('Needed') }, 'Undo')
          : null
      ].filter(Boolean));
    }

    const otherWay = otherWayOpen && s === 'needed'
      ? h('div', { class: 'other-way' },
        otherWayIntro,
        h('div', { class: 'field' },
          h('label', { for: linkId, class: 'field-label' }, 'Link (optional)'),
          linkInput),
        h('div', { class: 'confirm-actions' },
          h('button', { class: 'btn btn-primary', type: 'button', disabled: busy, onclick: () => setStatus('Shared', linkInput.value.trim()) }, busy ? 'Saving…' : 'Mark as sent'),
          h('button', { class: 'btn btn-outline', type: 'button', disabled: busy, onclick: () => { otherWayOpen = false; error.textContent = ''; draw(); } }, 'Cancel')))
      : null;

    input.disabled = busy;
    fill(card,
      h('div', { class: 'approval-top' }, statusChip(file)),
      h('h2', { id: `file-${file.id}`, class: 'card-title' }, file.item),
      file.details ? h('p', { class: 'muted' }, file.details) : null,
      status, error, input,
      otherWay,
      actions.childNodes.length && !otherWay ? actions : null);
  }

  function openOtherWay(reason) {
    otherWayIntro.textContent = (reason ? reason + ' ' : '') +
      `You can email it to ${owner}, or share it from Google Drive: tap Share, set access to "Anyone with the link", ` +
      'tap Copy link, and paste it below. Then tap "Mark as sent".';
    otherWayOpen = true;
    draw();
    linkInput.focus();
  }

  async function upload(chosen) {
    if (busy) return;
    error.textContent = '';
    input.value = '';
    if (chosen.size > MAX_BYTES) {
      pending = null;
      openOtherWay(`"${chosen.name}" is ${(chosen.size / 1048576).toFixed(1)} MB, which is over the 10 MB limit for uploads here.`);
      return;
    }
    busy = true;
    pending = chosen;
    status.textContent = `Uploading "${chosen.name}"… This can take up to a minute. Please keep this page open.`;
    draw();
    try {
      const base64 = await readAsBase64(chosen);
      file = Object.assign(initial, await ctx.api.uploadFile(file.id, chosen.name, chosen.type || 'application/octet-stream', base64));
      pending = null;
      announce(`Uploaded "${chosen.name}". Thank you!`, 'success');
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      error.textContent = err.message;
      status.textContent = '';
    } finally {
      busy = false;
      draw();
    }
  }

  async function setStatus(next, link = '') {
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      error.textContent = 'That doesn\'t look like a link. It should start with https:// (use "Copy link" in Google Drive), or leave the box empty.';
      linkInput.focus();
      return;
    }
    if (busy) return;
    busy = true;
    error.textContent = '';
    status.textContent = 'Saving…';
    draw();
    try {
      file = Object.assign(initial, await ctx.api.updateFileStatus(file.id, next, link));
      if (next === 'Shared') {
        otherWayOpen = false;
        linkInput.value = '';
        announce(`Thank you! ${owner} has been told.`, 'success');
      }
    } catch (err) {
      if (ctx.handleAuthError(err)) return;
      error.textContent = err.message;
    } finally {
      busy = false;
      draw();
    }
  }

  draw();
  return card;
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(new Error('That file couldn\'t be read. Please choose it again.'));
    reader.readAsDataURL(file);
  });
}
