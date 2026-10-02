# Editing the script locally with clasp

`clasp` is Google's command-line tool. It copies the files in `apps-script/`
up to the script attached to a project sheet. You edit on your computer, run
one command, and the script editor has your changes.

> clasp **replaces** the online files with your local ones. Once you start
> using clasp for a project, make changes locally, not in the online editor.
> Otherwise your next push overwrites them.

## One-time setup on your computer

1. **Nothing to install.** `npx` (it comes with Node) downloads and runs clasp
   for you. Every command below starts with `npx -y @google/clasp`. Check it
   works:

   ```bash
   npx -y @google/clasp --version
   ```

   (`npm install -g @google/clasp` fails on this Mac with "EACCES: permission
   denied" unless you use an admin password, so we don't.)

2. **Allow clasp to access Apps Script.** Go to
   <https://script.google.com/home/usersettings> and switch
   **Google Apps Script API** to **On**.

3. **Sign in:**

   ```bash
   npx -y @google/clasp login
   ```

   Terminal prints a link. Open it, choose the Google account that owns your project sheets,
   and tick only these boxes:
   - See, edit, create, and delete **only the specific** Google Drive files you use with this app
   - Publish this application as a web app
   - Create and update Google Apps Script deployments
   - Create and update Google Apps Script projects

   Click **Continue**. You can close the tab when it says you're logged in.

## Connect this repo to a project's script

Each project sheet has its own script, with its own **Script ID**.

1. Open the project sheet → **Extensions → Apps Script**.
2. Left sidebar → **⚙️ Project Settings** → under **IDs**, find **Script ID**
   and click **Copy**.
3. In Terminal, from the repo folder, create your local config:

   ```bash
   cp apps-script/.clasp.json.example apps-script/.clasp.json
   ```

4. Open `apps-script/.clasp.json` and replace `PASTE-THE-SCRIPT-ID-HERE` with
   the Script ID. Save the file.

   `.clasp.json` is gitignored, so each client's Script ID stays out of the
   repo.

## Push your changes

```bash
cd apps-script
npx -y @google/clasp push
```

- If it asks **"Manifest file has been updated. Do you want to push and
  overwrite?"**, type `y` and press Enter.
- Only `*.gs` files in `apps-script/` and `appsscript.json` are pushed (see
  `.claspignore`). `examples/` stays local.
- `SeedLetsPray.gs` **is** pushed, even though it's not in git. That's how the
  Portal → Load starter content menu gets it.

Then reload the script editor tab to see the changes.

**A push doesn't change the live portal by itself.** To publish:
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**
(the same steps as in SETUP.md).

## Switching between clients

Each client sheet has a different Script ID. Before pushing, put the right
Script ID in `apps-script/.clasp.json`. Run `clasp push` once per client
whenever the engine code changes.

Before pushing to a new client, remove or rename the previous client's
`Seed*.gs` file, so their content isn't uploaded to the wrong project. Only
one `Seed*.gs` file can define `seedProject`.

## Troubleshooting

- **"User has not enabled the Apps Script API":** redo step 2 of the one-time
  setup, wait a minute, and try again.
- **"Could not find script" or permission errors:** check the Script ID in
  `.clasp.json`, and that you're logged in with the account that owns the
  sheet. To switch accounts, run `npx -y @google/clasp logout`, then log in again.
