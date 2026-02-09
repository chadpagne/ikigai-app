# Ikigai v0.4 (deployable)

This is a ready-to-deploy Vite + React build of the Ikigai prototype.

## Run locally
1) Install Node.js (LTS)
2) In this folder:
```bash
npm install
npm run dev
```

Open the URL shown in the terminal (it will also be reachable on your phone if you're on the same Wi‑Fi).

## Deploy to Vercel (public link)
1) Upload this whole folder to GitHub (all files, not just App.jsx)
2) In Vercel: New Project → import the repo → Deploy
3) If Vercel asks:
- Build command: `npm run build`
- Output directory: `dist`

## Notes
- State is saved to localStorage.
- `vercel.json` includes an SPA rewrite so page refreshes won't 404.
