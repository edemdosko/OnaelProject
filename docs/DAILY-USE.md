# Running a project day to day

You work in the project sheet; the client sees the result in the portal the
next time they open or refresh it. You get an email when the client sends
answers, decides on an approval, uploads a file, or leaves a note.

## Questions

| You want to… | In the sheet |
|---|---|
| Open a set early | **Sets** → **Release** → **Open now** |
| Delay a set | **Sets** → **Release** → **Hold** (or change **Opens**) |
| Open the next set as soon as the client sends the current one | **Sets** → **Release** → **After previous** (it still opens on its date if they're slower) |
| Let the client edit answers they already sent | **Questions** → set those rows' **Status** back to **Answered** |
| Mark answers as read | **Questions** → **Status** → **Reviewed** (the client sees no change) |
| Add a question | Add a row: **Set**, **Order**, **Question**. Then **Portal → Fill missing IDs** |
| Let the client pick from choices | **Questions** → **Options**: type each choice on its own line (in the cell, press **Ctrl+Enter** on Windows or **⌘+Enter** on a Mac for a new line). The client taps one and can add a comment; both are saved in **Answer**, the choice on the first line. |
| Show a question as your follow-up to an earlier answer | **Questions** → **Follows up**: type the earlier question's ID (e.g. Q-007). The card quotes that question and the client's answer. |
| Tie a question to a step of the plan | **Questions** → **Plan step**: type the step's ID from **Plan** (e.g. P-005). Questions with the same step are grouped under the step's name and date, so keep them next to each other in **Order**. |

A set the client has already sent stays visible under "Already sent", even if
you later add a new set with an earlier **Opens** date. If **Follows up** or
**Plan step** names an ID that doesn't exist, **Portal → Check health** says so.

## Approvals

### What the client sees

Each approval has an **Open the preview** button that opens your **Preview
link** in a new tab. The client looks, comes back, and taps **Approve** or
**Request changes**. Nothing is uploaded into the portal; it's always a link.

### What to use as the preview link

The link must open **without the client signing in**. Pick whichever fits:

| What you're showing | Link to use | How to get it |
|---|---|---|
| A web page (coming-soon page, book page) | A Netlify deploy preview, or a hidden page on the live site | In Netlify: **Deploys** → the deploy → **Open deploy preview** → copy the address |
| A document (core message, page outline) | A Google Doc set to "can comment" or "can view" | In the Doc: **Share** → **General access** → **Anyone with the link** → role **Commenter** or **Viewer** → **Copy link** |
| A PDF or image (free guide, cover mock-up) | A Google Drive file | Right-click the file in Drive → **Share** → **Anyone with the link** → **Viewer** → **Copy link** |
| A design (Canva, Figma) | The tool's view link | Canva: **Share** → **View-only link**. Figma: **Share** → **Anyone with the link can view** |

Test the link in a private/incognito browser window first. If it asks you to
sign in, the client will see that too.

### Steps

1. Add a row (or use a placeholder): **Title**, **What to look at**, **Posted** date.
2. While it isn't ready: **Decision** = **Coming soon**. The client sees it greyed
   out, with no link.
3. When it's ready: paste the **Preview link** (must start with `https://`) and
   set **Decision** → **Waiting for you**. It appears on the client's Home.
4. The client's choice and notes come back into **Decision**, **Client notes**
   and **Decided at**, and you get an email.
5. After you make changes: paste the new link (or keep the same one, if it
   updates in place) and set **Decision** back to **Waiting for you**.

## Plan

Update **Status** (Not started, In progress, Done) as work moves. Set
**Key date** → **Yes** on steps you want listed under "Key dates" on Home.
**Target date** can be a date or words like "Release day".

Write **Details** for the client: they never see the sheet, so avoid wording
like "this sheet".

## Files

- Uploads (up to 10 MB) land in the project's "… - Client uploads" Drive
  folder. The link is saved in **Drive file link**, and you get an email.
- Bigger files: the client emails them to you or pastes a share link (for
  example from Google Drive) with **I sent it another way**. Their link is
  saved in **Shared link**, and you get an email with it.
- When you have what you need: **Status** → **Received**. The client sees
  "Received" and can't change it.
- Add an item: new row with **Item** and **Details**, **Status** = **Needed**,
  then **Portal → Fill missing IDs**.

## Notes (replying to the client)

Add a row to **Notes**:

| Column | What to type |
|---|---|
| **Date** | Today's date. Add a time if you like (e.g. `2026-10-06 14:30`) |
| **From** | Your name, e.g. `Edem` |
| **Note** | Your message |

Then **Portal → Fill missing IDs**. Within the hour, the client gets an email
with your note and the portal link (only if **clientEmail** is filled in).
**Client emailed** shows when it went. To send it right away:
**Portal → Send note emails now**.

Typing a whole note in one go is best: the hourly check could catch a note
you're still in the middle of writing.

## Greeting and wording

**Settings → greeting** sets how Home greets the client: `Dear` gives
"Dear Sam". **Settings → clientName** is the name used.

## Turning sections on or off

**Settings → modules** lists the sections the portal shows, separated by commas:
`questions,approvals,plan,files,notes`. Remove one to hide it.
Rename a section with **Settings → planLabel** (etc.).
