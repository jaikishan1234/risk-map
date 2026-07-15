# RiskMap setup guide

## Installed libraries

| Library | Purpose | Configuration |
| --- | --- | --- |
| shadcn/ui | Accessible, composable UI primitives | `components.json`, Tailwind CSS variables, and the `@/components/ui` alias |
| react-hook-form | Client-side form state | No global configuration required |
| zod | Runtime validation and typed schemas | No global configuration required |
| recharts | Dashboard charts | Use only in Client Components |
| octokit | GitHub REST and GraphQL API client | Use only in server-side services |

## shadcn/ui

The shadcn CLI is configured in `components.json` with the `base-nova` style,
Tailwind CSS variables, and the existing `@/*` TypeScript import alias.

- Components belong in `src/components/ui`.
- The shared `cn` class-name helper is in `src/lib/utils.ts`.
- The initial `Button` primitive is in `src/components/ui/button.tsx`.

Add a component when it is needed:

```bash
npx shadcn@latest add input
```

## Forms and validation

Create form components as Client Components in `src/components`. Define each
Zod schema close to its feature's shared types and use it to validate the
server request as well. `react-hook-form` manages field state; Zod remains the
single source of truth for validation rules.

## Charts

Recharts accesses browser APIs, so chart components must begin with
`"use client"`. Keep chart data transformation in `src/lib` and rendering in
`src/components`.

## GitHub API

Create Octokit clients only in `src/services`. Keep any GitHub token on the
server in `.env.local`:

```dotenv
GITHUB_TOKEN=your_personal_access_token
```

Never expose this value through a `NEXT_PUBLIC_` variable or import an Octokit
service into a Client Component.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

## Verification

The project has been checked with ESLint and a production build. The package
tree confirms that the requested libraries are installed, and shadcn/ui has
validated the Next.js 16, Tailwind CSS 4, and `@/*` alias configuration.
