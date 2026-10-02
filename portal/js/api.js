/**
 * api.js: the ONLY file that talks to the backend.
 *
 * Today the backend is a Google Apps Script web app. If it is ever replaced
 * (a Netlify Function, Supabase, Airtable…), only this file changes. The rest
 * of the portal calls the named methods below and gets plain data back, or an
 * ApiError with a `code` and a readable `message`.
 *
 * Request:  POST, body = JSON string, Content-Type: text/plain (no CORS preflight)
 *   { action, passcode, payload }
 * Response: { ok: true, data } or { ok: false, error: { code, message } }
 */

const TIMEOUT_MS = 30000; // Apps Script can take a few seconds to wake up

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Creates a client for one project.
 *   scriptUrl:   the project's backend URL
 *   getPasscode: function returning the current passcode
 */
export function createApi(scriptUrl, getPasscode) {
  async function call(action, payload = {}, passcodeOverride) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError('OFFLINE', 'You seem to be offline. Check your connection and try again.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action,
          passcode: passcodeOverride !== undefined ? passcodeOverride : (getPasscode() || ''),
          payload
        }),
        signal: controller.signal,
        redirect: 'follow'
      });
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      throw new ApiError('NETWORK', timedOut
        ? 'This is taking longer than usual. Please try again in a moment.'
        : 'We couldn\'t reach the project just now. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
    }

    let body;
    try {
      body = await response.json();
    } catch (err) {
      throw new ApiError('NETWORK', 'The project sent back something unexpected. Please try again in a minute.');
    }
    if (!body || body.ok !== true) {
      const e = (body && body.error) || {};
      throw new ApiError(e.code || 'SERVER_ERROR', e.message || 'Something went wrong. Please try again.');
    }
    return body.data;
  }

  return {
    /** Checks a passcode without storing it. Returns the project. */
    signIn: (passcode) => call('getProject', {}, passcode),

    health: () => call('health'),
    getProject: () => call('getProject'),

    getQuestions: () => call('getQuestions'),
    saveAnswer: (id, answer) => call('saveAnswer', { id, answer }),
    submitSet: (set) => call('submitSet', { set }),

    getApprovals: () => call('getApprovals'),
    decideApproval: (id, decision, notes) => call('decideApproval', { id, decision, notes }),

    getPlan: () => call('getPlan'),

    getFiles: () => call('getFiles'),
    updateFileStatus: (id, status) => call('updateFileStatus', { id, status }),
    uploadFile: (id, name, mimeType, base64) => call('uploadFile', { id, name, mimeType, base64 }),

    getNotes: () => call('getNotes'),
    addNote: (note) => call('addNote', { note })
  };
}
