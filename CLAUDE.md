# Claude Context Guide - Ritchy Monorepo

This file provides essential context for Claude when working with the Ritchy monorepo. Claude automatically references this information to provide accurate, contextual assistance.

## 🏗️ Project Architecture

### Monorepo Structure

```
ritchy-mono/
├── apps/
│ ├── front/ # React frontend (TypeScript)
│ └── api/ # Node.js backend (TypeScript)
├── packages/
│ └── types/ # Shared TypeScript types
├── .github/workflows/ # GitHub Actions (including Claude PR Assistant)
└── docs/ # Documentation
```


### Technology Stack
- **Frontend**: React 18+, TanStack Query, TanStack Router, Tailwind + Shadcn/UI, Vite
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL
- **Development**: Turborepo, pnpm, Biome, TypeScript (strict mode)
- **AI Integration**: Claude Sonnet 4 via GitHub Actions

## 💻 Development Environment

### Prerequisites
```bash
# Required versions
Node.js >= 22.1.0
pnpm 9.13.2+
Docker and Docker Compose
```

### Setup Commands
```bash
# Install dependencies
pnpm install

# Start development environment
docker-compose up -d
pnpm dev

# Database operations
pnpm db:generate    # Generate Drizzle schema
pnpm db:migrate     # Run migrations

# Code quality
pnpm typecheck      # TypeScript checks
pnpm coverage       # Lint/prettier coverage
pnpm test           # Run tests
```

## 📝 Code Style Guidelines

### Naming Conventions
- **PascalCase**: Components, Types, Interfaces
- **camelCase**: Functions, Variables, Properties
- **kebab-case**: Files, Folders
- **SCREAMING_SNAKE_CASE**: Constants

### Function Style (Functional Programming)
```typescript
// ✅ Good - Functional approach
export const getUserData = async (id: string): Promise<User> => {
  if (!id) throw new Error('ID required')
  return await fetchUser(id)
}

// ❌ Bad - Avoid classes and default exports
export default function getData(a) {
  return a ? fetchData(a) : null
}
```

### Component Style
```typescript
// ✅ Good - Functional components
export const UserProfile = ({ id }: { id: string }) => {
  const { data } = useQuery(['user', id], () => getUser(id))
  return data ? <div>{data.name}</div> : null
}

// ❌ Bad - No class components
class Profile extends React.Component {
  render() { return <div>{this.props.name}</div> }
}
```

### Core Principles
- **Type Safety**: Strict TypeScript, Zod validation, no `any` types
- **Functional Programming**: No classes, pure functions, immutable data
- **Single Responsibility**: Each function/component has one clear purpose
- **Feature Organization**: Self-contained features with clear boundaries

## 🔄 Git Workflow

### Branch Management
```bash
# Create feature branches from staging
git checkout staging
git pull origin staging
git checkout -b feature/RIT-123-description

# Branch naming convention
feature/RIT-123-description    # Feature with Linear ticket
fix/RIT-456-bug-description    # Bug fix with Linear ticket
docs/update-readme             # Documentation updates
```

### Commit Convention
```bash
# Format: [scope] Description
[core] Update readme with onboarding process
[front] Add user authentication component
[back] Implement user service with Drizzle
[types] Add shared API response types
```

### Pull Request Process
1. **Create PR** from feature branch to `staging`
2. **Claude Integration**: Automatic description and review via GitHub Actions
3. **Review**: Two engineers required, follow review outcomes
4. **QA**: Automated PR environment for testing

## 🤖 Claude AI Integration

### Automated Workflow
- **File**: `.github/workflows/claude-pr-assistant.yml`
- **Trigger**: Every PR (opened/synchronize)
- **Features**: 
  - PR description generation
  - Code review with monorepo guidelines
  - Linear ticket integration
  - Cost tracking and reporting

### Linear Ticket Integration
```bash
# Branch names automatically extract Linear tickets
feature/RIT-123-add-auth    # Extracts RIT-123
fix/RIT-456-bug-fix         # Extracts RIT-456
```

### Cost Management
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Timeout**: 20-30 minutes (adaptive)
- **Cost Reports**: Posted as PR comments
- **Alerts**: High-cost PRs (>$0.20) flagged

## 🏛️ Architecture Patterns

### Backend Service Structure

```
apps/api/src/services/
├── domain_name/
│ ├── queries/ # Data access functions
│ ├── utils/ # Helper functions
│ ├── validators/ # Validation logic
│ └── .ts # Pure domain functions
```

### Frontend Feature Structure

```
apps/front/src/features/
├── feature_name/
│ ├── components/ # Feature components
│ ├── hooks/ # Feature hooks
│ ├── services/ # Feature services
│ └── types.ts # Feature-specific types
```


### Shared Types
```typescript
// packages/types/src/
export interface ApiResponse<T> {
  data: T
  error?: string
}

// Used in both frontend and backend
import type { ApiResponse, User } from '@ritchy/types'
```

## 🧪 Testing Guidelines

Not implemented yet

## 🔧 Common Development Tasks

### Database Operations
```bash
# Generate new schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Reset database (development)
pnpm db:reset
```

### Code Quality
```bash
# Type checking
pnpm typecheck

# Linting and formatting
pnpm coverage

# Fix auto-fixable issues
pnpm fix
```


### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build
```

## ⚠️ Important Warnings

### Environment Variables
- **Never commit `.env` files** - they contain sensitive data
- **Use `ex.env`** as template for local development
- **Ask team members** for internal environment variables

### TypeScript Strict Mode
- **No `any` types** allowed
- **Always define return types** for functions
- **Use Zod schemas** for runtime validation

### Performance Considerations
- **Bundle size monitoring** for frontend
- **Query optimization** for database operations
- **Lazy loading** for routes and components

### Security Guidelines
- **Input validation** on all API endpoints
- **Authentication/Authorization** checks
- **XSS prevention** in frontend
- **CSRF protection** for forms

## 🆘 Troubleshooting

### Common Issues
```bash
# Node version issues
nvm use 22.1.0

# pnpm issues
pnpm install --force

# Docker issues
docker-compose down -v
docker-compose up --build

# TypeScript issues
pnpm typecheck --noEmit
```

### Claude Integration Issues
- **Check GitHub secrets** are properly configured
- **Verify Linear API key** for ticket integration
- **Monitor cost reports** for unexpected usage
- **Review debug logs** in workflow execution

## 📚 Additional Resources

- **README.md**: General project overview
- **.cursorrules**: Detailed development guidelines
- **docs/**: Additional documentation
- **GitHub Issues**: Bug reports and feature requests

---

*This file serves as Claude's primary context when working with the Ritchy monorepo. Keep it updated with any changes to development practices, architecture, or tooling.*