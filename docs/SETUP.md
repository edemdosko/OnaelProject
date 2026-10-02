# Setup: the project sheet and its script

This guide sets up one project's backend: a Google Sheet plus the script that
the portal talks to. Allow about 30 minutes the first time.

You will:

1. Create the sheet
2. Put the script code into it
3. Run setup and load the starter content
4. Fill in Settings
5. Deploy the script as a web app and copy its URL
6. Switch on the daily trigger
7. Test it with the test page

> **The one rule to remember**
> After you change the code, update the **existing** deployment:
> **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
> Never click "New deployment" again after the first time. A new deployment gets a
> new URL, and the portal would stop working until you update Netlify.

---

## 1. Create the sheet

1. Go to <https://drive.google.com>.
2. Click **+ New** (top left) → **Google Sheets** → **Blank spreadsheet**.
3. Click **Untitled spreadsheet** (top left) and name it, for example
   `Let's Pray: Project Portal`. Press Enter.
4. Set the sheet's timezone: **File → Settings**. On the **General** tab, choose
   the project's **Time zone** (for example `(GMT-05:00) Eastern Time - New York`).
   Click **Save settings**.

   This matters because "today" decides when a set of questions opens.

## 2. Put the script code into the sheet

You have two ways to do this:

- **Option A: copy and paste.** Easiest the first time. The steps are below.
- **Option B: clasp.** Better once you are making regular changes, because you
  edit on your computer and push. See [CLASP.md](CLASP.md). If you use clasp,
  do step 2.1 below, then follow CLASP.md, then come back to step 3.

### 2.1 Open the script editor

1. In the sheet, click **Extensions → Apps Script** in the top menu. A new tab
   opens with the script editor.
2. Click **Untitled project** (top left), name it `Project Portal`, and click
   **Rename**.

### 2.2 Show the manifest file

1. In the left sidebar, click the **⚙️ gear icon (Project Settings)**.
2. Tick **Show "appsscript.json" manifest file in editor**.
3. Click the **< > icon (Editor)** in the left sidebar to go back.

### 2.3 Paste the files (Option A)

In the **Files** list on the left, you'll see `Code.gs` and `appsscript.json`.

1. Click **Code.gs**. Select everything in the editor (Cmd+A) and delete it.
   Paste in the full contents of `apps-script/Code.gs` from this repo.
2. Click **appsscript.json**, select everything, and paste in
   `apps-script/appsscript.json`.
3. Add the other files. For each of `Table`, `Setup`, `Notify` and
   `SeedLetsPray`:
   - Click the **+** next to **Files** → **Script**.
   - Type the name **without** `.gs` (for example `Table`) and press Enter.
   - Delete the starter `function myFunction() {}` and paste in the matching
     file from `apps-script/`.
4. Press **Cmd+S** to save. The floppy-disk icon in the toolbar does the same.

## 3. Run setup and load the starter content

### 3.1 First run and the "unverified app" screen

The first time a script runs, Google asks for permission. This is your own
script, so it's safe to allow.

1. In the editor toolbar, find the function dropdown (it sits next to
   **▷ Run** and **Debug**). Choose **setupTemplate**.
2. Click **▷ Run**.
3. An **Authorization required** box appears. Click **Review permissions**.
4. Choose your Google account.
5. You'll see **"Google hasn't verified this app"**. This is expected for
   personal scripts.
   - Click **Advanced** (small link, bottom left).
   - Click **Go to Project Portal (unsafe)**.
6. On the permissions screen, tick **Select all** if it's shown, then click
   **Allow**. The script asks only for narrow permissions (see
   "Permissions" at the end of this guide).
7. The run finishes. To see what happened, look in the **Execution log** at the
   bottom of the editor.

### 3.2 Use the Portal menu from now on

1. Go back to the sheet's browser tab and **reload the page** (Cmd+R).
2. Wait a few seconds. A new **Portal** menu appears at the end of the top menu
   bar, after **Help**.
3. Click **Portal → Load starter content**. This fills in the Let's Pray sets,
   questions, plan, files, approvals and a welcome note.
   - Running it twice is safe. Tabs that already have rows are skipped.

The sheet now has these tabs: **Settings, Sets, Questions, Approvals, Plan,
Files, Notes**.

## 4. Fill in Settings

Open the **Settings** tab. Each key has a **Help** column explaining it. Fill
in at least:

| Key | What to type |
|---|---|
| `clientName` | The client's first name, e.g. `Michael` |
| `passcode` | A passcode for the client, e.g. three short words: `quiet-morning-light`. Share it in person or by phone, not by email. |
| `notifyEmail` | Your email address |
| `timezone` | Already filled in from the sheet. Should match step 1.4, e.g. `America/New_York`. |

**`driveFolderId` is filled in for you.** When you ran setup, the script
created its own uploads folder in My Drive, named "… - Client uploads".
You can move that folder (and this sheet) into any project folder in your
Drive; it keeps working. Don't paste a different folder's ID: the script only
has permission to use folders it created itself (see "Permissions" below).

Leave `clientEmail` blank for now. Filling it in switches on emails to the
client (see step 6). Leave `portalUrl` blank until the portal is on Netlify.

