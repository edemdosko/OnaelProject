# Deploy: putting the portal on Netlify

One Netlify site serves every client: `https://<your-site>.netlify.app/lets-pray`,
`…/next-client`, and so on. You set it up once. After that, adding a client is
one line in a setting (see [NEW-CLIENT.md](NEW-CLIENT.md)).

Netlify's free plan is enough. Netlify sometimes renames buttons; where it
matters, both names are given.

---

## 1. Create the site (one time, about 10 minutes)

You need: your GitHub account (the repo `OnaelProject`) and each project's
`/exec` web app URL (SETUP.md, step 5).

1. Go to <https://app.netlify.com> and sign up or log in. Choosing **GitHub**
   as the sign-in method is easiest.
2. On the dashboard, click **Add new project** (older screens: **Add new site**)
   → **Import an existing project**.
3. Click **GitHub**. If GitHub asks to authorize Netlify, click **Authorize
   Netlify**.
4. Pick the repository **OnaelProject**.
   - If it isn't in the list, click **Configure the Netlify app on GitHub**,
     choose **Only select repositories → OnaelProject**, click **Save**, and
     go back.
5. On the settings screen, check these (they're read from `netlify.toml`, so
   they should already be filled in):
   - **Branch to deploy:** `main`
   - **Base directory:** leave empty
   - **Build command:** `node scripts/write-config.js`
   - **Publish directory:** `portal`
6. Click **Add environment variables** (it may sit under "Advanced") →
   **New variable**:
   - **Key:** `PROJECTS`
   - **Value:** one line per project, for example:

     ```
     lets-pray = https://script.google.com/macros/s/AKfy…/exec
     ```

     The part before `=` becomes the client's address. Use lowercase letters,
     numbers and dashes.
7. Click **Deploy** (it may say **Deploy OnaelProject**). Wait about 30 seconds
   until the deploy shows **Published**.

## 2. Give the site a good name

1. Go to **Site configuration** (or **Project configuration**) → **General** →
   **Site details** → **Change site name**.
2. Type a name, for example `onael-portal`, and click **Save**. Your address
   becomes `https://onael-portal.netlify.app`.

## 3. Test it

1. On your phone, open `https://onael-portal.netlify.app/lets-pray`.
2. Enter the passcode. You should land on Home.
3. Open `https://onael-portal.netlify.app/` (no project). It should show
   "Please use the portal link you were sent", and list no projects.

## 4. Tell the sheet its address

In the project sheet's **Settings**, set **portalUrl** to the full address, for
example `https://onael-portal.netlify.app/lets-pray`. The "Your next questions
are ready" emails use this link.

---

## Day to day

**Code changes deploy themselves.** Every push to `main` on GitHub rebuilds
the site in about a minute. Check progress in Netlify's **Deploys** tab.

**Changing `PROJECTS`** (adding a client, or a new `/exec` URL):

1. Go to **Site configuration** → **Environment variables** → **PROJECTS** →
   **Options** (or the ✏️ icon) → **Edit**.
2. Add or change the line, then click **Save variable**.
3. **Netlify doesn't rebuild on its own after a variable change.** Go to
   **Deploys** → **Trigger deploy** → **Deploy site**.

**A deploy failed?** Click it in **Deploys** and read the log. A mistake in
`PROJECTS` shows a plain message, for example:

```
Could not write portal/config.js:
  - Line 2 should look like "lets-pray = https://...": lets-pray https://...
```

Fix the variable and trigger a deploy again. The previous version stays live
until a new deploy succeeds, so clients aren't affected.

## Optional: your own domain

To use `portal.yourdomain.com` instead of `….netlify.app`:

1. Go to **Domain management** → **Add a domain** → type `portal.yourdomain.com`
   → **Verify** → **Add domain**.
2. Netlify shows a DNS record (usually a **CNAME** pointing to
   `onael-portal.netlify.app`). Add it where your domain is managed.
3. HTTPS is set up automatically within an hour or so.
4. Update **portalUrl** in each project's Settings.

## What's public and what isn't

- **The site's code is public.** Anyone can see `config.js`, which lists the
  project addresses and their `/exec` URLs. That's by design: no data can be
  read without that project's passcode.
- **Passcodes, emails and client content live only in each sheet.**
- Search engines are asked not to index the portal (`noindex`).
