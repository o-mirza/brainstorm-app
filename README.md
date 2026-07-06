# Brainstorm App

Brainstorm App is an anonymous realtime brainstorming board for group sessions. Participants join a shared room, add ideas and comments, heart the ideas they like, and see updates from everyone else as they happen.

## Features

- Anonymous room participation with generated room titles and shareable room URLs
- Realtime idea creation, editing, deletion, hearts, comments, participant counts, and room deletion updates
- Admin links for room management and real time participant permission controls
- Data export for room ideas and related activity
- AI insights summarizing top themes
- Room state backed by Postgres, with WebSocket fanout for live updates
- Separate web, API, and shared TypeScript packages in a pnpm workspace

## Tech Stack

- Web: Vite, React 19, React Router, Motion, TypeScript
- API: Fastify, WebSockets, TypeScript
- Data: Postgres with Drizzle ORM
- AI integration for board insights
- Package management: pnpm workspaces

## Local Development

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Copy the example environment file:

   ```sh
   cp .env.example .env
   ```

3. Set `DATABASE_URL` in `.env` to a Postgres connection string. AI settings are optional and only needed for AI summaries. The default local ports are:

   - Web: `http://localhost:5173`
   - API: `http://localhost:4000`

4. Run database migrations:

   ```sh
   pnpm db:migrate
   ```

5. Start the web and API apps:

   ```sh
   pnpm dev
   ```

## Scripts

- `pnpm dev` - build shared types and start the web and API apps
- `pnpm dev:web` - start only the web app
- `pnpm dev:api` - start only the API app
- `pnpm build` - build all workspace packages
- `pnpm typecheck` - run TypeScript checks across the workspace
- `pnpm test` - run tests across the workspace
- `pnpm lint` - run lint checks across the workspace
- `pnpm db:generate` - generate Drizzle migration files
- `pnpm db:migrate` - apply database migrations

## Environment

The root `.env.example` documents the required local settings:

- `DATABASE_URL` - Postgres connection string used by the API
- `PORT` - API server port
- `CLIENT_ORIGIN` - allowed browser origin for local development
- `NODE_ENV` - runtime environment
- `GEMINI_API_KEY` - optional AI API key used for summaries
- `GEMINI_MODEL` - optional AI model name used for summaries
- `VITE_API_BASE_URL` - API base URL used by the web app
- `VITE_WS_BASE_URL` - WebSocket base URL used by the web app

## Project Structure

```text
apps/
  api/       Fastify API, WebSocket server, route modules, Drizzle migrations
  web/       React client and room UI
packages/
  shared/    Shared TypeScript contracts, limits, and types
```

## Deployment

The root deployment config defines separate API and web services. The API service builds the shared package, runs database migrations on start, and starts the Fastify server. The web service builds the shared package and the Vite client, then serves the static output with a single-page app rewrite.
