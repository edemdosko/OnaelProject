# End-to-end test checklist

Run this for each new client before sending the link, and after big changes.
Use your phone for the client steps. Tick each box as you go.

**Setup:** put the test content back afterwards (see the end of this list).

## Backend (in the sheet)

- [ ] **Portal → Check health** shows ✓ for every line
- [ ] **Settings** has projectName, clientName, passcode, notifyEmail, timezone, portalUrl
- [ ] The sheet's timezone (**File → Settings**) matches **Settings → timezone**
- [ ] **Sets** has at least one set; for testing, set one to **Release = Open now**

## Signing in

- [ ] `https://<site>/<address>` shows the passcode screen
- [ ] A wrong passcode shows "That passcode didn't match…"
- [ ] The right passcode opens **Home** with "<greeting> <clientName>"
- [ ] Closing and reopening the browser goes straight to Home (passcode remembered)
- [ ] **Sign out** returns to the passcode screen
- [ ] `https://<site>/` shows "Please use the portal link…" and names no projects
- [ ] `https://<site>/wrong-name` shows "This link isn't quite right"

## How it works

- [ ] On the first sign-in on a device, "How your portal works" opens, listing only the enabled sections
- [ ] **Got it** closes it; it doesn't open again on that device
- [ ] **How it works** in the header opens it any time

## Home

- [ ] The greeting reads "<greeting> <clientName>", e.g. "Dear Pastor James"
- [ ] "Waiting on you" shows the open set with "x of y answered" and the due date
- [ ] "Next questions … open <date>" appears if a later set has Release = Auto
- [ ] Progress and Key dates appear (Plan rows with **Key date = Yes**)
- [ ] Only the sections listed in **Settings → modules** appear in the navigation

## Questions

- [ ] Only visible sets show. Hidden sets' questions never appear.
- [ ] Type an answer → "Not saved yet" → **Save** → "✓ Saved". It appears in the sheet as **Answered**.
- [ ] Tap **Speak**, allow the microphone, say a sentence, tap **Stop**: the words appear in the box ("Not saved yet"), then **Save**
- [ ] Turn on airplane mode, type, press **Save**: a clear error, and the text is still there
- [ ] Reload with unsaved text: the text comes back, with a notice
- [ ] **Send answers** stays disabled until every answer is saved
- [ ] Send → confirm → "Sent!" message. Answers show under "Already sent", the sheet shows **Sent**, and you get an email.
- [ ] A set with **Release = Hold** disappears even after its Opens date
- [ ] With the next set on **Release = After previous**, sending the current set shows "Your next questions are ready below" and the new set appears at once

## Approvals

- [ ] **Coming soon** items show greyed out with no link
- [ ] Set an item to **Waiting for you** with a Preview link. It shows on Home and in Approvals.
- [ ] **Open the preview** opens a new tab
- [ ] **Request changes** with an empty note is refused. With a note, it's saved to the sheet and you get an email.
- [ ] **Approve** works the same way; the decision shows on the card and can't be changed

## Plan

- [ ] The title matches **Settings → planLabel**
- [ ] Phases show "x of y done". The first unfinished phase is marked **Now**.
- [ ] Words in Target date (e.g. "Release day") display as typed

## Files

- [ ] Upload a photo from the phone. It shows "Uploaded", the file is in the uploads folder, the link is in the sheet, and you get an email.
- [ ] The "Large files, like videos" tip shows at the top
- [ ] A file over 10 MB opens the "send it another way" box with the file's size and the two options
- [ ] **I sent it another way** with a Google Drive link: shows "Link shared", the link is in **Shared link**, and you get an email with it
- [ ] An invalid link (no https://) is refused with a clear message; **Undo** reverts the item to Needed
- [ ] Setting **Status = Received** in the sheet shows "Received" with no buttons

## Notes

- [ ] Send a note. It shows as "You", appears in the sheet, and you get an email.
- [ ] Add a reply row in the sheet (Date, From = your name, Note). It appears in the thread with the right date.
- [ ] With clientEmail set: **Portal → Send note emails now** emails the client your note once; **Client emailed** is filled

## Daily emails (only if clientEmail is set)

- [ ] **Portal → Run daily check now** sends "Your next questions are ready" for a newly visible set, and fills **Notified at**
- [ ] Running it again sends nothing

## Robustness

- [ ] Drag a column (e.g. **Answer**) to a different position in **Questions**, then reload the portal. Everything still works.
- [ ] Change the passcode in Settings. The phone is asked for the new one.

## Put things back

- [ ] Sets → Release back to **Auto**
- [ ] Clear test answers and set their Status to **Not started**
- [ ] Approvals → back to **Coming soon**; clear Client notes and Decided at
- [ ] Delete test notes; set test files back to **Needed** and clear their links
- [ ] Delete test uploads from the Drive folder
