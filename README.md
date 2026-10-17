# AI Developer Hub

A React + Vite workspace for common software-development tasks, with a Gemini-powered serverless API.

## Features

- **Generate code** across programming languages and stacks.
- **Explain code** and technical concepts.
- **Debug code** with likely causes and suggested fixes.
- **README writer** for GitHub project documentation.
- **Release notes** with structured Markdown and emoji headings.
- **Project organizer** with projects saved in the current browser.

## Deploy from GitHub

1. Open [Vercel](https://vercel.com/) and sign in.
2. Choose **Add New → Project**, then import `Error-cracker-1/AI-Developer-Hub`.
3. Keep the detected Vite framework and default build settings (`npm run build`, output directory `dist`).
4. In the Vercel project, open **Settings → Environment Variables**.
5. Add `GEMINI_API_KEY` with your Gemini API key. Keep it server-side: **do not** name it `VITE_GEMINI_API_KEY` and do not commit it to GitHub.
6. Deploy. Future pushes to the connected production branch will trigger deployments automatically.

The app uses the stable, cost-conscious `gemini-3.5-flash-lite` model. Model availability and usage limits depend on the Google AI project and its quota.

## Run locally

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

To test the serverless API locally, install the Vercel CLI and run:

```bash
npm run vercel:dev
```

Set `GEMINI_API_KEY` in a local `.env.local` file for local API testing. Do not commit that file. The included `.gitignore` excludes environment files.

## Security notes

- The Gemini key is read only by the serverless function; it is never embedded in frontend JavaScript.
- Requests are validated and prompt size is limited.
- Review generated code and test it before using it in production.
- Configure usage limits and monitor API usage in your Google AI project to reduce unexpected consumption.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, Lucide icons, Vercel Functions, and the Gemini API.
