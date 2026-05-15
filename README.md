# Family Tree Website

## Files in this folder
- `config.js`      — Your Supabase credentials (edit this first)
- `index.html`     — Public family tree viewer
- `submit.html`    — Submission form for family members
- `admin.html`     — Admin panel (password protected)

---

## Step 1 — Add your Supabase credentials

Open `config.js` and replace the placeholder values:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key-here';
```

Find these in Supabase → Project Settings → API.

---

## Step 2 — Upload to GitHub

1. Go to github.com and sign in (create a free account if needed)
2. Click the "+" icon → "New repository"
3. Name it `family-tree`
4. Set it to **Public**
5. Click "Create repository"
6. Click "uploading an existing file"
7. Drag all 4 files into the upload area
8. Click "Commit changes"

---

## Step 3 — Enable GitHub Pages

1. In your repository, go to **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Wait ~2 minutes, then your site is live at:
   `https://your-username.github.io/family-tree`

---

## Your three pages

| Page | URL | Who can access |
|------|-----|----------------|
| Family tree | `/index.html` | Anyone |
| Submit form | `/submit.html` | Anyone |
| Admin panel | `/admin.html` | You only (requires login) |

---

## Sharing with family

Send them the link: `https://your-username.github.io/family-tree`

They can view the tree and click "Add Yourself" to submit their details.
You approve submissions from the Admin panel.
