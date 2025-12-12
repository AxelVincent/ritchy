// Set test environment variables before any imports
process.env.PGHOST = 'localhost'
process.env.PGPORT = '5434'
process.env.PGDATABASE = 'ritchy_test'
process.env.PGUSER = 'test'
process.env.PGPASSWORD = 'test'
process.env.PG_PUBLIC_URL = 'postgresql://test:test@localhost:5434/ritchy_test'
process.env.PGMAX = '5'
process.env.PGMIN = '1'

// Keep NODE_ENV=test to disable postgres debug logging (onparameter, onquery, etc.)
process.env.NODE_ENV = 'test'

// Enable info-level logging - logs are captured and only shown on test failure
// Use LOG_LEVEL=debug for more verbose output
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

// Enable pino-pretty for readable logs (sync mode for test capture)
process.env.PINO_PRETTY = 'true'