**Optional:** `accentColor` (the book's color, for example `#8a5a44`) and
`logoUrl`.

## 5. Deploy as a web app

1. In the script editor, click the blue **Deploy** button (top right) →
   **New deployment**.
2. Next to **Select type**, click the **⚙️ gear icon** → **Web app**.
3. Fill in:
   - **Description:** `Portal`
   - **Execute as:** **Me (your email)**
   - **Who has access:** **Anyone**. Choose exactly "Anyone", not "Anyone with
     Google account". The client doesn't sign in to Google; the passcode
     protects the data.
4. Click **Deploy**. If Google asks for permission again, repeat the steps from
   3.1 (Advanced → Go to … (unsafe) → Allow).
5. Under **Web app**, copy the **URL**. It looks like
   `https://script.google.com/macros/s/AKfy.../exec`. Keep it somewhere safe,
   such as your password manager or Netlify's settings (milestone 4). Don't put
   it in the repo.
6. Click **Done**.

> **Updating later:** **Deploy → Manage deployments** → select the deployment
> → **✏️ (Edit)** → **Version** dropdown → **New version** → **Deploy**.
> The URL stays the same. If you only save the code without doing this, the
> portal keeps running the old version.

## 6. Switch on the daily trigger

In the sheet: **Portal → Install triggers (daily + hourly)**. (Approve
permissions if asked.)

Every hour, the script emails the client about any note you've added in the
**Notes** tab (once per note).

The daily check runs about 7am in the project's timezone. Each morning it:

- Emails the client **"Your next questions are ready"** for any set that has
  just become visible and has **Notify client = Yes**. It then fills
  **Notified at**, so this email never sends twice for the same set.
- Emails a **reminder** when a visible set is due within two days and hasn't
  been sent. It then fills **Reminded at**.

**All client emails stay off while `clientEmail` is blank.**

**Before you fill in `clientEmail`:** for any set you've already sent the
client by email (for example Set 1), set **Notify client** to **No**.
Otherwise the client gets a "ready" email for it.

To run the check right away instead of waiting for morning: **Portal → Run
daily check now**.

## 7. Test it

### 7.1 Health check in the sheet

**Portal → Check health.** Each line shows ✓ or ✗ with what to fix.
Everything should show ✓.

### 7.2 Test page

1. In Finder, open this repo's `test` folder and double-click `index.html`. It
   opens in your browser.
2. Paste the web app URL (from step 5) into **Script URL**, and type the
   passcode.
3. Click these in order:
   - **Ping (no passcode):** shows `"alive": true`.
   - **Health check:** shows `"ok": true` and every check.
   - **getQuestions:** shows Set 1 (once its Opens date has arrived) and
     `nextSet`.
   - **saveAnswer** with `Q-001`: go to the **Questions** tab and you'll see
     the answer and the status **Answered**.
4. Clear the test answer in the sheet afterwards: delete the Answer cell and
   set Status back to **Not started**.

If double-clicking doesn't work (some browsers block it), open Terminal in the
repo folder and run:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000/test/>.

---

## Releasing a set early, or delaying it

Everything is controlled from the **Sets** tab, one change at a time:

| You want to… | Change |
|---|---|
| Open a set **now**, before its date | **Release → Open now** |
| **Delay** a set (keep it hidden even after its date) | **Release → Hold** |
| Move a set to a **new date** | Change **Opens** (and **Due**). Keep **Release = Auto**. |
| Go back to the normal schedule | **Release → Auto** |
| Open a set **as soon as the previous one is sent** | **Release → After previous**. It still opens on its **Opens** date if the previous set hasn't been sent by then. |

- **Auto** shows a set once **Opens** is today or earlier (in the project
  timezone).
- **Hold** always hides it. A set on Hold is also never mentioned as "Next set
  opens…".
- **After previous** works like Auto, but also opens the moment the client
  sends the set before it (the set with the next-earlier Opens date). The
  client sees it straight away, so no "ready" email is sent for it.
- The client sees changes the next time they open or refresh the portal.
- If **Notify client = Yes**, the "ready" email goes out at the next daily
  check. Use **Portal → Run daily check now** to send it immediately.

**Reopening answers after the client has sent them:** set those questions'
**Status** back to **Answered**. The client can then edit and send again.

**Adding a question:** add a row in **Questions** with the **Set** name, an
**Order** number and the **Question**. Leave **ID** blank, then click
**Portal → Fill missing IDs**.

---

## Where to look when something goes wrong

- **Execution log:** in the script editor's left sidebar, click **≡ Executions**
  (the list icon). Every portal request and daily check is listed. Click one to
  see its log, including full error details.
- **The portal shows old behavior after a code change:** you saved but didn't
  publish a new version. See "Updating later" in step 5.
- **The test page says "Could not reach the script" or "did not return JSON":**
  the URL must end in `/exec`, and **Who has access** must be **Anyone**.
  (Deploy → Manage deployments → ✏️ Edit to check.)
- **The Portal menu is missing:** reload the sheet and wait a few seconds.
- **"Authorization required" or "You do not have permission to call …":** in
  the editor, choose **setupTemplate** in the function dropdown, click
  **▷ Run**, and approve again.
- **Columns:** you can reorder columns or add your own anywhere. The script
  finds columns by their header name, so **don't rename the headers**. If a
  header is missing, **Portal → Set up tabs** adds it back without touching
  your data.

---

## Permissions: what the script can and can't touch

The script asks Google for these permissions only:

| Permission | Why |
|---|---|
| See and edit **this spreadsheet only** | Read and save the portal's data. It can't open your other sheets. |
| See and edit **only Drive files it created** | Create the uploads folder and save uploads into it. It can't see anything else in your Drive. |
| Send email as you | Notify you, and send the client's "questions ready" and reminder emails. |
| Run on a schedule | The daily check. |
| Show a menu in the sheet | The **Portal** menu. |

These are listed in `apps-script/appsscript.json` under `oauthScopes`.
