# New client: stand up a portal with no code changes

Each client gets their own **sheet** (copied from the template), their own
**script** (comes with the copy), and their own **address** on the shared
Netlify site. Allow about 30 minutes, most of it typing their content.

**Before you start, you need:**
- the client's name and the address you'll give them, e.g. `next-client`
  (lowercase letters, numbers, dashes);
- the **_Portal Template** sheet in your Drive (already created; it holds the
  engine code and nothing else).

---

## 1. Make the client's folder

1. In Google Drive, open **ONAEL Clients Portal**.
2. Click **+ New → New folder**, name it after the client (e.g. `Next Client`),
   and click **Create**.

## 2. Copy the template

1. Open **_Portal Template**.
2. Click **File → Make a copy**.
3. In the box that appears:
   - **Name:** `Next Client: Project Portal`
   - **Folder:** click it and choose **ONAEL Clients Portal → Next Client**
4. Click **Make a copy**. The copy opens in a new tab, and its script comes
   with it.

> Always copy **_Portal Template**, never another client's sheet. A client
> sheet would carry their answers, notes and settings.

## 3. Set up the tabs (and approve the script once)

1. In the new sheet, wait a few seconds for the **Portal** menu to appear at
   the end of the top menu bar. If it doesn't, reload the page.
2. Click **Portal → Set up tabs (safe, keeps data)**.
3. The first time, Google asks for permission:
   **Continue** → choose your Google account → **Advanced** →
   **Go to … (unsafe)** → tick **Select all** → **Continue**.
4. Click **Portal → Set up tabs** **again**. The first click only gave
   permission. A message lists what was created: the tabs, the settings and
   the client's uploads folder.
5. In Drive, move the new **"… - Client uploads"** folder into the client's
   folder. Moving it doesn't break anything.

## 4. Fill in Settings

Open the **Settings** tab. Each key has a **Help** note. Fill in:

| Key | Example |
|---|---|
| `projectName` | `Next Client App` |
| `clientName` | `Sam` |
| `greeting` | `Dear` (already filled) or `Hi` |
| `ownerName` | `Edem` (already filled) |
| `passcode` | Three short words, e.g. `amber-river-north` |
| `notifyEmail` | Your email |
| `timezone` | e.g. `America/New_York`. It must match **File → Settings → Time zone** |
| `releaseDate` | A date (`2027-03-01`) or words (`Spring 2027`) |
| `planLabel` | e.g. `Build Plan` |
| `modules` | Remove sections you don't need, e.g. `questions,approvals,plan,notes` |
| `studioName`, `studioUrl` | `ONAEL`, `https://onael.theengineroomai.com` |
| `accentColor` | Optional, e.g. `#3b5bdb` |
| `portalUrl` | Fill in at step 7 |
| `clientEmail` | Optional. Switches on "questions ready" and reminder emails. |

## 5. Add the client's content

Type straight into the tabs. Dates use the format `2027-01-15`.

| Tab | What to add |
|---|---|
| **Sets** | One row per set: **Set** (`Set 1`), **Title**, **Intro**, **Opens**, **Due**, **Release** = `Auto` (or `After previous` to open each set as soon as the one before is sent), **Notify client** = `Yes` |
| **Questions** | **Set** (must match a Set name exactly), **Order** (1, 2, 3…), **Question**, **Helpful note** |
| **Plan** | **Phase**, **Target date**, **Step**, **Details**, **Owner**, **Status**, **Key date** (Yes for Home) |
| **Files** | **Item**, **Details**, **Status** = `Needed` |
| **Approvals** | Placeholders: **Title**, **What to look at**, **Posted**, **Decision** = `Coming soon` |

Leave **ID** columns blank, then click **Portal → Fill missing IDs**.

## 6. Deploy the script and switch on the daily check

1. Click **Extensions → Apps Script**.
2. Click **Deploy → New deployment** → **⚙️** next to "Select type" → **Web app**.
3. Set **Description** = `Portal`, **Execute as** = **Me**, and
   **Who has access** = **Anyone**. Then click **Deploy**.
4. Copy the **Web app URL**, which ends in `/exec`. Make sure it's not a
   "Library" link. Click **Done**.
5. Back in the sheet: **Portal → Install triggers (daily + hourly)**.
6. **Portal → Check health.** Everything should show ✓.

## 7. Add the client to Netlify

1. In Netlify: **Site configuration** → **Environment variables** →
   **PROJECTS** → **Edit**.
2. Add a new line: `next-client = https://script.google.com/macros/s/…/exec`.
   Click **Save variable**.
3. Go to **Deploys** → **Trigger deploy** → **Deploy site**. Wait for
   **Published**.
4. In the sheet's **Settings**, set **portalUrl** to
   `https://onael-portal.netlify.app/next-client`.

## 8. Register the script for engine updates

1. In the script editor: **⚙️ Project Settings** → **IDs** → **Script ID** →
   **Copy**.
2. Add a line to `apps-script/projects.local.json` on your Mac:

   ```json
   "next-client": "PASTE-SCRIPT-ID"
   ```

Now `node scripts/push-engine.js` keeps this client's engine up to date with
the others (see [CLASP.md](CLASP.md)).

## 9. Test, then send the link

Run the client checks in [TEST-CHECKLIST.md](TEST-CHECKLIST.md). Then:

- Send the client the link (`…/next-client`) by email.
- Give them the **passcode** separately, in person or by phone.
