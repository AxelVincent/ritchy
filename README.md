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