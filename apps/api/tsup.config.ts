import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
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
