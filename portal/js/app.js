/**
 * app.js: starts the portal.
 *
 *   /                  → "use the link you were sent"
 *   /lets-pray         → that project's portal (passcode screen first)
 *   /lets-pray#/questions → a section inside the project
 *
 * Which backend each project uses comes from config.js (written by the
 * Netlify build from the PROJECTS environment variable).
 */

import { createApi } from './api.js';
import { h, store, announce, loadingBlock, errorBlock } from './ui.js';
import * as home from './views/home.js';
import * as questions from './views/questions.js';
import * as approvals from './views/approvals.js';
import * as plan from './views/plan.js';
import * as files from './views/files.js';
import * as notes from './views/notes.js';

// Sections the portal knows how to show. A section appears only if it is
// listed here AND in the project's Settings → modules.
const VIEWS = {
  home: { view: home, icon: 'home' },
  questions: { view: questions, icon: 'questions' },
  approvals: { view: approvals, icon: 'approvals' },
  plan: { view: plan, icon: 'plan' },
  files: { view: files, icon: 'files' },
  notes: { view: notes, icon: 'notes' }
};

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  questions: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  approvals: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.5 2.5L16 9.5',
  plan: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  files: 'M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 17a1.7 1.7 0 0 1-2.4-2.4L15 7.2',
  notes: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5'
};

const app = document.getElementById('app');
const config = window.PORTAL_CONFIG || { projects: {} };
const slug = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
const scriptUrl = config.projects ? config.projects[slug] : null;
const passcodeKey = `portal:${slug}:passcode`;

let api = null;
let project = null;

start();

function start() {
  if (!slug) return renderMessage('Welcome', 'Please use the portal link you were sent. It ends with your project\'s name.');
  if (!scriptUrl) return renderMessage('This link isn\'t quite right', 'Please check the portal link you were sent, or ask for a new one.');

  api = createApi(scriptUrl, () => store.get(passcodeKey));
  window.addEventListener('hashchange', route);

  if (store.get(passcodeKey)) {
    app.replaceChildren(loadingBlock('Opening your portal…'));
    api.getProject()
      .then((p) => { project = p; renderShell(); route(); })
      .catch((err) => {
        if (err.code === 'BAD_PASSCODE') return signOut('Your passcode has changed. Please enter the new one.');
        if (isAuthError(err)) return signOut(err.message);
        app.replaceChildren(errorBlock(err.message, start));
      });
  } else {
    renderPasscode();
  }
}

// ---------------------------------------------------------------------------
// Passcode screen
// ---------------------------------------------------------------------------

function renderPasscode(message) {
  document.title = 'Sign in';
  const input = h('input', {
    id: 'passcode', name: 'passcode', type: 'password', autocomplete: 'current-password',
    required: true, 'aria-describedby': 'passcode-help passcode-error', autocapitalize: 'none', spellcheck: 'false'
  });
  const error = h('p', { id: 'passcode-error', class: 'field-error', role: 'alert' }, message || '');
  const button = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Open my portal');

  const form = h('form', { class: 'signin-card', novalidate: true, onsubmit: onSubmit },
    h('img', { class: 'signin-mark', src: '/assets/onael-icon.png', alt: '', width: '56', height: '56' }),
    h('h1', { class: 'signin-title' }, 'Your project portal'),
    h('p', { class: 'muted' }, 'Enter the passcode you were given. This device will remember it.'),
    h('div', { class: 'field' },
      h('label', { for: 'passcode' }, 'Passcode'),
      input,
      h('p', { id: 'passcode-help', class: 'field-help' }, 'Type it exactly as you received it.')),
    error,
    button
  );

  app.replaceChildren(h('main', { id: 'main', class: 'signin' }, form));
  input.focus();

  async function onSubmit(event) {
    event.preventDefault();
    const passcode = input.value.trim();
    if (!passcode) {
      error.textContent = 'Please type your passcode.';
      input.focus();
      return;
    }
    button.disabled = true;
    button.textContent = 'Checking…';
    error.textContent = '';
    try {
      project = await api.signIn(passcode);
      store.set(passcodeKey, passcode);
      renderShell();
      if (!location.hash) location.hash = '#/home';
      route();
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
      button.textContent = 'Open my portal';
      input.select();
    }
  }
}

