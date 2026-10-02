# Client Project Portal

A calm, branded web portal in front of a project's Google Sheet. Clients answer
questions, approve drafts, share files and leave notes, all from their phone,
without ever seeing a spreadsheet.

- **Backend:** one Google Sheet per project, with an Apps Script deployed as a
  web app (`/apps-script`).
- **Frontend:** a static site on Netlify (`/portal`), one site per client.
- **Contract:** the portal talks to the backend only through `portal/js/api.js`,
  using a fixed list of named actions. The full list is at the top of
  `apps-script/Code.gs`.

| Folder | What's in it |
|---|---|
| `apps-script/` | The engine: `Code.gs` (actions), `Table.gs`, `Setup.gs`, `Notify.gs` |
| `portal/` | The client-facing site |
| `test/` | A bare page for calling the API by hand |
| `docs/` | Guides: [SETUP](docs/SETUP.md), [CLASP](docs/CLASP.md) |

Client content (seed files, reference workbooks), passcodes, emails and script
URLs are never committed. See `.gitignore`.
