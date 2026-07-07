# legal-cases

Simple Arabic RTL webpage for legal case folders.

## Features

- 4 case folders (first: **باتريك سيف**)
- Open a folder → categories
- First category: **الشكوى من {name}**
- Save complaint text to Supabase

## Supabase setup (one time)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/fzkdywytihenesxcaqfg/sql/new)
2. Paste and run `supabase/schema.sql`

## Local preview

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Vercel

1. Push this repo to GitHub
2. Import project in Vercel
3. No build command needed (static HTML)
4. Output directory: `.`

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
