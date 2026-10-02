/**
 * Plan: read-only progress by phase. The title comes from Settings → planLabel.
 */

import { h, chip, formatTarget, progressBar, loadingBlock, errorBlock } from '../ui.js';

export function render(main, ctx) {
  main.replaceChildren(loadingBlock('Loading the plan…'));
  ctx.api.getPlan()
    .then((plan) => main.replaceChildren(build(plan, ctx)))
    .catch((err) => {
      if (ctx.handleAuthError(err)) return;
      main.replaceChildren(errorBlock(err.message, () => render(main, ctx)));
    });
}

function statusChip(status) {
  const s = status.toLowerCase();
  if (s === 'done') return chip('Done', 'green');
  if (s === 'in progress') return chip('In progress', 'amber');
  return chip('Not started', 'neutral');
}

function build(plan, ctx) {
  const done = plan.phases.reduce((n, p) => n + p.done, 0);
  const total = plan.phases.reduce((n, p) => n + p.total, 0);
  // The first phase that isn't finished is "where we are now".
  const current = plan.phases.findIndex((p) => p.done < p.total);

  return h('div', { class: 'view view-plan' },
    h('header', { class: 'view-header' },
      h('h1', {}, plan.label || ctx.label('plan')),
      h('p', { class: 'lead' }, 'Every step from start to launch and beyond. This page updates as work moves along.')),
    total ? h('div', { class: 'card progress-row' },
      h('div', { class: 'progress-label' },
        h('span', {}, 'Overall'),
        h('span', { class: 'muted' }, `${done} of ${total} steps done`)),
      progressBar(done, total, 'Overall progress')) : null,
    plan.phases.length
      ? h('div', { class: 'stack' }, plan.phases.map((phase, i) => phaseBlock(phase, i === current, i)))
      : h('div', { class: 'card card-calm' }, h('p', { class: 'card-title' }, 'The plan will appear here soon.')));
}

function phaseBlock(phase, isCurrent, index) {
  const finished = phase.total > 0 && phase.done === phase.total;
  const details = h('details', { class: 'card phase' + (isCurrent ? ' is-current' : ''), open: !finished || null },
    h('summary', { class: 'phase-summary' },
      h('span', { class: 'phase-name' }, phase.phase,
        isCurrent ? h('span', { class: 'phase-now' }, 'Now') : null),
      h('span', { class: 'muted small' }, finished ? 'All done ✓' : `${phase.done} of ${phase.total} done`)),
    progressBar(phase.done, phase.total, `${phase.phase} progress`),
    h('ol', { class: 'steps' }, phase.steps.map((s) =>
      h('li', { class: 'step' + (s.status.toLowerCase() === 'done' ? ' is-done' : '') },
        h('div', { class: 'step-top' },
          h('span', { class: 'step-when' }, formatTarget(s.target, { short: true }) || 'Date to come'),
          statusChip(s.status)),
        h('p', { class: 'step-title' }, s.step),
        s.details ? h('p', { class: 'step-details' }, s.details) : null,
        s.owner ? h('p', { class: 'step-owner' }, `Who: ${s.owner}`) : null))));
  details.dataset.index = index;
  return details;
}
