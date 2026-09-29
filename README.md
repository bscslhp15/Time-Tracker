# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Minute | Time Tracker

  A responsive work-hour tracker for employees and OJT/interns. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

  ## Setup

  1. Create a free project at [supabase.com](https://supabase.com/) and wait for its database to finish provisioning.
  2. In the Supabase dashboard, open **SQL Editor**, create a query, paste in [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the tables, ownership constraints, indexes, and row-level security policies.
  3. In **Authentication → Providers**, make sure Email is enabled. For a beginner-friendly local test, either confirm new accounts using the email link or temporarily turn off email confirmations in **Authentication → Sign In / Providers**.
  4. Open **Project Settings → API**. Copy the Project URL and the `anon` / publishable key. Do not put a service-role key in this frontend.
  5. Copy `.env.example` to `.env.local` in the project root and fill in the two values:

     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
     ```

  6. From a terminal in the project folder, install packages and start Vite:

     ```bash
     npm install
     npm run dev
     ```

  7. Open the local URL printed by Vite, create an account, and start a session. To check the calculations and code quality, run `npm test`, `npm run lint`, and `npm run build`.

  ## Deploy to Vercel

  1. Push this folder to a GitHub repository and import it into [Vercel](https://vercel.com/).
  2. Keep the Vite defaults: build command `npm run build`, output directory `dist`.
  3. In **Project Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values used locally. Apply them to Production and Preview as needed.
  4. Deploy. After deployment, add your Vercel URL to **Supabase → Authentication → URL Configuration → Site URL** and add it to the redirect URL allow list.

  ## Behavior notes

  - Dates and clock times use the browser's local timezone. A clock-out earlier than clock-in is treated as an overnight shift; equal times are rejected.
  - The break is deducted from worked time only when **Deduct breaks from worked time** is enabled for the session. Each log's break value can be edited independently.
  - Undertime and overtime are calculated only for dates with at least one log. No weekly work schedule is stored, so unlogged weekends and holidays are not assumed to be workdays.
  - When the target is an end date, planned target hours are estimated as required hours per day multiplied by the inclusive calendar-day span from the start date.
  - Applying time-bank hours allocates surplus to the oldest logged undertime first and reports the remaining balance. It is a calculated allocation, not an edit to historical logs.
  - Without Supabase environment variables, the sign-in screen offers a browser-only sample workspace. Demo data stays in local storage and is not synced.

  ## Project structure

  ```text
  src/
    components/   Auth and data-entry forms
    lib/          Supabase client and shared types
    utils/        Time, date, validation, and balance calculations
    App.tsx       Protected workspace, data flows, and views
    styles.css    Tailwind entry point and responsive theme
  supabase/
    schema.sql    Tables and row-level security policies
  ```

