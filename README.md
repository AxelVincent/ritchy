# Ritchy Monorepo

A modern TypeScript monorepo built with Turborepo, featuring a React frontend and Node.js backend.

## Technology Stack

### Frontend Core
- React 18+ with TypeScript
- TanStack Query for data fetching
- TanStack Router for routing
- Tailwind + Shadcn/UI for styling
- Vite for build tooling
- Zod for runtime validation

### Backend Core
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM with PostgreSQL
- Zod for API validation

### Development Tools
- Turborepo for monorepo management
- pnpm for package management
- Biome for formatting

## Prerequisites

- Node.js >= 22.1.0
- pnpm 9.13.2+

## Getting Started

1. Install dependencies:
```sh
pnpm install
```

2. Start development servers:
```sh
pnpm dev
```

3. Build all packages:
```sh
pnpm build
```

## Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Check code formatting
- `pnpm format:fix` - Fix code formatting
- `pnpm check` - Run code linting
- `pnpm check:fix` - Fix linting issues
- `pnpm test` - Run tests

## Core Principles

### Type Safety & Validation
- Strict TypeScript configuration
- Zod validators for API contracts
- Shared types between frontend and backend
- No any types allowed
- Runtime type validation

### Code Quality
- Functional programming approach
- No JavaScript classes (use functions and closures)
- Pure functions when possible
- Immutable data structures
- Single responsibility principle
- No dead code
- Comprehensive logging
- Clear error handling
- Self-documenting code

### Feature Organization
- Self-contained features
- Clear boundaries
- Shared utilities
- Minimal cross-feature dependencies

## Code Style Rules

### Naming Conventions
- PascalCase: Components, Types, Interfaces
- camelCase: Functions, Variables, Properties
- kebab-case: Files, Folders
- SCREAMING_SNAKE_CASE: Constants

### Function Rules
✅ Good:
```typescript
export const getUserData = async (id: string): Promise<User> => {
  if (!id) throw new Error('ID required')
  return await fetchUser(id)
}
```

❌ Bad:
```typescript
export default function getData(a) {
  return a ? fetchData(a) : null
}
```

### Component Rules
✅ Good:
```typescript
export const UserProfile = ({ id }: { id: string }) => {
  const { data } = useQuery(['user', id], () => getUser(id))
  return data ? <div>{data.name}</div> : null
}
```

❌ Bad:
```typescript
class Profile extends React.Component {
  render() { return <div>{this.props.name}</div> }
}
```

## Contributing

Please follow our established guidelines:

1. Use the provided code style rules
2. Maintain type safety (no `any` types)
3. Write tests for new features
4. Follow the functional programming approach
5. Keep features self-contained

## Project Structure

### Shared Types Package
```
packages/types/src/
    index.ts            # Main export file
    api/               # API-related schemas and types
    schemas.ts        # Shared Zod schemas
    types.ts         # Shared TypeScript types
```

### Frontend Application
```
apps/front/src/
    main.tsx                # Entry point
    App.tsx                # Root component
    features/              # Feature-based modules
    components/           # Shared components
    lib/                 # Core infrastructure
    providers/           # React providers
    routes/              # Application routes
```

### Backend Application
```
apps/api/src/
    index.ts             # Entry point
    controllers/         # Request handlers
    routes/             # Route definitions
    services/           # Business logic
    db/                 # Database
```

## License

[Add your license here]
