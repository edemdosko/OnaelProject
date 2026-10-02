/**
 * ui.js: small helpers shared by every screen.
 */

/**
 * Builds an element. Text is always set as text (never as HTML).
 *   h('p', { class: 'muted' }, 'Hello ', h('strong', {}, name))
 * Attributes starting with "on" become event listeners.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, value);
    }
  }
  append(el, children);
  return el;
}

/** Adds children to an element, skipping empty ones (null, false…). */
export function add(el, ...children) {
  append(el, children);
  return el;
}

/** Replaces an element's children, skipping empty ones. */
export function fill(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** "2026-10-09" → Date at local noon (avoids timezone edge cases). */
function parseIsoDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** "2026-10-09" → "Friday, October 9" (adds the year if it isn't this year). */
export function formatDate(iso, { short = false } = {}) {
  if (!iso) return '';
  const date = parseIsoDate(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    weekday: short ? 'short' : 'long',
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric'
  });
}

/** A Plan-style target: { date, label } → readable text. */
export function formatTarget(target, opts) {
  if (!target) return '';
  return target.date ? formatDate(target.date, opts) : (target.label || '');
}

/** Days from today to an ISO date (negative if past). */
export function daysUntil(iso, todayIso) {
  if (!iso) return null;
  const today = todayIso ? parseIsoDate(todayIso) : new Date(new Date().setHours(12, 0, 0, 0));
  return Math.round((parseIsoDate(iso) - today) / 86400000);
}

/** Progress bar with an accessible label. */
export function progressBar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h('div', {
    class: 'progress',
    role: 'progressbar',
    'aria-label': label,
    'aria-valuemin': '0',
    'aria-valuemax': String(total || 0),
    'aria-valuenow': String(done || 0),
    'aria-valuetext': `${done} of ${total}`
  }, h('span', { class: 'progress-fill', style: `width:${pct}%` }));
}

/** Small colored status chip. */
export function chip(text, tone = 'neutral') {
  return h('span', { class: `chip chip-${tone}` }, text);
}

/** Reads/writes browser storage without ever throwing (private mode, etc.). */
export const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
};

/** Announces a message to screen readers (and shows a small toast). */
export function announce(message, tone = 'neutral') {
  const region = document.getElementById('toast');
  if (!region) return;
  region.textContent = '';
  region.className = `toast toast-${tone}`;
  // Re-set on the next frame so screen readers notice repeated messages.
  requestAnimationFrame(() => {
    region.textContent = message;
    region.classList.add('is-visible');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => region.classList.remove('is-visible'), 4000);
  });
}

/** Standard loading block. */
export function loadingBlock(text = 'Loading…') {
  return h('div', { class: 'state state-loading', role: 'status' },
    h('span', { class: 'spinner', 'aria-hidden': 'true' }), text);
}

/** Standard error block with a "Try again" button. */
export function errorBlock(message, onRetry) {
  return h('div', { class: 'state state-error', role: 'alert' },
    h('p', {}, message),
    onRetry ? h('button', { class: 'btn btn-outline', type: 'button', onclick: onRetry }, 'Try again') : null);
}

/**
 * A textarea that keeps a draft on this device until it's sent, so typed
 * text survives a failed send, a reload, or a closed tab.
 * Returns { el, value(), clear() }.
 */
export function draftTextarea(key, attrs = {}) {
  const el = h('textarea', attrs);
  const saved = store.get(key);
  if (saved) el.value = saved;
  el.addEventListener('input', () => {
    if (el.value) store.set(key, el.value);
    else store.remove(key);
  });
  return {
    el,
    value: () => el.value.trim(),
    clear() { el.value = ''; store.remove(key); }
  };
}

/** ISO date or date-time → "Oct 5" or "Oct 5, 2:30 PM". */
export function formatWhen(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, { short: true });
  const d = new Date(value);
  if (isNaN(d)) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}
