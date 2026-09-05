# Getting Forge onto your phone — step by step

Everything is built and tested. These are the steps we do together — they need your
accounts, so none of this could happen while you were out. Budget ~20 minutes.

## 1. Put the code on GitHub (~5 min)

1. Go to **github.com** and sign in (or sign up — free).
2. Click the **+** in the top-right → **New repository**.
3. Name it `forge`, leave everything else default, click **Create repository**.
   **Don't** check "Add a README" — the project already has its files.
4. Come back to this chat and tell Claude your GitHub username — Claude will run the
   push commands for you. (The commit is already made locally.)

## 2. Deploy on Vercel (~10 min)

1. Go to **vercel.com** → **Sign Up** → choose **Continue with GitHub**. This links the
   two accounts, which is what makes deploys automatic.
2. On the Vercel dashboard, click **Add New… → Project**.
3. You'll see your `forge` repo in the list → click **Import**.
4. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your API key (from **console.anthropic.com** → API keys — the same key
     already in the local `.env.local` file, or make a fresh one).
   This is what powers transcription, pressure tests, and the voice profile. At your
   usage it costs cents per week.
5. Click **Deploy**. Two minutes later you get a URL like `forge-xyz.vercel.app`.

From now on, any future code change pushed to GitHub redeploys automatically.

## 3. Install on your phone (~2 min)

On **iPhone (Safari)**:
1. Open your Vercel URL in Safari.
2. Tap the **Share** button (the square with the arrow, bottom center).
3. Scroll down → tap **Add to Home Screen** → **Add**.

It now opens full-screen like a real app. Long-press the icon to see the **Capture**
shortcut — one tap from home screen to the notebook.

On **Android (Chrome)**: menu (⋮) → **Add to Home screen**.

## 4. First real test (do this once, together)

1. Open the app → an assignment is waiting.
2. Tap **Rep · 15 min**, write four lines on paper.
3. **Photograph your page** → watch the transcription appear → fix anything misread.
4. Tap **Done** → answer the five autopsy questions → counter hits 1.

## 5. Backup (so it's never theoretical)

History → ⚙ → **Export everything**. A JSON file downloads — that file IS your entire
archive (photos included). Save it somewhere safe (iCloud, Drive). **Import** restores
it completely. Do this monthly; History will nag you quietly if you forget.

## Things worth knowing

- **All your data lives on your phone.** The server only relays AI calls; nothing is
  stored anywhere else. That's why the export matters — one device, one archive.
- The app works offline for writing, capture, and history. Photos captured offline
  transcribe automatically when you're back online.
- The voice profile begins after 25 completed days. Until then the section in Settings
  just counts up.
