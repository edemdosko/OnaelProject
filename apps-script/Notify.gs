/**
 * Notify.gs: emails and the daily check.
 *
 * Emails to Edem (notifyEmail): client sends a set, decides an approval,
 * uploads a file, or adds a note.
 *
 * Emails to the client (clientEmail), from dailyCheck() only:
 *   1. "Your next questions are ready" when a set becomes visible and its
 *      "Notify client" is Yes. "Notified at" is filled so it never sends twice.
 *   2. A reminder two days before a visible set is due, if it isn't sent yet.
 *      "Reminded at" is filled so it never sends twice.
 * Both are off while clientEmail is blank.
 */

/** Sends Edem an email. Never fails the client's request if email fails. */
function notifyOwner_(settings, subject, body) {
  const to = str_(settings.notifyEmail);
  if (!to) {
    console.warn('notifyEmail is blank in Settings; skipped email: ' + subject);
    return;
  }
  const portalUrl = str_(settings.portalUrl);
  try {
    MailApp.sendEmail({
      to: to,
      subject: '[' + (str_(settings.projectName) || 'Portal') + '] ' + subject,
      body: body + '\n\n—\nOpen the project sheet to see everything: ' + SpreadsheetApp.getActive().getUrl() +
        (portalUrl ? '\nPortal: ' + portalUrl : ''),
      name: (str_(settings.projectName) || 'Project') + ' portal'
    });
  } catch (e) {
    console.error('Could not email notifyEmail: ' + e);
  }
}

function emailClient_(settings, subject, body) {
  MailApp.sendEmail({
    to: str_(settings.clientEmail),
    replyTo: str_(settings.notifyEmail) || undefined,
    subject: subject,
    body: body,
    name: str_(settings.ownerName) || str_(settings.projectName) || 'Project portal'
  });
}

/**
 * Runs once a day (see installTriggers in Setup.gs). You can also run it by
 * hand from the sheet: Portal → Run daily check now.
 */
function dailyCheck() {
  const settings = readSettings_();
  if (!str_(settings.clientEmail)) {
    console.log('dailyCheck: clientEmail is blank, so no client emails are sent.');
    return 'No client emails: clientEmail is blank in Settings.';
  }
  if (enabledModules_(settings).indexOf('questions') === -1) return 'Questions module is off.';

  const portalUrl = str_(settings.portalUrl);
  const greeting = 'Hi' + (str_(settings.clientName) ? ' ' + str_(settings.clientName) : '') + ',\n\n';
  const signoff = '\n\n' + (str_(settings.ownerName) || '');
  const log = [];

  withLock_(function () {
    const view = buildQuestionsView_(settings);
    const sets = view.setsTable;

    view.sets.forEach(function (s) {
      const row = s._setRow;
      if (s.submitted || !s.questions.length) return;

      // 1. "Your next questions are ready"
      if (key_(row['Notify client']) === 'yes' && !row['Notified at']) {
        try {
          emailClient_(settings,
            'Your next questions are ready' + (s.title ? ': ' + s.title : ''),
            greeting + 'Your next questions are ready' + (s.title ? ' (' + s.title + ')' : '') + '. ' +
            'There are ' + s.questions.length + ' of them' + (s.due ? ', and it would help to have them by ' + friendlyDate_(s.due) : '') + '.' +
            (portalUrl ? '\n\nOpen your portal: ' + portalUrl : '') + signoff);
          updateRow_(sets, row, { 'Notified at': new Date() });
          log.push('Sent "ready" email for ' + s.set);
        } catch (e) {
          console.error('Could not send "ready" email for ' + s.set + ': ' + e);
        }
      }

      // 2. Reminder two days (or less) before the due date, once.
      if (s.due && sets.col['Reminded at'] && !row['Reminded at']) {
        const daysLeft = daysBetween_(view.today, s.due);
        if (daysLeft >= 0 && daysLeft <= 2) {
          const left = s.questions.filter(function (q) { return !q.answer; }).length;
          try {
            emailClient_(settings,
              'A gentle reminder: ' + (s.title || 'your questions') + ' are due ' + friendlyDate_(s.due),
              greeting + 'A gentle reminder that ' + (s.title ? '"' + s.title + '"' : 'your current questions') +
              ' would be helpful by ' + friendlyDate_(s.due) + '. ' +
              (left ? left + ' still need an answer.' : 'Everything is answered; just press "Send answers" when you\'re ready.') +
              (portalUrl ? '\n\nOpen your portal: ' + portalUrl : '') + signoff);
            updateRow_(sets, row, { 'Reminded at': new Date() });
            log.push('Sent reminder for ' + s.set);
          } catch (e) {
            console.error('Could not send reminder for ' + s.set + ': ' + e);
          }
        }
      }
    });
  });

  const summary = log.length ? log.join('\n') : 'Nothing to send today.';
  console.log('dailyCheck: ' + summary);
  return summary;
}

/** "2026-10-09" → "Friday, October 9" */
function friendlyDate_(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return Utilities.formatDate(d, 'UTC', 'EEEE, MMMM d');
}
