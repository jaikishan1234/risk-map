# AGENTS.md

## Project
RiskMap

## Goal
Analyze public GitHub repositories and identify knowledge concentration risk and bus-factor issues.

## Tech Stack
- Next.js 16
- TypeScript
- Tailwind CSS
- App Router

## Development Rules
- MVP first.
- Keep implementation simple and hackathon-friendly.
- Use the latest stable package versions unless compatibility issues exist.
- Prefer deterministic algorithms over AI-generated conclusions.
- Keep functions small, readable, and well-typed.
- Avoid unnecessary dependencies.

## Do Not Add Unless Explicitly Requested
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Kafka
- Docker
- GitHub OAuth
- Authentication systems
- Microservices

## Architecture Guidelines
- UI components in `components/`
- Business logic in `lib/`
- External integrations in `services/`
- Shared types in `types/`
- Reusable helpers in `utils/`
- Custom hooks in `hooks/`

## AI Usage
- AI should explain computed results.
- AI should not invent risk scores.
- All AI explanations must be grounded in repository analysis data.

## MVP Priorities
1. GitHub URL input
2. Repository analysis
3. Risk scoring
4. Ranked file table
5. File details view
6. AI explanation

## Success Criteria
A user can paste a public GitHub repository URL and receive a ranked, explainable list of knowledge-concentration risks in under 30 seconds.
