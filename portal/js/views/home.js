/**
 * Home: what's waiting on the client, progress, and key dates.
 */

import { h, formatDate, formatTarget, daysUntil, progressBar, chip, loadingBlock, errorBlock } from '../ui.js';

export function render(main, ctx) {
  main.replaceChildren(loadingBlock());
  ctx.api.getProject()
    .then((project) => {
      ctx.setProject(project);
      main.replaceChildren(build(project, ctx));
    })
    .catch((err) => {
      if (ctx.handleAuthError(err)) return;
      main.replaceChildren(errorBlock(err.message, () => render(main, ctx)));
    });
}

function build(p, ctx) {
  const counts = p.counts || {};
  const has = (name) => (p.modules || []).includes(name);
  const canOpen = (name) => ctx.sections.includes(name);

  // --- What's waiting on you
  const waiting = [];

  if (has('questions') && p.openSet) {
    const done = counts.questionsAnswered || 0;
    const total = counts.questionsTotal || 0;
    const allAnswered = total > 0 && done === total;
    waiting.push(h('article', { class: 'card card-action' },
      h('p', { class: 'eyebrow' }, ctx.label('questions')),
      h('h2', { class: 'card-title' }, p.openSet.title || p.openSet.set),
      h('p', { class: 'card-meta' },
        allAnswered ? 'All answered. Ready to send.' : `${done} of ${total} answered`,
        p.openSet.due ? ` · ${dueText(p.openSet.due, p.today)}` : ''),
      progressBar(done, total, `${ctx.label('questions')} answered`),
      h('div', { class: 'card-actions' },
        h('a', { class: 'btn btn-primary', href: '#/questions' },
          allAnswered ? 'Review and send' : (done ? 'Continue answering' : 'Start answering')))));
  }

  if (has('approvals') && counts.approvalsWaiting) {
    const n = counts.approvalsWaiting;
    waiting.push(simpleCard(ctx.label('approvals'),
      `${n} ${n === 1 ? 'item is' : 'items are'} waiting for your review`,
      canOpen('approvals') ? '#/approvals' : null, 'Review'));
  }

  if (has('files') && counts.filesNeeded) {
    const n = counts.filesNeeded;
    waiting.push(simpleCard(ctx.label('files'),
      `${n} ${n === 1 ? 'file is' : 'files are'} still needed`,
      canOpen('files') ? '#/files' : null, 'See the list'));
  }

  const waitingSection = h('section', { class: 'section', 'aria-labelledby': 'waiting-heading' },
    h('h2', { id: 'waiting-heading', class: 'section-title' }, 'Waiting on you'),
    waiting.length
      ? h('div', { class: 'stack' }, waiting)
      : h('div', { class: 'card card-calm' },
        h('p', { class: 'card-title' }, 'You\'re all caught up.'),
        h('p', { class: 'muted' }, 'Nothing needs you right now. Thank you!')),
    has('questions') && p.nextSet
      ? h('p', { class: 'next-note' }, `Next questions, "${p.nextSet.title}", open ${formatDate(p.nextSet.opens)}.`)
      : null);

  // --- Progress
  const progress = [];
  if (has('plan') && counts.planTotal) {
    progress.push(h('div', { class: 'progress-row' },
      h('div', { class: 'progress-label' },
        h('span', {}, ctx.label('plan')),
        h('span', { class: 'muted' }, `${counts.planDone} of ${counts.planTotal} steps done`)),
      progressBar(counts.planDone, counts.planTotal, `${ctx.label('plan')} progress`)));
  }

  // --- Key dates
  const dates = (p.keyDates || []).map((d) =>
    h('li', { class: 'date-row' + (isDone(d.status) ? ' is-done' : '') },
      h('span', { class: 'date-when' }, formatTarget(d, { short: true }) || 'To be confirmed'),
      h('span', { class: 'date-what' }, d.step),
      isDone(d.status) ? chip('Done', 'green') : null));
  if (p.releaseDate || p.releaseLabel) {
    dates.push(h('li', { class: 'date-row date-launch' },
      h('span', { class: 'date-when' }, p.releaseDate ? formatDate(p.releaseDate, { short: true }) : p.releaseLabel),
      h('span', { class: 'date-what' }, 'Launch')));
  }

  return h('div', { class: 'view view-home' },
    h('header', { class: 'view-header' },
      h('h1', {}, p.clientName ? `Hi ${p.clientName}` : 'Welcome'),
      h('p', { class: 'lead' }, 'Here\'s where things stand.')),
    waitingSection,
    progress.length ? h('section', { class: 'section', 'aria-labelledby': 'progress-heading' },
      h('h2', { id: 'progress-heading', class: 'section-title' }, 'Progress'),
      h('div', { class: 'card' }, progress)) : null,
    dates.length ? h('section', { class: 'section', 'aria-labelledby': 'dates-heading' },
      h('h2', { id: 'dates-heading', class: 'section-title' }, 'Key dates'),
      h('ul', { class: 'card date-list' }, dates)) : null
  );
}

function simpleCard(eyebrow, text, href, action) {
  return h('article', { class: 'card card-action' },
    h('p', { class: 'eyebrow' }, eyebrow),
    h('p', { class: 'card-title' }, text),
    href ? h('div', { class: 'card-actions' }, h('a', { class: 'btn btn-outline', href }, action)) : null);
}

function dueText(due, today) {
  const days = daysUntil(due, today);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `Was due ${formatDate(due, { short: true })}`;
  return `Due ${formatDate(due)}`;
}

function isDone(status) {
  return String(status || '').toLowerCase() === 'done';
}
