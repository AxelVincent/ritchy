# Ritchy Monorepo

TypeScript monorepo built with Turborepo, featuring a React frontend and Node.js backend.

## 🚀 Getting Started

### Prerequisites
- Node.js 22.1.0+
- pnpm 9.13.2+
- python 3.11
- [pipx](https://pipx.pypa.io/stable/installation/) 
- [poetry 1.8.4+](https://python-poetry.org/docs/)
- [Playwright](https://playwright.dev/)
- Docker and Docker Compose
- Access to internal environment variables (ask a team member)

```bash
brew install python@3.11
which python3.11
# likely /opt/homebrew/bin/python3.11
pipx install poetry --python /opt/homebrew/bin/python3.11
pipx list
```

### Quick Setup
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
pnpm install

# Start development environment (includes dockerized services)
docker-compose up -d
pnpm dev
```

## 💻 Development Workflow

### Branch Management
- Create branches from `staging`
- Use snake_case for branch names
- Example: `feature_user_authentication`

### Commit Convention
Format: `[scope] Description`

Scopes:
- `[core]`: Shared/infrastructure changes
- `[back]`: Backend changes
- `[front]`: Frontend changes

Example:
```bash
git commit -m "[core] Update readme with onboarding process"
```

### Pull Request Process
1. **Creation**
   - Create PR from your feature branch to `staging`
   - Fill out the PR template completely
   - Ensure all checks pass (typecheck, linter, tests, build)

2. **Review Process**
   - Two engineers will review your code
   - Review outcomes:
     - ✅ Approval: Ready to merge
     - 💬 Comments: Minor changes needed
     - ❌ Request Changes: Major rework required

3. **QA Process**
   - Automated PR environment creation for testing
   - Verify your changes in the PR environment

#### Quality Checklist

Before submitting your PR, ensure:

- [ ] Code follows style guidelines
- [ ] Types are properly defined
- [ ] Tests are written and passing
- [ ] No unnecessary dependencies added
- [ ] Features are properly isolated
- [ ] Performance implications considered
- [ ] Security best practices followed

### Code Quality Checks
```bash
pnpm typecheck   # Run TypeScript checks
pnpm coverage    # Run lint/prettier coverage
pnpm test        # Run tests
```

## 📐 Code Standards

### Naming Conventions
- `PascalCase`: Components, Types, Interfaces
- `camelCase`: Functions, Variables, Properties
- `kebab-case`: Files, Folders
- `SCREAMING_SNAKE_CASE`: Constants

### Function Style
```typescript
// ✅ Good
export const getUserData = async (id: string): Promise<User> => {
  if (!id) throw new Error('ID required')
  return await fetchUser(id)
}

// ❌ Bad
export default function getData(a) {
  return a ? fetchData(a) : null
}
```

### Component Style
```typescript
// ✅ Good
export const UserProfile = ({ id }: { id: string }) => {
  const { data } = useQuery(['user', id], () => getUser(id))
  return data ? <div>{data.name}</div> : null
}

// ❌ Bad
class Profile extends React.Component {
  render() { return <div>{this.props.name}</div> }
}
```

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

## 🧪 Testing
> TODO: This section will be updated with specific requirements for:
> - Test coverage requirements
> - Types of tests needed for different changes
> - Testing tools and frameworks

## 🤝 Need Help?
- For environment variables and internal access: Contact any team member
- For technical questions: Open a discussion in the team channel