function signOut(message) {
  store.remove(passcodeKey);
  project = null;
  history.replaceState(null, '', location.pathname);
  renderPasscode(message);
}

function isAuthError(err) {
  return err && (err.code === 'BAD_PASSCODE' || err.code === 'TOO_MANY_TRIES');
}

// ---------------------------------------------------------------------------
// Shell: header, navigation, main area, footer
// ---------------------------------------------------------------------------

function availableSections() {
  const enabled = ['home'].concat(project.modules || []);
  return enabled.filter((name) => VIEWS[name]);
}

function sectionLabel(name) {
  if (name === 'home') return 'Home';
  return (project.labels && project.labels[name]) || name;
}

function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'nav-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

function renderShell() {
  if (!store.get(`portal:${slug}:helpSeen`)) setTimeout(showHelp, 400);
  applyAccent(project.accentColor);
  document.title = project.projectName || 'Project portal';

  const brand = project.logoUrl
    ? h('img', { class: 'topbar-logo', src: project.logoUrl, alt: project.projectName || 'Project' })
    : h('span', { class: 'topbar-name' }, project.projectName || 'Project portal');

  const nav = h('nav', { class: 'tabs', 'aria-label': 'Sections' },
    h('ul', {}, availableSections().map((name) =>
      h('li', {}, h('a', { href: `#/${name}`, 'data-section': name },
        icon(VIEWS[name].icon), h('span', { class: 'nav-label' }, sectionLabel(name)))))));

  // The footer is always present: on phones it also keeps content clear of the bottom bar.
  const studio = project.footer || {};
  const footer = h('footer', { class: 'site-footer' },
    studio.name
      ? h(studio.url ? 'a' : 'span', { class: 'footer-brand', href: studio.url || null, target: studio.url ? '_blank' : null, rel: studio.url ? 'noopener' : null },
        h('img', { src: '/assets/onael-icon.png', alt: '', width: '20', height: '20' }),
        h('span', {}, studio.name))
      : null);

  app.replaceChildren(
    h('a', { class: 'skip-link', href: '#main', onclick: (e) => { e.preventDefault(); document.getElementById('main').focus(); } }, 'Skip to content'),
    h('header', { class: 'topbar' },
      h('div', { class: 'topbar-inner' },
        brand,
        h('div', { class: 'topbar-actions' },
          h('button', { class: 'btn-link topbar-link', type: 'button', onclick: showHelp }, 'How it works'),
          h('button', { class: 'btn-link topbar-link', type: 'button', onclick: () => {
            signOut('');
            announce('You\'re signed out on this device.');
          } }, 'Sign out')))),
    nav,
    h('main', { id: 'main', class: 'main', tabindex: '-1' }),
    footer
  );
}

// ---------------------------------------------------------------------------
// "How it works": a short guide, shown on the first visit to each project
// ---------------------------------------------------------------------------

const HELP_TEXT = {
  home: () => 'See what\'s waiting on you, how the project is moving, and the key dates.',
  questions: (owner) => 'Answer a few questions at a time. Type, or tap Speak and talk. Press Save under each answer, ' +
    `then "Send answers to ${owner}" when the set is done. The next set appears when you send these, or on its date.`,
  approvals: () => 'When a draft is ready, tap "Open the preview" to look at it. Then approve it, or ask for changes and say what you\'d like.',
  plan: () => 'Every step and date from start to launch. It updates as the work moves along. Nothing to do here, just a place to look.',
  files: (owner) => `Upload what's needed, up to 10 MB each. For bigger files, like videos, email them to ${owner} or share a Google Drive link.`,
  notes: (owner) => `Send ${owner} a quick message any time. ${owner}'s replies appear here too.`
};

