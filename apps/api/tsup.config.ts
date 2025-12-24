import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    // Worker entry point
    'src/workers/index.ts',
    // Sandbox files for BullMQ worker threads (must be separate entries)
    'src/internal/bullmq/jobs/enrichment-company/sandbox.ts',
    'src/internal/bullmq/jobs/enrichment-contact/sandbox.ts',
    'src/internal/bullmq/jobs/scraper/sandbox.ts',
  ],
  clean: true,
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
      tsBuildInfoFile: undefined,
    },
  },
  sourcemap: true,
  target: 'node22',
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  external: ['@modelcontextprotocol/sdk', '@langchain/mcp-adapters'],
})
