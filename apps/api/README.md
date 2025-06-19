# Lead Generation Tool

A powerful lead generation tool that leverages Google Maps research and website content analysis to create tailored emails for potential leads.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Scripts](#scripts)
- [Database](#database)
- [Contributing](#contributing)
- [License](#license)

## Features

- Google Maps research for lead discovery
- Website content analysis for personalized outreach
- Tailored email generation based on lead information
- Database integration for lead management

## Technologies

- Node.js
- Drizzle ORM
- Biome (for linting and formatting)
- Docker
- PostgreSQL
- Cheerio (for web scraping)

## Architecture

### Project Structure

```
src/  
├── routes_web/ #Presentation Layer
├── db/ #Database Layer
├── external/ #External service integrations  
├── middleware/ #Express middleware  
├── services/ #Business logic layer 
├── utils/ #Shared utilities
├── webhook/ #Webhook handlers  
├── config/ #Configuration management  
├── types/ #TypeScript type definitions  
└── index.ts #Application entry point  
```

### Architecture Principles

#### Presentation Layer Structure

The routes layer follows a resource-based organization with clear endpoint grouping:

```
routes_web/  
├── resource_name/  
│ ├── sub_resource/ # Nested resource endpoints  
│ ├── index.ts # Route aggregation  
│ ├── get_resource.ts # GET endpoint  
│ ├── post_resource.ts # POST endpoint handlers    
│ ├── put_resource.ts # PUT endpoint handlers  
│ └── delete_resource.ts # DELETE endpoint handlers  
└── index.ts # Main routes aggregation  
```


#### Data Access Layer Structure

The database layer provides a clean abstraction for data persistence:

```
db/
├── schema.ts # Schema definitions
├── db.ts # Connection management
├── migrate.ts # Migration utilities
└── versioned_db/ # Version history system
   ├── client.ts # Versioned database client
   ├── types.ts # Version history types
   └── utils.ts # Version history utilities
```

#### Integration Layer Structure

External integrations are organized by service provider:

```
external/
├── service_name/
│ ├── client.ts # API client configuration
│ ├── types.ts # Service-specific types
│ ├── utils.ts # Service utilities
│ └── handlers/ # Event handlers
│    ├── event_type.ts # Specific event handling
│    └── transformers.ts # Data transformation
└── index.ts # Integration exports
```
#### Cross-cutting Concerns Structure

Middleware and utilities follow a functional organization:

```
middleware/
├── error_handler.ts # Error handling middleware
├── validation.ts # Request validation
├── authentication.ts # Auth middleware
├── logging.ts # Request logging
└── business_rules.ts # Business rule middleware
```

#### Services Layer Structure

The API follows a domain-focused architecture with clear separation of concerns. Each domain is organized into four distinct layers:
```
services/
├── domain_name/
│ ├── queries/ # Data access functions
│ ├── utils/ # Helper functions
│ ├── validators/ # Validation logic
│ └── .ts # Pure domain functions
```

### 1. Domain Separation
Each business domain has its own folder with complete separation of concerns.

### 2. Layer Organization
- **queries/**: Pure data access functions (get, create, update, delete)
- **utils/**: Helper functions for data transformation and aggregation
- **validators/**: Business rule validation and permission checking
- **Root level**: Pure domain functions that orchestrate business logic

### 3. Naming Conventions
- **Folders and files**: snake_case
- **Functions**: snake_case
- **Variables**: snake_case
- **Types**: PascalCase (following TypeScript conventions)

### 4. Function Categories

#### Queries (Data Access)
```typescript
// apps/api/src/services/places/queries/get_place_by_id.ts
export const get_place_by_id = async (
  place_id: string,
  user_id: string,
): Promise<Place | null> => {
  // Pure data access logic
}
```

#### Utils (Helper Functions)
```typescript
// apps/api/src/services/places/utils/aggregate_place_data.ts
export const aggregate_place_data = async (
  places: PlaceBase[],
  options: AggregationOptions,
): Promise<Place[]> => {
  // Data transformation and aggregation logic
}
```

#### Validators (Business Rules)
```typescript
// apps/api/src/services/places/validators/validate_place_permissions.ts
export const validate_place_update_permission = async (
  user_id: string,
  place_id: string,
): Promise<void> => {
  // Permission and business rule validation
}
```

#### Pure Domain Functions (Business Logic)
```typescript
// apps/api/src/services/places/update_place_status.ts
export const update_place_status = async (
  place_id: string,
  user_id: string,
  new_status: StatusType,
): Promise<Status> => {
  // Orchestrate business logic using queries, utils, and validators
}
```


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lead-generation-tool.git
   cd lead-generation-tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and replace the dummy data with your actual configuration values.

4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

## Docker Setup

This project includes a `docker-compose.yml` file for easy containerization and deployment.

To run the project using Docker:

1. Make sure you have Docker and Docker Compose installed on your system.

2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

   This command will build the Docker image and start the containers defined in the `docker-compose.yml` file.

3. To stop the containers, use:
   ```bash
   docker-compose down
   ```

Note: The `docker-compose.yml` file likely includes services for both the application and the database. Make sure all necessary environment variables are properly set in your `.env` file or directly in the `docker-compose.yml` file.

## Configuration

This project uses environment variables for configuration. An example file `ex.env` is provided with dummy data. To configure the application:

1. Copy `ex.env` to `.env`:
   ```bash
   cp ex.env .env
   ```
2. Open `.env` in a text editor and replace the dummy values with your actual configuration data.

Important: Never commit your `.env` file to version control, as it may contain sensitive information.

## Usage

To start the development server:

```bash
npm run dev
```

## Scripts

- `npm run dev`: Start the development server
- `npm run scripts:example`: Run the example script
- `npm run scripts:leadGenerator`: Run the lead generation script
- `npm run db:generate`: Generate database schema
- `npm run db:migrate`: Run database migrations

## Database

This project uses Drizzle ORM with PostgreSQL. To manage the database:

- Generate schema: `npm run db:generate`
- Run migrations: `npm run db:migrate`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.