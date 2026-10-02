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

/** "Next set" wording, shared by Home and Questions. */
export function nextSetText(next, current = 'these answers') {
  if (!next) return '';
  if (next.afterPrevious) {
    return next.opens
      ? `Next, "${next.title}" opens as soon as you send ${current}, or on ${formatDate(next.opens)}.`
      : `Next, "${next.title}" opens as soon as you send ${current}.`;
  }
  return `Next, "${next.title}" opens ${formatDate(next.opens)}.`;
}

// ---------------------------------------------------------------------------
// Voice input
// ---------------------------------------------------------------------------

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const activeVoice = new Set();

/** True if this browser can turn speech into text. */
export const canUseVoice = !!Recognition;

/** Stops any microphone that is listening (used when leaving a page). */
export function stopAllVoice() {
  activeVoice.forEach((rec) => { try { rec.stop(); } catch (e) { /* already stopped */ } });
  activeVoice.clear();
}

/**
 * A "Speak" button that types what you say into `textarea`.
 * Spoken words are added after any text already there. Each update fires an
 * "input" event, so drafts and Save buttons react as if it were typed.
 * Returns null when the browser has no speech recognition (the keyboard's own
 * microphone still works there).
 */
export function voiceButton(textarea) {
  if (!Recognition) return null;

  const label = h('span', {}, 'Speak');
  const button = h('button', {
    type: 'button',
    class: 'btn-voice',
    'aria-pressed': 'false',
    'aria-label': 'Speak your answer',
    onclick: () => (rec ? rec.stop() : start())
  }, micIcon(), label);

  let rec = null;

  function setListening(on) {
    button.classList.toggle('is-listening', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.setAttribute('aria-label', on ? 'Stop listening' : 'Speak your answer');
    label.textContent = on ? 'Stop' : 'Speak';
  }

  function start() {
    rec = new Recognition();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    let base = textarea.value;
    if (base && !/\s$/.test(base)) base += ' ';
    let finalText = '';

    rec.onresult = (event) => {
      let interim = '';
      finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += part;
        else interim += part;
      }
      textarea.value = base + finalText + interim;
      textarea.dispatchEvent(new Event('input'));
    };
    rec.onerror = (event) => {
      const messages = {
        'not-allowed': 'Microphone access is blocked. Allow it in your browser settings, or tap the microphone on your keyboard instead.',
        'service-not-allowed': 'Voice typing isn\'t available here. Tap the microphone on your keyboard instead.',
        'no-speech': 'We didn\'t hear anything. Tap Speak and try again.',
        'audio-capture': 'No microphone was found. Tap the microphone on your keyboard instead.',
        'network': 'Voice typing needs an internet connection. Please try again.'
      };
      if (event.error !== 'aborted') announce(messages[event.error] || 'Voice typing stopped. Please try again.', 'error');
    };
    rec.onend = () => {
      textarea.value = (base + finalText).replace(/\s+$/, '');
      textarea.dispatchEvent(new Event('input'));
      activeVoice.delete(rec);
      rec = null;
      setListening(false);
    };

    try {
      rec.start();
      activeVoice.add(rec);
      setListening(true);
      textarea.focus({ preventScroll: true });
    } catch (e) {
      rec = null;
      announce('Voice typing couldn\'t start. Please try again.', 'error');
    }
  }

  return button;
}

function micIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'icon');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3');
  svg.append(path);
  return svg;
}