function showHelp() {
  const owner = project.ownerName || 'us';
  const steps = availableSections().map((name) =>
    h('li', { class: 'help-step' },
      h('span', { class: 'help-icon', 'aria-hidden': 'true' }, icon(VIEWS[name].icon)),
      h('div', {},
        h('p', { class: 'help-step-title' }, sectionLabel(name)),
        h('p', { class: 'help-step-text' }, HELP_TEXT[name](owner)))));

  const dialog = h('dialog', { class: 'help-dialog', 'aria-labelledby': 'help-title' },
    h('div', { class: 'help-body' },
      h('p', { class: 'eyebrow' }, project.projectName),
      h('h2', { id: 'help-title', class: 'help-title', tabindex: '-1', autofocus: true }, 'How your portal works'),
      h('p', { class: 'muted' }, `This is your private space to work with ${owner}. ` +
        `Everything you save or send here goes straight to ${owner}, and you can come back any time.`),
      h('ol', { class: 'help-steps' }, steps),
      h('p', { class: 'help-foot muted small' }, 'This device remembers your passcode. On a shared device, tap Sign out when you\'re done.'),
      h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => dialog.close() }, 'Got it')));

  dialog.addEventListener('close', () => {
    store.set(`portal:${slug}:helpSeen`, '1');
    dialog.remove();
  });
  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  // Start at the top, focused on the title (not the button at the bottom).
  dialog.scrollTop = 0;
  dialog.querySelector('#help-title').focus({ preventScroll: true });
}

/** Applies Settings → accentColor to progress bars and highlights. */
function applyAccent(color) {
  const root = document.documentElement.style;
  if (!color) {
    root.removeProperty('--project-accent');
    root.removeProperty('--project-accent-text');
    return;
  }
  root.setProperty('--project-accent', color);
  // Pick white or navy text, whichever reads better on this color.
  root.setProperty('--project-accent-text', isLight(color) ? 'var(--navy-900)' : 'var(--white)');
}

function isLight(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.18; // white text would be below 4.5:1 contrast
}

// ---------------------------------------------------------------------------
// Routing between sections
// ---------------------------------------------------------------------------

let currentView = null;

function route() {
  if (!project) return;
  const wanted = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  const sections = availableSections();
  const name = sections.includes(wanted) ? wanted : 'home';
  if (name !== wanted) history.replaceState(null, '', `#/${name}`);

  document.querySelectorAll('.tabs a').forEach((a) => {
    if (a.dataset.section === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const main = document.getElementById('main');
  if (!main) return;
  if (currentView && currentView.leave) currentView.leave();
  currentView = VIEWS[name].view;
  document.title = `${sectionLabel(name)} · ${project.projectName || 'Project portal'}`;

  currentView.render(main, {
    api,
    project,
    slug,
    label: sectionLabel,
    sections,
    navigate: (section) => { location.hash = `#/${section}`; },
    setProject: (p) => { project = p; applyAccent(p.accentColor); },
    // Every screen sends errors here first: a changed passcode signs you out.
    handleAuthError: (err) => {
      if (!isAuthError(err)) return false;
      signOut(err.code === 'BAD_PASSCODE'
        ? 'Your passcode has changed. Please enter the new one. Anything you typed is saved on this device.'
        : err.message);
      return true;
    }
  });

  // Move focus to the new heading for keyboard and screen-reader users.
  requestAnimationFrame(() => {
    const heading = main.querySelector('h1');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  });
}

// ---------------------------------------------------------------------------
// Simple full-page message (no project, wrong link)
// ---------------------------------------------------------------------------

function renderMessage(title, text) {
  document.title = title;
  app.replaceChildren(h('main', { id: 'main', class: 'signin' },
    h('div', { class: 'signin-card' },
      h('img', { class: 'signin-mark', src: '/assets/onael-icon.png', alt: '', width: '56', height: '56' }),
      h('h1', { class: 'signin-title' }, title),
      h('p', { class: 'muted' }, text))));
}
