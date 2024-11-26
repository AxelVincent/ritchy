# Ritchy Monorepo

A modern TypeScript monorepo built with Turborepo, featuring a React frontend and Node.js backend.

## 📚 Table of Contents
- [Quick Start](#quick-start)
- [Technology Stack](#technology-stack)
- [Development Guide](#development-guide)
- [Project Structure](#project-structure)
- [Code Standards](#code-standards)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22.1.0
- pnpm 9.13.2+

### Setup
```sh
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build
```

## 🛠 Technology Stack

### Core Technologies
- **Frontend**: React 18+, TanStack Query/Router, Tailwind + Shadcn/UI, Vite
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL
- **Shared**: TypeScript, Zod, Turborepo, pnpm, Biome

### Development Tools
```sh
pnpm dev         # Start development servers
pnpm build       # Build all packages
pnpm typecheck   # Run TypeScript type checking
pnpm format      # Check/fix code formatting
pnpm check       # Run/fix code linting
pnpm test        # Run tests
```

## 💻 Development Guide

### Core Principles
- **Type Safety**
  - Strict TypeScript configuration
  - Zod validators for API contracts
  - No any types allowed
  - Runtime type validation

- **Code Quality**
  - Functional programming approach
  - Pure functions when possible
  - Immutable data structures
  - Single responsibility principle
  - Comprehensive logging

- **Feature Organization**
  - Self-contained features
  - Clear boundaries
  - Minimal cross-feature dependencies

## 📁 Project Structure

### Monorepo Layout
```
packages/types/src/      # Shared types package
    ├── index.ts        # Main export file
    ├── api/            # API-related schemas
    ├── schemas.ts      # Shared Zod schemas
    └── types.ts        # Shared TypeScript types

apps/
    ├── front/src/      # Frontend application
    │   ├── main.tsx    # Entry point
    │   ├── features/   # Feature modules
    │   ├── components/ # Shared components
    │   └── lib/        # Core infrastructure
    │
    └── api/src/        # Backend application
        ├── index.ts    # Entry point
        ├── controllers/# Request handlers
        ├── routes/     # Route definitions
        └── services/   # Business logic
```

## 📐 Code Standards

### Naming Conventions
- `PascalCase`: Components, Types, Interfaces
- `camelCase`: Functions, Variables, Properties
- `kebab-case`: Files, Folders
- `SCREAMING_SNAKE_CASE`: Constants

### Function Examples
✅ Good:
```typescript
export const getUserData = async (id: string): Promise<User> => {
  if (!id) throw new Error('ID required')
  return await fetchUser(id)
}
```

### Component Examples
✅ Good:
```typescript
export const UserProfile = ({ id }: { id: string }) => {
  const { data } = useQuery(['user', id], () => getUser(id))
  return data ? <div>{data.name}</div> : null
}
```

## 🤝 Contributing

### Development Workflow

1. **Setup Your Environment**
   - Ensure you have Node.js >= 22.1.0 and pnpm 9.13.2+
   - Fork and clone the repository
   - Run `pnpm install` to install dependencies

2. **Code Style Requirements**
   - Follow our naming conventions:
     ```
     PascalCase: Components, Types, Interfaces
     camelCase:  Functions, Variables, Properties
     kebab-case: Files, Folders
     SCREAMING_SNAKE_CASE: Constants
     ```
   - Use the provided Biome configuration for formatting
   - Run `pnpm format` and `pnpm check` before committing

3. **Type Safety**
   - Maintain strict TypeScript configuration
   - No `any` types allowed
   - Use Zod for runtime validation
   - Run `pnpm typecheck` before submitting PR

4. **Code Quality**
   - Follow functional programming principles
   - Write pure functions when possible
   - Use immutable data structures
   - Keep features self-contained
   - Ensure comprehensive logging
   - Implement clear error handling
   - Write self-documenting code

5. **Testing Requirements**
   - Write tests for new features
   - Place tests in appropriate directories:
     ```
     tests/
       unit/           # Unit tests
       integration/    # Integration tests
       e2e/           # End-to-end tests
     ```
   - Run `pnpm test` to ensure all tests pass

6. **Documentation**
   - Add JSDoc comments for public APIs
   - Update relevant README files
   - Document architecture decisions
   - Update API documentation when needed

7. **Pull Request Process**
   - Create feature branches from `master`
   - Keep PRs focused and single-purpose
   - Fill out the PR template completely
   - Ensure all checks pass
   - Request review from maintainers

### Quality Checklist

Before submitting your PR, ensure:

- [ ] Code follows style guidelines
- [ ] Types are properly defined
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No unnecessary dependencies added
- [ ] Features are properly isolated
- [ ] Performance implications considered
- [ ] Security best practices followed

## License

[Add your license here]
