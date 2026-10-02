# Theme: colors, fonts and shapes

The portal's look lives in **`portal/theme.css`** as CSS variables. The values
were taken from the CSS of <https://onael.theengineroomai.com>, so the portal
matches your site. `portal/app.css` only uses these variables, so changing a
value in `theme.css` restyles the whole portal.

Your site has no dark mode, so the portal is light only.

## Colors

| Variable | Value | Used for |
|---|---|---|
| `--navy-950` | `#0f1622` | Top bar, sign-in background |
| `--navy-900` | `#1a2332` | Main text, outline buttons |
| `--navy-800` | `#26324a` | Dates, due-date lines |
| `--accent-600` | `#2f7a70` | Buttons, links, focus ring, active tab |
| `--accent-700` | `#256058` | Button hover, eyebrow labels |
| `--accent-100` | `#e4f0ee` | Question number circles, "all caught up" card |
| `--neutral-600` | `#4d5566` | Secondary text (`--color-muted`) |
| `--neutral-400` | `#9aa3b2` | Input borders |
| `--neutral-200` | `#dfe3e9` | Card borders, disabled buttons |
| `--neutral-100` | `#eef0f3` | Empty part of progress bars |
| `--neutral-50` | `#f7f8fa` | Page background |
| `--gold` | `#c49c6c` | The thin line beside "Next set opens…" (from the ONAEL mark) |
| `--status-green` / `-bg` | `#3f7a4f` / `#eaf3ec` | "Saved", "Sent", "Done" |
| `--status-amber` / `-bg` | `#b4791f` / `#faf1e2` | "Not saved yet", restored-text notice |
| `--status-red` / `-bg` | `#b3453c` / `#f8ebea` | Errors |

The middle section of `theme.css` maps these to roles (`--color-page`,
`--color-text`, `--button-bg`…). To change, for example, the button color
everywhere, change `--button-bg` and `--button-bg-hover`.

## The project accent color

Each project can set **Settings → accentColor** in its sheet, for example
`#8a5a44` for a book cover's color. It replaces `--project-accent` and is used
**sparingly**:

- Progress bars
- The colored edge on "Waiting on you" cards
- A saved question's number circle

The rest of the portal stays on your brand. Leave accentColor blank to use
your teal. Text on the accent is switched between white and navy
automatically, so a light color stays readable. Use the format `#rrggbb`.

## Fonts

| Variable | Value |
|---|---|
| `--font-sans` | Inter (loaded from Google Fonts), then the system font |
| `--text-xs` … `--text-2xl` | .8125rem … up to 2rem for page titles |
| Weights | 500 medium, 600 semibold (buttons, labels), 700 bold (titles) |
| `--tracking-eyebrow` | .08em: the small uppercase labels, as on your site |

Answer boxes always use 16px text, so iPhones don't zoom in when you tap them.

## Shapes and spacing

| Variable | Value | Used for |
|---|---|---|
| `--radius-sm` | 4px | Buttons and inputs (same as your site's buttons) |
| `--radius-md` | 8px | Notices, toasts |
| `--radius-lg` | 14px | Cards |
| `--space-1` … `--space-12` | .25rem … 3rem | Same spacing scale as your site |
| `--max-width` | 720px | Width of the content column on large screens |

## Buttons

They match your site's `.btn`: 600 weight, 4px corners, teal fill, and a
darker teal on hover. Buttons are at least 44px tall so they're easy to tap.
Outline buttons use a navy border that turns teal on hover.

## Studio footer

The footer shows the ONAEL mark (`portal/assets/onael-icon.png`) with
**Settings → studioName**, linked to **Settings → studioUrl**. Leave
studioName blank to hide it.
