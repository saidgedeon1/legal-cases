# legal-cases

Simple Arabic RTL webpage for legal case folders.

## Features

- 4 case folders (first: **باتريك سيف**)
- Open a folder → categories
- First category: **الشكوى من {name}**
- Upload files in **every category** (all formats, up to 50MB each)
- Save complaint text to Supabase

## Supabase setup (one time)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/fzkdywytihenesxcaqfg/sql/new)
2. Paste and run `supabase/schema.sql`
3. If you already ran an older schema, also run `supabase/files-migration.sql`

## Local preview

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Vercel

Live site: https://legal-cases-theta.vercel.app

1. Push this repo to GitHub — Vercel auto-redeploys
2. No build command needed (static HTML)
3. Output directory: `.`

`config.js` already contains the public Supabase URL + anon key.

## GitHub

```bash
git init
git add .
git commit -m "Initial legal-cases static app"
git branch -M main
git remote add origin https://github.com/saidgedeon1/legal-cases.git
git push -u origin main
```

## Security

- The **anon key** in `config.js` is public by design.
- Do **not** commit the **service role** key to GitHub.
