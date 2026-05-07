# Puter.js Habit Tracker App

A simple single-page habit tracker demo built with Next.js, shadcn/ui, Tailwind CSS, Lucide Icons, and Puter.js.

Suggested GitHub repository name: `Puter.js Habit Tracker App`

## Features

- Weekly habit grid with daily completion toggles
- Today summary, progress ring, and streak list
- Add-habit dialog for quick demo data entry
- Local browser persistence
- Puter cloud sync through Puter.js KV storage
- Responsive app-like layout for desktop and mobile

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` starts the local development server
- `npm run build` builds the app for production
- `npm run lint` runs ESLint

## Puter.js

This app is built with Puter.js using the `@heyputer/puter.js` package. The demo uses Puter Auth for sign-in and Puter KV for saving habit tracker data to the user's Puter account.

Puter.js documentation: [https://docs.puter.com](https://docs.puter.com)

## License

MIT
