# Client Project Portal

A calm, branded web portal in front of each project's Google Sheet. Clients answer
questions, approve drafts, share files and leave notes, all from their phone,
without ever seeing a spreadsheet.

- **Backend:** one Google Sheet per project, with an Apps Script deployed as a
  web app (`/apps-script`).
- **Frontend:** one static site on Netlify (`/portal`) that serves every
  project at its own address: `/lets-pray`, `/next-client`, …
- **Contract:** the portal talks to the backend only through `portal/js/api.js`,
  using a fixed list of named actions. The full list is at the top of
  `apps-script/Code.gs`.

| Folder | What's in it |
|---|---|
| `apps-script/` | The engine: `Code.gs` (actions), `Table.gs`, `Setup.gs`, `Notify.gs` |
| `portal/` | The client-facing site: `index.html`, `theme.css`, `app.css`, `js/` |
| `scripts/` | `write-config.js` (Netlify build step), `dev-server.js` (local preview), `push-engine.js` (update every client's script) |
| `test/` | A bare page for calling the API by hand |
| `docs/` | Guides: [SETUP](docs/SETUP.md) (first project), [DEPLOY](docs/DEPLOY.md) (Netlify), [NEW-CLIENT](docs/NEW-CLIENT.md), [TEST-CHECKLIST](docs/TEST-CHECKLIST.md), [DAILY-USE](docs/DAILY-USE.md), [CLASP](docs/CLASP.md), [THEME](docs/THEME.md) |

## Preview the portal on your computer or phone

1. Write `portal/config.js`, pasting your project's `/exec` URL (one time):

   ```bash
   PROJECTS="lets-pray = https://script.google.com/macros/s/…/exec" node scripts/write-config.js
   ```

2. Start the preview server:

   ```bash
   node scripts/dev-server.js
   ```

3. Open <http://localhost:8787/lets-pray> on this computer.
4. **On your phone** (same Wi-Fi), open `http://<your-Mac's-IP>:8787/lets-pray`.
   To find the IP, open **System Settings → Wi-Fi → Details…** next to your
   network → **IP address**. If your Mac asks whether to allow "node" to
   accept incoming connections, click **Allow**.

Press **Ctrl+C** in Terminal to stop the server.

Client content (seed files, reference workbooks), passcodes, emails and script
URLs are never committed. See `.gitignore`.
