<!-- BEGIN:nextjs-agent-rules -->

...existing Next.js content...

<!-- END:nextjs-agent-rules -->

# MediVault Project Instructions

## Design System

Always use:

design-system/medivault/MASTER.md

as the single source of truth.

Never regenerate the design system.

Follow all typography, spacing, colors, accessibility, motion and component rules defined in MASTER.md.

## Component Selection

Before creating any UI:

1. Search existing project components.
2. Prefer 21st.dev components.
3. Otherwise use shadcn/ui.
4. Use Radix UI primitives.
5. Use Lucide React icons.

Never duplicate reusable components.

## Framework

- Next.js App Router
- TypeScript
- Tailwind CSS

## Development Rules

Never break:

- Authentication
- API integration
- Business logic
- Routing
- State management

Only improve the frontend unless explicitly instructed otherwise.

## UI Standards

Every new page must:

- Follow MASTER.md
- Be responsive
- Be accessible
- Match existing UI
- Reuse components
- Use production-ready patterns

For every response, begin by writing:

"Loaded MediVault project instructions."